"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CommentItem } from "./CommentItem";
import { Button } from "@/app/components/ui/button";
import { type Comment } from "@/app/lib/types/confession";
import { AUTH_TOKEN_KEY } from "@/app/lib/api/constants";
import { ArrowDown } from "lucide-react";

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
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());
  const [lastVisit, setLastVisit] = useState<Date>(new Date());
  const [hasUnread, setHasUnread] = useState(false);
  const unreadButtonRef = useRef<HTMLButtonElement>(null);

  const fetchComments = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/comments/by-confession/${confessionId}?page=${pageToLoad}&limit=${COMMENTS_PAGE_SIZE}`);
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
    [confessionId],
  );

  useEffect(() => {
    fetchComments(1);
    const stored = localStorage.getItem(`comment_visit_${confessionId}`);
    if (stored) {
      setLastVisit(new Date(stored));
    } else {
      const now = new Date();
      setLastVisit(now);
      localStorage.setItem(`comment_visit_${confessionId}`, now.toISOString());
    }
  }, [fetchComments, confessionId]);

  useEffect(() => {
    if (comments.length > 0) {
      const unreadExists = comments.some((c) => new Date(c.createdAt) > lastVisit);
      setHasUnread(unreadExists);
    }
  }, [comments, lastVisit]);

  const toggleCollapse = useCallback((commentId: number) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) { next.delete(commentId); } else { next.add(commentId); }
      return next;
    });
  }, []);

  const jumpToUnread = useCallback(() => {
    const unreadElement = document.querySelector('[data-unread="true"]');
    if (unreadElement) {
      unreadElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setHasUnread(false);
    }
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date();
    setLastVisit(now);
    localStorage.setItem(`comment_visit_${confessionId}`, now.toISOString());
    setHasUnread(false);
  }, [confessionId]);

  const topLevelComments = comments.filter((c) => c.parentId == null);
  const displayedComments = topLevelComments;
  const canLoadMore = hasMore;

  const hasReplies = useCallback((commentId: number) => comments.some((c) => c.parentId === commentId), [comments]);
  const isUnreadComment = useCallback((comment: Comment) => new Date(comment.createdAt) > lastVisit, [lastVisit]);

  function renderReplies(parentId: number, depth = 1) {
    if (depth > 6) return null;
    if (collapsedThreads.has(parentId)) return null;
    const parent = comments.find((c) => c.id === parentId);
    const attached = (parent as any)?.replies ?? null;
    const children = Array.isArray(attached) && attached.length > 0 ? attached : comments.filter((c) => c.parentId === parentId);
    if (!children || children.length === 0) return null;

    return (
      <ul className="mt-3 space-y-3 list-none p-0 m-0">
        {children.map((child: Comment) => (
          <li key={child.id}>
            <CommentItem comment={child} onReply={handleReply} isReply={true} hasReplies={hasReplies(child.id)} isCollapsed={collapsedThreads.has(child.id)} onToggleCollapse={hasReplies(child.id) ? () => toggleCollapse(child.id) : undefined} isUnread={isUnreadComment(child)} />
            {renderReplies(child.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!isAuthenticated) { onLoginPrompt?.(); return; }

    setSubmitting(true);
    setSubmitError(null);
    const token = typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

    try {
      const res = await fetch(`/api/comments/${confessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: trimmed, anonymousContextId: "", parentId: replyTo?.id ?? null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { onLoginPrompt?.(); return; }
        throw new Error(data.message || "Failed to post comment");
      }

      const newComment = await res.json();
      if (newComment.parentId != null) { setComments((prev) => [...prev, newComment]); } else { setComments((prev) => [newComment, ...prev]); }
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
    document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section id="comments" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="text-lg font-semibold text-white mb-4">Comments ({comments.length})</h2>

      <form id="comment-form" onSubmit={handleSubmit} className="mb-6" role="form" aria-label="Add a comment">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
            <span>Replying</span>
            <button type="button" onClick={() => { setReplyTo(null); setContent(""); }} className="text-zinc-500 hover:text-zinc-300">Cancel</button>
          </div>
        )}
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={isAuthenticated ? "Write a comment..." : "Sign in to comment"} disabled={!isAuthenticated} rows={3} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-60 resize-y min-h-20" maxLength={2000} aria-label="Comment text" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">{content.length}/2000</span>
          <Button type="submit" disabled={submitting || !content.trim() || !isAuthenticated} size="sm">{submitting ? "Posting..." : "Post comment"}</Button>
        </div>
        {submitError && <p className="mt-2 text-sm text-red-400" role="alert">{submitError}</p>}
      </form>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-zinc-800 animate-pulse" aria-hidden />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-900/50 bg-red-900/10 p-4 text-red-300 text-sm">
          {error}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchComments()}>Try again</Button>
        </div>
      )}

      {!loading && !error && (
        <>
          {hasUnread && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-400">New comments available</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs">Mark all read</Button>
                <Button ref={unreadButtonRef} variant="default" size="sm" onClick={jumpToUnread} className="flex items-center gap-1 text-xs"><ArrowDown className="h-3 w-3" />Jump to new</Button>
              </div>
            </div>
          )}
          <ul className="space-y-3 list-none p-0 m-0">
            {displayedComments.map((comment) => (
              <li key={comment.id}>
                <CommentItem comment={comment} onReply={handleReply} isReply={false} hasReplies={hasReplies(comment.id)} isCollapsed={collapsedThreads.has(comment.id)} onToggleCollapse={hasReplies(comment.id) ? () => toggleCollapse(comment.id) : undefined} isUnread={isUnreadComment(comment)} />
                {!collapsedThreads.has(comment.id) && renderReplies(comment.id, 1)}
              </li>
            ))}
          </ul>
          {displayedComments.length === 0 && <p className="text-zinc-500 text-sm py-4">No comments yet. Be the first to comment.</p>}
          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => { const next = page + 1; setPage(next); fetchComments(next); }}>Load more comments</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
