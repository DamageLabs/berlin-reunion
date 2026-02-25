"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

interface PageRecord {
	id: string;
	slug: string;
	title: string;
	published: boolean;
	visibility: string;
	createdAt: string;
}

export default function AdminPagesPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [pages, setPages] = useState<PageRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [error, setError] = useState("");

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	const loadPages = useCallback(async () => {
		setLoading(true);
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
	}, []);

	useEffect(() => {
		if (session && (role === "admin" || role === "moderator")) {
			loadPages();
		}
	}, [session, role, loadPages]);

	if (isPending) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-8">
				<Skeleton className="mb-6 h-7 w-48" />
				<Skeleton className="h-64 w-full rounded-md" />
			</div>
		);
	}

	if (!session || (role !== "admin" && role !== "moderator")) {
		router.push("/home");
		return null;
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		setError("");
		try {
			const res = await fetch(`/api/pages/${deleteTarget.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Failed to delete page");
				return;
			}
			setPages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
			setDeleteTarget(null);
		} catch {
			setError("Failed to delete page");
		}
	}

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Pages
				</h1>
				<Link
					href="/admin/pages/new"
					className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark"
				>
					New Page
				</Link>
			</div>

			{error && <p className="mb-4 text-sm text-crimson">{error}</p>}

			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-gold-dark/30">
							<th className="pb-2 pr-4 font-medium text-cream/70">Title</th>
							<th className="pb-2 pr-4 font-medium text-cream/70">Slug</th>
							<th className="pb-2 pr-4 font-medium text-cream/70">Status</th>
							<th className="pb-2 pr-4 font-medium text-cream/70">Visibility</th>
							<th className="pb-2 pr-4 font-medium text-cream/70">Created</th>
							<th className="pb-2 font-medium text-cream/70">Actions</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							Array.from({ length: 3 }).map((_, i) => (
								<tr key={i} className="border-b border-gold-dark/15">
									<td className="py-2 pr-4">
										<Skeleton className="h-4 w-32" />
									</td>
									<td className="py-2 pr-4">
										<Skeleton className="h-4 w-24" />
									</td>
									<td className="py-2 pr-4">
										<Skeleton className="h-4 w-16" />
									</td>
									<td className="py-2 pr-4">
										<Skeleton className="h-4 w-20" />
									</td>
									<td className="py-2">
										<Skeleton className="h-4 w-20" />
									</td>
								</tr>
							))
						) : pages.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="py-8 text-center text-sm text-cream/40"
								>
									No pages yet. Create your first page.
								</td>
							</tr>
						) : (
							pages.map((p) => (
								<tr key={p.id} className="border-b border-gold-dark/15">
									<td className="py-2 pr-4 text-cream/80">{p.title}</td>
									<td className="py-2 pr-4 text-cream/50 font-mono text-xs">
										/pages/{p.slug}
									</td>
									<td className="py-2 pr-4">
										{p.published ? (
											<span className="rounded-full bg-field-green/20 px-2 py-0.5 text-xs font-medium text-field-green">
												Published
											</span>
										) : (
											<span className="rounded-full bg-gold-dark/20 px-2 py-0.5 text-xs font-medium text-gold-dark">
												Draft
											</span>
										)}
									</td>
									<td className="py-2 pr-4">
										{p.visibility === "private" ? (
											<span className="rounded-full bg-crimson/15 px-2 py-0.5 text-xs font-medium text-crimson">
												Private
											</span>
										) : (
											<span className="rounded-full bg-silver/15 px-2 py-0.5 text-xs font-medium text-silver">
												Public
											</span>
										)}
									</td>
									<td className="py-2 pr-4 text-cream/50">
										{new Date(p.createdAt).toLocaleDateString()}
									</td>
									<td className="py-2 whitespace-nowrap">
										<div className="flex gap-2">
											<Link
												href={`/admin/pages/${p.id}/edit`}
												className="rounded border border-gold-dark/40 px-2 py-0.5 text-xs text-cream/70 hover:border-gold/60 hover:text-gold"
											>
												Edit
											</Link>
											<button
												onClick={() =>
													setDeleteTarget({ id: p.id, title: p.title })
												}
												className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<ConfirmDialog
				open={deleteTarget !== null}
				title="Delete page?"
				message={
					deleteTarget
						? `Permanently delete "${deleteTarget.title}"? This cannot be undone.`
						: ""
				}
				confirmLabel="Delete Page"
				danger
				onConfirm={handleDelete}
				onCancel={() => setDeleteTarget(null)}
			/>
		</div>
	);
}
