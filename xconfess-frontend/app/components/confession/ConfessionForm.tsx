"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { CharacterCounter } from "./CharacterCounter";
import { FormattingToolbar } from "./FormattingToolbar";
import { PreviewPanel } from "./PreviewPanel";
import { DraftManager } from "./DraftManager";
import { StellarAnchorToggle } from "./StellarAnchorToggle";
import {
  validateConfessionForm,
  Gender,
  type ConfessionFormData,
  type ValidationErrors,
} from "@/app/lib/utils/validation";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";
import { Draft } from "@/app/lib/hooks/useDrafts";
import { Eye, EyeOff, Send, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils/cn";

interface ConfessionFormProps {
  onSubmit?: (data: ConfessionFormData & { stellarTxHash?: string }) => void;
  className?: string;
}

export const ConfessionForm: React.FC<ConfessionFormProps> = ({
  onSubmit,
  className,
}) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [enableStellarAnchor, setEnableStellarAnchor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [stellarTxHash, setStellarTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { anchor } = useStellarWallet();

  useEffect(() => {
    const validationErrors = validateConfessionForm({
      title,
      body,
      gender,
      enableStellarAnchor,
    });
    setErrors(validationErrors);
  }, [title, body, gender, enableStellarAnchor]);

  const handleLoadDraft = (draft: Draft) => {
    setTitle(draft.title || "");
    setBody(draft.body);
    setGender(draft.gender);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleTextChange = (newText: string, cursorPos: number) => {
    setBody(newText);
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (textareaRef.current) {
          const maxPos = textareaRef.current.value.length;
          const safeCursorPos = Math.min(cursorPos, maxPos);
          textareaRef.current.setSelectionRange(safeCursorPos, safeCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    const validationErrors = validateConfessionForm({
      title,
      body,
      gender,
      enableStellarAnchor,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      let txHash: string | undefined;

      if (enableStellarAnchor) {
        const anchorResult = await anchor(body);
        if (anchorResult.success && anchorResult.txHash) {
          txHash = anchorResult.txHash;
          setStellarTxHash(txHash);
        } else {
          setSubmitError(
            anchorResult.error || "Failed to anchor confession on Stellar",
          );
          setIsSubmitting(false);
          return;
        }
      }

      const response = await fetch("/api/confessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || undefined,
          body,
          message: body,
          gender,
          stellarTxHash: txHash,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to submit confession: ${response.statusText}`,
        );
      }

      setSubmitSuccess(true);

      if (onSubmit) {
        onSubmit({
          title,
          body,
          gender,
          enableStellarAnchor,
          stellarTxHash: txHash,
        });
      }

      setTitle("");
      setBody("");
      setGender(undefined);
      setEnableStellarAnchor(false);
      setStellarTxHash(null);

      setTimeout(() => {
        setSubmitSuccess(false);
        setIsPreviewMode(false);
      }, 2000);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit confession";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Share Your Confession</CardTitle>
        <CardDescription>
          Express yourself anonymously. Your confession will be shared with the
          community.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Title Field */}
          <div>
            <label
              htmlFor="confession-title"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Title <span className="text-zinc-500">(optional)</span>
            </label>
            <Input
              id="confession-title"
              type="text"
              placeholder="Give your confession a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!errors.title}
              maxLength={200}
              aria-describedby={errors.title ? "title-error" : "title-counter"}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.title ? (
                <p
                  id="title-error"
                  className="text-xs text-red-400"
                  role="alert"
                >
                  {errors.title}
                </p>
              ) : (
                <div />
              )}
              <CharacterCounter
                current={title.length}
                max={200}
                id="title-counter"
              />
            </div>
          </div>

          {/* Body Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="confession-body"
                className="block text-sm font-medium text-zinc-300"
              >
                Confession <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <DraftManager
                  currentDraft={{ title, body, gender }}
                  onLoadDraft={handleLoadDraft}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  aria-label={
                    isPreviewMode
                      ? "Switch to edit mode"
                      : "Switch to preview mode"
                  }
                  className="flex items-center gap-2"
                >
                  {isPreviewMode ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isPreviewMode ? (
              <PreviewPanel
                title={title}
                body={body}
              />
            ) : (
              <>
                <FormattingToolbar
                  textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
                  onTextChange={handleTextChange}
                />
                <textarea
                  id="confession-body"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your thoughts, feelings, or experiences..."
                  className={cn(
                    "mt-2 flex w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-white",
                    "placeholder:text-zinc-500 min-h-[200px] resize-y",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    "focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
                    errors.body
                      ? "border-red-500 focus-visible:ring-red-500"
                      : "border-zinc-700 focus-visible:border-zinc-600",
                  )}
                  maxLength={5000}
                  aria-describedby={errors.body ? "body-error" : "body-counter"}
                  aria-required="true"
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.body ? (
                    <p
                      id="body-error"
                      className="text-xs text-red-400"
                      role="alert"
                    >
                      {errors.body}
                    </p>
                  ) : (
                    <div />
                  )}
                  <CharacterCounter
                    current={body.length}
                    max={5000}
                    id="body-counter"
                  />
                </div>
              </>
            )}
          </div>

          {/* Gender Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Gender <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="flex gap-4">
              {Object.values(Gender).map((g) => (
                <label
                  key={g}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-4 h-4 border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  />
                  <span className="text-sm text-zinc-300 capitalize">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stellar Anchoring */}
          <StellarAnchorToggle
            enabled={enableStellarAnchor}
            onToggle={setEnableStellarAnchor}
            transactionHash={stellarTxHash}
          />

          {/* Submit Error */}
          {submitError && (
            <div
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3"
              role="alert"
            >
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Submit Success */}
          {submitSuccess && (
            <div
              className="rounded-lg border border-green-500/20 bg-green-500/10 p-3"
              role="alert"
            >
              <p className="text-sm text-green-400">
                Confession submitted successfully!
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitle("");
                setBody("");
                setGender(undefined);
                setEnableStellarAnchor(false);
                setErrors({});
                setSubmitError(null);
                setSubmitSuccess(false);
                setStellarTxHash(null);
                setIsPreviewMode(false);
              }}
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || !!errors.body || body.trim().length < 10
              }
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
