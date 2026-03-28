const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function POST(
  request: Request,
  context: { params: Promise<{ confessionId: string }> },
) {
  let body: Record<string, unknown> = {};
  let content = "";
  let anonymousContextId = "";
  let parentId: unknown = null;

  try {
    const { confessionId } = await context.params;
    if (!confessionId) {
      return new Response(
        JSON.stringify({ message: "Confession ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    body = await request.json().catch(() => ({}));
    content = (body.content ?? body.message) as string;
    anonymousContextId = (body.anonymousContextId ??
      body.contextId ??
      "") as string;
    parentId = body.parentId ?? null;

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({ message: "Comment content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = request.headers.get("Authorization");
    const url = `${BASE_API_URL}/comments/${confessionId}`;
    const payload: Record<string, unknown> = {
      content: content.trim(),
      anonymousContextId,
    };
    if (parentId != null) payload.parentId = parentId;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const isDemoMode =
        process.env.NODE_ENV === "development" ||
        process.env.DEMO_MODE === "true";

      if (isDemoMode) {
        console.warn(
          "Failed to post comment, returning demo response for testing",
        );
        // Return a demo comment - ensure parentId is properly set as a number or null
        const finalParentId = parentId != null ? Number(parentId) : null;
        const comment = {
          id: Math.floor(Math.random() * 10000) + 100,
          content: content.trim(),
          createdAt: new Date().toISOString(),
          author: "Anonymous",
          confessionId,
          parentId: finalParentId,
          _demo: true,
        };
        return new Response(JSON.stringify(comment), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "X-Demo-Mode": "true",
          },
        });
      }

      const err = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ message: "Please sign in to comment" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          message: err.message || "Failed to post comment",
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const comment = {
      id: data.id,
      content: data.content,
      createdAt: data.createdAt ?? data.created_at,
      author: "Anonymous",
      confessionId: data.confessionId ?? confessionId,
      parentId: data.parentId ?? data.parent_id ?? null,
    };

    return new Response(JSON.stringify(comment), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const isDemoMode =
      process.env.NODE_ENV === "development" ||
      process.env.DEMO_MODE === "true";

    if (isDemoMode) {
      console.warn("Backend unreachable, returning demo comment for testing");

      const { confessionId } = await context.params;
      // Use the body that was already read at the top
      const finalParentId = parentId != null ? Number(parentId) : null;

      const comment = {
        id: Math.floor(Math.random() * 10000) + 100,
        content: content || "Demo comment",
        createdAt: new Date().toISOString(),
        author: "Anonymous",
        confessionId,
        parentId: finalParentId,
        _demo: true,
      };

      return new Response(JSON.stringify(comment), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Mode": "true",
        },
      });
    }

    console.error("Error posting comment:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
