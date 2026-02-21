import Link from "next/link";

export default function Footer() {
	return (
		<footer className="bg-charcoal border-t border-gold-dark/30">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
				<Link
					href="/privacy"
					className="font-[family-name:var(--font-oswald)] text-xs uppercase tracking-[0.15em] text-gold-dark hover:text-gold transition-colors"
				>
					Privacy Policy
				</Link>
				<span className="font-[family-name:var(--font-oswald)] text-xs uppercase tracking-[0.15em] text-gold-dark/60">
					&copy; {new Date().getFullYear()} Berlin Reunion
				</span>
			</div>
		</footer>
	);
}
