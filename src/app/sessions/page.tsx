"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useSession,
  listSessions,
  revokeSession,
  revokeOtherSessions,
} from "@/lib/auth-client";
import ConfirmDialog from "@/components/ConfirmDialog";
import Skeleton from "@/components/Skeleton";

interface Session {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
}

function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    fetchSessions();
  }, [session]);

  async function fetchSessions() {
    setLoading(true);
    setError("");
    try {
      const res = await listSessions();
      if (res.data) {
        setSessions(res.data as Session[]);
      } else {
        setError("Failed to load sessions.");
      }
    } catch {
      setError("Failed to load sessions.");
    }
    setLoading(false);
  }

  async function handleRevoke(tokenToRevoke: string) {
    setConfirmRevokeId(null);
    setRevoking(tokenToRevoke);
    setError("");
    try {
      await revokeSession({ token: tokenToRevoke });
      setSessions((prev) => prev.filter((s) => s.token !== tokenToRevoke));
    } catch {
      setError("Failed to revoke session.");
    }
    setRevoking(null);
  }

  async function handleRevokeAll() {
    setConfirmRevokeAll(false);
    setRevokingAll(true);
    setError("");
    try {
      await revokeOtherSessions();
      setSessions((prev) =>
        prev.filter((s) => s.token === session?.session?.token),
      );
    } catch {
      setError("Failed to revoke other sessions.");
    }
    setRevokingAll(false);
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

  const currentToken = session.session?.token;
  const otherSessionsExist = sessions.some((s) => s.token !== currentToken);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
            Active Sessions
          </h1>
          <p className="mt-1 text-sm text-cream/50">
            Manage your logged-in devices
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-crimson/15 p-3 text-sm text-crimson">
            {error}
          </div>
        )}

        {!loading && otherSessionsExist && (
          <button
            type="button"
            onClick={() => setConfirmRevokeAll(true)}
            disabled={revokingAll}
            className="w-full rounded-md bg-crimson/15 px-4 py-2 text-sm font-medium text-crimson hover:bg-crimson/25 disabled:opacity-50"
          >
            {revokingAll ? "Signing out..." : "Sign out all other sessions"}
          </button>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-gold-dark/20 p-4 space-y-3"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-sm text-cream/40">
            No active sessions found.
          </p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const isCurrent = s.token === currentToken;
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border border-gold-dark/20 p-4 ${
                    isCurrent ? "bg-charcoal-light" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {isCurrent && (
                        <span className="inline-block rounded-full bg-gold-dark/20 px-2 py-0.5 text-xs font-medium text-gold">
                          Current
                        </span>
                      )}
                      <div>
                        <span className="text-xs text-cream/50">
                          User Agent
                        </span>
                        <p className="truncate text-sm text-cream/80">
                          {s.userAgent || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-cream/50">
                          IP Address
                        </span>
                        <p className="text-sm text-cream/80">
                          {s.ipAddress || "Unknown"}
                        </p>
                      </div>
                      <div className="flex gap-6">
                        <div>
                          <span className="text-xs text-cream/50">Created</span>
                          <p className="text-sm text-cream/80">
                            {formatDate(s.createdAt)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-cream/50">
                            Expires
                          </span>
                          <p className="text-sm text-cream/80">
                            {formatDate(s.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(s.token)}
                        disabled={revoking === s.token}
                        className="shrink-0 rounded-md border border-gold-dark/40 px-3 py-1.5 text-xs text-cream/70 hover:border-crimson/60 hover:text-crimson disabled:opacity-50"
                      >
                        {revoking === s.token ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center">
          <Link
            href="/profile"
            className="text-sm font-medium text-gold-dark underline hover:text-gold"
          >
            Back to Profile
          </Link>
        </p>
      </div>

      <ConfirmDialog
        open={confirmRevokeId !== null}
        title="Revoke Session"
        message="This will sign out the device associated with this session. Are you sure?"
        confirmLabel="Revoke"
        danger
        onConfirm={() => confirmRevokeId && handleRevoke(confirmRevokeId)}
        onCancel={() => setConfirmRevokeId(null)}
      />

      <ConfirmDialog
        open={confirmRevokeAll}
        title="Sign Out Other Sessions"
        message="This will sign out all devices except your current one. Are you sure?"
        confirmLabel="Sign out all"
        danger
        onConfirm={handleRevokeAll}
        onCancel={() => setConfirmRevokeAll(false)}
      />
    </div>
  );
}
