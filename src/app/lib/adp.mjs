// Node.js server/CLI only: ADP requires OAuth client credentials AND mutual TLS.
import https from "node:https";
import { readFileSync } from "node:fs";
import { X509Certificate, createPrivateKey } from "node:crypto";

const TOKEN_URL = "https://accounts.adp.com/auth/oauth/v2/token";
const JOBS_URL = "https://api.adp.com/staffing/v1/job-requisitions";
const PAGE_SIZE = 20;

export class AdpError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AdpError";
    this.status = status;
  }
}

export function readAdpConfig(env = process.env) {
  const names = ["ADP_CLIENT_ID", "ADP_CLIENT_SECRET"];
  const missing = names.filter((name) => !env[name]?.trim());
  if (!env.ADP_CERT_PEM?.trim() && !env.ADP_CERT_PATH?.trim()) missing.push("ADP_CERT_PEM or ADP_CERT_PATH");
  if (!env.ADP_KEY_PEM?.trim() && !env.ADP_KEY_PATH?.trim()) missing.push("ADP_KEY_PEM or ADP_KEY_PATH");
  if (missing.length) {
    throw new AdpError(
      `Missing ${missing.join(", ")}. ADP_API_KEY alone cannot authenticate ADP. See docs/adp-job-requisitions.md.`,
    );
  }
  let cert, key;
  try {
    // Hosting services can supply PEM secrets directly, without bundling private files.
    cert = env.ADP_CERT_PEM?.trim()
      ? Buffer.from(env.ADP_CERT_PEM.trim().replace(/\\n/g, "\n"))
      : readFileSync(env.ADP_CERT_PATH.trim());
    key = env.ADP_KEY_PEM?.trim()
      ? Buffer.from(env.ADP_KEY_PEM.trim().replace(/\\n/g, "\n"))
      : readFileSync(env.ADP_KEY_PATH.trim());
  } catch {
    throw new AdpError("Cannot read ADP_CERT_PATH or ADP_KEY_PATH. Use paths to your ADP certificate and matching private key.");
  }
  let certificate, privateKey;
  try {
    certificate = new X509Certificate(cert);
    privateKey = createPrivateKey({ key, passphrase: env.ADP_KEY_PASSPHRASE || undefined });
  } catch {
    throw new AdpError("Cannot parse the ADP certificate/private key. Check the complete PEM contents and ADP_KEY_PASSPHRASE if the key is encrypted.");
  }
  if (!certificate.checkPrivateKey(privateKey)) {
    throw new AdpError("ADP private key does not match the certificate. Use the key saved when this certificate was requested.");
  }
  return {
    clientId: env.ADP_CLIENT_ID.trim(),
    clientSecret: env.ADP_CLIENT_SECRET.trim(),
    cert,
    key,
    passphrase: env.ADP_KEY_PASSPHRASE || undefined,
  };
}

// Never expose upstream response bodies or request options: they may contain secrets or HR data.
function requestJson(url, { method = "GET", headers = {}, body, agent }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method,
      agent,
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(20000),
    }, (res) => {
      const status = res.statusCode;
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new AdpError(`ADP returned HTTP ${status}.`, status));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > 10 * 1024 * 1024) {
          req.destroy();
          reject(new AdpError("ADP response exceeded the size limit."));
        } else {
          chunks.push(chunk);
        }
      });
      res.on("error", () => reject(new AdpError("ADP response was interrupted.")));
      res.on("end", () => {
        if (status === 204) return resolve(null);
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(new AdpError("ADP returned an invalid JSON response."));
        }
      });
    });
    req.on("error", () => reject(new AdpError("ADP connection failed. Check network access, certificate validity, and the matching private key/passphrase.")));
    req.end(body);
  });
}

export function isPublicJob(requisition) {
  return requisition?.requisitionStatusCode?.codeValue === "ON"
    && requisition.externalIndicator === true
    && requisition.visibleToJobSeekerIndicator === true;
}

