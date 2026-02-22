"use client";

import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { darkMapStyles } from "./mapStyles";
import { hasGoogleMapsKey } from "./GoogleMapsProvider";

interface ProfileLocationMapProps {
	latitude: number;
	longitude: number;
	name: string;
}

export default function ProfileLocationMap({
	latitude,
	longitude,
	name,
}: ProfileLocationMapProps) {
	if (!hasGoogleMapsKey()) return null;

	return (
		<div className="h-48 overflow-hidden rounded-lg border border-gold-dark/20">
			<Map
				defaultCenter={{ lat: latitude, lng: longitude }}
				defaultZoom={10}
				mapId="profile-location-map"
				styles={darkMapStyles}
				disableDefaultUI={true}
				zoomControl={false}
				draggable={false}
				clickableIcons={false}
				gestureHandling="none"
			>
				<AdvancedMarker
					position={{ lat: latitude, lng: longitude }}
					title={name}
				>
					<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gold bg-charcoal">
						<div className="h-2 w-2 rounded-full bg-gold" />
					</div>
				</AdvancedMarker>
			</Map>
		</div>
	);
}
