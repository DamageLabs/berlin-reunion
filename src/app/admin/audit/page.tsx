"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetId: string | null;
  targetName: string | null;
  targetEmail: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "role.change": "Role Change",
  "user.ban": "Ban",
  "user.unban": "Unban",
  "invite.create": "Invite Created",
  "invite.revoke": "Invite Revoked",
  "email.change": "Email Change",
  "password.reset": "Password Reset",
  "login.success": "Login Success",
  "login.failure": "Login Failure",
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const role = session
    ? ((session.user as { role?: string }).role ?? "user")
    : "user";

  const loadLogs = useCallback(async (p: number, action: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
      });
      if (action) params.set("action", action);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session && (role === "admin" || role === "moderator")) {
      loadLogs(page, actionFilter);
    }
  }, [session, role, page, actionFilter, loadLogs]);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatDetail(entry: AuditEntry): string {
    if (!entry.detail) return "";
    const parts: string[] = [];
    if (entry.action === "role.change") {
      parts.push(`${entry.detail.oldRole} → ${entry.detail.newRole}`);
    }
    if (entry.action === "user.ban") {
      if (entry.detail.reason) parts.push(`Reason: ${entry.detail.reason}`);
      if (entry.detail.expiresInDays) parts.push(`${entry.detail.expiresInDays}d`);
      else parts.push("Permanent");
    }
    if (entry.action === "invite.create" || entry.action === "invite.revoke") {
      if (entry.detail.role) parts.push(`Role: ${entry.detail.role}`);
    }
    if (entry.action === "login.failure") {
      if (entry.detail.reason) parts.push(`${entry.detail.reason}`);
      if (entry.detail.username) parts.push(`User: ${entry.detail.username}`);
    }
    if (entry.action === "login.success" || entry.action === "login.failure") {
      if (entry.detail.ipAddress) parts.push(`IP: ${entry.detail.ipAddress}`);
    }
    return parts.join(" · ");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Audit Log
        </h1>
        <Link
          href="/admin"
          className="text-sm text-gold-dark hover:text-gold"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-cream/70">Action:</label>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-1.5 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All</option>
          <option value="login.success">Login Success</option>
          <option value="login.failure">Login Failure</option>
          <option value="role.change">Role Change</option>
          <option value="user.ban">Ban</option>
          <option value="user.unban">Unban</option>
          <option value="invite.create">Invite Created</option>
          <option value="invite.revoke">Invite Revoked</option>
          <option value="email.change">Email Change</option>
          <option value="password.reset">Password Reset</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold-dark/30">
              <th className="pb-2 pr-4 font-medium text-cream/70">Date</th>
              <th className="pb-2 pr-4 font-medium text-cream/70">Action</th>
              <th className="pb-2 pr-4 font-medium text-cream/70">Actor</th>
              <th className="pb-2 pr-4 font-medium text-cream/70">Target</th>
              <th className="pb-2 font-medium text-cream/70">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-cream/40">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-cream/40">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gold-dark/15"
                >
                  <td className="py-2 pr-4 text-cream/50">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-cream/80">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="py-2 pr-4 text-cream/80">
                    {entry.actorName ?? entry.actorId}
                  </td>
                  <td className="py-2 pr-4 text-cream/80">
                    {entry.targetEmail ??
                      (entry.targetId ? (
                        <Link
                          href={`/users/${entry.targetId}`}
                          className="underline hover:text-gold"
                        >
                          {entry.targetName ?? entry.targetId}
                        </Link>
                      ) : (
                        "—"
                      ))}
                  </td>
                  <td className="py-2 text-cream/50">
                    {formatDetail(entry)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-cream/50">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
