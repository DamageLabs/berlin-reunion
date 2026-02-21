"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(onEscape: () => void) {
	const containerRef = useRef<HTMLDivElement>(null);
	const onEscapeRef = useRef(onEscape);

	useEffect(() => {
		onEscapeRef.current = onEscape;
	});

	useEffect(() => {
		const previouslyFocused = document.activeElement as HTMLElement | null;

		// Focus the first focusable element inside the container
		requestAnimationFrame(() => {
			const container = containerRef.current;
			if (!container) return;
			const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
			first?.focus();
		});

		function handleKeyDown(e: KeyboardEvent) {
			const container = containerRef.current;
			if (!container) return;

			if (e.key === "Escape") {
				e.stopPropagation();
				onEscapeRef.current();
				return;
			}

			if (e.key !== "Tab") return;

			const focusable = Array.from(
				container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			);
			if (focusable.length === 0) return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, true);
			previouslyFocused?.focus();
		};
	}, []);

	return containerRef;
}
