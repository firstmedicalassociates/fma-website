// Local-only QA: all inquiry email delivery is mocked. No SendLayer credentials are read.
// Run alongside `npm run dev`: node scripts/preview-practice-inquiry.mjs
import http from "node:http";
import net from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { buildPracticeEmails } from "../src/app/lib/practice-inquiry.mjs";
import { createPracticeInquiryHandler } from "../src/app/lib/practice-inquiry-handler.mjs";
import { hasPotentialPhi } from "../src/app/lib/no-phi-guard.js";

const preview = buildPracticeEmails({ firstName: "Alex", lastName: "Morgan", email: "alex@example.com", phone: "301-555-0123", practiceName: "Example Primary Care", role: "Practice owner / physician owner", city: "Rockville", state: "Maryland", specialty: "Family medicine", providerCount: "2–5", goal: "Explore selling my practice", timeline: "6–12 months", preferredContact: "Email", message: "I would like to discuss a future transition.", attribution: { utm_source: "facebook", utm_campaign: "practice-transition" } });
await mkdir("artifacts/practice-transition", { recursive: true });
await writeFile("artifacts/practice-transition/welcome-email.html", preview.welcome.html);
await writeFile("artifacts/practice-transition/team-notification.html", preview.team.html);

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/welcome-email.html" || req.url === "/team-notification.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(req.url === "/welcome-email.html" ? preview.welcome.html : preview.team.html);
      return;
    }
    if (req.url === "/api/practice-inquiry" && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      const handler = createPracticeInquiryHandler({ checkLimit: async () => null, hasPotentialPhi,
        env: { NODE_ENV: "test", SENDLAYER_API_KEY: "mock", SENDLAYER_FROM_EMAIL: "fma@example.com", SENDLAYER_TO_EMAILS: "team@example.com" },
        logError: () => {},
        send: async (_key, email) => {
          if (raw.includes("simulate team failure") || (raw.includes("simulate welcome failure") && email.Tags.includes("visitor-welcome"))) throw new Error("Simulated QA delivery failure");
          return "mock-message-id";
        },
      });
      const response = await handler(new Request("http://localhost:3002/api/practice-inquiry", { method: "POST", body: raw }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    const upstream = http.request({ hostname: "localhost", port: 3000, path: req.url, method: req.method, headers: { ...req.headers, host: "localhost:3000" } }, (response) => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end("Start the Next.js dev server on port 3000 first."); });
    req.pipe(upstream);
  } catch { res.writeHead(500); res.end("Preview failed."); }
});
// Next's development client needs its HMR connection to complete initialization.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(3000, "localhost", () => {
    const headers = { ...req.headers, host: "localhost:3000" };
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});
server.listen(3002, "127.0.0.1", () => console.log("Mock inquiry preview: http://localhost:3002/sell-your-practice/\nWelcome email: http://localhost:3002/welcome-email.html"));
