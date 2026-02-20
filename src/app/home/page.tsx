"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function HelloPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!session) return;
    fetch(`/api/users/${session.user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) setEmail(data.email);
      });
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-cream/40">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const user = session.user;
  const role = (user as { role?: string }).role ?? "user";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl font-semibold uppercase tracking-wider text-gold">
            Hello, {user.name}!
          </h1>
          <p className="mt-1 text-sm text-cream/50">
            Welcome to Berlin Reunion
          </p>
        </div>

        <div className="rounded-lg border border-gold-dark/20 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-cream/50">Email</dt>
              <dd className="text-cream/80">{email || "..."}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cream/50">Username</dt>
              <dd className="text-cream/80">{(user as { username?: string }).username ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cream/50">Location</dt>
              <dd className="text-cream/80">
                {(user as { location?: string }).location ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cream/50">Role</dt>
              <dd className="capitalize text-cream/80">{role}</dd>
            </div>
          </dl>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/profile"
            className="rounded-md border border-gold-dark/40 px-4 py-2 text-center text-sm font-medium text-cream/70 hover:border-gold/60 hover:text-gold hover:bg-gold-dark/10"
          >
            Edit Profile
          </Link>
          <Link
            href="/change-password"
            className="rounded-md border border-gold-dark/40 px-4 py-2 text-center text-sm font-medium text-cream/70 hover:border-gold/60 hover:text-gold hover:bg-gold-dark/10"
          >
            Change Password
          </Link>
        </nav>
      </div>
    </div>
  );
}
