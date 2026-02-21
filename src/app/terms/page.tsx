import Link from "next/link";

export default function TermsOfServicePage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-12">
			<h1 className="font-[family-name:var(--font-oswald)] text-3xl font-bold uppercase tracking-wider text-gold">
				Terms of Service
			</h1>
			<p className="mt-2 text-sm text-cream/40">
				Last updated: February 21, 2026
			</p>

			<div className="mt-8 space-y-8 text-sm leading-relaxed text-cream/80">
				{/* 1. Scope */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						1. Scope
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						These Terms of Service govern your use of the Berlin Reunion Tour
						website, a private, invite-only web application for veterans of
						Combat Support Company, 4/502nd Infantry Regiment, Berlin Brigade.
						By creating an account or accessing the site, you agree to be bound
						by these terms.
					</p>
				</section>

				{/* 2. Eligibility */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						2. Eligibility
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						Access to this site is by invitation only. You must have received a
						valid invitation from an existing member or administrator to create
						an account. Invitations are non-transferable and intended solely for
						the individual to whom they are addressed.
					</p>
				</section>

				{/* 3. Accounts */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						3. Accounts
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						You are responsible for maintaining the security of your account
						credentials. Do not share your password or allow others to access
						your account. You must provide accurate information when creating
						your profile and keep it up to date. If you believe your account has
						been compromised, contact a site administrator immediately.
					</p>
				</section>

				{/* 4. Conduct */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						4. Conduct
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						This site exists to help veterans reconnect and coordinate reunion
						activities. When using the site, you agree to:
					</p>
					<ul className="mt-2 list-inside list-disc space-y-1 text-cream/70">
						<li>Treat all members with respect and courtesy</li>
						<li>
							Refrain from posting offensive, harassing, or discriminatory
							content
						</li>
						<li>
							Not use the site for commercial solicitation or advertising
						</li>
						<li>
							Not attempt to access other members&apos; accounts or private
							information
						</li>
						<li>
							Not attempt to disrupt or interfere with the site&apos;s
							operation
						</li>
					</ul>
				</section>

				{/* 5. Content */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						5. Content
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						You retain ownership of any content you post to the site, including
						photos, comments, and profile information. By posting content, you
						grant the site organizers a non-exclusive right to display that
						content to other authenticated members as part of the site&apos;s
						normal operation. You may remove your content at any time through
						your account settings.
					</p>
				</section>

				{/* 6. Termination */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						6. Termination
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						You may delete your account at any time. Administrators reserve the
						right to suspend or remove accounts that violate these terms or
						engage in behavior harmful to the community. Upon account deletion,
						your personal data will be permanently removed in accordance with
						our{" "}
						<Link
							href="/privacy"
							className="text-gold-dark hover:text-gold underline"
						>
							Privacy Policy
						</Link>
						.
					</p>
				</section>

				{/* 7. Disclaimers */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						7. Disclaimers
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						This site is provided on an &ldquo;as is&rdquo; basis by volunteer
						reunion organizers. We make no warranties regarding availability,
						reliability, or fitness for a particular purpose. The site is not
						affiliated with or endorsed by the U.S. Department of Defense or any
						government agency.
					</p>
				</section>

				{/* 8. Changes to These Terms */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						8. Changes to These Terms
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						We may update these terms from time to time. When significant
						changes are made, we will notify members through the site or via
						email. Continued use of the site after changes are posted
						constitutes acceptance of the revised terms.
					</p>
				</section>

				{/* 9. Contact */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						9. Contact
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						If you have questions about these terms, please contact a site
						administrator through the application or reach out to the reunion
						organizers directly.
					</p>
				</section>
			</div>

			<div className="mt-12 border-t border-gold-dark/30 pt-6">
				<Link
					href="/"
					className="text-sm text-gold-dark hover:text-gold underline"
				>
					&larr; Back to Home
				</Link>
			</div>
		</div>
	);
}
