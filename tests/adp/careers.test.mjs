import test from "node:test";
import assert from "node:assert/strict";
import { createCareersFeed, sanitizeJobDescription, toPublicCareerJob } from "../../src/app/lib/career-jobs.mjs";

const now = Date.parse("2026-10-08T20:00:00Z");
const applyUrl = "https://workforcenow.adp.com/jobs?jobId=123&source=CC2";
function requisition(overrides = {}) {
  return {
    itemID: "123_1", requisitionStatusCode: { codeValue: "ON" },
    externalIndicator: true, visibleToJobSeekerIndicator: true,
    job: { jobTitle: "Medical Assistant" }, workerTypeCode: { shortName: "Full Time" },
    locationVisibleIndicator: false,
    requisitionLocations: [{ address: { cityName: "Rockville", countrySubdivisionLevel1: { codeValue: "MD" } } }],
    hiringManager: { email: "private@example.org" }, compensation: { amount: 12345 },
    postingInstructions: [{
      internalIndicator: false,
      postDate: "2026-08-16T00:58:05.000+0000", expireDate: "2027-01-01T04:59:59.000+0000",
      nameCode: { longName: "<p><strong>Qualifications</strong></p><p>2&ndash;5 years of experience.</p>" },
      postingChannel: { externalIndicator: true, defaultIndicator: true, nameCode: { codeValue: "CC2" }, internetAddress: { uri: applyUrl } },
    }],
    ...overrides,
  };
}

test("publishes only job fields, honors location privacy, and preserves public description formatting", () => {
  const source = requisition();
  const job = toPublicCareerJob(source, now);
  assert.equal(job.title, "Medical Assistant");
  assert.equal(job.employmentType, "Full Time");
  assert.equal(job.applyUrl, applyUrl);
  assert.equal(job.postedAt, "2026-08-16T00:58:05.000Z");
  assert.match(job.descriptionHtml, /<strong>Qualifications<\/strong>/);
  assert.match(job.summary, /2–5 years/);
  assert.deepEqual(job.locations, []);
  assert.doesNotMatch(JSON.stringify(job), /hiringManager|private@example|compensation|12345/);
  assert.deepEqual(toPublicCareerJob({ ...source, locationVisibleIndicator: true }, now).locations, ["Rockville, MD"]);
});

test("excludes closed, internal, hidden, unlinked, future, and expired postings", () => {
  for (const overrides of [
    { requisitionStatusCode: { codeValue: "CD" } }, { externalIndicator: false },
    { visibleToJobSeekerIndicator: false }, { itemID: "../../invalid" },
    { job: {} }, { postingInstructions: [] },
  ]) assert.equal(toPublicCareerJob(requisition(overrides), now), null);
  for (const changes of [
    { internalIndicator: true }, { postDate: "2026-10-09T00:00:00Z" },
    { expireDate: new Date(now).toISOString() }, { expireDate: "invalid" },
    { postingChannel: { externalIndicator: false } },
    { postingChannel: { externalIndicator: true, nameCode: { codeValue: "CC2" }, internetAddress: { uri: "https://example.org/?source=CC2" } } },
  ]) {
    const source = requisition();
    Object.assign(source.postingInstructions[0], changes);
    assert.equal(toPublicCareerJob(source, now), null);
  }
});

test("description and application destination come from the same active external channel", () => {
  const source = requisition();
  source.postingInstructions.unshift({
    internalIndicator: true, nameCode: { longName: "Private internal description" },
    postingChannel: { externalIndicator: false, defaultIndicator: true, nameCode: { codeValue: "CC1" } },
  });
  const job = toPublicCareerJob(source, now);
  assert.equal(job.applyUrl, applyUrl);
  assert.doesNotMatch(job.descriptionHtml, /Private/);
});

test("description sanitizer removes executable content and attributes but retains readable text and lists", () => {
  const html = sanitizeJobDescription('<h1 onclick="alert(1)">Role</h1><script>alert(1)</script><style>body{display:none}</style><iframe src="evil"></iframe><svg onload="alert(1)"><text>hidden</text></svg><p style="color:red">Care &amp; support <a href="javascript:alert(1)">patients</a><img src="x" onerror="alert(1)"></p><ul><li>Experience &lt; 5 years</li></ul><!--private--><p>&lt;script&gt;inert&lt;/script&gt;</p>');
  assert.equal(html, '<h3>Role</h3><p>Care &amp; support patients</p><ul><li>Experience &lt; 5 years</li></ul><p>&lt;script&gt;inert&lt;/script&gt;</p>');
  assert.equal(sanitizeJobDescription(null), "");
});

test("concurrent page requests share a retrieval and refresh after the cache window", async () => {
  let time = now, calls = 0;
  const feed = createCareersFeed({ now: () => time, fetchRequisitions: async () => { calls++; return [requisition()]; } });
  const [list, detail] = await Promise.all([feed(), feed()]);
  assert.equal(list, detail);
  assert.equal(calls, 1);
  assert.equal((await feed()).jobs.length, 1);
  time += 60001;
  await feed();
  assert.equal(calls, 2);
});

test("a posting disappears when it expires even within the normal cache window", async () => {
  let time = now;
  const source = requisition();
  source.postingInstructions[0].expireDate = new Date(now + 1000).toISOString();
  const feed = createCareersFeed({ now: () => time, fetchRequisitions: async () => [source] });
  assert.equal((await feed()).jobs.length, 1);
  time += 1000;
  assert.deepEqual(await feed(), { status: "ready", jobs: [] });
});

test("ADP outages are distinguished from empty results, do not serve stale jobs, and recover", async () => {
  let time = now, fail = false;
  const feed = createCareersFeed({ now: () => time, fetchRequisitions: async () => {
    if (fail) throw new Error("upstream-private-data");
    return [requisition()];
  } });
  assert.equal((await feed()).jobs.length, 1);
  time += 60001;
  fail = true;
  assert.deepEqual(await feed(), { status: "unavailable", jobs: [] });
  fail = false;
  time += 10001;
  assert.equal((await feed()).jobs.length, 1);
});
