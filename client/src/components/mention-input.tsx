import React, { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MentionPicker } from "@/components/mention-picker";
import { MessageParticipant, parseMentions, Mention } from "@/data/messages";

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: Mention[]) => void;
  participants: MessageParticipant[];
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function MentionInput({
  value,
  onChange,
  participants,
  placeholder,
  className,
  onKeyDown
}: MentionInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPosition(cursor);

    // Check if we should show the mention picker
    const textBeforeCursor = newValue.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show picker if @ is at start or after whitespace, and no space after @
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";

      if ((charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) &&
          !textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);
        setShowPicker(true);
      } else {
        setShowPicker(false);
      }
    } else {
      setShowPicker(false);
    }

    const mentions = parseMentions(newValue, participants);
    onChange(newValue, mentions);
  };

  const handleMentionSelect = (mention: { type: "role" | "user"; value: string; displayName: string }) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = value.slice(cursorPosition);

    const newValue = textBeforeCursor.slice(0, atIndex) + mention.displayName + " " + textAfterCursor;
    const mentions = parseMentions(newValue, participants);
    onChange(newValue, mentions);

    setShowPicker(false);

    // Focus and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPosition = atIndex + mention.displayName.length + 1;
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close picker on Escape
    if (e.key === "Escape" && showPicker) {
      setShowPicker(false);
      e.preventDefault();
      return;
    }

    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      <span ref={anchorRef} className="absolute" style={{ left: 0, bottom: '100%' }} />
      <MentionPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleMentionSelect}
        participants={participants}
        searchQuery={mentionSearch}
        anchorRef={anchorRef}
      />
    </div>
  );
}
