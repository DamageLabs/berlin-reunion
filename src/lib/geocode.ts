const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface GeocodeResult {
	latitude: number;
	longitude: number;
}

/**
 * Geocode a location string to lat/lng using Google Geocoding API.
 * Returns null if the API key is missing or geocoding fails.
 */
export async function geocodeLocation(
	location: string,
): Promise<GeocodeResult | null> {
	if (!API_KEY || !location.trim()) return null;

	try {
		const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
		url.searchParams.set("address", location);
		url.searchParams.set("key", API_KEY);

		const res = await fetch(url.toString());
		if (!res.ok) return null;

		const data = await res.json();
		if (data.status !== "OK" || !data.results?.length) return null;

		const { lat, lng } = data.results[0].geometry.location;
		return { latitude: lat, longitude: lng };
	} catch {
		return null;
	}
}
