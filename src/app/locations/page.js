import { SITE_NAME } from "../lib/config/site";
import LocationFinderPage from "../location/page";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  title: "Find a Location",
  description: `Browse ${SITE_NAME} locations on an interactive map and filter by city, state, or ZIP code.`,
};

export default LocationFinderPage;
