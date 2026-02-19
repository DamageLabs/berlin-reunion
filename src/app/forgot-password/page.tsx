"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    await requestPasswordReset(
      { email, redirectTo: `${appUrl}/reset-password` },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: () => {
          // Show the same message regardless to prevent email enumeration
          setSubmitted(true);
        },
      },
    );

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="mt-1 text-sm text-silver">
            Enter your email to receive a reset link
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              If an account with that email exists, a password reset link has
              been sent. Check your inbox.
            </div>
            <p className="text-center text-sm text-silver">
              <a href="/login" className="text-gold hover:underline">
                Back to login
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-crimson/10 p-3 text-sm text-crimson dark:bg-crimson/20">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-silver">
              <a href="/login" className="text-gold hover:underline">
                Back to login
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
