import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";
import { createMedicalRecordsHandler } from "../../lib/medical-records-handler.mjs";
import { buildCompletedMedicalRecordsPdf } from "../../lib/medical-records-pdf.mjs";
import { sendMedicalRecordsEmail } from "../../lib/medical-records-email.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = createMedicalRecordsHandler({
  buildPdf: buildCompletedMedicalRecordsPdf,
  async checkLimit(request) {
    const limit = await checkRateLimit(getRateLimitIdentity(request, "api-medical-records-release"), {
      windowMs: 10 * 60 * 1000, max: 5, requireShared: process.env.NODE_ENV === "production",
    });
    return limit.ok ? null : { unavailable: limit.unavailable, headers: getRateLimitHeaders(limit) };
  },
  send: sendMedicalRecordsEmail,
});
