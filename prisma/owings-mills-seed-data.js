// Only details supplied for the upcoming office. Unknown fields stay empty.
const location = {
  slug: "/location/owings-mills",
  title: "Owings Mills, MD",
  eyebrow: "Coming soon",
  accent: "Coming soon to Owings Mills",
  intro:
    "Our Owings Mills office is coming soon. Jacob Scott, MD is the planned provider. Booking information will be added when available.",
  isComingSoon: true,
  openingDateLabel: "October 5",
  address: "25 Crossroads Dr., Suite #412, Owings Mills, MD 21117",
  streetAddress: "25 Crossroads Dr., Suite #412",
  addressCity: "Owings Mills",
  addressState: "MD",
  postalCode: "21117",
  addressCountry: "US",
  displayAddress: "25 Crossroads Dr., Suite #412\nOwings Mills, MD 21117",
  phone: "443-652-1165",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=25%20Crossroads%20Dr.%2C%20Suite%20%23412%2C%20Owings%20Mills%2C%20MD%2021117",
  bookingUrl: null,
  mapImageUrl: "/assets/locations/owings-mills-crossroads.avif",
  mapImageAlt:
    "Exterior of the building at 25 Crossroads Drive in Owings Mills, Maryland",
  officeHours: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
    (day) => ({ day, startTime: "08:00", endTime: "17:00" }),
  ),
  infoSections: [
    {
      key: "planned-provider",
      title: "Planned provider",
      paragraphs: [
        "Jacob Scott, MD. Additional provider details will be added when available.",
      ],
    },
  ],
  serviceIds: [],
  services: [],
};
const provider = {
  slug: "jacob-scott",
  name: "Jacob Scott",
  title: "MD",
  bio: "Planned provider for the upcoming Owings Mills office. Additional details coming soon.",
  imageUrl: "",
  imageAlt: "",
  linkUrl: null,
  locations: [location.slug],
  languages: [],
  // Keep out of live scheduling until provider details and launch are confirmed.
  isActive: false,
};
module.exports = { location, provider };
