"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import Skeleton from "@/components/Skeleton";

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width={18} height={11} x={3} y={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width={18} height={18} x={3} y={4} rx={2} />
      <path d="M3 10h18" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFields, setProfileFields] = useState<{
    location: string;
    platoon: string;
    yearsServed: string;
  }>({ location: "", platoon: "", yearsServed: "" });
  const [createdAt, setCreatedAt] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // Fetch profile data
  useEffect(() => {
    if (!session) return;
    fetch(`/api/users/${session.user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.email) setEmail(data.email);
        if (data.image) setProfileImage(data.image);
        if (data.createdAt) setCreatedAt(data.createdAt);
        setProfileFields({
          location: data.location ?? "",
          platoon: data.platoon ?? "",
          yearsServed: data.yearsServed ?? "",
        });
        setProfileLoaded(true);
      });
  }, [session]);

  // Fetch community stats
  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMemberCount(data.memberCount);
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

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column skeleton */}
          <div className="space-y-6 lg:col-span-2">
            {/* Welcome card */}
            <div className="rounded-lg border border-gold-dark/20 p-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
            {/* Quick actions grid */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gold-dark/20 p-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="mt-3 h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          {/* Right column skeleton */}
          <div className="space-y-6">
            {/* Profile card */}
            <div className="rounded-lg border border-gold-dark/20 p-6">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
            {/* Stats card */}
            <div className="rounded-lg border border-gold-dark/20 p-6 text-center">
              <Skeleton className="mx-auto h-10 w-16" />
              <Skeleton className="mx-auto mt-2 h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Auth guard ───────────────────────────────────────────────────────────

  if (!session) {
    router.push("/login");
    return null;
  }

  const user = session.user;
  const role = (user as { role?: string }).role ?? "user";
  const username = (user as { username?: string }).username;
  const image = profileImage ?? user.image ?? null;

  const subtitle =
    profileFields.platoon || profileFields.yearsServed
      ? [profileFields.platoon, profileFields.yearsServed].filter(Boolean).join(" \u00B7 ")
      : "Welcome to Berlin Reunion";

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : "—";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left Column (2/3) ────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Welcome Card */}
          <div className="rounded-lg border border-gold-dark/20 p-6">
            <h1 className="font-[family-name:var(--font-oswald)] text-3xl font-semibold uppercase tracking-wider text-gold">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-cream/50">{subtitle}</p>

            {profileLoaded && missingFields.length > 0 && !dismissed && (
              <div className="relative mt-4 rounded-lg border border-gold-dark/30 bg-gold/10 p-4">
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
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/profile"
              className="rounded-lg border border-gold-dark/20 p-4 transition-colors hover:border-gold/40 hover:bg-gold-dark/5"
            >
              <PencilIcon className="h-6 w-6 text-gold" />
              <span className="mt-3 block font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-cream/80">
                Edit Profile
              </span>
            </Link>
            <Link
              href="/change-password"
              className="rounded-lg border border-gold-dark/20 p-4 transition-colors hover:border-gold/40 hover:bg-gold-dark/5"
            >
              <LockIcon className="h-6 w-6 text-gold" />
              <span className="mt-3 block font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-cream/80">
                Change Password
              </span>
            </Link>
            <Link
              href="/members"
              className="rounded-lg border border-gold-dark/20 p-4 transition-colors hover:border-gold/40 hover:bg-gold-dark/5"
            >
              <UsersIcon className="h-6 w-6 text-gold" />
              <span className="mt-3 block font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-cream/80">
                Member Directory
              </span>
            </Link>
            <div className="rounded-lg border border-gold-dark/20 p-4 opacity-60">
              <CalendarIcon className="h-6 w-6 text-gold" />
              <span className="mt-3 block font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-cream/80">
                Events
              </span>
              <span className="mt-1 inline-block rounded-full bg-gold-dark/20 px-2 py-0.5 text-xs text-cream/50">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Upcoming Events Placeholder */}
          <div className="rounded-lg border border-gold-dark/20 p-6">
            <h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
              Upcoming Events
            </h2>
            <p className="mt-3 text-sm text-cream/40">
              No upcoming events scheduled.
            </p>
          </div>
        </div>

        {/* ── Right Column (1/3) ───────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-lg border border-gold-dark/20 p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gold-dark/20">
                {image ? (
                  <img
                    src={image}
                    alt={`${user.name}'s photo`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-3xl text-gold-dark">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-center">
                <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wider text-gold">
                  {user.name}
                </h2>
                {username && (
                  <p className="text-sm text-cream/50">@{username}</p>
                )}
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cream/50">Platoon</dt>
                <dd className="text-cream/80">{profileFields.platoon || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/50">Years Served</dt>
                <dd className="text-cream/80">{profileFields.yearsServed || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/50">Location</dt>
                <dd className="text-cream/80">{profileFields.location || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/50">Role</dt>
                <dd className="capitalize text-cream/80">{role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/50">Email</dt>
                <dd className="text-cream/80 truncate max-w-[160px]" title={email}>{email || "..."}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cream/50">Member Since</dt>
                <dd className="text-cream/80">{memberSince}</dd>
              </div>
            </dl>
          </div>

          {/* Community Stats Card */}
          <div className="rounded-lg border border-gold-dark/20 p-6 text-center">
            {memberCount !== null ? (
              <p className="font-[family-name:var(--font-oswald)] text-4xl font-bold text-gold">
                {memberCount}
              </p>
            ) : (
              <Skeleton className="mx-auto h-10 w-16" />
            )}
            <p className="mt-1 text-sm text-cream/50">veterans have joined</p>
            <Link
              href="/members"
              className="mt-3 inline-block text-sm font-medium text-gold hover:text-gold-light"
            >
              View Member Directory &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
