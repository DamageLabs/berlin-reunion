"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

interface ToastContextValue {
	toasts: Toast[];
	addToast: (type: ToastType, message: string) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback((type: ToastType, message: string) => {
		const id = crypto.randomUUID();
		setToasts((prev) => {
			const next = [...prev, { id, type, message }];
			if (next.length > MAX_TOASTS) {
				return next.slice(next.length - MAX_TOASTS);
			}
			return next;
		});
	}, []);

	return (
		<ToastContext value={{ toasts, addToast, removeToast }}>
			{children}
		</ToastContext>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return ctx;
}
