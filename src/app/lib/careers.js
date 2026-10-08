import "server-only";
import { cache } from "react";
import { createAdpClient, readAdpConfig } from "./adp.mjs";
import { createCareersFeed } from "./career-jobs.mjs";

let client;
const getFeed = createCareersFeed({
  fetchRequisitions: () => {
    client ||= createAdpClient(readAdpConfig());
    return client.getPublicJobRequisitions();
  },
  onError: (error) => console.warn("ADP careers feed unavailable", { status: Number(error?.status) || 0 }),
});

export const getCareers = cache(getFeed);
