"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, authClient } from "@/lib/auth-client";
import ConfirmDialog from "@/components/ConfirmDialog";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  username?: string;
  role?: string;
  emailVerified: boolean;
  createdAt: string;
  image?: string;
  location?: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
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
  const [roleError, setRoleError] = useState("");

  const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [banError, setBanError] = useState("");
  const [revokeError, setRevokeError] = useState("");

  const [pendingRole, setPendingRole] = useState<{
    userId: string;
    name: string;
    oldRole: string;
    newRole: string;
  } | null>(null);
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    token: string;
    email: string;
  } | null>(null);

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

  const ROLE_HIERARCHY: Record<string, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
  };
  const callerLevel = ROLE_HIERARCHY[role] ?? 0;

  async function handleBan() {
    if (!banTarget) return;
    setBanError("");
    try {
      const body: { reason?: string; expiresInDays?: number } = {};
      if (banReason.trim()) body.reason = banReason.trim();
      if (banDuration !== "permanent") body.expiresInDays = Number(banDuration);

      const res = await fetch(`/api/users/${banTarget.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setBanError(data.error ?? "Failed to ban user");
        return;
      }
      const banExpires =
        banDuration !== "permanent"
          ? new Date(
              Date.now() + Number(banDuration) * 86400000,
            ).toISOString()
          : undefined;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === banTarget.id
            ? {
                ...u,
                banned: true,
                banReason: banReason.trim() || undefined,
                banExpires,
              }
            : u,
        ),
      );
      setBanTarget(null);
      setBanReason("");
      setBanDuration("permanent");
    } catch {
      setBanError("Failed to ban user");
    }
  }

  async function handleUnban(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}/ban`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setRoleError(data.error ?? "Failed to unban user");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, banned: false, banReason: undefined, banExpires: undefined }
            : u,
        ),
      );
    } catch {
      setRoleError("Failed to unban user");
    }
  }

  async function handleRevoke(token: string) {
    setRevokeError("");
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setRevokeError(data.error ?? "Failed to revoke invite");
        return;
      }
      setInvites((prev) =>
        prev.map((inv) =>
          inv.token === token ? { ...inv, used: true } : inv,
        ),
      );
    } catch {
      setRevokeError("Failed to revoke invite");
    }
  }

  async function handleInvite() {
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

  async function handleRoleChange(userId: string, newRole: string) {
    setRoleError("");
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRoleError(data.error ?? "Failed to update role");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch {
      setRoleError("Failed to update role");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {role === "admin" && (
          <Link
            href="/admin/audit"
            className="text-sm text-silver hover:text-gold"
          >
            Audit Log
          </Link>
        )}
      </div>

      {/* Send Invite */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Send Invite</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setInviteConfirmOpen(true);
          }}
          className="flex flex-wrap gap-3"
        >
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
        {roleError && (
          <p className="mb-3 text-sm text-crimson">{roleError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-silver/30 dark:border-silver/20">
                <th className="pb-2 pr-4 font-medium"></th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Username</th>
                <th className="pb-2 pr-4 font-medium">Location</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Verified</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-silver/20 dark:border-silver/10"
                >
                  <td className="py-2 pr-4">
                    {u.image ? (
                      <Image
                        src={u.image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-silver/20 text-xs text-silver">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/users/${u.id}`} className="underline hover:text-gold">
                      {u.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-silver">{u.email}</td>
                  <td className="py-2 pr-4">{u.username ?? "—"}</td>
                  <td className="py-2 pr-4 text-silver">{u.location ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {role === "admin" ? (
                      <select
                        value={u.role ?? "user"}
                        disabled={u.id === session.user.id}
                        onChange={(e) =>
                          setPendingRole({
                            userId: u.id,
                            name: u.name,
                            oldRole: u.role ?? "user",
                            newRole: e.target.value,
                          })
                        }
                        className="rounded border border-silver/30 bg-transparent px-2 py-0.5 text-sm capitalize disabled:opacity-50 dark:border-silver/20"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="capitalize">{u.role ?? "user"}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {u.emailVerified ? "Yes" : "No"}
                  </td>
                  <td className="py-2 pr-4">
                    {u.banned ? (
                      <span className="text-crimson font-medium" title={
                        [u.banReason, u.banExpires ? `Expires: ${new Date(u.banExpires).toLocaleDateString()}` : null].filter(Boolean).join(" — ")
                      }>
                        Banned
                        {u.banExpires && (
                          <span className="ml-1 text-xs text-silver">
                            until {new Date(u.banExpires).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-field-green">Active</span>
                    )}
                  </td>
                  <td className="py-2">
                    {u.id !== session.user.id &&
                      (ROLE_HIERARCHY[u.role ?? "user"] ?? 0) < callerLevel && (
                        u.banned ? (
                          <button
                            onClick={() =>
                              setUnbanTarget({ id: u.id, name: u.name })
                            }
                            className="rounded border border-field-green px-2 py-0.5 text-xs text-field-green hover:bg-field-green/10"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBanTarget(u);
                              setBanError("");
                            }}
                            className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
                          >
                            Ban
                          </button>
                        )
                      )}
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
        {revokeError && (
          <p className="mb-3 text-sm text-crimson">{revokeError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-silver/30 dark:border-silver/20">
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Expires</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const isPending =
                  !inv.used && new Date(inv.expiresAt) >= new Date();
                return (
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
                    <td className="py-2 pr-4 text-silver">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {isPending && (
                        <button
                          onClick={() =>
                            setRevokeTarget({
                              token: inv.token,
                              email: inv.email,
                            })
                          }
                          className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Role Change Confirmation */}
      <ConfirmDialog
        open={pendingRole !== null}
        title="Change role?"
        message={
          pendingRole
            ? `Change ${pendingRole.name}\u2019s role from ${pendingRole.oldRole} to ${pendingRole.newRole}?`
            : ""
        }
        confirmLabel="Change Role"
        onConfirm={() => {
          if (pendingRole) {
            handleRoleChange(pendingRole.userId, pendingRole.newRole);
          }
          setPendingRole(null);
        }}
        onCancel={() => setPendingRole(null)}
      />

      {/* Send Invite Confirmation */}
      <ConfirmDialog
        open={inviteConfirmOpen}
        title="Send invite?"
        message={`Send invite to ${inviteEmail} as ${inviteRole}?`}
        confirmLabel="Send Invite"
        onConfirm={() => {
          setInviteConfirmOpen(false);
          handleInvite();
        }}
        onCancel={() => setInviteConfirmOpen(false)}
      />

      {/* Unban Confirmation */}
      <ConfirmDialog
        open={unbanTarget !== null}
        title="Unban user?"
        message={unbanTarget ? `Unban ${unbanTarget.name}?` : ""}
        confirmLabel="Unban"
        onConfirm={() => {
          if (unbanTarget) {
            handleUnban(unbanTarget.id);
          }
          setUnbanTarget(null);
        }}
        onCancel={() => setUnbanTarget(null)}
      />

      {/* Revoke Invite Confirmation */}
      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke invite?"
        message={revokeTarget ? `Revoke invite to ${revokeTarget.email}?` : ""}
        confirmLabel="Revoke"
        danger
        onConfirm={() => {
          if (revokeTarget) {
            handleRevoke(revokeTarget.token);
          }
          setRevokeTarget(null);
        }}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-navy-light">
            <h3 className="mb-4 text-lg font-semibold">
              Ban {banTarget.name}?
            </h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Reason (optional)
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Spam, harassment"
                className="w-full rounded-md border border-silver px-3 py-2 text-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Duration
              </label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full rounded-md border border-silver px-3 py-2 text-sm dark:border-silver/30 dark:bg-navy"
              >
                <option value="permanent">Permanent</option>
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            {banError && (
              <p className="mb-3 text-sm text-crimson">{banError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setBanTarget(null);
                  setBanReason("");
                  setBanDuration("permanent");
                  setBanError("");
                }}
                className="rounded-md border border-silver px-4 py-2 text-sm hover:bg-silver/10 dark:border-silver/30"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
