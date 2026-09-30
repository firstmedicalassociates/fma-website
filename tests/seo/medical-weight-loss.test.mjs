import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import serviceSeedData from "../../prisma/service-seed-data.js";
import locationSeedData from "../../prisma/location-seed-data.js";
import seedMedicalWeightLoss from "../../prisma/seed-medical-weight-loss.js";
import seedOwingsMills from "../../prisma/seed-owings-mills.js";
import serviceAvailability from "../../src/app/lib/service-availability.cjs";
import { getServiceSeoContent } from "../../src/app/lib/seo.js";
import { normalizeServicePageContent } from "../../src/app/lib/services.js";
import { getServiceDetailNavigation } from "../../src/app/lib/service-detail-navigation.js";
import { GENERAL_BOOK_APPOINTMENT_URL } from "../../src/app/lib/config/site.js";

const { MEDICAL_WEIGHT_LOSS_SLUG, SEVERNA_PARK_SLUG, filterServicesForLocation } = serviceAvailability;
const seed = serviceSeedData.find((entry) => entry.slug === MEDICAL_WEIGHT_LOSS_SLUG);
const bookingUrl = `${GENERAL_BOOK_APPOINTMENT_URL}search?location_name=Severna%20Park`;

test("new service provides every CMS section with neutral, location-specific content", () => {
  assert.equal(seed.category, "Specialized Care");
  assert.equal(seed.title, "GLP-1 / Medical Weight Loss Management");
  assert.deepEqual(normalizeServicePageContent(seed.pageContent), seed.pageContent);
  assert.equal(seed.pageContent.features.length, 4);
  assert.equal(seed.pageContent.faqItems.length, 3);
  const content = JSON.stringify(seed);
  assert.match(content, /Severna Park/);
  assert.doesNotMatch(content, /guarantee|promise|rapid|effective|proven|same.day|next.day|semaglutide|tirzepatide|wegovy|ozempic|zepbound|mounjaro|dosage|prescription|insurance|coverage|\bBMI\b|\b\d+%/i);
  const seo = getServiceSeoContent(seed);
  assert.match(seo.title, /Severna Park/);
  assert.doesNotMatch(seo.title, /Treatment in Maryland/);
  assert.match(seo.description, /exclusively.*Severna Park/);
});

test("availability filters global and legacy service entries only outside Severna Park", () => {
  const services = [{ id: "primary", slug: "primary-care" }, { id: "weight", ...seed }];
  for (const location of locationSeedData) {
    const slug = (location.seedRecord?.slug || location.href).replace(/\/+$/, "");
    const eligible = filterServicesForLocation(services, slug);
    assert.ok(eligible.some((service) => service.id === "primary"));
    assert.equal(eligible.some((service) => service.id === "weight"), slug === SEVERNA_PARK_SLUG, slug);
  }
  assert.equal(filterServicesForLocation([{ title: seed.title }], "/location/crofton").length, 0);
  assert.equal(filterServicesForLocation(services, `${SEVERNA_PARK_SLUG}/`).length, 2);
  assert.equal(serviceAvailability.getServiceLocationSlugs("__proto__"), null);
});

test("service navigation uses the office booking link and falls back only to its office page", () => {
  const office = { slug: SEVERNA_PARK_SLUG, title: "Severna Park, MD", bookingUrl };
  const navigation = getServiceDetailNavigation(office);
  assert.equal(navigation.appointmentHref, bookingUrl);
  assert.equal(navigation.secondaryHref, `${SEVERNA_PARK_SLUG}/`);
  assert.equal(navigation.heroSecondaryLabel, "View Severna Park Office");
  assert.doesNotMatch(JSON.stringify(navigation.relatedLinks), /"\/providers\/"|"\/locations\/"|treatment|insurance/i);
  assert.equal(getServiceDetailNavigation({ ...office, bookingUrl: " " }).appointmentHref, `${SEVERNA_PARK_SLUG}/`);
  const existing = getServiceDetailNavigation();
  assert.equal(existing.appointmentHref, GENERAL_BOOK_APPOINTMENT_URL);
  assert.equal(existing.secondaryHref, "/providers/");
  assert.equal(existing.heroSecondaryLabel, "Find a Primary Care Provider");
  assert.equal(existing.relatedLinks.length, 4);
});

