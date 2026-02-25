"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

interface PageData {
	title: string;
	content: string;
}

export default function PageViewPage() {
	const router = useRouter();
	const { slug } = useParams<{ slug: string }>();
	const { data: session, isPending } = useSession();
	const [pageData, setPageData] = useState<PageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (!session) return;
		(async () => {
			try {
				const res = await fetch("/api/pages");
				if (!res.ok) {
					setNotFound(true);
					setLoading(false);
					return;
				}
				const data = await res.json();
				const found = (data.pages as { slug: string; title: string; content: string }[]).find(
					(p) => p.slug === slug,
				);
				if (found) {
					setPageData({ title: found.title, content: found.content });
				} else {
					setNotFound(true);
				}
			} catch {
				setNotFound(true);
			}
			setLoading(false);
		})();
	}, [session, slug]);

	if (isPending || loading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<Skeleton className="mb-6 h-8 w-64" />
				<Skeleton className="h-64 w-full rounded-md" />
			</div>
		);
	}

	if (!session) {
		router.push("/login");
		return null;
	}

	if (notFound || !pageData) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<h1 className="mb-4 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Page Not Found
				</h1>
				<p className="text-sm text-cream/50">
					This page doesn&apos;t exist or is not yet published.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="mb-6 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				{pageData.title}
			</h1>
			<MarkdownRenderer content={pageData.content} />
		</div>
	);
}
