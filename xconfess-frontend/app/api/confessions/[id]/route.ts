const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new Response(
        JSON.stringify({ message: "Confession ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const url = `${BASE_API_URL}/confessions/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(
        `[confessions/${id}] upstream returned ${response.status}`,
        { status: response.status, message: err.message },
      );
      return new Response(
        JSON.stringify({
          error: true,
          code: response.status === 404 ? "NOT_FOUND" : "UPSTREAM_ERROR",
          status: response.status,
          message: err.message || `Backend returned ${response.status}`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    const normalized = {
      id: data.id,
      content: data.message ?? data.body ?? data.content,
      message: data.message,
      createdAt: data.created_at ?? data.createdAt,
      created_at: data.created_at,
      viewCount: data.view_count ?? data.viewCount ?? 0,
      view_count: data.view_count,
      reactions: aggregateReactions(data.reactions),
      commentCount: Array.isArray(data.comments)
        ? data.comments.length
        : (data.commentCount ?? 0),
      isAnchored: data.isAnchored ?? data.is_anchored ?? false,
      stellarTxHash: data.stellarTxHash ?? data.stellar_tx_hash ?? null,
      author: data.anonymousUser
        ? { id: data.anonymousUser.id, username: "Anonymous", avatar: null }
        : undefined,
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[confessions/[id]] network error:", error);
    return new Response(
      JSON.stringify({
        error: true,
        code: "NETWORK_ERROR",
        status: 503,
        message:
          "Could not reach the confessions service. Please try again later.",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

function aggregateReactions(reactions: Array<{ emoji?: string }> | undefined): {
  like: number;
  love: number;
} {
  if (!Array.isArray(reactions)) return { like: 0, love: 0 };
  let like = 0;
  let love = 0;
  for (const r of reactions) {
    const e = (r.emoji ?? "").toLowerCase();
    if (e === "👍" || e === "like") like++;
    else if (e === "❤️" || e === "love") love++;
  }
  return { like, love };
}
