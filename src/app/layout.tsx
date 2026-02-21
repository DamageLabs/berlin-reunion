import type { Metadata } from "next";
import {
	Bebas_Neue,
	Geist,
	Geist_Mono,
	Oswald,
	Playfair_Display,
	Source_Serif_4,
} from "next/font/google";
import Footer from "@/components/Footer";
import ForcePasswordChangeGuard from "@/components/ForcePasswordChangeGuard";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const oswald = Oswald({
	subsets: ["latin"],
	variable: "--font-oswald",
	weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
	weight: "700",
	style: ["normal", "italic"],
});

const bebas = Bebas_Neue({
	subsets: ["latin"],
	variable: "--font-bebas",
	weight: "400",
});

const sourceSerif = Source_Serif_4({
	subsets: ["latin"],
	variable: "--font-source-serif",
	style: ["normal", "italic"],
	weight: "400",
});

export const metadata: Metadata = {
	title: "Berlin Reunion",
	description: "Reconnecting the Berlin American community",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${playfair.variable} ${bebas.variable} ${sourceSerif.variable} antialiased`}
			>
				<Header />
				<ForcePasswordChangeGuard />
				{children}
				<Footer />
			</body>
		</html>
	);
}
