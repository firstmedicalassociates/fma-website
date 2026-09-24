// Completed public-page content for the Owings Mills office.
const location = {
  slug: "/location/owings-mills",
  title: "Owings Mills, MD",
  eyebrow: null,
  accent: "Primary care in Owings Mills, MD",
  intro:
    "Visit our Owings Mills, MD location for primary care appointments and office information.",
  isComingSoon: false,
  openingDateLabel: null,
  address: "25 Crossroads Dr Ste 412, Owings Mills, MD 21117",
  streetAddress: "25 Crossroads Dr Ste 412",
  addressCity: "Owings Mills",
  addressState: "MD",
  postalCode: "21117",
  addressCountry: "US",
  displayAddress: "25 Crossroads Dr Ste 412\nOwings Mills, MD 21117",
  phone: "443-652-1165",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=25%20Crossroads%20Dr.%2C%20Suite%20%23412%2C%20Owings%20Mills%2C%20MD%2021117",
  bookingUrl: "https://pmc-firstmedicalassociates.provider-match.com/search?location_name=Owings%20Mills",
  mapImageUrl: "/assets/locations/owings-mills-crossroads.avif",
  mapImageAlt:
    "Exterior of the building at 25 Crossroads Drive in Owings Mills, Maryland",
  officeHours: [
    { day: "Sunday", closed: true },
    ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
      (day) => ({ day, startTime: "08:00", endTime: "17:00" }),
    ),
    { day: "Saturday", closed: true },
  ],
  infoSections: [
    {
      key: "same-day-clinic",
      title: "Same-Day Appointments in Owings Mills, MD",
      paragraphs: [
        "When a non-emergency illness or health concern cannot wait, First Medical Associates in Owings Mills offers same-day appointment options designed to help patients receive timely medical guidance.",
        "Our Owings Mills care team evaluates new symptoms, minor injuries, and other time-sensitive concerns while keeping each patient's broader health history and ongoing primary care plan in mind.",
        "Same-day availability may vary. Patients can contact the Owings Mills office or use our online scheduling options to request an appointment.",
      ],
    },
    {
      key: "family-doctor",
      title: "Family Doctor in Owings Mills, MD",
      paragraphs: [
        "A dependable family doctor provides a consistent place to address preventive care, routine wellness needs, new symptoms, and long-term health concerns. At First Medical Associates in Owings Mills, we take time to understand each patient's history, priorities, and goals.",
        "Our patient-centered approach supports continuity of care through different stages of life. Regular visits help patients stay current with screenings, review medications, and identify changes in their health early.",
        "By building an ongoing relationship with the Owings Mills care team, patients have a trusted partner for coordinating treatment, referrals, and follow-up care when needed.",
      ],
    },
    {
      key: "doctors",
      title: "Doctors in Owings Mills, MD",
      paragraphs: [
        "Jacob Scott, MD provides primary care at our Owings Mills location with a focus on thoughtful evaluation, clear communication, and care tailored to the individual.",
        "Patients can visit the Owings Mills office for preventive visits, evaluation of common illnesses, and ongoing support for chronic health conditions.",
        "Our clinicians work within the broader First Medical Associates network to help coordinate testing, referrals, and follow-up care so patients can keep their next steps organized.",
      ],
    },
    {
      key: "primary-care",
      title: "Primary Care in Owings Mills, MD",
      paragraphs: [
        "Primary care provides a foundation for protecting your health and addressing concerns early. Our Owings Mills services include routine checkups, preventive visits, health screenings, chronic condition support, and evaluation of common illnesses.",
        "First Medical Associates is committed to accessible, personalized care for patients in Owings Mills and nearby Baltimore County communities. We work with each patient to develop practical care plans that reflect their needs.",
      ],
    },
    {
      key: "geriatric-care",
      title: "Geriatric Care in Owings Mills, MD",
      paragraphs: [
        "Older adults often benefit from primary care that considers medications, mobility, preventive needs, chronic conditions, and personal goals together. Our Owings Mills team provides attentive care designed to support health, independence, and quality of life.",
        "We collaborate with patients, families, caregivers, and specialists when appropriate, helping make complex care plans easier to understand and manage as needs evolve.",
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
  bio: "Dr. Jacob Scott is a board-certified Family Medicine physician dedicated to helping patients achieve optimal health through personalized, comprehensive care.\n\nHe earned a Bachelor of Science in Exercise Science from Salisbury University before obtaining his Doctor of Medicine from Trinity School of Medicine. Dr. Scott completed residency training in Family Medicine at St. Francis Hospital in Wilmington, Delaware.\n\nDr. Scott offers full scope adult family medicine, centering on preventative medicine, chronic disease management, patient empowerment and lifestyle interventions.\n\nOutside the clinic, he enjoys time with his wife and daughter, outdoor activities, and is a passionate fan of the Baltimore Ravens and Orioles.",
  imageUrl: "",
  imageAlt: "Jacob Scott, MD",
  linkUrl: "https://pmc-firstmedicalassociates.provider-match.com/book/7367823",
  locations: [location.slug],
  languages: [],
  isActive: true,
};
module.exports = { location, provider };
