"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = useCallback((value: string) => {
    // Auto-uppercase, strip non-alphanumeric, allow space at position 4
    const raw = value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    // Auto-format: insert space after 4th char
    const stripped = raw.replace(/\s/g, "");
    if (stripped.length > 4) {
      setCode(`${stripped.slice(0, 4)} ${stripped.slice(4, 8)}`);
    } else {
      setCode(stripped);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.replace(/\s/g, "") }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.remainingAttempts !== undefined
            ? `${data.error} (${data.remainingAttempts} attempt${data.remainingAttempts !== 1 ? "s" : ""} remaining)`
            : data.error,
        );
        setLoading(false);
        return;
      }

      setSuccess("Email verified! Redirecting to sign in...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Verification failed");
    }

    setLoading(false);
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    setError("");

    try {
      const res = await fetch("/api/verify-code/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to resend code");
        return;
      }

      setResendCooldown(60);
    } catch {
      setError("Failed to resend code");
    }
  }

  if (!email) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Email Verification
        </h1>
        <p className="text-sm text-crimson">No email address provided.</p>
        <Link href="/login" className="text-sm font-medium text-gold underline">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Verify Your Email
        </h1>
        <p className="mt-1 text-sm text-cream/50">
          We sent an 8-digit code to <strong className="text-cream/80">{email}</strong>
        </p>
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
          <label htmlFor="code" className="block text-sm font-medium text-cream/70">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            required
            maxLength={9}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ABCD EFGH"
            autoComplete="one-time-code"
            className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-3 text-center font-mono text-lg tracking-widest text-cream uppercase shadow-sm focus:border-gold focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !!success || code.replace(/\s/g, "").length < 8}
          className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm font-medium text-gold-dark underline hover:text-gold disabled:opacity-50 disabled:no-underline"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Resend code"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Suspense
        fallback={<p className="text-sm text-cream/40">Loading...</p>}
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
