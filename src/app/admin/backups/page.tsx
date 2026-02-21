"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import ConfirmDialog from "@/components/ConfirmDialog";
import BackupSchedulerConfig from "@/components/BackupSchedulerConfig";

interface BackupFile {
	filename: string;
	type: string;
	size: number;
	createdAt: string;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function BackupsPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	const [backups, setBackups] = useState<BackupFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [confirmRestore, setConfirmRestore] = useState<BackupFile | null>(
		null,
	);
	const [confirmDelete, setConfirmDelete] = useState<BackupFile | null>(null);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	const loadBackups = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/backups");
			if (res.ok) {
				const data = await res.json();
				setBackups(data.backups);
			}
		} catch {
			setError("Failed to load backups");
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		if (isPending) return;
		if (!session || role !== "admin") {
			router.push("/admin");
			return;
		}
		loadBackups();
	}, [session, isPending, role, router, loadBackups]);

	async function handleCreateBackup() {
		setCreating(true);
		setError("");
		setSuccess("");
		try {
			const res = await fetch("/api/admin/backups", { method: "POST" });
			if (res.ok) {
				const data = await res.json();
				setSuccess(`Backup created: ${data.filePath.split("/").pop()}`);
				loadBackups();
			} else {
				const body = await res.json();
				setError(body.error ?? "Backup failed");
			}
		} catch {
			setError("Backup failed");
		}
		setCreating(false);
	}

	function handleDownload(backup: BackupFile) {
		const url = `/api/admin/backups/${encodeURIComponent(backup.filename)}?type=${backup.type}`;
		window.open(url, "_blank");
	}

	async function handleRestore(backup: BackupFile) {
		setRestoring(true);
		setError("");
		setSuccess("");
		setConfirmRestore(null);
		try {
			const res = await fetch(
				`/api/admin/backups/${encodeURIComponent(backup.filename)}?type=${backup.type}`,
				{ method: "POST" },
			);
			if (res.ok) {
				const data = await res.json();
				const safetyFile = data.safetyPath.split("/").pop();
				setSuccess(
					`Database restored from ${backup.filename}. Safety backup: ${safetyFile}`,
				);
				loadBackups();
			} else {
				const body = await res.json();
				setError(body.error ?? "Restore failed");
			}
		} catch {
			setError("Restore failed");
		}
		setRestoring(false);
	}

	async function handleDelete(backup: BackupFile) {
		setError("");
		setSuccess("");
		setConfirmDelete(null);
		try {
			const res = await fetch(
				`/api/admin/backups/${encodeURIComponent(backup.filename)}?type=${backup.type}`,
				{ method: "DELETE" },
			);
			if (res.ok) {
				setSuccess(`Deleted ${backup.filename}`);
				loadBackups();
			} else {
				const body = await res.json();
				setError(body.error ?? "Delete failed");
			}
		} catch {
			setError("Delete failed");
		}
	}

	if (isPending) {
		return (
			<div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
				<p className="text-sm text-cream/40">Loading...</p>
			</div>
		);
	}

	if (!session || role !== "admin") return null;

	const grouped = {
		daily: backups.filter((b) => b.type === "daily"),
		weekly: backups.filter((b) => b.type === "weekly"),
		monthly: backups.filter((b) => b.type === "monthly"),
		"pre-restore": backups.filter((b) => b.type === "pre-restore"),
	};

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Database Backups
				</h1>
				<Link
					href="/admin"
					className="text-sm text-gold-dark hover:text-gold"
				>
					Back to Admin
				</Link>
			</div>

			{error && (
				<div className="mb-4 rounded-md bg-crimson/15 p-3 text-sm text-crimson">
					{error}
				</div>
			)}
			{success && (
				<div className="mb-4 rounded-md bg-field-green/15 p-3 text-sm text-field-green">
					{success}
				</div>
			)}

			<div className="mb-8">
				<button
					type="button"
					onClick={handleCreateBackup}
					disabled={creating || restoring}
					className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
				>
					{creating ? "Creating Backup..." : "Create Backup Now"}
				</button>
				<p className="mt-2 text-xs text-cream/40">
					Creates a daily backup of all database tables.
				</p>
			</div>

			<BackupSchedulerConfig />

			{loading ? (
				<p className="text-sm text-cream/40">Loading backups...</p>
			) : backups.length === 0 ? (
				<p className="text-sm text-cream/50">
					No backups found. Create one to get started.
				</p>
			) : (
				<div className="space-y-8">
					{(["daily", "weekly", "monthly", "pre-restore"] as const).map(
						(type) => {
							const files = grouped[type];
							if (files.length === 0) return null;
							return (
								<section key={type}>
									<h2 className="mb-3 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
										{type === "pre-restore" ? "Pre-Restore" : type} Backups
										<span className="ml-2 text-sm font-normal normal-case text-cream/40">
											({files.length})
										</span>
									</h2>
									<div className="overflow-hidden rounded-lg border border-gold-dark/20">
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b border-gold-dark/20 bg-charcoal-light">
													<th className="px-4 py-2 text-left font-medium text-cream/50">
														Filename
													</th>
													<th className="px-4 py-2 text-left font-medium text-cream/50">
														Date
													</th>
													<th className="px-4 py-2 text-right font-medium text-cream/50">
														Size
													</th>
													<th className="px-4 py-2 text-right font-medium text-cream/50">
														Actions
													</th>
												</tr>
											</thead>
											<tbody>
												{files.map((backup) => (
													<tr
														key={`${backup.type}-${backup.filename}`}
														className="border-b border-gold-dark/10 last:border-0"
													>
														<td className="px-4 py-2 font-mono text-xs text-cream/70">
															{backup.filename}
														</td>
														<td className="px-4 py-2 text-cream/60">
															{formatDate(backup.createdAt)}
														</td>
														<td className="px-4 py-2 text-right text-cream/60">
															{formatSize(backup.size)}
														</td>
														<td className="px-4 py-2 text-right">
															<div className="flex items-center justify-end gap-3">
																<button
																	type="button"
																	onClick={() => handleDownload(backup)}
																	className="text-gold-dark hover:text-gold"
																>
																	Download
																</button>
																<button
																	type="button"
																	onClick={() => setConfirmRestore(backup)}
																	disabled={restoring}
																	className="text-field-green hover:text-field-green/80 disabled:opacity-50"
																>
																	Restore
																</button>
																<button
																	type="button"
																	onClick={() => setConfirmDelete(backup)}
																	className="text-crimson/70 hover:text-crimson"
																>
																	Delete
																</button>
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</section>
							);
						},
					)}
				</div>
			)}

			<ConfirmDialog
				open={confirmRestore !== null}
				title="Restore Database"
				message={`This will replace ALL current data with the backup from ${confirmRestore ? formatDate(confirmRestore.createdAt) : ""}. A safety backup will be created automatically before restoring. This action cannot be undone.`}
				confirmLabel={restoring ? "Restoring..." : "Restore"}
				danger
				onConfirm={() => confirmRestore && handleRestore(confirmRestore)}
				onCancel={() => setConfirmRestore(null)}
			/>

			<ConfirmDialog
				open={confirmDelete !== null}
				title="Delete Backup"
				message={`Are you sure you want to delete ${confirmDelete?.filename ?? ""}? This cannot be undone.`}
				confirmLabel="Delete"
				danger
				onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
				onCancel={() => setConfirmDelete(null)}
			/>
		</div>
	);
}
