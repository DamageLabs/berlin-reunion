import Link from "next/link";

export default function PrivacyPolicyPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-12">
			<h1 className="font-[family-name:var(--font-oswald)] text-3xl font-bold uppercase tracking-wider text-gold">
				Privacy Policy
			</h1>
			<p className="mt-2 text-sm text-cream/40">
				Last updated: February 21, 2026
			</p>

			<div className="mt-8 space-y-8 text-sm leading-relaxed text-cream/80">
				{/* 1. Introduction */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						1. Introduction
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						The Berlin Reunion Tour is a private, invite-only web application
						for veterans of Combat Support Company, 4/502nd Infantry Regiment,
						Berlin Brigade. This site is operated by reunion organizers to help
						members reconnect, coordinate events, and share memories from their
						time serving in Berlin, Germany.
					</p>
					<p className="mt-2">
						This policy describes what personal information we collect, how we
						store and protect it, and your rights regarding your data.
					</p>
				</section>

				{/* 2. Data We Collect */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						2. Data We Collect
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						When you create an account and use the site, we may collect the
						following personal information:
					</p>
					<ul className="mt-2 list-inside list-disc space-y-1 text-cream/70">
						<li>Full name</li>
						<li>Email address</li>
						<li>Username</li>
						<li>Profile photo</li>
						<li>Location (city, state)</li>
						<li>Platoon assignment</li>
						<li>Years of service in Berlin</li>
					</ul>
				</section>

				{/* 3. How Data Is Stored */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						3. How Data Is Stored
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						All data is stored in a SQLite database on the application server.
						Sensitive personal information is encrypted at rest using
						AES-256-GCM encryption. Searchable fields use HMAC-based blind
						indexes so that lookups can be performed without exposing plaintext
						data.
					</p>
				</section>

				{/* 4. Profile Visibility */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						4. Profile Visibility
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						Your profile includes a public/private visibility toggle. When set
						to public, your name, photo, location, and platoon will appear in
						the member directory visible to other authenticated members. When
						set to private, your profile is hidden from the directory.
						Administrators and moderators may still access your information for
						site management purposes.
					</p>
				</section>

				{/* 5. Authentication & Sessions */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						5. Authentication &amp; Sessions
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						We use session-based authentication. When you sign in, a secure
						session cookie is set in your browser with a 7-day expiry. Passwords
						are hashed using bcrypt before storage and are never stored in
						plaintext. We do not use third-party authentication providers.
					</p>
				</section>

				{/* 6. Audit Logging */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						6. Audit Logging
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						For security purposes, we maintain audit logs of significant account
						actions including sign-ins, profile updates, role changes, and
						administrative actions. These logs are accessible only to
						administrators and moderators, and are used to detect unauthorized
						activity and maintain site integrity.
					</p>
				</section>

				{/* 7. Third-Party Services */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						7. Third-Party Services
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						We use <strong className="text-cream">Resend</strong> for
						transactional email delivery (invite notifications, email
						verification, password resets). Your email address is shared with
						Resend solely for the purpose of delivering these messages. No other
						third-party services receive your personal data.
					</p>
				</section>

				{/* 8. Role-Based Access */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						8. Role-Based Access
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						Access to information on this site is controlled by a role-based
						system:
					</p>
					<ul className="mt-2 list-inside list-disc space-y-1 text-cream/70">
						<li>
							<strong className="text-cream/90">Users</strong> can view the
							member directory (public profiles only), manage their own profile,
							and participate in site features.
						</li>
						<li>
							<strong className="text-cream/90">Moderators</strong> can manage
							invitations and have limited administrative capabilities.
						</li>
						<li>
							<strong className="text-cream/90">Administrators</strong> can
							manage all user accounts, view audit logs, and configure site
							settings.
						</li>
					</ul>
				</section>

				{/* 9. Data Retention & Deletion */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						9. Data Retention &amp; Deletion
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						Your account data is retained for as long as your account is active.
						You may permanently delete your account at any time from your{" "}
						<Link href="/profile" className="text-gold underline hover:text-gold-light">
							profile settings
						</Link>{" "}
						using the &ldquo;Delete My Account&rdquo; option in the Danger Zone
						section. Account deletion requires a two-step confirmation: typing
						DELETE and entering your password.
					</p>
					<p className="mt-2">
						When your account is deleted, your personal information (name,
						email, profile photo, location, and service details) is permanently
						removed from the database. Events you created are preserved as
						community resources but your name is removed from them. All active
						sessions are revoked, pending invitations you sent are deleted, and
						a confirmation email is sent to your address. Audit log entries
						related to your account may be retained in anonymized form for
						security purposes.
					</p>
				</section>

				{/* 10. Your Rights */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						10. Your Rights
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">You have the right to:</p>
					<ul className="mt-2 list-inside list-disc space-y-1 text-cream/70">
						<li>
							<strong className="text-cream/90">Access</strong> your personal
							data stored on this site
						</li>
						<li>
							<strong className="text-cream/90">Correct</strong> inaccurate
							information in your profile
						</li>
						<li>
							<strong className="text-cream/90">Delete</strong> your account and
							all associated personal data
						</li>
						<li>
							<strong className="text-cream/90">Export</strong> your personal
							data upon request
						</li>
					</ul>
					<p className="mt-2">
						You can delete your account directly from your{" "}
						<Link href="/profile" className="text-gold underline hover:text-gold-light">
							profile settings
						</Link>
						. For other requests, contact a site administrator or use the
						account management features in your profile.
					</p>
				</section>

				{/* 11. Cookies */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						11. Cookies
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						This site uses a single session cookie to maintain your
						authenticated session. We do not use tracking cookies, analytics
						cookies, or any third-party cookies. No advertising or behavioral
						tracking is performed.
					</p>
				</section>

				{/* 12. Contact Information */}
				<section>
					<h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-gold">
						12. Contact Information
					</h2>
					<div className="mt-1 h-px bg-gold-dark/30" />
					<p className="mt-3">
						If you have questions or concerns about this privacy policy or how
						your data is handled, please contact a site administrator through
						the application or reach out to the reunion organizers directly.
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
