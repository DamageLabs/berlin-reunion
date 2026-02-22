"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { hasGoogleMapsKey } from "./GoogleMapsProvider";

export interface LocationData {
	location: string;
	latitude: number | null;
	longitude: number | null;
}

interface LocationAutocompleteProps {
	value: string;
	onChange: (data: LocationData) => void;
	placeholder?: string;
	className?: string;
	id?: string;
}

function PlacesAutocomplete({
	value,
	onChange,
	placeholder,
	className,
	id,
}: LocationAutocompleteProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
	const places = useMapsLibrary("places");
	const [inputValue, setInputValue] = useState(value);

	useEffect(() => {
		setInputValue(value);
	}, [value]);

	useEffect(() => {
		if (!places || !inputRef.current || autocompleteRef.current) return;

		const autocomplete = new places.Autocomplete(inputRef.current, {
			types: ["(cities)"],
			fields: ["formatted_address", "geometry"],
		});

		autocomplete.addListener("place_changed", () => {
			const place = autocomplete.getPlace();
			const formatted = place.formatted_address ?? "";
			const lat = place.geometry?.location?.lat() ?? null;
			const lng = place.geometry?.location?.lng() ?? null;

			setInputValue(formatted);
			onChange({ location: formatted, latitude: lat, longitude: lng });
		});

		autocompleteRef.current = autocomplete;
	}, [places, onChange]);

	const handleManualChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = e.target.value;
			setInputValue(val);
			onChange({ location: val, latitude: null, longitude: null });
		},
		[onChange],
	);

	return (
		<input
			ref={inputRef}
			id={id}
			type="text"
			value={inputValue}
			onChange={handleManualChange}
			placeholder={placeholder}
			className={className}
		/>
	);
}

function PlainInput({
	value,
	onChange,
	placeholder,
	className,
	id,
}: LocationAutocompleteProps) {
	return (
		<input
			id={id}
			type="text"
			value={value}
			onChange={(e) =>
				onChange({
					location: e.target.value,
					latitude: null,
					longitude: null,
				})
			}
			placeholder={placeholder}
			className={className}
		/>
	);
}

export default function LocationAutocomplete(props: LocationAutocompleteProps) {
	if (!hasGoogleMapsKey()) {
		return <PlainInput {...props} />;
	}

	return <PlacesAutocomplete {...props} />;
}
