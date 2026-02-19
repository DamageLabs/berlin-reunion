"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

function isUnverifiedError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("email") && lower.includes("verified");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/hello";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowVerifyPrompt(false);
    setLoading(true);

    await signIn.username(
      { username, password },
      {
        onSuccess: () => {
          router.push(callbackUrl);
        },
        onError: (ctx) => {
          const msg = ctx.error.message ?? "Sign in failed";
          setError(msg);
          if (isUnverifiedError(msg)) {
            setShowVerifyPrompt(true);
          }
        },
      },
    );

    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm text-silver">
          Welcome back to Berlin Reunion
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-crimson/10 p-3 text-sm text-crimson dark:bg-crimson/20">
            {error}
          </div>
        )}

        {showVerifyPrompt && (
          <div className="rounded-md border border-silver/30 p-3 space-y-2">
            <p className="text-sm text-silver">
              Enter your email to verify your account:
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-md border border-silver px-3 py-1.5 text-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
              />
              <button
                type="button"
                onClick={() => {
                  if (verifyEmail) {
                    router.push(
                      `/verify-email?email=${encodeURIComponent(verifyEmail)}`,
                    );
                  }
                }}
                className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-gold hover:bg-navy-dark dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
          />
        </div>

        <div className="flex justify-end">
          <a
            href="/forgot-password"
            className="text-sm text-silver hover:text-gold"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-silver">
        Registration is by invitation only.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={<p className="text-sm text-silver">Loading...</p>}
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
