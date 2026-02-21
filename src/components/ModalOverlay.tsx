"use client";

import { useId, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ModalOverlayProps {
	open: boolean;
	onClose: () => void;
	children: (labelId: string) => ReactNode;
	panelClassName?: string;
}

export default function ModalOverlay({
	open,
	onClose,
	children,
	panelClassName = "w-full max-w-md",
}: ModalOverlayProps) {
	const containerRef = useFocusTrap(onClose);
	const labelId = useId();

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			onClick={onClose}
		>
			<div
				ref={containerRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelId}
				className={`${panelClassName} rounded-lg border border-gold-dark/30 bg-charcoal p-6 shadow-xl`}
				onClick={(e) => e.stopPropagation()}
			>
				{children(labelId)}
			</div>
		</div>
	);
}
