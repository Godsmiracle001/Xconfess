import { getApiBaseUrl } from "@/app/lib/config";

const BASE_API_URL = getApiBaseUrl();

const ALLOWED_TYPES = new Set([
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate_content",
  "copyright",
  "other",
]);

export async function POST(
  request: Request,
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

    const body = await request.json().catch(() => ({} as any));
    const type = body?.type;
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    if (!type || !ALLOWED_TYPES.has(type)) {
      return new Response(
        JSON.stringify({
          message: "Invalid report type",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const anonymousUserId = request.headers.get("x-anonymous-user-id");
    const authorization = request.headers.get("authorization");

    // The backend allows anonymous reports only if we supply x-anonymous-user-id.
    if (!authorization && !anonymousUserId) {
      return new Response(
        JSON.stringify({
          message: "Missing anonymous user ID",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const idempotencyKey = request.headers.get("idempotency-key");

    const forwardedHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authorization) forwardedHeaders["Authorization"] = authorization;
    if (anonymousUserId) forwardedHeaders["x-anonymous-user-id"] = anonymousUserId;
    if (idempotencyKey) forwardedHeaders["idempotency-key"] = idempotencyKey;

    const res = await fetch(`${BASE_API_URL}/confessions/${id}/report`, {
      method: "POST",
      headers: forwardedHeaders,
      body: JSON.stringify({ type, reason }),
    });

    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { message: text };
    }

    return new Response(JSON.stringify(payload), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        message: "Failed to submit report",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

