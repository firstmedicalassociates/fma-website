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
    ["25 Crossroads Dr., Suite #412\nOwings Mills, MD 21117", "25 Crossroads Dr Ste 412\nOwings Mills, MD 21117"],
    ["806 W Diamond Ave #110,\nGaithersburg, MD 20878", "806 W Diamond Ave Ste 110\nGaithersburg, MD 20878"],
    ["700 Roeder Rd\nSuite 100 B\nSilver Spring, Maryland 20910\nUS", "700 Roeder Rd Ste 100 B\nSilver Spring, MD 20910"],
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
  assert.equal(formatLocationAddress(location), "7500 Greenway Center Dr Ste 620\nGreenbelt, MD 20770");
  const schema = buildPostalAddressSchema(location);
  assert.equal(schema.addressCountry, "US");
  assert.equal(schema.postalCode, "20770");
  assert.equal(schema.streetAddress, "7500 Greenway Center Dr Ste 620");
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
