"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  ValidationErrors,
} from "@/app/lib/utils/validation";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";
import { useDrafts, Draft } from "@/app/lib/hooks/useDrafts";
import { Eye, EyeOff, Send, Loader2, CloudDownload } from "lucide-react";
import { cn } from "@/app/lib/utils/cn";
import apiClient from "@/app/lib/api/client";
import { getErrorMessage } from "@/app/lib/utils/errorHandler";
import { useGlobalToast } from "@/app/components/common/Toast";

interface EnhancedConfessionFormProps {
  onSubmit?: (data: ConfessionFormData & { stellarTxHash?: string }) => void;
  className?: string;
}

export const EnhancedConfessionForm: React.FC<EnhancedConfessionFormProps> = ({
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

  // Issue #454: State for backend reconciliation
  const [newerCloudDraft, setNewerCloudDraft] = useState<{
    title?: string;
    body?: string;
    content?: string;
    gender?: Gender;
    scheduledFor?: string;
    updatedAt?: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { anchor } = useStellarWallet();
  const toast = useGlobalToast();
  const { drafts } = useDrafts();

  // Issue #454: Backend synchronization check
  const checkForNewerDrafts = useCallback(async () => {
    try {
      // Fetch latest drafts from the backend
      const response = await apiClient.get('/confessions/drafts');
      const cloudDrafts = response.data;
      
      if (cloudDrafts && cloudDrafts.length > 0) {
        const latestCloudDraft = cloudDrafts[0];
        const latestLocalDraft = drafts[0];

        // Compare timestamps. If cloud is newer, trigger prompt.
        if (
          !latestLocalDraft || 
          new Date(latestCloudDraft.updatedAt).getTime() > latestLocalDraft.savedAt
        ) {
          setNewerCloudDraft(latestCloudDraft);
        }
      }
    } catch (error) {
      // Silently fail if endpoint doesn't exist or user isn't logged in
      console.debug("Could not sync drafts from backend:", error);
    }
  }, [drafts]);

  // Issue #454: Trigger reconciliation on component mount and tab focus (device wake)
  useEffect(() => {
    checkForNewerDrafts();
    
    const handleFocus = () => {
      checkForNewerDrafts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkForNewerDrafts]);

  const recoverCloudDraft = () => {
    if (newerCloudDraft) {
      setTitle(newerCloudDraft.title || "");
      setBody(newerCloudDraft.body || newerCloudDraft.content || ""); 
      if (newerCloudDraft.gender) setGender(newerCloudDraft.gender as Gender);
      
      // Preserve scheduled metadata locally (inform the user)
      if (newerCloudDraft.scheduledFor) {
        toast.info("Restored draft with scheduled publish metadata.");
      }
      
      setNewerCloudDraft(null);
    }
  };

  // Removed premature validation effect
  useEffect(() => {
    // Only clear errors when user starts typing to improve UX
    if (Object.keys(errors).length > 0) {
      const validationErrors = validateConfessionForm({
        title,
        body,
        gender,
        enableStellarAnchor,
      });
      // Only update if errors are cleared
      if (Object.keys(validationErrors).length < Object.keys(errors).length) {
        setErrors(validationErrors);
      }
    }
  }, [title, body, gender, enableStellarAnchor, errors]);

  const handleLoadDraft = (draft: Draft) => {
    setTitle(draft.title || "");
    setBody(draft.body);
    setGender(draft.gender);
    setNewerCloudDraft(null); // Dismiss sync prompt if loading locally
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

      await apiClient.post("/confessions", {
        title: title || undefined,
        body,
        message: body,
        gender,
        stellarTxHash: txHash,
      });

      setSubmitSuccess(true);
      toast.success("Confession submitted successfully!");

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
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // This function closes the when the "esc" key is pressed
  useEffect(() => {
    if (!isPreviewMode) return;

    const closePreviewOnEscPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPreviewMode(false);

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    };

    window.addEventListener("keydown", closePreviewOnEscPress);

    return () => {
      window.removeEventListener("keydown", closePreviewOnEscPress);
    };
  }, [isPreviewMode]);

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
        {/* Issue #454: Cloud Draft Reconciliation Prompt */}
        {newerCloudDraft && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200 font-medium">A newer draft was saved on another device/tab.</p>
              <p className="text-xs text-blue-300/70 mt-1">Do you want to load the cloud version to prevent data loss?</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNewerCloudDraft(null)} className="text-zinc-400 hover:text-white">
                Dismiss
              </Button>
              <Button size="sm" onClick={recoverCloudDraft} className="bg-blue-600 hover:bg-blue-700 text-white">
                <CloudDownload className="w-4 h-4 mr-2" />
                Load Cloud Draft
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              aria-required="true"
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
              <PreviewPanel title={title} body={body} />
            ) : (
              <>
                <FormattingToolbar
                  textareaRef={textareaRef}
                  onTextChange={handleTextChange}
                />
                <textarea
                  id="confession-body"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your thoughts, feelings, or experiences..."
                  className={cn(
                    "mt-2 flex w-full rounded-lg border bg-zinc-900 px-3 py-2 text-base text-white",
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
            <div className="flex flex-wrap gap-4">
              {Object.values(Gender).map((g) => (
                <label
                  key={g}
                  htmlFor={g}
                  className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name="gender"
                    id={g}
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                  />
                  <span>{g}</span>
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
              className="min-h-[44px]"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || !!errors.body || body.trim().length < 10
              }
              className="min-w-[120px] min-h-[44px]"
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