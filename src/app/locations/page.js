import LocationFinderPage, { locationFinderMetadata } from "../location/location-finder-page";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = locationFinderMetadata;

export default LocationFinderPage;
