"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { type ReactNode } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function hasGoogleMapsKey(): boolean {
	return API_KEY.length > 0;
}

interface GoogleMapsProviderProps {
	children: ReactNode;
}

export default function GoogleMapsProvider({
	children,
}: GoogleMapsProviderProps) {
	if (!hasGoogleMapsKey()) {
		return <>{children}</>;
	}

	return (
		<APIProvider apiKey={API_KEY}>
			{children}
		</APIProvider>
	);
}
