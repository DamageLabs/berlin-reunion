"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

interface UserRecord {
	id: string;
	name: string;
	email: string;
	username?: string;
	role?: string;
	emailVerified: boolean;
	createdAt: string;
	image?: string;
	location?: string;
	banned?: boolean;
	banReason?: string;
	banExpires?: string;
	failedLoginAttempts?: number;
	lockedUntil?: string;
}

interface Invite {
	id: string;
	token: string;
	email: string;
	role: string;
	used: boolean;
	createdAt: string;
	expiresAt: string;
}

export default function AdminPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	const PAGE_SIZE = 20;

	const [users, setUsers] = useState<UserRecord[]>([]);
	const [usersTotal, setUsersTotal] = useState(0);
	const [usersPage, setUsersPage] = useState(0);
	const [usersLoading, setUsersLoading] = useState(false);
	const [usersSortBy, setUsersSortBy] = useState("name");
	const [usersSortDir, setUsersSortDir] = useState<"asc" | "desc">("asc");
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [verifiedFilter, setVerifiedFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const [invites, setInvites] = useState<Invite[]>([]);
	const [invitesTotal, setInvitesTotal] = useState(0);
	const [invitesPage, setInvitesPage] = useState(0);
	const [invitesLoading, setInvitesLoading] = useState(false);

	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("user");
	const [inviteError, setInviteError] = useState("");
	const [inviteSuccess, setInviteSuccess] = useState("");
	const [inviteLoading, setInviteLoading] = useState(false);
	const [roleError, setRoleError] = useState("");

	const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
	const [banReason, setBanReason] = useState("");
	const [banDuration, setBanDuration] = useState("permanent");
	const [banError, setBanError] = useState("");
	const [revokeError, setRevokeError] = useState("");

	const [pendingRole, setPendingRole] = useState<{
		userId: string;
		name: string;
		oldRole: string;
		newRole: string;
	} | null>(null);
	const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
	const [unbanTarget, setUnbanTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [unlockTarget, setUnlockTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [resetPasswordTarget, setResetPasswordTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [resetPasswordError, setResetPasswordError] = useState("");
	const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");
	const [revokeTarget, setRevokeTarget] = useState<{
		token: string;
		email: string;
	} | null>(null);
	const [resendTarget, setResendTarget] = useState<{
		email: string;
		role: string;
	} | null>(null);
	const [resendError, setResendError] = useState("");
	const [resendSuccess, setResendSuccess] = useState("");
	const [verifyTarget, setVerifyTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [verifyError, setVerifyError] = useState("");
	const [verifySuccess, setVerifySuccess] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [deleteError, setDeleteError] = useState("");
	const [deleteSuccess, setDeleteSuccess] = useState("");

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	const loadUsers = useCallback(
		async (
			p: number,
			sort: string,
			dir: string,
			search: string,
			role: string,
			verified: string,
			status: string,
		) => {
			setUsersLoading(true);
			try {
				const params = new URLSearchParams({
					page: String(p),
					limit: String(PAGE_SIZE),
					sort,
					dir,
				});
				if (search) params.set("search", search);
				if (role) params.set("role", role);
				if (verified) params.set("verified", verified);
				if (status) params.set("status", status);
				const res = await fetch(`/api/admin/users?${params}`);
				if (res.ok) {
					const data = await res.json();
					setUsers(data.users);
					setUsersTotal(data.total);
				}
			} catch {
				// silently fail
			}
			setUsersLoading(false);
		},
		[],
	);

	const loadInvites = useCallback(async (p: number) => {
		setInvitesLoading(true);
		try {
			const res = await fetch(`/api/invites?page=${p}&limit=${PAGE_SIZE}`);
			if (res.ok) {
				const data = await res.json();
				setInvites(data.invites);
				setInvitesTotal(data.total);
			}
		} catch {
			// silently fail
		}
		setInvitesLoading(false);
	}, []);

	useEffect(() => {
		if (session && (role === "admin" || role === "moderator")) {
			loadUsers(
				usersPage,
				usersSortBy,
				usersSortDir,
				debouncedSearch,
				roleFilter,
				verifiedFilter,
				statusFilter,
			);
		}
	}, [
		session,
		role,
		usersPage,
		usersSortBy,
		usersSortDir,
		debouncedSearch,
		roleFilter,
		verifiedFilter,
		statusFilter,
		loadUsers,
	]);

	useEffect(() => {
		if (session && (role === "admin" || role === "moderator")) {
			loadInvites(invitesPage);
		}
	}, [session, role, invitesPage, loadInvites]);

	if (isPending) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-8">
				{/* Header */}
				<div className="mb-8 flex items-center justify-between">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-20" />
				</div>
				{/* Send Invite form */}
				<div className="mb-8">
					<Skeleton className="mb-4 h-5 w-28" />
					<div className="flex flex-wrap gap-3">
						<Skeleton className="h-10 flex-1 min-w-[200px] rounded-md" />
						<Skeleton className="h-10 w-24 rounded-md" />
						<Skeleton className="h-10 w-28 rounded-md" />
					</div>
				</div>
				{/* Users table */}
				<div className="mb-8">
					<Skeleton className="mb-4 h-5 w-24" />
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-gold-dark/30">
									{["w-7","w-16","w-16","w-20","w-20","w-12","w-16","w-14","w-16"].map((w, i) => (
										<th key={i} className="pb-2 pr-4">
											<Skeleton className={`h-4 ${w}`} />
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{Array.from({ length: 5 }).map((_, i) => (
									<tr key={i} className="border-b border-gold-dark/15">
										<td className="py-2 pr-4"><Skeleton className="h-7 w-7 rounded-full" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-24" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-36" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-8" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-12" /></td>
										<td className="py-2"><Skeleton className="h-4 w-16" /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
				{/* Invites table */}
				<div>
					<Skeleton className="mb-4 h-5 w-24" />
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-gold-dark/30">
									{["w-16","w-12","w-14","w-16","w-14"].map((w, i) => (
										<th key={i} className="pb-2 pr-4">
											<Skeleton className={`h-4 ${w}`} />
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{Array.from({ length: 3 }).map((_, i) => (
									<tr key={i} className="border-b border-gold-dark/15">
										<td className="py-2 pr-4"><Skeleton className="h-4 w-36" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2"><Skeleton className="h-4 w-14" /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}

	if (!session || (role !== "admin" && role !== "moderator")) {
		router.push("/home");
		return null;
	}

	const ROLE_HIERARCHY: Record<string, number> = {
		user: 0,
		moderator: 1,
		admin: 2,
	};
	const callerLevel = ROLE_HIERARCHY[role] ?? 0;

	function handleUsersSort(column: string) {
		if (usersSortBy === column) {
			setUsersSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setUsersSortBy(column);
			setUsersSortDir("asc");
		}
		setUsersPage(0);
	}

	function handleSearchChange(value: string) {
		setSearchQuery(value);
		clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			setDebouncedSearch(value);
			setUsersPage(0);
		}, 300);
	}

	function clearSearch() {
		setSearchQuery("");
		setDebouncedSearch("");
		clearTimeout(searchTimerRef.current);
		setUsersPage(0);
	}

	function handleFilterChange(setter: (v: string) => void) {
		return (value: string) => {
			setter(value);
			setUsersPage(0);
		};
	}

	async function handleBan() {
		if (!banTarget) return;
		setBanError("");
		try {
			const body: { reason?: string; expiresInDays?: number } = {};
			if (banReason.trim()) body.reason = banReason.trim();
			if (banDuration !== "permanent") body.expiresInDays = Number(banDuration);

			const res = await fetch(`/api/users/${banTarget.id}/ban`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json();
				setBanError(data.error ?? "Failed to ban user");
				return;
			}
			const banExpires =
				banDuration !== "permanent"
					? new Date(Date.now() + Number(banDuration) * 86400000).toISOString()
					: undefined;
			setUsers((prev) =>
				prev.map((u) =>
					u.id === banTarget.id
						? {
								...u,
								banned: true,
								banReason: banReason.trim() || undefined,
								banExpires,
							}
						: u,
				),
			);
			setBanTarget(null);
			setBanReason("");
			setBanDuration("permanent");
		} catch {
			setBanError("Failed to ban user");
		}
	}

	async function handleResetPassword() {
		if (!resetPasswordTarget) return;
		setResetPasswordError("");
		setResetPasswordSuccess("");
		try {
			const res = await fetch(
				`/api/users/${resetPasswordTarget.id}/reset-password`,
				{ method: "POST" },
			);
			if (!res.ok) {
				const data = await res.json();
				setResetPasswordError(data.error ?? "Failed to reset password");
				return;
			}
			setResetPasswordSuccess(
				`Password reset for ${resetPasswordTarget.name}. A temporary password has been emailed to them.`,
			);
			setResetPasswordTarget(null);
		} catch {
			setResetPasswordError("Failed to reset password");
		}
	}

	async function handleUnban(userId: string) {
		try {
			const res = await fetch(`/api/users/${userId}/ban`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json();
				setRoleError(data.error ?? "Failed to unban user");
				return;
			}
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? {
								...u,
								banned: false,
								banReason: undefined,
								banExpires: undefined,
							}
						: u,
				),
			);
		} catch {
			setRoleError("Failed to unban user");
		}
	}

	async function handleUnlock(userId: string) {
		try {
			const res = await fetch(`/api/users/${userId}/unlock`, {
				method: "POST",
			});
			if (!res.ok) {
				const data = await res.json();
				setRoleError(data.error ?? "Failed to unlock user");
				return;
			}
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? {
								...u,
								failedLoginAttempts: 0,
								lockedUntil: undefined,
							}
						: u,
				),
			);
		} catch {
			setRoleError("Failed to unlock user");
		}
	}

	async function handleRevoke(token: string) {
		setRevokeError("");
		try {
			const res = await fetch(`/api/invites/${token}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json();
				setRevokeError(data.error ?? "Failed to revoke invite");
				return;
			}
			setInvites((prev) =>
				prev.map((inv) => (inv.token === token ? { ...inv, used: true } : inv)),
			);
		} catch {
			setRevokeError("Failed to revoke invite");
		}
	}

	async function handleResend() {
		if (!resendTarget) return;
		setResendError("");
		setResendSuccess("");
		try {
			const res = await fetch("/api/invites", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: resendTarget.email,
					role: resendTarget.role,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				setResendError(data.error ?? "Failed to resend invite");
				setResendTarget(null);
				return;
			}
			setResendSuccess(`Invite resent to ${resendTarget.email}`);
			setResendTarget(null);
			loadInvites(invitesPage);
		} catch {
			setResendError("Failed to resend invite");
			setResendTarget(null);
		}
	}

	async function handleInvite() {
		setInviteError("");
		setInviteSuccess("");
		setInviteLoading(true);

		try {
			const res = await fetch("/api/invites", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
			});

			if (!res.ok) {
				const data = await res.json();
				setInviteError(data.error ?? "Failed to send invite");
				setInviteLoading(false);
				return;
			}

			setInviteSuccess(`Invite sent to ${inviteEmail}`);
			setInviteEmail("");
			setInviteRole("user");
			loadInvites(invitesPage);
		} catch {
			setInviteError("Failed to send invite");
		}

		setInviteLoading(false);
	}

	async function handleRoleChange(userId: string, newRole: string) {
		setRoleError("");
		try {
			const res = await fetch(`/api/users/${userId}/role`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role: newRole }),
			});
			if (!res.ok) {
				const data = await res.json();
				setRoleError(data.error ?? "Failed to update role");
				return;
			}
			setUsers((prev) =>
				prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
			);
		} catch {
			setRoleError("Failed to update role");
		}
	}

	async function handleVerify() {
		if (!verifyTarget) return;
		setVerifyError("");
		setVerifySuccess("");
		try {
			const res = await fetch(`/api/users/${verifyTarget.id}/verify`, {
				method: "POST",
			});
			if (!res.ok) {
				const data = await res.json();
				setVerifyError(data.error ?? "Failed to verify user email");
				return;
			}
			setUsers((prev) =>
				prev.map((u) =>
					u.id === verifyTarget.id ? { ...u, emailVerified: true } : u,
				),
			);
			setVerifySuccess(`Email verified for ${verifyTarget.name}.`);
			setVerifyTarget(null);
		} catch {
			setVerifyError("Failed to verify user email");
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		setDeleteError("");
		setDeleteSuccess("");
		try {
			const res = await fetch(`/api/users/${deleteTarget.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json();
				setDeleteError(data.error ?? "Failed to delete user");
				return;
			}
			setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
			setUsersTotal((t) => t - 1);
			setDeleteSuccess(`User ${deleteTarget.name} has been deleted.`);
			setDeleteTarget(null);
		} catch {
			setDeleteError("Failed to delete user");
		}
	}

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Admin Dashboard
				</h1>
				{(role === "admin" || role === "moderator") && (
					<Link
						href="/admin/audit"
						className="text-sm text-gold-dark hover:text-gold"
					>
						Audit Log
					</Link>
				)}
			</div>

			{/* Send Invite */}
			<section className="mb-8">
				<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
					Send Invite
				</h2>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						setInviteConfirmOpen(true);
					}}
					className="flex flex-wrap gap-3"
				>
					<input
						type="email"
						required
						placeholder="Email address"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						className="flex-1 min-w-[200px] rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
					/>
					<select
						value={inviteRole}
						onChange={(e) => setInviteRole(e.target.value)}
						className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
					>
						<option value="user">User</option>
						{role === "admin" && (
							<>
								<option value="moderator">Moderator</option>
								<option value="admin">Admin</option>
							</>
						)}
					</select>
					<button
						type="submit"
						disabled={inviteLoading}
						className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
					>
						{inviteLoading ? "Sending..." : "Send Invite"}
					</button>
				</form>
				{inviteError && (
					<p className="mt-2 text-sm text-crimson">{inviteError}</p>
				)}
				{inviteSuccess && (
					<p className="mt-2 text-sm text-field-green">{inviteSuccess}</p>
				)}
			</section>

			{/* Users List */}
			<section className="mb-8">
				<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
					Users ({usersTotal})
				</h2>
				{roleError && <p className="mb-3 text-sm text-crimson">{roleError}</p>}
				{resetPasswordError && (
					<p className="mb-3 text-sm text-crimson">{resetPasswordError}</p>
				)}
				{resetPasswordSuccess && (
					<p className="mb-3 text-sm text-field-green">
						{resetPasswordSuccess}
					</p>
				)}
				{verifyError && (
					<p className="mb-3 text-sm text-crimson">{verifyError}</p>
				)}
				{verifySuccess && (
					<p className="mb-3 text-sm text-field-green">{verifySuccess}</p>
				)}
				{deleteError && (
					<p className="mb-3 text-sm text-crimson">{deleteError}</p>
				)}
				{deleteSuccess && (
					<p className="mb-3 text-sm text-field-green">{deleteSuccess}</p>
				)}
				{/* Search & Filters */}
				<div className="mb-4 flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[200px]">
						<input
							type="text"
							placeholder="Search by name or username..."
							value={searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 pr-8 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
						/>
						{searchQuery && (
							<button
								onClick={clearSearch}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70"
								aria-label="Clear search"
							>
								&times;
							</button>
						)}
					</div>
					<select
						value={roleFilter}
						onChange={(e) => handleFilterChange(setRoleFilter)(e.target.value)}
						className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
					>
						<option value="">All Roles</option>
						<option value="user">User</option>
						<option value="moderator">Moderator</option>
						<option value="admin">Admin</option>
					</select>
					<select
						value={verifiedFilter}
						onChange={(e) =>
							handleFilterChange(setVerifiedFilter)(e.target.value)
						}
						className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
					>
						<option value="">All Verified</option>
						<option value="true">Verified</option>
						<option value="false">Unverified</option>
					</select>
					<select
						value={statusFilter}
						onChange={(e) =>
							handleFilterChange(setStatusFilter)(e.target.value)
						}
						className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
					>
						<option value="">All Status</option>
						<option value="active">Active</option>
						<option value="banned">Banned</option>
						<option value="locked">Locked</option>
					</select>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gold-dark/30">
								<th className="pb-2 pr-4 font-medium text-cream/70"></th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("name")}
								>
									Name{" "}
									{usersSortBy === "name" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("email")}
								>
									Email{" "}
									{usersSortBy === "email" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("username")}
								>
									Username{" "}
									{usersSortBy === "username" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("location")}
								>
									Location{" "}
									{usersSortBy === "location" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("role")}
								>
									Role{" "}
									{usersSortBy === "role" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("verified")}
								>
									Verified{" "}
									{usersSortBy === "verified" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th
									className="pb-2 pr-4 font-medium text-cream/70 cursor-pointer select-none hover:text-cream"
									onClick={() => handleUsersSort("status")}
								>
									Status{" "}
									{usersSortBy === "status" &&
										(usersSortDir === "asc" ? "▲" : "▼")}
								</th>
								<th className="pb-2 font-medium text-cream/70 whitespace-nowrap">Actions</th>
							</tr>
						</thead>
						<tbody>
							{usersLoading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<tr key={i} className="border-b border-gold-dark/15">
										<td className="py-2 pr-4"><Skeleton className="h-7 w-7 rounded-full" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-24" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-36" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-8" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-12" /></td>
										<td className="py-2"><Skeleton className="h-4 w-16" /></td>
									</tr>
								))
							) : (
								users.map((u) => (
									<tr key={u.id} className="border-b border-gold-dark/15">
										<td className="py-2 pr-4">
											{u.image ? (
												<img
													src={u.image}
													alt=""
													width={28}
													height={28}
													className="rounded-full object-cover"
												/>
											) : (
												<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-dark/20 text-xs text-gold-dark">
													{u.name.charAt(0).toUpperCase()}
												</span>
											)}
										</td>
										<td className="py-2 pr-4">
											<Link
												href={`/users/${u.id}`}
												className="underline text-cream/80 hover:text-gold"
											>
												{u.name}
											</Link>
										</td>
										<td className="py-2 pr-4 text-cream/50 max-w-[200px] truncate" title={u.email}>{u.email}</td>
										<td className="py-2 pr-4 text-cream/80">
											{u.username ?? "—"}
										</td>
										<td className="py-2 pr-4 text-cream/50 max-w-[140px] truncate" title={u.location ?? ""}>
											{u.location ?? "—"}
										</td>
										<td className="py-2 pr-4">
											{role === "admin" ? (
												<select
													value={u.role ?? "user"}
													disabled={u.id === session.user.id}
													onChange={(e) =>
														setPendingRole({
															userId: u.id,
															name: u.name,
															oldRole: u.role ?? "user",
															newRole: e.target.value,
														})
													}
													className="rounded border border-gold-dark/30 bg-transparent px-2 py-0.5 text-sm text-cream capitalize disabled:opacity-50"
												>
													<option value="user">User</option>
													<option value="moderator">Moderator</option>
													<option value="admin">Admin</option>
												</select>
											) : (
												<span className="capitalize text-cream/80">
													{u.role ?? "user"}
												</span>
											)}
										</td>
										<td className="py-2 pr-4 text-cream/80">
											{u.emailVerified ? "Yes" : "No"}
										</td>
										<td className="py-2 pr-4">
											{u.banned ? (
												<span
													className="text-crimson font-medium"
													title={[
														u.banReason,
														u.banExpires
															? `Expires: ${new Date(u.banExpires).toLocaleDateString()}`
															: null,
													]
														.filter(Boolean)
														.join(" — ")}
												>
													Banned
													{u.banExpires && (
														<span className="ml-1 text-xs text-cream/40">
															until{" "}
															{new Date(u.banExpires).toLocaleDateString()}
														</span>
													)}
												</span>
											) : u.lockedUntil &&
											  new Date(u.lockedUntil) > new Date() ? (
												<span
													className="text-amber-400 font-medium"
													title={`Locked until ${new Date(u.lockedUntil).toLocaleString()}`}
												>
													Locked
													<span className="ml-1 text-xs text-cream/40">
														until{" "}
														{new Date(u.lockedUntil).toLocaleTimeString()}
													</span>
												</span>
											) : (
												<span className="text-field-green">Active</span>
											)}
										</td>
										<td className="py-2 whitespace-nowrap">
											{u.id !== session.user.id &&
												(ROLE_HIERARCHY[u.role ?? "user"] ?? 0) <
													callerLevel && (
													<div className="flex gap-2">
														{u.banned ? (
															<button
																onClick={() =>
																	setUnbanTarget({ id: u.id, name: u.name })
																}
																className="rounded border border-field-green px-2 py-0.5 text-xs text-field-green hover:bg-field-green/10"
															>
																Unban
															</button>
														) : (
															<button
																onClick={() => {
																	setBanTarget(u);
																	setBanError("");
																}}
																className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
															>
																Ban
															</button>
														)}
														{u.lockedUntil &&
														  new Date(u.lockedUntil) > new Date() && (
															<button
																onClick={() =>
																	setUnlockTarget({ id: u.id, name: u.name })
																}
																className="rounded border border-field-green px-2 py-0.5 text-xs text-field-green hover:bg-field-green/10"
															>
																Unlock
															</button>
														)}
														<button
															onClick={() => {
																setResetPasswordTarget({
																	id: u.id,
																	name: u.name,
																});
																setResetPasswordError("");
															}}
															className="rounded border border-gold-dark/40 px-2 py-0.5 text-xs text-cream/50 hover:text-cream/80 hover:bg-gold-dark/10"
														>
															Reset PW
														</button>
														{!u.emailVerified && (
															<button
																onClick={() => {
																	setVerifyTarget({ id: u.id, name: u.name });
																	setVerifyError("");
																}}
																className="rounded border border-field-green px-2 py-0.5 text-xs text-field-green hover:bg-field-green/10"
															>
																Verify
															</button>
														)}
														{role === "admin" && (
															<button
																onClick={() => {
																	setDeleteTarget({ id: u.id, name: u.name });
																	setDeleteError("");
																}}
																className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
															>
																Delete
															</button>
														)}
													</div>
												)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{Math.ceil(usersTotal / PAGE_SIZE) > 1 && (
					<div className="mt-4 flex items-center justify-between">
						<button
							onClick={() => setUsersPage((p) => Math.max(0, p - 1))}
							disabled={usersPage === 0}
							className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
						>
							Previous
						</button>
						<span className="text-sm text-cream/50">
							Page {usersPage + 1} of {Math.ceil(usersTotal / PAGE_SIZE)}
						</span>
						<button
							onClick={() =>
								setUsersPage((p) =>
									Math.min(Math.ceil(usersTotal / PAGE_SIZE) - 1, p + 1),
								)
							}
							disabled={usersPage >= Math.ceil(usersTotal / PAGE_SIZE) - 1}
							className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
						>
							Next
						</button>
					</div>
				)}
			</section>

			{/* Invites List */}
			<section>
				<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
					Invites ({invitesTotal})
				</h2>
				{revokeError && (
					<p className="mb-3 text-sm text-crimson">{revokeError}</p>
				)}
				{resendError && (
					<p className="mb-3 text-sm text-crimson">{resendError}</p>
				)}
				{resendSuccess && (
					<p className="mb-3 text-sm text-field-green">{resendSuccess}</p>
				)}
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gold-dark/30">
								<th className="pb-2 pr-4 font-medium text-cream/70">Email</th>
								<th className="pb-2 pr-4 font-medium text-cream/70">Role</th>
								<th className="pb-2 pr-4 font-medium text-cream/70">Status</th>
								<th className="pb-2 pr-4 font-medium text-cream/70">Expires</th>
								<th className="pb-2 font-medium text-cream/70">Actions</th>
							</tr>
						</thead>
						<tbody>
							{invitesLoading ? (
								Array.from({ length: 3 }).map((_, i) => (
									<tr key={i} className="border-b border-gold-dark/15">
										<td className="py-2 pr-4"><Skeleton className="h-4 w-36" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-16" /></td>
										<td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
										<td className="py-2"><Skeleton className="h-4 w-14" /></td>
									</tr>
								))
							) : (
								invites.map((inv) => {
									const isPending =
										!inv.used && new Date(inv.expiresAt) >= new Date();
									return (
										<tr key={inv.id} className="border-b border-gold-dark/15">
											<td className="py-2 pr-4 text-cream/80">{inv.email}</td>
											<td className="py-2 pr-4 capitalize text-cream/80">
												{inv.role}
											</td>
											<td className="py-2 pr-4 text-cream/80">
												{inv.used
													? "Used"
													: new Date(inv.expiresAt) < new Date()
														? "Expired"
														: "Pending"}
											</td>
											<td className="py-2 pr-4 text-cream/50">
												{new Date(inv.expiresAt).toLocaleDateString()}
											</td>
											<td className="py-2">
												{isPending && (
													<button
														onClick={() =>
															setRevokeTarget({
																token: inv.token,
																email: inv.email,
															})
														}
														className="rounded border border-crimson px-2 py-0.5 text-xs text-crimson hover:bg-crimson/10"
													>
														Revoke
													</button>
												)}
												{!inv.used &&
													new Date(inv.expiresAt) < new Date() && (
														<button
															onClick={() =>
																setResendTarget({
																	email: inv.email,
																	role: inv.role,
																})
															}
															className="rounded border border-gold-dark/40 px-2 py-0.5 text-xs text-cream/70 hover:border-gold/60 hover:text-gold hover:bg-gold-dark/10"
														>
															Resend
														</button>
													)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				{Math.ceil(invitesTotal / PAGE_SIZE) > 1 && (
					<div className="mt-4 flex items-center justify-between">
						<button
							onClick={() => setInvitesPage((p) => Math.max(0, p - 1))}
							disabled={invitesPage === 0}
							className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
						>
							Previous
						</button>
						<span className="text-sm text-cream/50">
							Page {invitesPage + 1} of {Math.ceil(invitesTotal / PAGE_SIZE)}
						</span>
						<button
							onClick={() =>
								setInvitesPage((p) =>
									Math.min(Math.ceil(invitesTotal / PAGE_SIZE) - 1, p + 1),
								)
							}
							disabled={invitesPage >= Math.ceil(invitesTotal / PAGE_SIZE) - 1}
							className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
						>
							Next
						</button>
					</div>
				)}
			</section>

			{/* Role Change Confirmation */}
			<ConfirmDialog
				open={pendingRole !== null}
				title="Change role?"
				message={
					pendingRole
						? `Change ${pendingRole.name}\u2019s role from ${pendingRole.oldRole} to ${pendingRole.newRole}?`
						: ""
				}
				confirmLabel="Change Role"
				onConfirm={() => {
					if (pendingRole) {
						handleRoleChange(pendingRole.userId, pendingRole.newRole);
					}
					setPendingRole(null);
				}}
				onCancel={() => setPendingRole(null)}
			/>

			{/* Send Invite Confirmation */}
			<ConfirmDialog
				open={inviteConfirmOpen}
				title="Send invite?"
				message={`Send invite to ${inviteEmail} as ${inviteRole}?`}
				confirmLabel="Send Invite"
				onConfirm={() => {
					setInviteConfirmOpen(false);
					handleInvite();
				}}
				onCancel={() => setInviteConfirmOpen(false)}
			/>

			{/* Unban Confirmation */}
			<ConfirmDialog
				open={unbanTarget !== null}
				title="Unban user?"
				message={unbanTarget ? `Unban ${unbanTarget.name}?` : ""}
				confirmLabel="Unban"
				onConfirm={() => {
					if (unbanTarget) {
						handleUnban(unbanTarget.id);
					}
					setUnbanTarget(null);
				}}
				onCancel={() => setUnbanTarget(null)}
			/>

			{/* Unlock Confirmation */}
			<ConfirmDialog
				open={unlockTarget !== null}
				title="Unlock account?"
				message={unlockTarget ? `Unlock ${unlockTarget.name}\u2019s account? This will reset their failed login attempts and remove the lockout.` : ""}
				confirmLabel="Unlock"
				onConfirm={() => {
					if (unlockTarget) {
						handleUnlock(unlockTarget.id);
					}
					setUnlockTarget(null);
				}}
				onCancel={() => setUnlockTarget(null)}
			/>

			{/* Revoke Invite Confirmation */}
			<ConfirmDialog
				open={revokeTarget !== null}
				title="Revoke invite?"
				message={revokeTarget ? `Revoke invite to ${revokeTarget.email}?` : ""}
				confirmLabel="Revoke"
				danger
				onConfirm={() => {
					if (revokeTarget) {
						handleRevoke(revokeTarget.token);
					}
					setRevokeTarget(null);
				}}
				onCancel={() => setRevokeTarget(null)}
			/>

			{/* Resend Invite Confirmation */}
			<ConfirmDialog
				open={resendTarget !== null}
				title="Resend invite?"
				message={
					resendTarget
						? `Resend invite to ${resendTarget.email}?`
						: ""
				}
				confirmLabel="Resend"
				onConfirm={() => {
					handleResend();
				}}
				onCancel={() => setResendTarget(null)}
			/>

			{/* Reset Password Confirmation */}
			<ConfirmDialog
				open={resetPasswordTarget !== null}
				title="Reset password?"
				message={
					resetPasswordTarget
						? `Reset ${resetPasswordTarget.name}\u2019s password? A temporary password will be emailed to them.`
						: ""
				}
				confirmLabel="Reset Password"
				danger
				onConfirm={() => {
					handleResetPassword();
				}}
				onCancel={() => setResetPasswordTarget(null)}
			/>

			{/* Verify Email Confirmation */}
			<ConfirmDialog
				open={verifyTarget !== null}
				title="Verify email?"
				message={
					verifyTarget
						? `Manually verify ${verifyTarget.name}\u2019s email address?`
						: ""
				}
				confirmLabel="Verify"
				onConfirm={() => {
					handleVerify();
				}}
				onCancel={() => setVerifyTarget(null)}
			/>

			{/* Delete User Confirmation */}
			<ConfirmDialog
				open={deleteTarget !== null}
				title="Delete user?"
				message={
					deleteTarget
						? `Permanently delete ${deleteTarget.name}? This action cannot be undone.`
						: ""
				}
				confirmLabel="Delete User"
				danger
				onConfirm={() => {
					handleDelete();
				}}
				onCancel={() => setDeleteTarget(null)}
			/>

			{/* Ban Modal */}
			{banTarget && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
					<div className="w-full max-w-md rounded-lg border border-gold-dark/30 bg-charcoal p-6 shadow-lg">
						<h3 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
							Ban {banTarget.name}?
						</h3>
						<div className="mb-4">
							<label className="mb-1 block text-sm font-medium text-cream/70">
								Reason (optional)
							</label>
							<input
								type="text"
								value={banReason}
								onChange={(e) => setBanReason(e.target.value)}
								placeholder="e.g. Spam, harassment"
								className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
							/>
						</div>
						<div className="mb-4">
							<label className="mb-1 block text-sm font-medium text-cream/70">
								Duration
							</label>
							<select
								value={banDuration}
								onChange={(e) => setBanDuration(e.target.value)}
								className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
							>
								<option value="permanent">Permanent</option>
								<option value="1">1 day</option>
								<option value="7">7 days</option>
								<option value="30">30 days</option>
							</select>
						</div>
						{banError && (
							<p className="mb-3 text-sm text-crimson">{banError}</p>
						)}
						<div className="flex justify-end gap-3">
							<button
								onClick={() => {
									setBanTarget(null);
									setBanReason("");
									setBanDuration("permanent");
									setBanError("");
								}}
								className="rounded-md border border-gold-dark/40 px-4 py-2 text-sm text-cream/60 hover:border-gold/60 hover:text-cream hover:bg-gold-dark/10"
							>
								Cancel
							</button>
							<button
								onClick={handleBan}
								className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:bg-crimson/90"
							>
								Confirm Ban
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
