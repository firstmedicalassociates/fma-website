function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function renderElements(elements = []) {
  return elements
    .map((element) => {
      const content = escapeHtml(element.content || "");
      if (element.type === "h2") return `<h2>${content}</h2>`;
      if (element.type === "p") return `<p>${content}</p>`;
      if (element.type === "ul") {
        const items = content
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `<li>${item}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return "";
    })
    .join("");
}

export function buildContentHtml({
  title,
  header,
  featuredImageUrl,
  featuredImageAlt,
  footer,
  sections,
}) {
  const imageHtml = featuredImageUrl
    ? `<img src="${escapeHtml(featuredImageUrl)}" alt="${escapeHtml(featuredImageAlt || title)}" />`
    : "";
  const headerHtml = `<header><h1>${escapeHtml(header)}</h1></header>`;
  const body = sections
    .map((section) => `<section>${renderElements(section.elements || [])}</section>`)
    .join("");
  const footerHtml = `<footer><p>${escapeHtml(footer)}</p></footer>`;
  return `<article>${imageHtml}${headerHtml}${body}${footerHtml}</article>`;
}

function parseSectionElements(sectionHtml, sectionIndex) {
  return Array.from(sectionHtml.matchAll(/<(h2|p|ul)>([\s\S]*?)<\/\1>/gi)).map(
    ([, type, innerHtml], elementIndex) => {
      const content =
        type === "ul"
          ? Array.from(innerHtml.matchAll(/<li>([\s\S]*?)<\/li>/gi))
              .map(([, item]) => decodeHtml(item).trim())
              .filter(Boolean)
              .join("\n")
          : decodeHtml(innerHtml).trim();

      return {
        id: `parsed-${sectionIndex + 1}-${elementIndex + 1}`,
        type,
        content,
      };
    }
  );
}

export function parseContentHtml(contentHtml = "") {
  const html = String(contentHtml || "");
  const header =
    decodeHtml(html.match(/<header>\s*<h1>([\s\S]*?)<\/h1>\s*<\/header>/i)?.[1] || "").trim();
  const footer =
    decodeHtml(html.match(/<footer>\s*<p>([\s\S]*?)<\/p>\s*<\/footer>/i)?.[1] || "").trim();
  const sections = Array.from(html.matchAll(/<section>([\s\S]*?)<\/section>/gi)).map(
    ([, sectionHtml], sectionIndex) => ({
      id: `parsed-section-${sectionIndex + 1}`,
      elements: parseSectionElements(sectionHtml, sectionIndex),
    })
  );

  return { header, footer, sections };
}
