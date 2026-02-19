"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

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

    if (inviteToken && invite) {
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

        setSuccess("Account created! You can now sign in.");
        setTimeout(() => router.push("/login"), 2000);
      } catch {
        setError("Registration failed");
      }
    } else {
      await signUp.email(
        { email, password, name, username },
        {
          onSuccess: () => {
            setSuccess(
              "Account created! Check your email to verify your address.",
            );
          },
          onError: (ctx) => {
            setError(ctx.error.message ?? "Registration failed");
          },
        },
      );
    }

    setLoading(false);
  }

  if (inviteToken && inviteError) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Invalid Invite</h1>
        <p className="text-sm text-crimson dark:text-crimson">
          {inviteError}
        </p>
        <Link href="/register" className="text-sm font-medium underline">
          Register without invite
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {invite ? (
          <p className="mt-1 text-sm text-silver">
            You&apos;ve been invited as <strong>{invite.role}</strong>
          </p>
        ) : (
          <p className="mt-1 text-sm text-silver">
            Join Berlin Reunion
          </p>
        )}
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
          <label htmlFor="name" className="block text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
          />
        </div>

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
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            readOnly={!!invite}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none disabled:opacity-60 dark:border-silver/30 dark:bg-navy-light"
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
          />
          <p className="mt-1 text-xs text-silver">
            At least 8 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !!success}
          className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-silver">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={<p className="text-sm text-silver">Loading...</p>}
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
