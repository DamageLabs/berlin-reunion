"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[ErrorBoundary]", error);
	}, [error]);

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<h1 className="font-[family-name:var(--font-oswald)] text-5xl font-bold uppercase tracking-wider text-gold">
					Something Went Wrong
				</h1>

				<p className="text-sm text-cream/60">
					An unexpected error occurred. Our engineers have been notified.
				</p>

				<button
					type="button"
					onClick={reset}
					className="inline-block rounded-md bg-gold px-6 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark"
				>
					Try Again
				</button>
			</div>
		</div>
	);
}
