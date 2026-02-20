"use client";

import { useState } from "react";
import Link from "next/link";
import { changePassword, useSession } from "@/lib/auth-client";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isForced = !!(session?.user as { forcePasswordChange?: boolean } | undefined)
    ?.forcePasswordChange;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    await changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: async () => {
          if (isForced) {
            await fetch("/api/clear-force-password-change", { method: "POST" });
          }
          setSuccess("Password changed successfully.");
          setCurrentPassword("");
          setNewPassword("");
        },
        onError: (ctx) => {
          setError(ctx.error.message ?? "Failed to change password");
        },
      },
    );

    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
            Change Password
          </h1>
        </div>

        {isForced && (
          <div className="rounded-md bg-gold/10 border border-gold-dark/30 p-3 text-sm text-gold">
            Your password was reset by an administrator. Please set a new password to continue.
          </div>
        )}

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
              htmlFor="currentPassword"
              className="block text-sm font-medium text-cream/70"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            />
          </div>

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
            <p className="mt-1 text-xs text-cream/40">
              At least 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>

        {!isForced && (
          <p className="text-center">
            <Link
              href="/home"
              className="text-sm font-medium text-gold-dark underline hover:text-gold"
            >
              Back to Home
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
