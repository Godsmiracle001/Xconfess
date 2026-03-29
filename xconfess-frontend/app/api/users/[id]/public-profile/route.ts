const BASE_API_URL = process.env.BACKEND_API_URL;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!BASE_API_URL) {
    return new Response(
      JSON.stringify({
        message: "Server misconfiguration: BACKEND_API_URL is not set.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { id } = params;
    const backendUrl = `${BASE_API_URL}/users/${id}/public-profile`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-Correlation-ID": correlationId,
      },
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error proxying to backend:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}