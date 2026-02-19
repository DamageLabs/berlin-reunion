"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  image?: string;
  location?: string;
  platoon?: string;
  yearsServed?: string;
  role?: string;
  createdAt: string;
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionPending) return;
    if (!session) {
      router.push("/login");
      return;
    }

    fetch(`/api/users/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          setError(body.error ?? "Failed to load profile");
          return;
        }
        setProfile(await res.json());
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id, session, sessionPending, router]);

  if (sessionPending || loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-silver">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-crimson">{error}</p>
          <Link href="/hello" className="mt-4 inline-block text-sm font-medium underline text-silver">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = session?.user.id === profile.id;
  const memberSince = new Date(profile.createdAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-silver/20">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={`${profile.name}'s photo`}
                fill
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl text-silver">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.username && (
              <p className="text-sm text-silver">@{profile.username}</p>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-lg border border-silver/30 p-4 dark:border-silver/20">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-silver">Platoon</dt>
              <dd>{profile.platoon || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Years Served</dt>
              <dd>{profile.yearsServed || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Location</dt>
              <dd>{profile.location || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Role</dt>
              <dd className="capitalize">{profile.role ?? "user"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isOwnProfile && (
            <Link
              href="/profile"
              className="rounded-md border border-silver px-4 py-2 text-center text-sm font-medium hover:bg-navy/5 dark:border-silver/30 dark:hover:bg-navy-light"
            >
              Edit Profile
            </Link>
          )}
          <Link
            href="/hello"
            className="text-center text-sm font-medium underline text-silver"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
