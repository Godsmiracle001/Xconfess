"use client";

import { useState } from "react";
import { Bold, Italic, Link, Smile } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Modal } from "@/app/components/ui/modal";
import { Input } from "@/app/components/ui/input";
import {
  insertBold,
  insertItalic,
  insertLink,
  insertEmoji,
} from "@/app/lib/utils/markdown";

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onTextChange?: (newText: string, cursorPos: number) => void;
}

const COMMON_EMOJIS = [
  "😀",
  "😂",
  "❤️",
  "😢",
  "🤯",
  "😊",
  "😍",
  "🤔",
  "👍",
  "👎",
  "🔥",
  "💯",
  "✨",
  "🎉",
  "🙏",
  "💪",
];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  textareaRef,
  onTextChange,
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const handleBold = () => {
    if (textareaRef.current) {
      const { newText, cursorPos } = insertBold(textareaRef.current);
      if (onTextChange) {
        onTextChange(newText, cursorPos);
      }
    }
  };

  const handleItalic = () => {
    if (textareaRef.current) {
      const { newText, cursorPos } = insertItalic(textareaRef.current);
      if (onTextChange) {
        onTextChange(newText, cursorPos);
      }
    }
  };

  const handleLink = () => {
    setIsLinkModalOpen(true);
  };

  const handleInsertLink = () => {
    if (textareaRef.current) {
      const { newText, cursorPos } = insertLink(
        textareaRef.current,
        linkUrl || undefined,
      );
      if (onTextChange) {
        onTextChange(newText, cursorPos);
      }
      setLinkUrl("");
      setIsLinkModalOpen(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (textareaRef.current) {
      const { newText, cursorPos } = insertEmoji(textareaRef.current, emoji);
      if (onTextChange) {
        onTextChange(newText, cursorPos);
      }
    }
    setIsEmojiPickerOpen(false);
  };

  return (
    <>
      <div
        className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 overflow-x-auto"
        role="toolbar"
        aria-label="Text formatting"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          aria-label="Bold"
          title="Bold (Ctrl+B)"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          aria-label="Italic"
          title="Italic (Ctrl+I)"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLink}
          aria-label="Insert link"
          title="Insert link"
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            aria-label="Insert emoji"
            title="Insert emoji"
            className="h-8 w-8 p-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
          {isEmojiPickerOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
              <div className="grid grid-cols-8 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="rounded p-1 text-lg hover:bg-zinc-800 transition-colors"
                    aria-label={`Insert ${emoji} emoji`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setLinkUrl("");
        }}
        title="Insert Link"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="link-url"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              URL
            </label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInsertLink();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false);
                setLinkUrl("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleInsertLink}>
              Insert Link
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
