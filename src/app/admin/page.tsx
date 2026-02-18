"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  username?: string;
  role?: string;
  emailVerified: boolean;
  createdAt: string;
}

interface Invite {
  id: string;
  token: string;
  email: string;
  role: string;
  used: boolean;
  createdAt: string;
  expiresAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const role = session
    ? ((session.user as { role?: string }).role ?? "user")
    : "user";

  const loadData = useCallback(async () => {
    try {
      const [usersRes, invitesRes] = await Promise.all([
        authClient.admin.listUsers({ query: { limit: 100 } }),
        fetch("/api/invites").then((r) => r.json()),
      ]);
      if (usersRes.data) {
        setUsers(usersRes.data.users as unknown as UserRecord[]);
      }
      if (Array.isArray(invitesRes)) {
        setInvites(invitesRes);
      }
    } catch {
      // silently fail — user will see empty lists
    }
  }, []);

  useEffect(() => {
    if (session && (role === "admin" || role === "moderator")) {
      loadData();
    }
  }, [session, role, loadData]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-silver">Loading...</p>
      </div>
    );
  }

  if (!session || (role !== "admin" && role !== "moderator")) {
    router.push("/hello");
    return null;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setInviteError(data.error ?? "Failed to send invite");
        setInviteLoading(false);
        return;
      }

      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("user");
      loadData();
    } catch {
      setInviteError("Failed to send invite");
    }

    setInviteLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Send Invite */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Send Invite</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-silver px-3 py-2 text-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-silver px-3 py-2 text-sm dark:border-silver/30 dark:bg-navy-light"
          >
            <option value="user">User</option>
            {role === "admin" && (
              <>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </>
            )}
          </select>
          <button
            type="submit"
            disabled={inviteLoading}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
          >
            {inviteLoading ? "Sending..." : "Send Invite"}
          </button>
        </form>
        {inviteError && (
          <p className="mt-2 text-sm text-crimson">
            {inviteError}
          </p>
        )}
        {inviteSuccess && (
          <p className="mt-2 text-sm text-field-green">
            {inviteSuccess}
          </p>
        )}
      </section>

      {/* Users List */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">
          Users ({users.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-silver/30 dark:border-silver/20">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Username</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-silver/20 dark:border-silver/10"
                >
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4 text-silver">{u.email}</td>
                  <td className="py-2 pr-4">{u.username ?? "—"}</td>
                  <td className="py-2 pr-4 capitalize">{u.role ?? "user"}</td>
                  <td className="py-2">
                    {u.emailVerified ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invites List */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Invites ({invites.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-silver/30 dark:border-silver/20">
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-silver/20 dark:border-silver/10"
                >
                  <td className="py-2 pr-4">{inv.email}</td>
                  <td className="py-2 pr-4 capitalize">{inv.role}</td>
                  <td className="py-2 pr-4">
                    {inv.used
                      ? "Used"
                      : new Date(inv.expiresAt) < new Date()
                        ? "Expired"
                        : "Pending"}
                  </td>
                  <td className="py-2 text-silver">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