export function getAdpApplyUrl(requisition) {
  if (!isPublicJob(requisition)) return null;
  const channels = (Array.isArray(requisition.postingInstructions) ? requisition.postingInstructions : [])
    .map((instruction) => instruction.postingChannel)
    .filter((channel) => channel?.externalIndicator === true)
    .sort((a, b) => Number(b.defaultIndicator === true) - Number(a.defaultIndicator === true)
      || Number(b.nameCode?.codeValue === "CC3") - Number(a.nameCode?.codeValue === "CC3"));
  const links = Array.isArray(requisition.links) ? requisition.links : [];
  for (const channel of channels) {
    const source = channel.nameCode?.codeValue;
    if (typeof source !== "string" || !source) continue;
    for (const candidate of [channel.internetAddress?.uri, ...links.map((link) => link.href)]) {
      try {
        const url = new URL(candidate);
        if (url.protocol === "https:" && !url.username && !url.password
          && (url.hostname === "adp.com" || url.hostname.endsWith(".adp.com"))
          && url.searchParams.get("source") === source) return url.href;
      } catch { /* Missing or invalid links do not qualify as application links. */ }
    }
  }
  return null;
}

export function createAdpClient(config, { request = requestJson, now = Date.now } = {}) {
  const agent = new https.Agent({
    cert: config.cert,
    key: config.key,
    passphrase: config.passphrase,
    rejectUnauthorized: true,
    keepAlive: true,
  });
  let token;
  let expiresAt = 0;
  let pendingToken;

  async function accessToken() {
    if (token && now() < expiresAt) return token;
    if (pendingToken) return pendingToken;
    pendingToken = (async () => {
      const data = await request(TOKEN_URL, {
        method: "POST",
        agent,
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      });
      const lifetime = Number(data?.expires_in);
      if (typeof data?.access_token !== "string" || !data.access_token || !Number.isFinite(lifetime) || lifetime <= 0) {
        throw new AdpError("ADP returned an invalid token response.");
      }
      token = data.access_token;
      expiresAt = now() + Math.max(0, lifetime - 60) * 1000;
      return token;
    })();
    try {
      return await pendingToken;
    } finally {
      pendingToken = undefined;
    }
  }

  async function page(url, retry = true) {
    const bearer = await accessToken();
    try {
      return await request(url, { agent, headers: { Authorization: `Bearer ${bearer}` } });
    } catch (error) {
      if (error.status === 401 && retry) {
        if (token === bearer) { token = undefined; expiresAt = 0; }
        return page(url, false);
      }
      throw error;
    }
  }

  return {
    // Full records remain server-side; the CLI below prints only a small field allowlist.
    async getPublicJobRequisitions() {
      const jobs = [];
      const seen = new Set();
      for (let skip = 0; skip < 20000; skip += PAGE_SIZE) {
        const url = new URL(JOBS_URL);
        url.searchParams.set("$top", String(PAGE_SIZE));
        url.searchParams.set("$skip", String(skip));
        // ADP's combined boolean filters omitted four published jobs in live testing.
        // Fetch all open requisitions, then enforce public visibility locally below.
        url.searchParams.set("$filter", "requisitionStatusCode/codeValue eq ON");
        const data = await page(url);
        if (data === null) return jobs; // HTTP 204
        if (!Array.isArray(data?.jobRequisitions)) throw new AdpError("ADP returned an unexpected job requisitions response.");
        const rows = data.jobRequisitions;
        let added = 0;
        for (const row of rows) {
          if (typeof row?.itemID !== "string" || !row.itemID) throw new AdpError("ADP returned a requisition without an itemID.");
          if (seen.has(row.itemID)) continue;
          seen.add(row.itemID);
          added++;
          // Also filter locally, so ignored upstream filters cannot expose internal vacancies.
          if (isPublicJob(row)) jobs.push(row);
        }
        if (rows.length < PAGE_SIZE) return jobs;
        if (!added) throw new AdpError("ADP repeated a page. Stopped to avoid returning an incomplete job list.");
        // ADP can return 404 when paging past the end of an exact multiple of 20.
        const total = data.meta?.totalNumber;
        if (Number.isInteger(total) && total >= 0 && seen.size >= total) return jobs;
      }
      throw new AdpError("ADP pagination exceeded the limit; job retrieval is incomplete.");
    },
    close() { agent.destroy(); },
  };
}
