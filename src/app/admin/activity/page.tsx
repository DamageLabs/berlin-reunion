"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";

const ACTION_LABELS: Record<string, string> = {
	"role.change": "Role Change",
	"user.ban": "Ban",
	"user.unban": "Unban",
	"invite.create": "Invite Created",
	"invite.revoke": "Invite Revoked",
	"email.change": "Email Change",
	"password.reset": "Password Reset",
	"login.success": "Login",
	"login.failure": "Failed Login",
	"user.lockout": "Lockout",
	"user.unlock": "Unlock",
};

interface ActivityData {
	totalMembers: number;
	activeUsers30d: number;
	newSignupsThisWeek: number;
	newSignupsThisMonth: number;
	failedLogins7d: number;
	failedLogins30d: number;
	lockedAccounts: number;
	bannedAccounts: number;
	activeSessions: number;
	signupTrend: { week: string; count: number }[];
	recentActivity: {
		id: string;
		action: string;
		actorId: string | null;
		actorName: string | null;
		createdAt: string;
	}[];
}

function relativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	return `${days}d ago`;
}

export default function ActivityDashboardPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [data, setData] = useState<ActivityData | null>(null);
	const [loading, setLoading] = useState(true);

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";

	useEffect(() => {
		if (session && (role === "admin" || role === "moderator")) {
			fetch("/api/admin/activity")
				.then((res) => (res.ok ? res.json() : null))
				.then((d) => {
					if (d) setData(d);
				})
				.finally(() => setLoading(false));
		}
	}, [session, role]);

	if (isPending) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-8">
				<div className="mb-6 flex items-center justify-between">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-28" />
				</div>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (!session || (role !== "admin" && role !== "moderator")) {
		router.push("/home");
		return null;
	}

	const maxTrend = data
		? Math.max(...data.signupTrend.map((w) => w.count), 1)
		: 1;

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
					Activity Dashboard
				</h1>
				<Link
					href="/admin"
					className="text-sm text-gold-dark hover:text-gold"
				>
					Back to Dashboard
				</Link>
			</div>

			{loading || !data ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
			) : (
				<>
					{/* Stat Cards */}
					<div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						<StatCard
							label="Total Members"
							value={data.totalMembers}
							color="text-gold"
						/>
						<StatCard
							label="Active Users (30d)"
							value={data.activeUsers30d}
							color="text-gold"
						/>
						<StatCard
							label="Signups (7d)"
							value={data.newSignupsThisWeek}
							color="text-field-green"
						/>
						<StatCard
							label="Signups (30d)"
							value={data.newSignupsThisMonth}
							color="text-field-green"
						/>
						<StatCard
							label="Failed Logins (7d)"
							value={data.failedLogins7d}
							color={data.failedLogins7d > 0 ? "text-crimson" : undefined}
						/>
						<StatCard
							label="Failed Logins (30d)"
							value={data.failedLogins30d}
							color={data.failedLogins30d > 0 ? "text-crimson" : undefined}
						/>
						<StatCard
							label="Locked Accounts"
							value={data.lockedAccounts}
							color={data.lockedAccounts > 0 ? "text-amber-400" : undefined}
						/>
						<StatCard
							label="Banned Accounts"
							value={data.bannedAccounts}
						/>
						<StatCard
							label="Active Sessions"
							value={data.activeSessions}
						/>
					</div>

					{/* Signup Trend */}
					<section className="mb-8">
						<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
							Signup Trend (12 Weeks)
						</h2>
						<div className="space-y-1.5">
							{data.signupTrend.map((w) => (
								<div key={w.week} className="flex items-center gap-3 text-sm">
									<span className="w-20 shrink-0 text-right text-cream/50">
										{w.week}
									</span>
									<div className="flex-1">
										<div
											className="h-5 rounded bg-gold-dark/40"
											style={{
												width: `${Math.max((w.count / maxTrend) * 100, w.count > 0 ? 4 : 0)}%`,
											}}
										/>
									</div>
									<span className="w-8 text-right text-cream/70">{w.count}</span>
								</div>
							))}
						</div>
					</section>

					{/* Recent Activity */}
					<section className="mb-8">
						<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
							Recent Activity
						</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b border-gold-dark/30">
										<th className="pb-2 pr-4 font-medium text-cream/70">
											Time
										</th>
										<th className="pb-2 pr-4 font-medium text-cream/70">
											Action
										</th>
										<th className="pb-2 font-medium text-cream/70">Actor</th>
									</tr>
								</thead>
								<tbody>
									{data.recentActivity.map((entry) => (
										<tr
											key={entry.id}
											className="border-b border-gold-dark/15"
										>
											<td className="py-2 pr-4 text-cream/50">
												{relativeTime(entry.createdAt)}
											</td>
											<td className="py-2 pr-4">
												<Link
													href={`/admin/audit?action=${encodeURIComponent(entry.action)}`}
													className="text-cream/80 underline hover:text-gold"
												>
													{ACTION_LABELS[entry.action] ?? entry.action}
												</Link>
											</td>
											<td className="py-2 text-cream/80">
												{entry.actorName ?? entry.actorId ?? "—"}
											</td>
										</tr>
									))}
									{data.recentActivity.length === 0 && (
										<tr>
											<td
												colSpan={3}
												className="py-8 text-center text-cream/40"
											>
												No recent activity.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>

					{/* Quick Links */}
					<section>
						<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-cream/80">
							Quick Links
						</h2>
						<div className="flex flex-wrap gap-3">
							<QuickLink href="/admin/audit?action=login.success" label="All Logins" />
							<QuickLink href="/admin/audit?action=login.failure" label="Failed Logins" />
							<QuickLink href="/admin/audit?action=user.lockout" label="Lockouts" />
							<QuickLink href="/admin/audit?action=user.ban" label="Bans" />
						</div>
					</section>
				</>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color?: string;
}) {
	return (
		<div className="rounded-lg border border-gold-dark/20 p-4 text-center">
			<div
				className={`font-[family-name:var(--font-oswald)] text-3xl font-bold ${color ?? "text-cream/80"}`}
			>
				{value}
			</div>
			<div className="mt-1 text-xs text-cream/50">{label}</div>
		</div>
	);
}

function QuickLink({ href, label }: { href: string; label: string }) {
	return (
		<Link
			href={href}
			className="rounded-md border border-gold-dark/30 px-4 py-2 text-sm text-cream/70 hover:border-gold/60 hover:text-gold"
		>
			{label}
		</Link>
	);
}
