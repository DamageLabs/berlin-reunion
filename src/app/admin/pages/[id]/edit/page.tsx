"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageEditor from "@/components/pages/PageEditor";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

interface PageData {
	id: string;
	slug: string;
	title: string;
	content: string;
	published: boolean;
	visibility: "public" | "private";
}

export default function EditPagePage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const { data: session, isPending } = useSession();
	const [pageData, setPageData] = useState<PageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	useEffect(() => {
		if (!session || (role !== "admin" && role !== "moderator")) return;
		(async () => {
			try {
				const res = await fetch(`/api/pages/${id}`);
				if (!res.ok) {
					setNotFound(true);
					return;
				}
				const data = await res.json();
				setPageData(data.page);
			} catch {
				setNotFound(true);
			} finally {
				setLoading(false);
			}
		})();
	}, [session, role, id]);

	if (isPending || loading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<Skeleton className="mb-6 h-7 w-48" />
				<Skeleton className="h-96 w-full rounded-md" />
			</div>
		);
	}

	if (!session || (role !== "admin" && role !== "moderator")) {
		router.push("/home");
		return null;
	}

	if (notFound || !pageData) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<p className="text-sm text-cream/50">Page not found.</p>
			</div>
		);
	}

	async function handleSave(data: {
		title: string;
		slug: string;
		content: string;
		published: boolean;
		visibility: "public" | "private";
	}) {
		const res = await fetch(`/api/pages/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error ?? "Failed to update page");
		}
		router.push("/admin/pages");
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="mb-6 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				Edit Page
			</h1>
			<PageEditor
				initialTitle={pageData.title}
				initialSlug={pageData.slug}
				initialContent={pageData.content}
				initialPublished={pageData.published}
				initialVisibility={pageData.visibility}
				onSave={handleSave}
				onCancel={() => router.push("/admin/pages")}
			/>
		</div>
	);
}
