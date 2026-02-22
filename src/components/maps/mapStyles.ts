// Dark map style matching the charcoal/gold/cream design system.
// Used with Google Maps `styles` option (legacy raster styling).
export const darkMapStyles: google.maps.MapTypeStyle[] = [
	{ elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#1A1A1A" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#8B6914" }] },
	{
		featureType: "administrative",
		elementType: "geometry.stroke",
		stylers: [{ color: "#333333" }],
	},
	{
		featureType: "administrative.land_parcel",
		elementType: "labels.text.fill",
		stylers: [{ color: "#6B6B6B" }],
	},
	{
		featureType: "landscape",
		elementType: "geometry",
		stylers: [{ color: "#252525" }],
	},
	{
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: "#2D2D2D" }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.fill",
		stylers: [{ color: "#6B6B6B" }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry.fill",
		stylers: [{ color: "#1E3A1E" }],
	},
	{
		featureType: "road",
		elementType: "geometry",
		stylers: [{ color: "#333333" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#2A2A2A" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#3D3D3D" }],
	},
	{
		featureType: "transit",
		elementType: "geometry",
		stylers: [{ color: "#2D2D2D" }],
	},
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#0D1B2A" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#4A6FA5" }],
	},
];

// Default map center (center of continental US)
export const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
export const DEFAULT_ZOOM = 4;
