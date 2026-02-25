"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

interface PageRecord {
	id: string;
	slug: string;
	title: string;
}

export default function PagesIndexPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [pages, setPages] = useState<PageRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!session) return;
		(async () => {
			try {
				const res = await fetch("/api/pages");
				if (res.ok) {
					const data = await res.json();
					setPages(data.pages);
				}
			} catch {
				// silently fail
			}
			setLoading(false);
		})();
	}, [session]);

	if (isPending) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<Skeleton className="mb-6 h-7 w-32" />
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full rounded-md" />
					))}
				</div>
			</div>
		);
	}

	if (!session) {
		router.push("/login");
		return null;
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="mb-6 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				Pages
			</h1>
			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full rounded-md" />
					))}
				</div>
			) : pages.length === 0 ? (
				<p className="text-sm text-cream/40">No pages available.</p>
			) : (
				<ul className="space-y-2">
					{pages.map((p) => (
						<li key={p.id}>
							<Link
								href={`/pages/${p.slug}`}
								className="block rounded-md border border-gold-dark/20 bg-charcoal-light px-4 py-3 text-cream/80 transition-colors hover:border-gold/40 hover:text-gold"
							>
								{p.title}
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
