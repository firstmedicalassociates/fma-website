// Local QA only. Never forwards submissions to Amazon SES or another real service.
// Start Next on port 3001 with SES_REGION=us-east-1 and SES_FROM_EMAIL=forms@example.com and
// MEDICAL_RECORDS_VENDOR_REVIEWED=true; visit this proxy on port 3003.
import http from "node:http";
import net from "node:net";
import { createMedicalRecordsHandler } from "../src/app/lib/medical-records-handler.mjs";
import { buildCompletedMedicalRecordsPdf } from "../src/app/lib/medical-records-pdf.mjs";
import { createSesEmailSender } from "../src/app/lib/ses-email.mjs";

let lastDelivery = null;
const fakeEnv = { SES_REGION: "us-east-1", SES_FROM_EMAIL: "forms@example.com", MEDICAL_RECORDS_VENDOR_REVIEWED: "true" };
const handler = createMedicalRecordsHandler({
  env: fakeEnv, checkLimit: async () => null, buildPdf: buildCompletedMedicalRecordsPdf, logError: () => {},
  send: createSesEmailSender({ env: fakeEnv, client: { async send(command) {
    if (lastDelivery?.simulateFailure) { lastDelivery = null; throw new Error("Simulated delivery failure"); }
    lastDelivery = command.input;
    return { MessageId: "mock-accepted-id" };
  } } }),
});

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/__qa/delivery" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(lastDelivery));
      return;
    }
    if (req.url === "/__qa/fail-next" && req.method === "POST") {
      lastDelivery = { simulateFailure: true };
      res.writeHead(204); res.end(); return;
    }
    if (req.url === "/api/medical-records-release" && req.method === "POST") {
      const chunks = [];
      let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 21000) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
      const response = await handler(new Request(`http://127.0.0.1:3003${req.url}`, { method: "POST", headers: req.headers, body: Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text()); return;
    }
    // No other mutation can reach the live website's API through this preview.
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const upstream = http.request({ hostname: "127.0.0.1", port: 3001, path: req.url, method: req.method, headers: { ...req.headers, host: "127.0.0.1:3001" } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end("Start Next on port 3001."); });
    req.pipe(upstream);
  } catch { res.writeHead(500); res.end("Local preview failed."); }
});
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(3001, "127.0.0.1", () => {
    const headers = { ...req.headers, host: "127.0.0.1:3001" };
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});
server.listen(3003, "127.0.0.1", () => console.log("Mock medical-records preview: http://127.0.0.1:3003/patient-resources/medical-records-release/"));
