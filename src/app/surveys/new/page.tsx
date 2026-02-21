"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import SurveyBuilder from "@/components/surveys/SurveyBuilder";

export default function NewSurveyPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	const role = session
		? ((session.user as { role?: string }).role ?? "user")
		: "user";
	const isMod = role === "admin" || role === "moderator";

	if (isPending) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-8">
				<div className="h-8 w-48 animate-pulse rounded bg-gold-dark/10" />
				<div className="mt-4 h-96 animate-pulse rounded-lg bg-gold-dark/10" />
			</div>
		);
	}

	if (!session || !isMod) {
		router.push("/surveys");
		return null;
	}

	async function handleSave(data: {
		title: string;
		description: string;
		questions: { type: string; prompt: string; options: string[]; required: boolean }[];
	}) {
		const res = await fetch("/api/surveys", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error || "Failed to create survey");
		}

		const { id } = await res.json();
		router.push(`/surveys/${id}`);
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
				New Survey
			</h1>
			<div className="mt-6">
				<SurveyBuilder
					onSave={handleSave}
					onCancel={() => router.push("/surveys")}
				/>
			</div>
		</div>
	);
}
