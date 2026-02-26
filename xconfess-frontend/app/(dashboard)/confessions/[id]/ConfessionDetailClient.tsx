"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ReactionButton } from "@/app/components/confession/ReactionButtons";
import { AnchorButton } from "@/app/components/confession/AnchorButton";
import { ShareButton } from "@/app/components/confession/ShareButton";
import { CommentSection } from "@/app/components/confession/CommentSection";
import { RelatedConfessions } from "@/app/components/confession/RelatedConfessions";
import { formatDate } from "@/app/lib/utils/formatDate";
import { useAuth } from "@/app/lib/hooks/useAuth";
import { getConfessionById } from "@/app/lib/api/confessions";

interface ConfessionDetailClientProps {
  initialConfession: {
    id: string;
    content: string;
    createdAt: string;
    viewCount: number;
    reactions: { like: number; love: number };
    commentCount?: number;
    isAnchored?: boolean;
    stellarTxHash?: string | null;
  };
  confessionId: string;
}

export function ConfessionDetailClient({
  initialConfession,
  confessionId,
}: ConfessionDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [confession, setConfession] = useState(initialConfession);
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    setConfession(initialConfession);
  }, [initialConfession]);

 const [refetchError, setRefetchError] = useState(false);

const refetch = async () => {
  setRefetching(true);
  setRefetchError(false);
  const result = await getConfessionById(confessionId);
  if (result.ok && result.data) {
    setConfession({ ... });
  } else {
    setRefetchError(true);
  }
  setRefetching(false);
};


  const dateLabel = formatDate(new Date(confession.createdAt));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Navigation: Back + Breadcrumbs */}
        <nav
          className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 text-sm"
          aria-label="Breadcrumb"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="self-start gap-2 -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <ol className="flex items-center gap-2 text-zinc-500">
            <li>
              <Link
                href="/"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Feed
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li className="text-zinc-300 truncate max-w-50" aria-current="page">
              Confession
            </li>
          </ol>
        </nav>

        {/* Main confession card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <time dateTime={confession.createdAt}>{dateLabel}</time>
              {confession.viewCount != null && confession.viewCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {confession.viewCount} views
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-white text-lg leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {confession.content}
            </p>

            {/* Reactions + Anchor + Share */}
            <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <ReactionButton
                  type="like"
                  count={confession.reactions.like}
                  confessionId={confessionId}
                />
                <ReactionButton
                  type="love"
                  count={confession.reactions.love}
                  confessionId={confessionId}
                />
                <AnchorButton
                  confessionId={confessionId}
                  confessionContent={confession.content}
                  isAnchored={confession.isAnchored}
                  stellarTxHash={confession.stellarTxHash}
                  onAnchorSuccess={() => refetch()}
                />
              </div>
              <ShareButton confessionId={confessionId} variant="dropdown" />
            </div>

            {/* Comment count link */}
            {(confession.commentCount ?? 0) > 0 && (
              <p className="mt-3 text-sm text-zinc-500">
                💬 {confession.commentCount} comment
                {(confession.commentCount ?? 0) !== 1 ? "s" : ""}
              </p>
            )}

            {refetching && (
              <p className="mt-2 text-xs text-zinc-500">Updating…</p>
            )}
          </CardContent>
        </Card>

        {/* Report (placeholder) */}
        <div className="mb-8 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-zinc-400"
         onClick={() => window.open(`mailto:abuse@xconfess.app?subject=Report+${confessionId}`)}
            aria-label="Report confession (coming soon)"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>

        {/* Comments */}
        <div className="mb-10">
          <CommentSection
            confessionId={confessionId}
            isAuthenticated={!!user}
            onLoginPrompt={() => router.push("/login")}
          />
        </div>

        {/* Related confessions */}
        <RelatedConfessions currentId={confessionId} className="mb-8" />
      </div>
    </div>
  );
}
