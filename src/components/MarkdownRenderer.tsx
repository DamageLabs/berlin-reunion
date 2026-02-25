"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownRendererProps {
	content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
	return (
		<div className="prose-dark">
			<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
