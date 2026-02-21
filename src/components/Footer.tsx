import Link from "next/link";

export default function Footer() {
	return (
		<footer className="bg-charcoal border-t border-gold-dark/30">
			<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-4 py-4">
				<div className="flex items-center gap-2 font-[family-name:var(--font-oswald)] text-xs uppercase tracking-[0.15em]">
					<Link
						href="/privacy"
						className="text-gold-dark hover:text-gold transition-colors"
					>
						Privacy Policy
					</Link>
					<span className="text-gold-dark/40">&middot;</span>
					<Link
						href="/terms"
						className="text-gold-dark hover:text-gold transition-colors"
					>
						Terms of Service
					</Link>
				</div>
				<span className="font-[family-name:var(--font-oswald)] text-xs uppercase tracking-[0.15em] text-gold-dark/60">
					&copy; {new Date().getFullYear()} Berlin Reunion
				</span>
			</div>
		</footer>
	);
}
