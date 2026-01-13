import React from "react";
import { Mention } from "@/data/messages";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  mentions?: Mention[];
  className?: string;
}

export function MentionText({ text, mentions = [], className }: MentionTextProps) {
  if (!mentions || mentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort mentions by startIndex
  const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, idx) => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>
          {text.slice(lastIndex, mention.startIndex)}
        </span>
      );
    }

    // Add highlighted mention
    parts.push(
      <span
        key={`mention-${idx}`}
        className={cn(
          "px-1 py-0.5 rounded font-medium",
          mention.type === "role"
            ? "bg-primary/15 text-primary"
            : "bg-blue-500/15 text-blue-600"
        )}
        title={mention.type === "role" ? "Role mention" : "User mention"}
      >
        {mention.displayName}
      </span>
    );

    lastIndex = mention.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-final">{text.slice(lastIndex)}</span>);
  }

  return <span className={className}>{parts}</span>;
}
