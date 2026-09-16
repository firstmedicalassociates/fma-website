import crypto from "node:crypto";
export async function loadReportedCosts(
  { from, to },
  {
    db,
    apiKey = process.env.OPENAI_ADMIN_KEY,
    projectId = process.env.OPENAI_PROJECT_ID,
    fetcher = fetch,
    now = new Date(),
  } = {},
) {
  if (!apiKey?.trim() || !projectId?.trim())
    return { configured: false, available: false };
  const id = crypto
    .createHash("sha256")
    .update(`${projectId}:${from}:${to}`)
    .digest("hex");
  const cached = await db.openAiCostSnapshot.findUnique({ where: { id } });
  if (cached && now - cached.refreshedAt < 3600000)
    return {
      configured: true,
      available: true,
      ...cached.data,
      refreshedAt: cached.refreshedAt,
      stale: false,
    };
  try {
    const buckets = [];
    let page;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      do {
        const params = new URLSearchParams({
          start_time: String(Math.floor(new Date(from).getTime() / 1000)),
          end_time: String(Math.floor(new Date(to).getTime() / 1000)),
          bucket_width: "1d",
          limit: "180",
          "project_ids[]": projectId,
          "group_by[]": "line_item",
        });
        if (page) params.set("page", page);
        const response = await fetcher(
          `https://api.openai.com/v1/organization/costs?${params}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok)
          throw new Error(
            response.status === 401 || response.status === 403
              ? "The billing key cannot access project costs."
              : "OpenAI cost reporting is temporarily unavailable.",
          );
        const result = await response.json();
        if (!Array.isArray(result.data))
          throw new Error("OpenAI returned an unexpected cost report.");
        buckets.push(...result.data);
        const next = result.has_more ? result.next_page : null;
        if (next && next === page)
          throw new Error("OpenAI returned an incomplete cost report.");
        page = next;
        if (buckets.length > 550)
          throw new Error("OpenAI returned too many cost buckets.");
      } while (page);
    } finally {
      clearTimeout(timeout);
    }
    const data = {
      projectId,
      currency: "usd",
      daily: buckets.map((bucket) => ({
        date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10),
        amount: bucket.results.reduce(
          (total, item) =>
            total +
            (item.amount?.currency === "usd"
              ? Number(item.amount.value) || 0
              : 0),
          0,
        ),
      })),
    };
    data.total = data.daily.reduce((total, item) => total + item.amount, 0);
    await db.openAiCostSnapshot.upsert({
      where: { id },
      create: { id, projectId, data, refreshedAt: now },
      update: { data, refreshedAt: now },
    });
    return {
      configured: true,
      available: true,
      ...data,
      refreshedAt: now,
      stale: false,
    };
  } catch (error) {
    return {
      configured: true,
      available: Boolean(cached),
      ...(cached?.data || {}),
      refreshedAt: cached?.refreshedAt || null,
      stale: true,
      error:
        error.name === "AbortError"
          ? "OpenAI cost reporting timed out. Try again later."
          : error.message,
    };
  }
}
