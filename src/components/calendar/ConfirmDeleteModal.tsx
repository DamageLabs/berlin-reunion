"use client";

import { useState } from "react";

interface ConfirmDeleteModalProps {
	eventTitle: string;
	isRecurring: boolean;
	onConfirm: () => Promise<void>;
	onCancel: () => void;
}

export default function ConfirmDeleteModal({
	eventTitle,
	isRecurring,
	onConfirm,
	onCancel,
}: ConfirmDeleteModalProps) {
	const [deleting, setDeleting] = useState(false);

	async function handleConfirm() {
		setDeleting(true);
		try {
			await onConfirm();
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div className="w-full max-w-sm rounded-lg border border-gold-dark/30 bg-charcoal p-6 shadow-xl">
				<h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
					Delete Event
				</h3>

				<p className="mt-3 text-sm text-cream/70">
					Are you sure you want to delete{" "}
					<span className="font-medium text-cream/90">{eventTitle}</span>?
					This action cannot be undone.
				</p>

				{isRecurring && (
					<p className="mt-2 rounded border border-red-900/30 bg-red-950/20 px-3 py-2 text-sm text-red-400">
						This is a recurring event. Deleting it will remove all occurrences in the series.
					</p>
				)}

				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onCancel}
						disabled={deleting}
						className="rounded-md border border-gold-dark/30 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/60 hover:text-cream/80 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={deleting}
						className="rounded-md border border-red-900/40 bg-red-950/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-red-400 hover:border-red-700/60 hover:bg-red-950/40 disabled:opacity-50"
					>
						{deleting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}
