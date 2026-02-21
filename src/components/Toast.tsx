"use client";

import { useEffect } from "react";

import type { Toast as ToastData } from "./ToastContext";

const variantStyles: Record<ToastData["type"], string> = {
	success: "bg-field-green/15 border-field-green text-field-green",
	error: "bg-crimson/15 border-crimson text-crimson",
	info: "bg-gold/15 border-gold text-gold",
};

interface ToastProps {
	toast: ToastData;
	onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
	useEffect(() => {
		const timer = setTimeout(() => onDismiss(toast.id), 4000);
		return () => clearTimeout(timer);
	}, [toast.id, onDismiss]);

	return (
		<div
			className={`pointer-events-auto animate-[toast-in_0.25s_ease-out] rounded-md border p-3 text-sm shadow-lg ${variantStyles[toast.type]}`}
			role="status"
		>
			<div className="flex items-start justify-between gap-2">
				<p>{toast.message}</p>
				<button
					type="button"
					onClick={() => onDismiss(toast.id)}
					className="shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
					aria-label="Dismiss notification"
				>
					&times;
				</button>
			</div>
		</div>
	);
}
