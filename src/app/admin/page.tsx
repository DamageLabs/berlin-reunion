"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{
    token: string;
    email: string;
  } | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

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
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-cream/40">Loading...</p>
      </div>
    );
  }

  if (!session || (role !== "admin" && role !== "moderator")) {
    router.push("/home");
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

  async function handleResetPassword() {
    if (!resetPasswordTarget) return;
    setResetPasswordError("");
    setResetPasswordSuccess("");
    try {
      const res = await fetch(
        `/api/users/${resetPasswordTarget.id}/reset-password`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        setResetPasswordError(data.error ?? "Failed to reset password");
        return;
      }
      setResetPasswordSuccess(
        `Password reset for ${resetPasswordTarget.name}. A temporary password has been emailed to them.`,
      );
      setResetPasswordTarget(null);
    } catch {
      setResetPasswordError("Failed to reset password");
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

  async function handleVerify() {
    if (!verifyTarget) return;
    setVerifyError("");
    setVerifySuccess("");
    try {
      const res = await fetch(`/api/users/${verifyTarget.id}/verify`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setVerifyError(data.error ?? "Failed to verify user email");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === verifyTarget.id ? { ...u, emailVerified: true } : u,
        ),
      );
      setVerifySuccess(`Email verified for ${verifyTarget.name}.`);
      setVerifyTarget(null);
    } catch {
      setVerifyError("Failed to verify user email");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteSuccess("");
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete user");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteSuccess(`User ${deleteTarget.name} has been deleted.`);
      setDeleteTarget(null);
    } catch {
      setDeleteError("Failed to delete user");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Admin Dashboard
        </h1>
        {role === "admin" && (
          <Link
            href="/admin/audit"
            className="text-sm text-gold-dark hover:text-gold"
          >
            Audit Log
          </Link>
        )}
      </div>

      {/* Send Invite */}
      <section className="mb-8">
        <h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
          Send Invite
        </h2>
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
            className="flex-1 min-w-[200px] rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
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
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
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
        <h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
          Users ({users.length})
        </h2>
        {roleError && (
          <p className="mb-3 text-sm text-crimson">{roleError}</p>
        )}
        {resetPasswordError && (
          <p className="mb-3 text-sm text-crimson">{resetPasswordError}</p>
        )}
        {resetPasswordSuccess && (
          <p className="mb-3 text-sm text-field-green">{resetPasswordSuccess}</p>
        )}
        {verifyError && (
          <p className="mb-3 text-sm text-crimson">{verifyError}</p>
        )}
        {verifySuccess && (
          <p className="mb-3 text-sm text-field-green">{verifySuccess}</p>
        )}
        {deleteError && (
          <p className="mb-3 text-sm text-crimson">{deleteError}</p>
        )}
        {deleteSuccess && (
          <p className="mb-3 text-sm text-field-green">{deleteSuccess}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gold-dark/30">
                <th className="pb-2 pr-4 font-medium text-cream/70"></th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Name</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Email</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Username</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Location</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Role</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Verified</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Status</th>
                <th className="pb-2 font-medium text-cream/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gold-dark/15"
                >
                  <td className="py-2 pr-4">
                    {u.image ? (
                      <img
                        src={u.image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-dark/20 text-xs text-gold-dark">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <Link href={`/users/${u.id}`} className="underline text-cream/80 hover:text-gold">
                      {u.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-cream/50">{u.email}</td>
                  <td className="py-2 pr-4 text-cream/80">{u.username ?? "—"}</td>
                  <td className="py-2 pr-4 text-cream/50">{u.location ?? "—"}</td>
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
                        className="rounded border border-gold-dark/30 bg-transparent px-2 py-0.5 text-sm text-cream capitalize disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="capitalize text-cream/80">{u.role ?? "user"}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-cream/80">
                    {u.emailVerified ? "Yes" : "No"}
                  </td>
                  <td className="py-2 pr-4">
                    {u.banned ? (
                      <span className="text-crimson font-medium" title={
                        [u.banReason, u.banExpires ? `Expires: ${new Date(u.banExpires).toLocaleDateString()}` : null].filter(Boolean).join(" — ")
                      }>
                        Banned
                        {u.banExpires && (
                          <span className="ml-1 text-xs text-cream/40">
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
                        <div className="flex gap-2">
                          {u.banned ? (
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
                          )}
                          <button
                            onClick={() => {
                              setResetPasswordTarget({ id: u.id, name: u.name });
                              setResetPasswordError("");
                            }}
                            className="rounded border border-gold-dark/40 px-2 py-0.5 text-xs text-cream/50 hover:text-cream/80 hover:bg-gold-dark/10"
                          >
                            Reset PW
                          </button>
                          {!u.emailVerified && (
                            <button
                              onClick={() => {
                                setVerifyTarget({ id: u.id, name: u.name });
                                setVerifyError("");
                              }}
                              className="rounded border border-field-green px-2 py-0.5 text-xs text-field-green hover:bg-field-green/10"
                            >
                              Verify
                            </button>
                          )}
                          {role === "admin" && (
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: u.id, name: u.name });
                                setDeleteError("");
                              }}
                              className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
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
        <h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
          Invites ({invites.length})
        </h2>
        {revokeError && (
          <p className="mb-3 text-sm text-crimson">{revokeError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gold-dark/30">
                <th className="pb-2 pr-4 font-medium text-cream/70">Email</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Role</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Status</th>
                <th className="pb-2 pr-4 font-medium text-cream/70">Expires</th>
                <th className="pb-2 font-medium text-cream/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const isPending =
                  !inv.used && new Date(inv.expiresAt) >= new Date();
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-gold-dark/15"
                  >
                    <td className="py-2 pr-4 text-cream/80">{inv.email}</td>
                    <td className="py-2 pr-4 capitalize text-cream/80">{inv.role}</td>
                    <td className="py-2 pr-4 text-cream/80">
                      {inv.used
                        ? "Used"
                        : new Date(inv.expiresAt) < new Date()
                          ? "Expired"
                          : "Pending"}
                    </td>
                    <td className="py-2 pr-4 text-cream/50">
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

      {/* Reset Password Confirmation */}
      <ConfirmDialog
        open={resetPasswordTarget !== null}
        title="Reset password?"
        message={
          resetPasswordTarget
            ? `Reset ${resetPasswordTarget.name}\u2019s password? A temporary password will be emailed to them.`
            : ""
        }
        confirmLabel="Reset Password"
        danger
        onConfirm={() => {
          handleResetPassword();
        }}
        onCancel={() => setResetPasswordTarget(null)}
      />

      {/* Verify Email Confirmation */}
      <ConfirmDialog
        open={verifyTarget !== null}
        title="Verify email?"
        message={
          verifyTarget
            ? `Manually verify ${verifyTarget.name}\u2019s email address?`
            : ""
        }
        confirmLabel="Verify"
        onConfirm={() => {
          handleVerify();
        }}
        onCancel={() => setVerifyTarget(null)}
      />

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user?"
        message={
          deleteTarget
            ? `Permanently delete ${deleteTarget.name}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete User"
        danger
        onConfirm={() => {
          handleDelete();
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-gold-dark/30 bg-charcoal p-6 shadow-lg">
            <h3 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
              Ban {banTarget.name}?
            </h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-cream/70">
                Reason (optional)
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Spam, harassment"
                className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-cream/70">
                Duration
              </label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
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
                className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10"
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
