"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface InviteInfo {
	email: string;
	role: string;
	expiresAt: string;
}

function RegisterForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const inviteToken = searchParams.get("invite");

	const [invite, setInvite] = useState<InviteInfo | null>(null);
	const [inviteError, setInviteError] = useState("");

	const [name, setName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!inviteToken) return;

		fetch(`/api/invites/${inviteToken}`)
			.then(async (res) => {
				if (!res.ok) {
					const data = await res.json();
					setInviteError(data.error ?? "Invalid invite");
					return;
				}
				const data: InviteInfo = await res.json();
				setInvite(data);
				setEmail(data.email);
			})
			.catch(() => setInviteError("Failed to validate invite"));
	}, [inviteToken]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		try {
			const res = await fetch(`/api/invites/${inviteToken}/accept`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, username, password }),
			});

			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Registration failed");
				setLoading(false);
				return;
			}

			setSuccess("Account created! Redirecting to verify your email...");
			const inviteEmail = invite?.email ?? email;
			setTimeout(
				() =>
					router.push(`/verify-email?email=${encodeURIComponent(inviteEmail)}`),
				2000,
			);
		} catch {
			setError("Registration failed");
		}

		setLoading(false);
	}

	// No invite token — show invite-required message
	if (!inviteToken) {
		return (
			<div className="w-full max-w-sm space-y-4 text-center">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Invite Required
				</h1>
				<p className="text-sm text-cream/50">
					Registration is by invitation only. Ask an existing member to send you
					an invite.
				</p>
				<Link href="/login" className="text-sm font-medium text-gold underline">
					Sign In
				</Link>
			</div>
		);
	}

	// Invalid or expired invite token
	if (inviteError) {
		return (
			<div className="w-full max-w-sm space-y-4 text-center">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Invalid Invite
				</h1>
				<p className="text-sm text-crimson">{inviteError}</p>
				<Link href="/login" className="text-sm font-medium text-gold underline">
					Sign In
				</Link>
			</div>
		);
	}

	return (
		<div className="w-full max-w-sm space-y-6">
			<div className="text-center">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Create Account
				</h1>
				{invite ? (
					<p className="mt-1 text-sm text-cream/50">
						You&apos;ve been invited as{" "}
						<strong className="text-cream/80">{invite.role}</strong>
					</p>
				) : (
					<p className="mt-1 text-sm text-cream/40">Validating invite...</p>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="rounded-md bg-crimson/15 p-3 text-sm text-crimson">
						{error}
					</div>
				)}
				{success && (
					<div className="rounded-md bg-field-green/15 p-3 text-sm text-field-green">
						{success}
					</div>
				)}

				<div>
					<label
						htmlFor="name"
						className="block text-sm font-medium text-cream/70"
					>
						Full Name
					</label>
					<input
						id="name"
						type="text"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
					/>
				</div>

				<div>
					<label
						htmlFor="username"
						className="block text-sm font-medium text-cream/70"
					>
						Username
					</label>
					<input
						id="username"
						type="text"
						required
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
					/>
				</div>

				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-cream/70"
					>
						Email
					</label>
					<input
						id="email"
						type="email"
						required
						value={email}
						readOnly={!!invite}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none disabled:opacity-60"
					/>
				</div>

				<div>
					<label
						htmlFor="password"
						className="block text-sm font-medium text-cream/70"
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						required
						minLength={8}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
					/>
					<p className="mt-1 text-xs text-cream/40">At least 8 characters</p>
				</div>

				<button
					type="submit"
					disabled={loading || !!success}
					className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
				>
					{loading ? "Creating account..." : "Create Account"}
				</button>
			</form>

			<p className="text-center text-sm text-cream/50">
				Already have an account?{" "}
				<Link href="/login" className="font-medium text-gold underline">
					Sign In
				</Link>
			</p>
			<p className="text-center text-xs text-cream/40">
				By creating an account, you agree to our{" "}
				<Link
					href="/privacy"
					className="text-gold-dark hover:text-gold underline"
				>
					Privacy Policy
				</Link>{" "}
				and{" "}
				<Link
					href="/terms"
					className="text-gold-dark hover:text-gold underline"
				>
					Terms of Service
				</Link>
				.
			</p>
		</div>
	);
}

export default function RegisterPage() {
	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
			<Suspense fallback={<p className="text-sm text-cream/40">Loading...</p>}>
				<RegisterForm />
			</Suspense>
		</div>
	);
}
