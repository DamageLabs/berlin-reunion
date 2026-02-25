"use client";

import type { RefObject } from "react";

interface MarkdownToolbarProps {
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	onUpdate: (value: string) => void;
}

type Action =
	| { type: "wrap"; before: string; after: string; placeholder: string }
	| { type: "line"; prefix: string; placeholder: string }
	| { type: "block"; before: string; after: string; placeholder: string }
	| { type: "insert"; text: string };

const ACTIONS: { label: string; title: string; action: Action }[] = [
	{
		label: "B",
		title: "Bold",
		action: { type: "wrap", before: "**", after: "**", placeholder: "bold text" },
	},
	{
		label: "I",
		title: "Italic",
		action: { type: "wrap", before: "_", after: "_", placeholder: "italic text" },
	},
	{
		label: "S",
		title: "Strikethrough",
		action: { type: "wrap", before: "~~", after: "~~", placeholder: "strikethrough" },
	},
	{ label: "sep", title: "", action: { type: "insert", text: "" } },
	{
		label: "H1",
		title: "Heading 1",
		action: { type: "line", prefix: "# ", placeholder: "Heading 1" },
	},
	{
		label: "H2",
		title: "Heading 2",
		action: { type: "line", prefix: "## ", placeholder: "Heading 2" },
	},
	{
		label: "H3",
		title: "Heading 3",
		action: { type: "line", prefix: "### ", placeholder: "Heading 3" },
	},
	{ label: "sep", title: "", action: { type: "insert", text: "" } },
	{
		label: "\u2022",
		title: "Bulleted list",
		action: { type: "line", prefix: "- ", placeholder: "List item" },
	},
	{
		label: "1.",
		title: "Numbered list",
		action: { type: "line", prefix: "1. ", placeholder: "List item" },
	},
	{
		label: "\u2611",
		title: "Task list",
		action: { type: "line", prefix: "- [ ] ", placeholder: "Task" },
	},
	{ label: "sep", title: "", action: { type: "insert", text: "" } },
	{
		label: "\u{1F517}",
		title: "Link",
		action: { type: "wrap", before: "[", after: "](url)", placeholder: "link text" },
	},
	{
		label: "\u{1F5BC}",
		title: "Image",
		action: { type: "insert", text: "![alt text](image-url)" },
	},
	{ label: "sep", title: "", action: { type: "insert", text: "" } },
	{
		label: "<>",
		title: "Inline code",
		action: { type: "wrap", before: "`", after: "`", placeholder: "code" },
	},
	{
		label: "```",
		title: "Code block",
		action: { type: "block", before: "```\n", after: "\n```", placeholder: "code" },
	},
	{
		label: "\u201C",
		title: "Blockquote",
		action: { type: "line", prefix: "> ", placeholder: "Quote" },
	},
	{
		label: "\u2014",
		title: "Horizontal rule",
		action: { type: "insert", text: "\n---\n" },
	},
];

function applyAction(
	textarea: HTMLTextAreaElement,
	action: Action,
	onUpdate: (value: string) => void,
) {
	const { selectionStart, selectionEnd, value } = textarea;
	const selected = value.slice(selectionStart, selectionEnd);

	let newValue: string;
	let cursorStart: number;
	let cursorEnd: number;

	switch (action.type) {
		case "wrap": {
			const text = selected || action.placeholder;
			newValue =
				value.slice(0, selectionStart) +
				action.before +
				text +
				action.after +
				value.slice(selectionEnd);
			cursorStart = selectionStart + action.before.length;
			cursorEnd = cursorStart + text.length;
			break;
		}
		case "line": {
			// Find start of current line
			const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
			const text = selected || action.placeholder;
			newValue =
				value.slice(0, lineStart) +
				action.prefix +
				text +
				value.slice(selected ? selectionEnd : selectionStart);
			if (selected) {
				cursorStart = lineStart + action.prefix.length;
				cursorEnd = cursorStart + text.length;
			} else {
				cursorStart = lineStart + action.prefix.length;
				cursorEnd = cursorStart + text.length;
			}
			break;
		}
		case "block": {
			const text = selected || action.placeholder;
			// Ensure we're on a new line
			const needsNewlineBefore =
				selectionStart > 0 && value[selectionStart - 1] !== "\n";
			const prefix = needsNewlineBefore ? "\n" : "";
			newValue =
				value.slice(0, selectionStart) +
				prefix +
				action.before +
				text +
				action.after +
				value.slice(selectionEnd);
			cursorStart =
				selectionStart + prefix.length + action.before.length;
			cursorEnd = cursorStart + text.length;
			break;
		}
		case "insert": {
			newValue =
				value.slice(0, selectionStart) +
				action.text +
				value.slice(selectionEnd);
			cursorStart = selectionStart + action.text.length;
			cursorEnd = cursorStart;
			break;
		}
	}

	onUpdate(newValue);

	// Restore focus and selection after React re-render
	requestAnimationFrame(() => {
		textarea.focus();
		textarea.setSelectionRange(cursorStart, cursorEnd);
	});
}

const btnClass =
	"rounded px-1.5 py-1 text-xs text-cream/60 hover:bg-gold-dark/20 hover:text-gold transition-colors";

export default function MarkdownToolbar({
	textareaRef,
	onUpdate,
}: MarkdownToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-gold-dark/30 bg-charcoal-light/80 px-1.5 py-1">
			{ACTIONS.map((item, i) => {
				if (item.label === "sep") {
					return (
						<span
							key={i}
							className="mx-1 h-4 w-px bg-gold-dark/20"
						/>
					);
				}
				return (
					<button
						key={i}
						type="button"
						title={item.title}
						onClick={() => {
							const ta = textareaRef.current;
							if (ta) applyAction(ta, item.action, onUpdate);
						}}
						className={`${btnClass} ${
							item.label === "B"
								? "font-bold"
								: item.label === "I"
									? "italic"
									: item.label === "S"
										? "line-through"
										: ""
						}`}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}