test("service discovery never overrides clinical or medication policy questions", () => {
  for (const query of ["GLP1", "GLP-1 / Medical Weight Loss Management", "Does FMA offer weight management?", "Can I book medical weight loss in Crofton?"]) {
    assert.equal(serviceAvailability.isMedicalWeightLossServiceQuery(query), true, query);
  }
  for (const query of ["Does FMA prescribe GLP-1 for weight loss?", "GLP1 insurance coverage", "GLP1 diabetes refills", "Does FMA offer GLP1 injections?", "Where can I get a Wegovy prescription?", "GLP-1 side effects", "GLP1 prior authorization policy", "Annual physicals"]) {
    assert.equal(serviceAvailability.isMedicalWeightLossServiceQuery(query), false, query);
  }
});

function createRegistrationDatabase(includeOffice = true) {
  const services = [{ id: "unrelated", slug: "primary-care", title: "Existing CMS copy", isActive: true }];
  const locations = [
    ...(includeOffice ? [{ id: "severna", slug: SEVERNA_PARK_SLUG, title: "CMS office title", phone: "unchanged", serviceIds: ["unrelated", "unrelated"] }] : []),
    { id: "crofton", slug: "/location/crofton", title: "Other office", serviceIds: ["unrelated", "weight"] },
  ];
  const db = {
    $transaction: async (run) => run(db),
    service: {
      upsert: async ({ where, create, update }) => {
        let service = services.find((entry) => entry.slug === where.slug);
        if (service) Object.assign(service, structuredClone(update));
        else { service = { id: "weight", ...structuredClone(create) }; services.push(service); }
        return { id: service.id, slug: service.slug, title: service.title };
      },
    },
    location: {
      findUnique: async ({ where }) => locations.find((entry) => entry.slug === where.slug) || null,
      findMany: async () => structuredClone(locations),
      update: async ({ where, data }) => Object.assign(locations.find((entry) => entry.id === where.id), structuredClone(data)),
    },
  };
  return { db, services, locations };
}

test("targeted registration is repeatable, repairs misplaced assignments, and preserves unrelated CMS data", async () => {
  const { db, services, locations } = createRegistrationDatabase();
  const unrelatedService = structuredClone(services[0]);
  const first = await seedMedicalWeightLoss(db);
  assert.equal(first.updatedLocationCount, 2);
  assert.deepEqual(locations[0].serviceIds, ["unrelated", "unrelated", "weight"]);
  assert.deepEqual(locations[1].serviceIds, ["unrelated"]);
  assert.equal(locations[0].phone, "unchanged");
  assert.equal(locations[0].title, "CMS office title");
  const second = await seedMedicalWeightLoss(db);
  assert.equal(second.updatedLocationCount, 0);
  assert.equal(services.filter((entry) => entry.slug === MEDICAL_WEIGHT_LOSS_SLUG).length, 1);
  assert.deepEqual(services[0], unrelatedService);
  const missingOffice = createRegistrationDatabase(false);
  await assert.rejects(seedMedicalWeightLoss(missingOffice.db), /Severna Park office must exist/);
  assert.equal(missingOffice.services.length, 1);
});

test("Owings Mills launch seed excludes the restricted service", async () => {
  let savedLocation;
  const tx = {
    service: { findMany: async () => [{ id: "primary", slug: "primary-care" }, { id: "weight", slug: MEDICAL_WEIGHT_LOSS_SLUG }] },
    location: { upsert: async ({ create, update }) => { savedLocation = { ...create, ...update }; return savedLocation; } },
    provider: { findUnique: async () => null, upsert: async ({ create }) => create },
  };
  await seedOwingsMills({ $transaction: async (run) => run(tx) });
  assert.deepEqual(savedLocation.serviceIds, ["primary"]);
});

