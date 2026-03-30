import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfessionDetailClient } from "./ConfessionDetailClient";

const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getConfession(id: string) {
  try {
    // Use the internal API route which has demo mode support
    const res = await fetch(`${APP_URL}/api/confessions/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.content ?? data.message ?? data.body ?? "";
    return {
      id: data.id,
      content,
      createdAt: data.createdAt ?? data.created_at,
      viewCount: data.viewCount ?? data.view_count ?? 0,
      reactions: data.reactions ?? { like: 0, love: 0 },
      commentCount: data.commentCount ?? 0,
      isAnchored: data.isAnchored ?? false,
      stellarTxHash: data.stellarTxHash ?? null,
    };
  } catch (error) {
    console.error("Error fetching confession:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const confession = await getConfession(id);
  const title = confession
    ? `Confession — xConfess`
    : "Confession not found — xConfess";
  const description = confession
    ? confession.content.slice(0, 155).replace(/\n/g, " ") +
      (confession.content.length > 155 ? "…" : "")
    : "View confession on xConfess";
  const url = `${APP_URL}/confessions/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function ConfessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const confession = await getConfession(id);

  if (!confession) {
    notFound();
  }

  return (
    <ConfessionDetailClient initialConfession={confession} confessionId={id} />
  );
}
