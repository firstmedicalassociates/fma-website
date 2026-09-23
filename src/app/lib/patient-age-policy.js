// Confirmed in FMA's September 23, 2026 Asana content corrections.
export const PATIENT_AGE_POLICY =
  "First Medical Associates sees and treats adults ages 18 and older. We do not provide pediatric care or treat patients under 18.";

export function isPatientAgeQuestion(value = "") {
  const query = String(value).toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, " ").trim();
  return /\b(children|child|kids?|minors?|pediatrics?|paediatrics?|teens?|teenagers?|toddlers?|infants?|babies|all ages|whole family|entire family|minimum patient age|minimum age|patient ages?|what ages|which ages|age requirement|age limit|adults only|under 18|under eighteen)\b/.test(query) ||
    /\b(?:[0-9]|1[0-7]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen) year olds?\b|\bhow old (?:do|does|must)\b|\b18 (?:and |or )?(?:older|over|plus)\b/.test(query);
}
