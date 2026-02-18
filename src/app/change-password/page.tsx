"use client";

import { useState } from "react";
import Link from "next/link";
import { changePassword } from "@/lib/auth-client";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    await changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Change Password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-crimson/10 p-3 text-sm text-crimson dark:bg-crimson/20">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-field-green/10 p-3 text-sm text-field-green dark:bg-field-green/20">
              {success}
            </div>
          )}

          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
            <p className="mt-1 text-xs text-silver">
              At least 8 characters, letters and numbers only
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>

        <p className="text-center">
          <Link
            href="/hello"
            className="text-sm font-medium underline text-silver"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
