"use client";

import { useState, useCallback, useEffect } from "react";
import {
	AdvancedMarker,
	InfoWindow,
	useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import Link from "next/link";

export interface MapMember {
	id: string;
	name: string;
	username?: string;
	image?: string;
	location?: string;
	latitude: number;
	longitude: number;
	platoon?: string;
}

interface MemberMapPinProps {
	member: MapMember;
	onMarkerRef?: (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => void;
}

export default function MemberMapPin({ member, onMarkerRef }: MemberMapPinProps) {
	const [open, setOpen] = useState(false);
	const [markerRef, marker] = useAdvancedMarkerRef();

	const handleClick = useCallback(() => setOpen((o) => !o), []);
	const handleClose = useCallback(() => setOpen(false), []);

	useEffect(() => {
		onMarkerRef?.(marker, member.id);
		return () => onMarkerRef?.(null, member.id);
	}, [marker, member.id, onMarkerRef]);

	return (
		<>
			<AdvancedMarker
				ref={markerRef}
				position={{ lat: member.latitude, lng: member.longitude }}
				onClick={handleClick}
				title={member.name}
			>
				<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold bg-charcoal shadow-lg">
					{member.image ? (
						<img
							src={member.image}
							alt=""
							className="h-6 w-6 rounded-full object-cover"
						/>
					) : (
						<span className="text-xs font-bold text-gold">
							{member.name.charAt(0).toUpperCase()}
						</span>
					)}
				</div>
			</AdvancedMarker>

			{open && marker && (
				<InfoWindow anchor={marker} onCloseClick={handleClose}>
					<Link
						href={`/users/${member.id}`}
						className="flex items-center gap-3 no-underline"
					>
						<div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-700">
							{member.image ? (
								<img
									src={member.image}
									alt=""
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="flex h-full items-center justify-center text-sm font-bold text-amber-400">
									{member.name.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<div>
							<p className="text-sm font-semibold text-gray-900">
								{member.name}
							</p>
							{member.platoon && (
								<p className="text-xs text-gray-500">{member.platoon}</p>
							)}
							{member.location && (
								<p className="text-xs text-gray-400">{member.location}</p>
							)}
						</div>
					</Link>
				</InfoWindow>
			)}
		</>
	);
}
