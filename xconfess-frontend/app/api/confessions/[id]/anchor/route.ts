const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stellarTxHash } = body;

    if (!stellarTxHash) {
      return new Response(
        JSON.stringify({ message: "Stellar transaction hash is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate transaction hash format (64 hex characters)
    if (!/^[a-fA-F0-9]{64}$/.test(stellarTxHash)) {
      return new Response(
        JSON.stringify({ message: "Invalid Stellar transaction hash format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const backendUrl = `${BASE_API_URL}/confessions/${id}/anchor`;

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stellarTxHash }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[confessions/${id}/anchor] upstream returned ${response.status}`,
          { status: response.status, message: errorData.message },
        );
        return new Response(
          JSON.stringify({
            error: true,
            code: "UPSTREAM_ERROR",
            status: response.status,
            message:
              errorData.message ||
              `Failed to anchor confession: ${response.statusText}`,
            timestamp: new Date().toISOString(),
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      console.error("[confessions/[id]/anchor] network error:", fetchError);
      return new Response(
        JSON.stringify({
          error: true,
          code: "NETWORK_ERROR",
          status: 503,
          message: "Backend service unavailable. Please try again later.",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("[confessions/[id]/anchor] unexpected error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: true,
        code: "UNKNOWN_ERROR",
        status: 500,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
