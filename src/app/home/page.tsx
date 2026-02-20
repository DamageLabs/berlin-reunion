"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function HelloPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [profileFields, setProfileFields] = useState<{
    location: string;
    platoon: string;
    yearsServed: string;
  }>({ location: "", platoon: "", yearsServed: "" });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/users/${session.user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.email) setEmail(data.email);
        setProfileFields({
          location: data.location ?? "",
          platoon: data.platoon ?? "",
          yearsServed: data.yearsServed ?? "",
        });
        setProfileLoaded(true);
      });
  }, [session]);

  const missingFields: string[] = [];
  if (profileLoaded) {
    if (!profileFields.location) missingFields.push("location");
    if (!profileFields.platoon) missingFields.push("platoon");
    if (!profileFields.yearsServed) missingFields.push("years served");
  }

  useEffect(() => {
    if (!profileLoaded || missingFields.length === 0) return;
    const key = "profile-prompt-dismissed";
    const stored = localStorage.getItem(key);
    const current = missingFields.slice().sort().join(",");
    if (stored === current) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [profileLoaded, missingFields.join(",")]);

  function handleDismiss() {
    const current = missingFields.slice().sort().join(",");
    localStorage.setItem("profile-prompt-dismissed", current);
    setDismissed(true);
  }

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

        {profileLoaded && missingFields.length > 0 && !dismissed && (
          <div className="relative rounded-lg border border-gold-dark/30 bg-gold/10 p-4">
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 text-cream/50 hover:text-cream/70"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h2 className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-gold">
              Complete Your Profile
            </h2>
            <p className="mt-1 text-sm text-cream/60">
              Your {missingFields.join(", ")} {missingFields.length === 1 ? "is" : "are"} still empty.
            </p>
            <Link
              href="/profile"
              className="mt-2 inline-block text-sm font-medium text-gold hover:text-gold-light"
            >
              Edit Profile &rarr;
            </Link>
          </div>
        )}

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
