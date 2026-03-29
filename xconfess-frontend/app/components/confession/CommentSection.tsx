"use client";

import { useState, useEffect, useCallback } from "react";
import { CommentItem } from "./CommentItem";
import { Button } from "@/app/components/ui/button";
import { type Comment } from "@/app/lib/types/confession";
import { AUTH_TOKEN_KEY } from "@/app/lib/api/constants";

const COMMENTS_PAGE_SIZE = 10;

interface CommentSectionProps {
  confessionId: string;
  isAuthenticated?: boolean;
  onLoginPrompt?: () => void;
}

export function CommentSection({
  confessionId,
  isAuthenticated = false,
  onLoginPrompt,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const fetchComments = useCallback(
    async (pageToLoad = 1) => {
      // Guard: ignore if a fetch is already in-flight
      if (loading && pageToLoad !== 1) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/comments/by-confession/${confessionId}?page=${pageToLoad}&limit=${COMMENTS_PAGE_SIZE}`,
        );
        if (!res.ok) throw new Error("Failed to load comments");
        const data = await res.json();
        const list = data.comments ?? [];
        if (pageToLoad === 1) {
          setComments(list);
        } else {
          setComments((prev) => [...prev, ...list]);
        }
        setHasMore(Boolean(data.hasMore));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load comments");
      } finally {
        setLoading(false);
      }
    },
    [confessionId]
  );

  useEffect(() => {
    // load first page
    fetchComments(1);
  }, [fetchComments]);

  // Render top-level comments (parentId === null) with client-side pagination
  const topLevelComments = comments.filter((c) => c.parentId == null);
  const displayedComments = topLevelComments;
  const canLoadMore = hasMore;

  // Recursive replies renderer (supports nested replies)
  function renderReplies(parentId: number, depth = 1) {
    if (depth > 6) return null; // prevent excessive nesting

    // First, try to find replies attached directly to the parent comment (backend returns `replies` relation)
    const parent = comments.find((c) => c.id === parentId) as
      | Comment
      | undefined;
    const attached =
      (parent as unknown as Record<string, unknown>)?.replies ?? null;
    const children =
      Array.isArray(attached) && attached.length > 0
        ? (attached as Comment[])
        : comments.filter((c) => c.parentId === parentId);
    if (!children || children.length === 0) return null;

    return (
      <ul className="mt-3 space-y-3 list-none p-0 m-0">
        {children.map((child: Comment) => (
          <li key={child.id}>
            <CommentItem comment={child} onReply={handleReply} isReply={true} />
            {renderReplies(child.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: ignore if a submit is already in-flight
    if (submitting) return;

    const trimmed = content.trim();
    if (!trimmed) return;
    if (!isAuthenticated) {
      onLoginPrompt?.();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(AUTH_TOKEN_KEY)
        : null;

    try {
      const res = await fetch(`/api/comments/${confessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: trimmed,
          anonymousContextId: "",
          parentId: replyTo?.id ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          onLoginPrompt?.();
          return;
        }
        throw new Error(data.message || "Failed to post comment");
      }

      const newComment = await res.json();
      // If this is a reply, we need to add it to the comments list with its parentId
      // The rendering function will handle nesting based on parentId
      if (newComment.parentId != null) {
        // Add the reply to the flat comments list - it will be nested during rendering
        setComments((prev) => [...prev, newComment]);
      } else {
        // Top-level comment — prepend to current page's list
        setComments((prev) => [newComment, ...prev]);
      }
      setContent("");
      setReplyTo(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setContent(`@Anonymous `);
    document.getElementById("comment-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleLoadMore = () => {
    // Guard: ignore if a fetch is already in-flight
    if (loading) return;
    const next = page + 1;
    setPage(next);
    fetchComments(next);
  };

  const handleRetry = () => {
    // Guard: ignore if a fetch is already in-flight
    if (loading) return;
    fetchComments(1);
  };

  return (
    <section
      id="comments"
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6"
      aria-labelledby="comments-heading"
    >
      <h2
        id="comments-heading"
        className="text-lg font-semibold text-white mb-4"
      >
        Comments ({comments.length})
      </h2>

      {/* Add comment form */}
      <form
        id="comment-form"
        onSubmit={handleSubmit}
        className="mb-6"
        role="form"
        aria-label="Add a comment"
      >
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
            <span>Replying</span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setContent("");
              }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            isAuthenticated ? "Write a comment..." : "Sign in to comment"
          }
          disabled={!isAuthenticated}
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-60 resize-y min-h-20"
          maxLength={2000}
          aria-label="Comment text"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">{content.length}/2000</span>
          <Button
            type="submit"
            disabled={submitting || !content.trim() || !isAuthenticated}
            size="sm"
          >
            {submitting ? "Posting..." : "Post comment"}
          </Button>
        </div>
        {submitError && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {submitError}
          </p>
        )}
      </form>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-zinc-800 animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-900/50 bg-red-900/10 p-4 text-red-300 text-sm">
          {error}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleRetry}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Comment list */}
      {!loading && !error && (
        <>
          <ul className="space-y-3 list-none p-0 m-0">
            {displayedComments.map((comment) => (
              <li key={comment.id}>
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  isReply={false}
                />
                {/* Render nested replies recursively */}
                {renderReplies(comment.id, 1)}
              </li>
            ))}
          </ul>
          {displayedComments.length === 0 && (
            <p className="text-zinc-500 text-sm py-4">
              No comments yet. Be the first to comment.
            </p>
          )}
          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load more comments"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}