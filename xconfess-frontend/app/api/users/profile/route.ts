const BASE_API_URL = process.env.BACKEND_API_URL;

export async function GET(request: Request) {
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
    const backendUrl = `${BASE_API_URL}/users/profile`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

    // Forward cookies for auth
    const cookie = request.headers.get("cookie") || "";

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-Correlation-ID": correlationId,
        "cookie": cookie,
      },
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": response.headers.get("set-cookie") || "",
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

export async function PATCH(request: Request) {
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
    const body = await request.json();
    const backendUrl = `${BASE_API_URL}/users/profile`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";
    const cookie = request.headers.get("cookie") || "";

    const response = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        "cookie": cookie,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": response.headers.get("set-cookie") || "",
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