"use client";

import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";

interface DeleteAccountModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({
  onClose,
  onDeleted,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<"confirm" | "password">("confirm");
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onDeleted();
      } else {
        const body = await res.json();
        setError(body.error ?? "Failed to delete account");
      }
    } catch {
      setError("Failed to delete account");
    }
    setLoading(false);
  }

  return (
    <ModalOverlay open onClose={onClose}>
      {(labelId) =>
        step === "confirm" ? (
          <>
            <h3
              id={labelId}
              className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-crimson"
            >
              Delete Your Account
            </h3>
            <div className="mb-6 space-y-3 text-sm text-cream/60">
              <p>This action is <strong className="text-cream/80">permanent and cannot be undone</strong>.</p>
              <p>Deleting your account will:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Remove all your personal data</li>
                <li>Revoke all active sessions</li>
                <li>Remove your name from events you created</li>
                <li>Delete any pending invitations you sent</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("password")}
                className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
              >
                I understand, continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h3
              id={labelId}
              className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-crimson"
            >
              Confirm Deletion
            </h3>
            <p className="mb-4 text-sm text-cream/60">
              Type <strong className="text-cream/80">DELETE</strong> and enter your password to permanently delete your account.
            </p>
            {error && (
              <div className="mb-4 rounded-md bg-crimson/15 p-3 text-sm text-crimson">
                {error}
              </div>
            )}
            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label
                  htmlFor="delete-confirmation"
                  className="block text-sm font-medium text-cream/70"
                >
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-cream/70"
                >
                  Password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password || confirmation !== "DELETE"}
                  className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90 disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </form>
          </>
        )
      }
    </ModalOverlay>
  );
}
