"use client";

import { useCallback, useEffect, useRef } from "react";
import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import MemberMapPin, { type MapMember } from "./MemberMapPin";
import { darkMapStyles, DEFAULT_CENTER, DEFAULT_ZOOM } from "./mapStyles";

interface MemberMapProps {
	members: MapMember[];
}

function ClusteredMap({ members }: MemberMapProps) {
	const map = useMap();
	const clustererRef = useRef<MarkerClusterer | null>(null);
	const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

	useEffect(() => {
		if (!map) return;
		if (clustererRef.current) return;

		clustererRef.current = new MarkerClusterer({
			map,
			markers: [],
		});
	}, [map]);

	// Clear stale markers when members list changes
	useEffect(() => {
		const clusterer = clustererRef.current;
		if (!clusterer) return;

		const validIds = new Set(members.map((m) => m.id));
		for (const [id, marker] of markersRef.current) {
			if (!validIds.has(id)) {
				clusterer.removeMarker(marker);
				markersRef.current.delete(id);
			}
		}
	}, [members]);

	const handleMarkerRef = useCallback(
		(marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
			const clusterer = clustererRef.current;
			if (!clusterer) return;

			const existing = markersRef.current.get(id);
			if (existing) {
				clusterer.removeMarker(existing);
				markersRef.current.delete(id);
			}

			if (marker) {
				markersRef.current.set(id, marker);
				clusterer.addMarker(marker);
			}
		},
		[],
	);

	return (
		<>
			{members.map((member) => (
				<MemberMapPin
					key={member.id}
					member={member}
					onMarkerRef={handleMarkerRef}
				/>
			))}
		</>
	);
}

export default function MemberMap({ members }: MemberMapProps) {
	if (members.length === 0) {
		return (
			<div className="flex h-[500px] items-center justify-center rounded-lg border border-gold-dark/20">
				<p className="text-sm text-cream/40">
					No members with map locations yet.
				</p>
			</div>
		);
	}

	return (
		<div className="h-[500px] overflow-hidden rounded-lg border border-gold-dark/20">
			<GoogleMap
				defaultCenter={DEFAULT_CENTER}
				defaultZoom={DEFAULT_ZOOM}
				mapId="member-directory-map"
				styles={darkMapStyles}
				disableDefaultUI={false}
				zoomControl={true}
				streetViewControl={false}
				mapTypeControl={false}
				fullscreenControl={true}
				gestureHandling="cooperative"
			>
				<ClusteredMap members={members} />
			</GoogleMap>
		</div>
	);
}
