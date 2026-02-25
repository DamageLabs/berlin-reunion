"use client";

import { useRef, useState } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MarkdownToolbar from "@/components/pages/MarkdownToolbar";
import { slugify } from "@/lib/slug";

const inputClass =
	"mt-1 w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none";

interface PageEditorProps {
	initialTitle?: string;
	initialSlug?: string;
	initialContent?: string;
	initialPublished?: boolean;
	initialVisibility?: "public" | "private";
	onSave: (data: {
		title: string;
		slug: string;
		content: string;
		published: boolean;
		visibility: "public" | "private";
	}) => Promise<void>;
	onCancel: () => void;
}

export default function PageEditor({
	initialTitle = "",
	initialSlug = "",
	initialContent = "",
	initialPublished = false,
	initialVisibility = "public",
	onSave,
	onCancel,
}: PageEditorProps) {
	const [title, setTitle] = useState(initialTitle);
	const [slug, setSlug] = useState(initialSlug);
	const [content, setContent] = useState(initialContent);
	const [published, setPublished] = useState(initialPublished);
	const [visibility, setVisibility] = useState<"public" | "private">(initialVisibility);
	const [tab, setTab] = useState<"write" | "preview">("write");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [slugManual, setSlugManual] = useState(!!initialSlug);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	function handleTitleChange(value: string) {
		setTitle(value);
		if (!slugManual) {
			setSlug(slugify(value));
		}
	}

	function handleSlugChange(value: string) {
		setSlugManual(true);
		setSlug(slugify(value));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!title.trim()) {
			setError("Title is required");
			return;
		}
		if (!slug.trim()) {
			setError("Slug is required");
			return;
		}

		setSaving(true);
		try {
			await onSave({
				title: title.trim(),
				slug: slug.trim(),
				content,
				published,
				visibility,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{error && (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			<div>
				<label className="text-sm font-medium text-cream/70">Title</label>
				<input
					type="text"
					value={title}
					onChange={(e) => handleTitleChange(e.target.value)}
					className={inputClass}
					placeholder="Page title"
				/>
			</div>

			<div>
				<label className="text-sm font-medium text-cream/70">Slug</label>
				<div className="mt-1 flex items-center gap-2">
					<span className="text-sm text-cream/40">/pages/</span>
					<input
						type="text"
						value={slug}
						onChange={(e) => handleSlugChange(e.target.value)}
						className={`${inputClass} mt-0 flex-1`}
						placeholder="url-friendly-slug"
					/>
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between mb-1">
					<label className="text-sm font-medium text-cream/70">Content</label>
					<div className="flex rounded-md border border-gold-dark/30 overflow-hidden">
						<button
							type="button"
							onClick={() => setTab("write")}
							className={`px-3 py-1 text-xs font-medium ${
								tab === "write"
									? "bg-gold-dark/20 text-gold"
									: "text-cream/50 hover:text-cream/70"
							}`}
						>
							Write
						</button>
						<button
							type="button"
							onClick={() => setTab("preview")}
							className={`px-3 py-1 text-xs font-medium ${
								tab === "preview"
									? "bg-gold-dark/20 text-gold"
									: "text-cream/50 hover:text-cream/70"
							}`}
						>
							Preview
						</button>
					</div>
				</div>
				{tab === "write" ? (
					<div>
						<MarkdownToolbar textareaRef={textareaRef} onUpdate={setContent} />
						<textarea
							ref={textareaRef}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							className={`${inputClass} mt-0 min-h-[400px] rounded-t-none font-mono text-sm`}
							placeholder="Write your markdown content here..."
						/>
					</div>
				) : (
					<div className="mt-1 min-h-[400px] rounded-md border border-gold-dark/30 bg-charcoal-light p-4">
						{content ? (
							<MarkdownRenderer content={content} />
						) : (
							<p className="text-sm text-cream/30">Nothing to preview</p>
						)}
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-6">
				<label className="flex items-center gap-2 text-sm text-cream/70">
					<input
						type="checkbox"
						checked={published}
						onChange={(e) => setPublished(e.target.checked)}
						className="accent-gold"
					/>
					Published
				</label>

				<div className="flex items-center gap-2">
					<label className="text-sm font-medium text-cream/70">Visibility</label>
					<select
						value={visibility}
						onChange={(e) => setVisibility(e.target.value as "public" | "private")}
						className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-1.5 text-sm text-cream focus:border-gold/50 focus:outline-none"
					>
						<option value="public">Public — all members can view</option>
						<option value="private">Private — moderators &amp; admins only</option>
					</select>
				</div>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-gold-dark/20">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-md border border-gold-dark/30 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/60 hover:text-cream/80"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving}
					className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30 disabled:opacity-50"
				>
					{saving ? "Saving…" : "Save Page"}
				</button>
			</div>
		</form>
	);
}
