"use client";
// Never preventDefault or wait for tracking before following the original link.
export function trackSearchClick(event, targets = []) {
  try {
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = event.target.closest?.("a[href]");
    if (!link || !event.currentTarget.contains(link)) return;
    const match = targets.find(
      (target) =>
        new URL(target.url, window.location.origin).href === link.href,
    );
    if (!match?.token) return;
    const payload = JSON.stringify({
      id: crypto.randomUUID(),
      token: match.token,
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/ai-search/interactions", blob)) return;
    void fetch("/api/ai-search/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Tracking is best effort and must never interrupt navigation. */
  }
}
