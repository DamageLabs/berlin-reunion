"use client";

import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";

interface BanModalProps {
	userName: string;
	onConfirm: (reason: string, duration: string) => Promise<void>;
	onCancel: () => void;
}

export default function BanModal({
	userName,
	onConfirm,
	onCancel,
}: BanModalProps) {
	const [reason, setReason] = useState("");
	const [duration, setDuration] = useState("permanent");
	const [error, setError] = useState("");

	async function handleConfirm() {
		setError("");
		try {
			await onConfirm(reason, duration);
		} catch {
			setError("Failed to ban user");
		}
	}

	return (
		<ModalOverlay open={true} onClose={onCancel}>
			{(labelId) => (
				<>
					<h3
						id={labelId}
						className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold"
					>
						Ban {userName}?
					</h3>
					<div className="mb-4">
						<label className="mb-1 block text-sm font-medium text-cream/70">
							Reason (optional)
						</label>
						<input
							type="text"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="e.g. Spam, harassment"
							className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
						/>
					</div>
					<div className="mb-4">
						<label className="mb-1 block text-sm font-medium text-cream/70">
							Duration
						</label>
						<select
							value={duration}
							onChange={(e) => setDuration(e.target.value)}
							className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
						>
							<option value="permanent">Permanent</option>
							<option value="1">1 day</option>
							<option value="7">7 days</option>
							<option value="30">30 days</option>
						</select>
					</div>
					{error && (
						<p className="mb-3 text-sm text-crimson">{error}</p>
					)}
					<div className="flex justify-end gap-3">
						<button
							onClick={onCancel}
							className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10"
						>
							Cancel
						</button>
						<button
							onClick={handleConfirm}
							className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
						>
							Confirm Ban
						</button>
					</div>
				</>
			)}
		</ModalOverlay>
	);
}
