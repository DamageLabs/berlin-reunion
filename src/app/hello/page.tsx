"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";

export default function HelloPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const user = session.user;
  const role = (user as { role?: string }).role ?? "user";

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/"),
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Hello, {user.name}!</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Welcome to Berlin Reunion
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Username</dt>
              <dd>{(user as { username?: string }).username ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
              <dd className="capitalize">{role}</dd>
            </div>
          </dl>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/change-password"
            className="rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Change Password
          </Link>

          {(role === "admin" || role === "moderator") && (
            <Link
              href="/admin"
              className="rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Admin Dashboard
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign Out
          </button>
        </nav>
      </div>
    </div>
  );
}
