// Local QA only: mail is mocked and no SendLayer credentials are read.
// Run alongside the dev server on port 3000: node scripts/preview-partnership-inquiry.mjs
import http from "node:http";
import net from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { buildPartnershipEmails } from "../src/app/lib/partnership-inquiry.mjs";
import { createPartnershipInquiryHandler } from "../src/app/lib/partnership-inquiry-handler.mjs";
import { hasPotentialPhi } from "../src/app/lib/no-phi-guard.js";

const preview = buildPartnershipEmails({ firstName: "Jordan", lastName: "Morgan", email: "jordan@example.com", phone: "301-555-0123", organization: "Example Community Organization", role: "Director", partnershipType: "Community Organizations", message: "We would like to explore expanding access to primary care in our community." });
await mkdir("artifacts/partnership-inquiry", { recursive: true });
await writeFile("artifacts/partnership-inquiry/welcome-email.html", preview.welcome.html);
await writeFile("artifacts/partnership-inquiry/team-notification.html", preview.team.html);
let lastDelivery = [];

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/welcome-email.html" || req.url === "/team-notification.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(req.url === "/welcome-email.html" ? preview.welcome.html : preview.team.html);
      return;
    }
    if (req.url === "/__qa/last-delivery") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(lastDelivery));
      return;
    }
    if (req.url === "/api/partnership-inquiry" && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      lastDelivery = [];
      const handler = createPartnershipInquiryHandler({ checkLimit: async () => null, hasPotentialPhi,
        env: { NODE_ENV: "test", SENDLAYER_API_KEY: "mock", SENDLAYER_FROM_EMAIL: "fma@example.com" },
        logError: () => {},
        send: async (_key, email) => {
          if (raw.includes("simulate team failure") || (raw.includes("simulate welcome failure") && email.Tags.includes("visitor-welcome"))) throw new Error("Simulated QA delivery failure");
          lastDelivery.push({ to: email.To, replyTo: email.ReplyTo, subject: email.Subject, text: email.PlainContent });
          return "mock-message-id";
        },
      });
      const response = await handler(new Request("http://127.0.0.1:3003/api/partnership-inquiry", { method: "POST", body: raw }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    // Prevent any other form from reaching a real API through this QA proxy.
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end("This preview accepts only mocked partnership inquiries.");
      return;
    }
    const upstream = http.request({ hostname: "127.0.0.1", port: 3000, path: req.url, method: req.method, headers: { ...req.headers, host: "127.0.0.1:3000" } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end("Start the Next.js dev server on port 3000 first."); });
    req.pipe(upstream);
  } catch { res.writeHead(500); res.end("Preview failed."); }
});

server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(3000, "127.0.0.1", () => {
    const headers = { ...req.headers, host: "127.0.0.1:3000" };
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});
server.listen(3003, "127.0.0.1", () => console.log("Mock partnership preview: http://127.0.0.1:3003/partner-with-us/\nWelcome email: http://127.0.0.1:3003/welcome-email.html"));
