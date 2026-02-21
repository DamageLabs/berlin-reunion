"use client";

import ModalOverlay from "@/components/ModalOverlay";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <ModalOverlay open={open} onClose={onCancel}>
      {(labelId) => (
        <>
          <h3
            id={labelId}
            className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold"
          >
            {title}
          </h3>
          <p className="mb-6 text-sm text-cream/60">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={
                danger
                  ? "rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
                  : "rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark"
              }
            >
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  );
}
