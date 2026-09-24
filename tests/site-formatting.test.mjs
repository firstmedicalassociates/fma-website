import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPostalAddressSchema,
  formatLocationAddress,
  normalizeStreetAddress,
} from "../src/app/lib/locations.js";
import { normalizeProviderPayload, normalizeProviderCredentialText } from "../src/app/lib/providers.js";
import nextConfig from "../next.config.mjs";

test("legacy address variants keep the suite and produce exactly two lines", () => {
  const examples = [
    ["12800 Middlebrook Road, Suite 400, Germantown, MD 20874, US", "12800 Middlebrook Road Ste 400\nGermantown, MD 20874"],
    ["25 Crossroads Dr., Suite #412\nOwings Mills, MD 21117", "25 Crossroads Drive Ste 412\nOwings Mills, MD 21117"],
    ["806 W Diamond Ave #110,\nGaithersburg, MD 20878", "806 W Diamond Avenue Ste 110\nGaithersburg, MD 20878"],
    ["700 Roeder Rd\nSuite 100 B\nSilver Spring, Maryland 20910\nUS", "700 Roeder Road Ste 100 B\nSilver Spring, MD 20910"],
    ["9841 Broken Land Parkway, STE 115\nColumbia, MD 21046", "9841 Broken Land Parkway Ste 115\nColumbia, MD 21046"],
  ];
  for (const [address, expected] of examples) {
    assert.equal(formatLocationAddress({ address }), expected);
    assert.equal(formatLocationAddress({ displayAddress: expected }), expected);
  }
  assert.equal(normalizeStreetAddress("10 Sterling Road Suite 5"), "10 Sterling Road Ste 5");
});

test("current structured values override legacy text while schema keeps the country", () => {
  const location = {
    displayAddress: "7500 Greenway Center Dr, Ste 620\nGreenbelt, MD 21093\nUS",
    postalCode: "20770",
    addressCountry: "US",
  };
  assert.equal(formatLocationAddress(location), "7500 Greenway Center Drive Ste 620\nGreenbelt, MD 20770");
  const schema = buildPostalAddressSchema(location);
  assert.equal(schema.addressCountry, "US");
  assert.equal(schema.postalCode, "20770");
  assert.equal(schema.streetAddress, "7500 Greenway Center Drive Ste 620");
});

test("street suffixes expand without changing saint names, suites, or directions", () => {
  assert.equal(normalizeStreetAddress("10 Main St., Suite 2"), "10 Main Street Ste 2");
  assert.equal(normalizeStreetAddress("10 Main st NW #2"), "10 Main Street NW Ste 2");
  assert.equal(normalizeStreetAddress("10 St. Charles Dr."), "10 St. Charles Drive");
  assert.equal(normalizeStreetAddress("10 Driveway Street"), "10 Driveway Street");
});

test("location street types are spelled out in display and structured addresses", () => {
  const examples = [
    ["4660 Kenmore Ave Ste 1210", "4660 Kenmore Avenue Ste 1210"],
    ["14300 Gallant Fox Ln Ste 110", "14300 Gallant Fox Lane Ste 110"],
    ["8600 Snowden River Pkwy Ste 207", "8600 Snowden River Parkway Ste 207"],
    ["8100 Sandpiper Cir Ste 308", "8100 Sandpiper Circle Ste 308"],
    ["877 Baltimore Annapolis Blvd. Ste 112", "877 Baltimore Annapolis Boulevard Ste 112"],
    ["2200 Defense HWY Ste 309", "2200 Defense Highway Ste 309"],
  ];
  for (const [streetAddress, expected] of examples) {
    const location = { streetAddress, addressCity: "Example", addressState: "MD", postalCode: "20000" };
    assert.equal(formatLocationAddress(location), `${expected}\nExample, MD 20000`);
    assert.equal(buildPostalAddressSchema(location).streetAddress, expected);
    assert.equal(normalizeStreetAddress(expected), expected);
  }
});

test("provider saves remove periods from all credentials and preserve booking links", () => {
  const input = {
    name: "Example Provider", title: "M.D. , FACP, SFHM", bio: "Example Provider, M.D., practices primary care.",
    linkUrl: "https://pmc-firstmedicalassociates.provider-match.com/book/12345",
  };
  const output = normalizeProviderPayload(input);
  assert.equal(output.title, "MD, FACP, SFHM");
  assert.equal(output.bio, "Example Provider, MD, practices primary care.");
  assert.equal(output.linkUrl, input.linkUrl);
  assert.equal(normalizeProviderPayload({ title: "D.O., Ph.D., PA-C, F.N.P.-B.C., M.B.B.S." }).title, "DO, PhD, PA-C, FNP-BC, MBBS");
});

test("degree formatting in biographies preserves other punctuation", () => {
  assert.equal(
    normalizeProviderCredentialText("Dr. Amit S. Babra, M.D., and Matthew Bruntel, D.O., studied in the U.S. near Washington, D.C."),
    "Dr. Amit S. Babra, MD, and Matthew Bruntel, DO, studied in the U.S. near Washington, D.C."
  );
  assert.equal(normalizeProviderCredentialText("M.B.B.S. from China and a Ph.D.\nin Internal Medicine; B.S. in Biology."), "MBBS from China and a PhD\nin Internal Medicine; BS in Biology.");
  assert.equal(normalizeProviderCredentialText("M.D, D.O, Ph.D"), "MD, DO, PhD");
});

test("careers and its old jobs URL are temporarily redirected before legacy redirects", async () => {
  const redirects = await nextConfig.redirects();
  for (const source of ["/about/careers/:path*", "/jobs/:path*"]) {
    const redirect = redirects.find((entry) => entry.source === source);
    assert.equal(redirect.destination, "/about/");
    assert.equal(redirect.permanent, false);
  }
});
