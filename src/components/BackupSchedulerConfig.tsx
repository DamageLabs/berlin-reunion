"use client";

import { useState, useEffect } from "react";

interface Config {
	dailyEnabled: boolean;
	weeklyEnabled: boolean;
	monthlyEnabled: boolean;
	dailyRetention: number;
	weeklyRetention: number;
	monthlyRetention: number;
}

const SCHEDULES = [
	{ key: "daily" as const, label: "Daily", enabledKey: "dailyEnabled" as const, retentionKey: "dailyRetention" as const },
	{ key: "weekly" as const, label: "Weekly", enabledKey: "weeklyEnabled" as const, retentionKey: "weeklyRetention" as const },
	{ key: "monthly" as const, label: "Monthly", enabledKey: "monthlyEnabled" as const, retentionKey: "monthlyRetention" as const },
];

export default function BackupSchedulerConfig() {
	const [config, setConfig] = useState<Config | null>(null);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

	useEffect(() => {
		fetch("/api/admin/backups/config")
			.then((res) => res.json())
			.then((data) => setConfig(data))
			.catch(() => setFeedback({ type: "error", message: "Failed to load scheduler settings" }));
	}, []);

	async function handleSave() {
		if (!config) return;
		setSaving(true);
		setFeedback(null);
		try {
			const res = await fetch("/api/admin/backups/config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
			});
			if (res.ok) {
				const data = await res.json();
				setConfig(data);
				setFeedback({ type: "success", message: "Settings saved" });
			} else {
				const body = await res.json();
				setFeedback({ type: "error", message: body.error ?? "Save failed" });
			}
		} catch {
			setFeedback({ type: "error", message: "Save failed" });
		}
		setSaving(false);
	}

	if (!config) return null;

	return (
		<div className="mb-8 rounded-lg border border-gold-dark/20 bg-charcoal-light p-5">
			<h2 className="mb-4 font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
				Scheduler Settings
			</h2>

			<div className="space-y-3">
				{SCHEDULES.map(({ key, label, enabledKey, retentionKey }) => (
					<div key={key} className="flex items-center gap-4">
						<label className="flex w-28 items-center gap-2 text-sm text-cream/80">
							<input
								type="checkbox"
								checked={config[enabledKey]}
								onChange={(e) =>
									setConfig({ ...config, [enabledKey]: e.target.checked })
								}
								className="h-4 w-4 rounded border-gold-dark/40 accent-gold"
							/>
							{label}
						</label>
						<div className="flex items-center gap-2">
							<span className={`text-xs ${config[enabledKey] ? "text-cream/50" : "text-cream/25"}`}>
								Keep
							</span>
							<input
								type="number"
								min={1}
								max={365}
								value={config[retentionKey]}
								onChange={(e) =>
									setConfig({
										...config,
										[retentionKey]: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
									})
								}
								disabled={!config[enabledKey]}
								className="w-16 rounded border border-gold-dark/30 bg-charcoal px-2 py-1 text-center text-sm text-cream/80 disabled:opacity-40"
							/>
							<span className={`text-xs ${config[enabledKey] ? "text-cream/50" : "text-cream/25"}`}>
								backups
							</span>
						</div>
					</div>
				))}
			</div>

			<div className="mt-4 flex items-center gap-3">
				<button
					type="button"
					onClick={handleSave}
					disabled={saving}
					className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save Settings"}
				</button>
				{feedback && (
					<span
						className={`text-sm ${feedback.type === "success" ? "text-field-green" : "text-crimson"}`}
					>
						{feedback.message}
					</span>
				)}
			</div>

			<p className="mt-3 text-xs text-cream/35">
				Changes take effect on the next hourly check.
			</p>
		</div>
	);
}