test("general seed respects availability for both new and existing locations without a live database", async () => {
  const services = serviceSeedData.map((entry, index) => ({ id: `service-${index}`, ...entry, isActive: true }));
  const locations = new Map([
    [SEVERNA_PARK_SLUG, { slug: SEVERNA_PARK_SLUG, serviceIds: [] }],
    ["/location/crofton", { slug: "/location/crofton", serviceIds: services.map((entry) => entry.id) }],
    ["/location/owings-mills", { slug: "/location/owings-mills", serviceIds: [...services.map((entry) => entry.id), "cms-selection"], title: "Preserved CMS title" }],
  ]);
  const db = {
    adminUser: { upsert: async () => ({}) },
    service: {
      findFirst: async ({ where }) => services.find((entry) => entry.slug === where.OR[0].slug),
      update: async ({ where, data }) => Object.assign(services.find((entry) => entry.id === where.id), data),
      findMany: async () => services,
    },
    location: {
      findUnique: async ({ where }) => locations.get(where.slug) || null,
      update: async ({ where, data }) => { const updated = { ...locations.get(where.slug), ...data }; locations.set(where.slug, updated); return updated; },
      create: async ({ data }) => { locations.set(data.slug, data); return data; },
    },
    provider: { findUnique: async () => null, create: async ({ data }) => data, deleteMany: async () => ({ count: 0 }) },
  };
  const seedUrl = new URL("../../prisma/seed.js", import.meta.url);
  const localRequire = createRequire(seedUrl);
  const source = fs.readFileSync(seedUrl, "utf8");
  const context = {
    process: { env: { DATABASE_URL: "postgresql://localhost/test", ADMIN_EMAIL: "test@example.test", ADMIN_PASSWORD: "test-only" } },
    require: (id) => {
      if (id === "dotenv/config") return {};
      if (id === "bcryptjs") return { hash: async () => "test-only" };
      if (id === "@neondatabase/serverless") return { neonConfig: {} };
      if (id === "@prisma/client") return { PrismaClient: class { constructor() { return db; } } };
      if (id === "@prisma/adapter-neon") return { PrismaNeon: class {} };
      if (id === "ws") return class {};
      return localRequire(id);
    },
  };
  vm.runInNewContext(`${source.slice(0, source.lastIndexOf("\nmain()"))}\nglobalThis.seedRun = main();`, context);
  await context.seedRun;
  const weightId = services.find((entry) => entry.slug === MEDICAL_WEIGHT_LOSS_SLUG).id;
  assert.ok(locations.get(SEVERNA_PARK_SLUG).serviceIds.includes(weightId));
  for (const [slug, location] of locations) {
    if (slug !== SEVERNA_PARK_SLUG) assert.ok(!location.serviceIds.includes(weightId), slug);
  }
  assert.equal(locations.get("/location/owings-mills").title, "Preserved CMS title");
  assert.ok(locations.get("/location/owings-mills").serviceIds.includes("cms-selection"));
});

test("targeted search indexing refreshes only the selected service and never prunes other embeddings", async () => {
  const indexUrl = new URL("../../scripts/index-embeddings.js", import.meta.url);
  const localRequire = createRequire(indexUrl);
  const source = fs.readFileSync(indexUrl, "utf8");
  const queries = [];
  let metadataUpdates = 0;
  const db = {
    service: { findMany: async ({ where }) => { queries.push(where); return [{ id: "weight", ...seed }]; } },
    $queryRawUnsafe: async () => { metadataUpdates += 1; return [{ id: "service-weight" }]; },
    $disconnect: async () => {},
    // The broad indexing paths must not run during a targeted refresh.
    location: { findMany: async () => { throw new Error("Unexpected location indexing"); } },
    provider: { findMany: async () => { throw new Error("Unexpected provider indexing"); } },
    blogPost: { findMany: async () => { throw new Error("Unexpected blog indexing"); } },
    searchEmbedding: {
      count: async () => 188,
      findMany: async () => { throw new Error("Unexpected pruning of other embeddings"); },
    },
  };
  const makeContext = (selectedSlug) => ({
    __dirname: new URL("../../scripts/", import.meta.url).pathname,
    process: { env: { DATABASE_URL: "postgresql://localhost/test", OPENAI_API_KEY: "test-only" } },
    console: { log: () => {}, error: () => {} },
    require: (id) => {
      if (id === "node:util") return { parseArgs: () => ({ values: { "service-slug": selectedSlug } }) };
      if (id === "dotenv") return { config: () => {} };
      if (id === "@prisma/client") return { PrismaClient: class { constructor() { return db; } } };
      if (id === "@prisma/adapter-neon") return { PrismaNeon: class {} };
      if (id === "@neondatabase/serverless") return { neonConfig: {} };
      if (id === "openai") return { OpenAI: class {} };
      if (id === "ws") return class {};
      return localRequire(id);
    },
  });
  const context = makeContext(MEDICAL_WEIGHT_LOSS_SLUG);
  const isolatedSource = `${source.slice(0, source.lastIndexOf("\nmain();"))}\nglobalThis.indexRun = main();`;
  vm.runInNewContext(isolatedSource, context);
  await context.indexRun;
  assert.equal(context.process.exitCode, undefined);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].slug, MEDICAL_WEIGHT_LOSS_SLUG);
  assert.equal(queries[0].isActive, true);
  assert.equal(metadataUpdates, 1);
  assert.throws(() => vm.runInNewContext(isolatedSource, makeContext(" ")), /non-empty service slug/);
});
