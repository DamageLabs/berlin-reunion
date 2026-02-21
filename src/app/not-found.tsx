import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
			<div className="w-full max-w-lg space-y-6 text-center">
				<h1 className="font-[family-name:var(--font-oswald)] text-6xl font-bold uppercase tracking-wider text-gold">
					404
				</h1>

				<p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-wide text-cream/80">
					Area Secured &mdash; Nothing to See Here
				</p>

				<div className="mx-auto overflow-hidden rounded-lg border-2 border-gold-dark/30">
					<Image
						src="/images/404.png"
						alt="Humorous military cartoon illustration"
						width={480}
						height={360}
						className="h-auto w-full"
						priority
					/>
				</div>

				<p className="text-sm text-cream/60">
					404: Page went AWOL. Last seen running away at full speed, which
					&mdash; coincidentally &mdash; is the same thing every skinny,
					beautiful woman does when 4.2 Platoon rolls into the bar smelling
					like propellant charges and broken dreams.
				</p>

				<Link
					href="/"
					className="inline-block rounded-md bg-gold px-6 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark"
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
}
