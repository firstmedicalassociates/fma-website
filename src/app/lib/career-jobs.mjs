import { parse, NodeType } from "node-html-parser";
import { getAdpApplyUrl, isPublicJob } from "./adp.mjs";

const ALLOWED_TAGS = new Set(["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "br"]);
const DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "form", "input", "button", "textarea", "select", "template"]);
const cleanText = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Rebuild a small, attribute-free subset instead of exposing ADP HTML directly.
export function sanitizeJobDescription(value) {
  if (typeof value !== "string") return "";
  const root = parse(value.slice(0, 200000));
  function render(node) {
    if (node.nodeType === NodeType.TEXT_NODE) return escapeHtml(node.textContent);
    if (node.nodeType !== NodeType.ELEMENT_NODE) return "";
    const tag = node.tagName?.toLowerCase();
    if (DROP_TAGS.has(tag)) return "";
    const children = node.childNodes.map(render).join("");
    if (tag === "br") return "<br>";
    // Posting titles sometimes use h1; page headings already own that level.
    if (tag === "h1") return `<h3>${children}</h3>`;
    if (ALLOWED_TAGS.has(tag)) return `<${tag}>${children}</${tag}>`;
    return children;
  }
  return root.childNodes.map(render).join("").trim();
}

function validPostingDate(value, now, isStart) {
  if (!value) return true;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && (isStart ? timestamp <= now : timestamp > now);
}

export function toPublicCareerJob(requisition, now = Date.now()) {
  if (!isPublicJob(requisition) || !/^[\w-]{1,120}$/.test(requisition.itemID || "")) return null;
  const postings = (Array.isArray(requisition.postingInstructions) ? requisition.postingInstructions : [])
    .filter((posting) => posting?.postingChannel?.externalIndicator === true
      && posting.internalIndicator !== true
      && validPostingDate(posting.postDate, now, true)
      && validPostingDate(posting.expireDate, now, false))
    .sort((a, b) => Number(b.postingChannel.defaultIndicator === true) - Number(a.postingChannel.defaultIndicator === true)
      || Number(b.postingChannel.nameCode?.codeValue === "CC3") - Number(a.postingChannel.nameCode?.codeValue === "CC3"));
  const applyUrl = getAdpApplyUrl({ ...requisition, postingInstructions: postings });
  // A published listing must have an active external destination to apply.
  if (!applyUrl) return null;
  const source = new URL(applyUrl).searchParams.get("source");
  const posting = postings.find((item) => item.postingChannel.nameCode?.codeValue === source);
  const title = cleanText(requisition.job?.jobTitle)
    || cleanText(requisition.job?.jobCode?.longName)
    || cleanText(requisition.job?.jobCode?.shortName);
  if (!title) return null;
  const descriptionHtml = sanitizeJobDescription(posting?.nameCode?.longName);
  const plainDescription = cleanText(parse(descriptionHtml).structuredText);
  const summary = plainDescription.length > 210 ? `${plainDescription.slice(0, 207).trimEnd()}…` : plainDescription;
  const locations = requisition.locationVisibleIndicator === true
    ? (Array.isArray(requisition.requisitionLocations) ? requisition.requisitionLocations : [])
      .map(({ address }) => [cleanText(address?.cityName), cleanText(address?.countrySubdivisionLevel1?.shortName) || cleanText(address?.countrySubdivisionLevel1?.codeValue)]
        .filter(Boolean).join(", ")).filter(Boolean)
    : [];
  return {
    id: requisition.itemID,
    title,
    employmentType: cleanText(requisition.workerTypeCode?.shortName) || cleanText(requisition.workerTypeCode?.longName),
    locations: [...new Set(locations)],
    descriptionHtml,
    summary,
    applyUrl,
    postedAt: posting?.postDate ? new Date(posting.postDate).toISOString() : null,
    expiresAt: posting?.expireDate ? new Date(posting.expireDate).toISOString() : null,
  };
}

export function createCareersFeed({ fetchRequisitions, now = Date.now, cacheMs = 60000, onError = () => {} }) {
  let result;
  let expiresAt = 0;
  let pending;
  return async function getFeed() {
    if (result && now() < expiresAt) return result;
    if (pending) return pending;
    pending = (async () => {
      try {
        const requisitions = await fetchRequisitions();
        const timestamp = now();
        const jobs = requisitions.map((requisition) => toPublicCareerJob(requisition, timestamp))
          .filter(Boolean).sort((a, b) => a.title.localeCompare(b.title));
        result = { status: "ready", jobs };
        // Never cache a posting beyond its advertised closing date.
        expiresAt = Math.min(timestamp + cacheMs, ...jobs.filter((job) => job.expiresAt).map((job) => Date.parse(job.expiresAt)));
      } catch (error) {
        onError(error);
        result = { status: "unavailable", jobs: [] };
        expiresAt = now() + 10000;
      }
      return result;
    })();
    try { return await pending; } finally { pending = undefined; }
  };
}
