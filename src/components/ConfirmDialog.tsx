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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-navy-light">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <p className="mb-6 text-sm text-silver">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-silver px-4 py-2 text-sm hover:bg-silver/10 dark:border-silver/30"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? "rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
                : "rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
