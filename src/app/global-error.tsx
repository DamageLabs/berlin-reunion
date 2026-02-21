"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[GlobalError]", error);
	}, [error]);

	return (
		<html lang="en">
			<body style={{ backgroundColor: "#1C1C1C", margin: 0 }}>
				<div
					style={{
						display: "flex",
						minHeight: "100vh",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
					}}
				>
					<div
						style={{
							maxWidth: "28rem",
							width: "100%",
							textAlign: "center",
						}}
					>
						<h1
							style={{
								fontFamily: "Oswald, sans-serif",
								fontSize: "2.5rem",
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "#C8A84E",
								marginBottom: "1.5rem",
							}}
						>
							Something Went Wrong
						</h1>

						<p
							style={{
								fontSize: "0.875rem",
								color: "rgba(245, 241, 235, 0.6)",
								marginBottom: "1.5rem",
							}}
						>
							A critical error occurred. Please try again.
						</p>

						<button
							type="button"
							onClick={reset}
							style={{
								backgroundColor: "#C8A84E",
								color: "#1C1C1C",
								padding: "0.5rem 1.5rem",
								borderRadius: "0.375rem",
								fontSize: "0.875rem",
								fontWeight: 500,
								border: "none",
								cursor: "pointer",
							}}
						>
							Try Again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
