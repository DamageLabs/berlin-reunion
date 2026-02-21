"use client";

import Toast from "./Toast";
import { useToast } from "./ToastContext";

export default function ToastContainer() {
	const { toasts, removeToast } = useToast();

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 flex-col gap-2"
		>
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={removeToast} />
			))}
		</div>
	);
}
