"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const styledComponents: Components = {
  ol({ children }) {
    return <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  p({ children }) {
    return <p className="my-1.5 leading-relaxed">{children}</p>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-3 mb-1.5">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mt-2.5 mb-1">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>;
  },
  code({ children }) {
    return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
  },
  hr() {
    return <hr className="border-border/40 my-3" />;
  },
};

export function MarkdownRenderer({
  content,
  proseEnabled,
}: {
  content: string;
  proseEnabled?: boolean;
}) {
  return (
    <div className="prose-invert text-sm leading-relaxed">
      <ReactMarkdown components={proseEnabled ? styledComponents : undefined}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
