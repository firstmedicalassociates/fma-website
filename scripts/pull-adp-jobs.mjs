import "dotenv/config";
import { AdpError, createAdpClient, getAdpApplyUrl, readAdpConfig } from "../src/app/lib/adp.mjs";

let client;
try {
  client = createAdpClient(readAdpConfig());
  const requisitions = await client.getPublicJobRequisitions();
  const jobs = requisitions.map((job) => ({
    id: job.itemID,
    title: job.job?.jobTitle || job.job?.jobCode?.shortName || "Untitled position",
    applyUrl: getAdpApplyUrl(job),
    locations: (Array.isArray(job.requisitionLocations) ? job.requisitionLocations : [])
      .map(({ address }) => [address?.cityName, address?.countrySubdivisionLevel1?.codeValue]
        .filter(Boolean).join(", "))
      .filter(Boolean),
  }));
  console.log(JSON.stringify({ count: jobs.length, jobs }, null, 2));
} catch (error) {
  console.error(error instanceof AdpError ? error.message : "ADP job retrieval failed. Check your configuration.");
  if (error.status === 401) console.error("Verify the project's client ID/secret and ADP-issued certificate.");
  if (error.status === 403) console.error("Enable Job Requisitions read access in API Central and verify company consent/access permissions.");
  if (error.status === 429) console.error("ADP rate limit reached. Wait before trying again.");
  process.exitCode = 1;
} finally {
  client?.close();
}
