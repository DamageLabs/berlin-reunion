"use client";

import { useRouter } from "next/navigation";
import PageEditor from "@/components/pages/PageEditor";
import { useSession } from "@/lib/auth-client";

export default function NewPagePage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	if (isPending) return null;
	if (!session || (role !== "admin" && role !== "moderator")) {
		router.push("/home");
		return null;
	}

	async function handleSave(data: {
		title: string;
		slug: string;
		content: string;
		published: boolean;
	}) {
		const res = await fetch("/api/pages", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error ?? "Failed to create page");
		}
		router.push("/admin/pages");
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="mb-6 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				New Page
			</h1>
			<PageEditor onSave={handleSave} onCancel={() => router.push("/admin/pages")} />
		</div>
	);
}
