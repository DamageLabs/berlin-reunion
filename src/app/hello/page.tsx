"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function HelloPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-silver">Loading...</p>
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
          <h1 className="text-3xl font-bold">Hello, {user.name}!</h1>
          <p className="mt-1 text-sm text-silver">
            Welcome to Berlin Reunion
          </p>
        </div>

        <div className="rounded-lg border border-silver/30 p-4 dark:border-silver/20">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-silver">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Username</dt>
              <dd>{(user as { username?: string }).username ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Location</dt>
              <dd>
                {(user as { location?: string }).location ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Role</dt>
              <dd className="capitalize">{role}</dd>
            </div>
          </dl>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/profile"
            className="rounded-md border border-silver px-4 py-2 text-center text-sm font-medium hover:bg-navy/5 dark:border-silver/30 dark:hover:bg-navy-light"
          >
            Edit Profile
          </Link>
          <Link
            href="/change-password"
            className="rounded-md border border-silver px-4 py-2 text-center text-sm font-medium hover:bg-navy/5 dark:border-silver/30 dark:hover:bg-navy-light"
          >
            Change Password
          </Link>
        </nav>
      </div>
    </div>
  );
}
