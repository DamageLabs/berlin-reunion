"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push("/login"), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  if (errorParam === "INVALID_TOKEN" || (!token && !errorParam)) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
            Invalid or Expired Link
          </h1>
          <p className="mt-2 text-sm text-cream/50">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <p className="text-center text-sm">
          <a
            href="/forgot-password"
            className="text-gold hover:underline"
          >
            Request a new reset link
          </a>
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    await resetPassword(
      { newPassword, token: token! },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (ctx) => {
          setError(ctx.error.message ?? "Failed to reset password");
        },
      },
    );

    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
            Password Reset!
          </h1>
          <p className="mt-2 text-sm text-cream/50">
            Your password has been reset. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Reset Password
        </h1>
        <p className="mt-1 text-sm text-cream/50">Enter your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-crimson/15 p-3 text-sm text-crimson">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-cream/70">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-cream/70"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Suspense
        fallback={<p className="text-sm text-cream/40">Loading...</p>}
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
