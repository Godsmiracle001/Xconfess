const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, body: bodyContent, gender, stellarTxHash } = body;

    if (!message && !bodyContent) {
      return new Response(
        JSON.stringify({ message: "Confession content is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const confessionContent = bodyContent || message;
    const backendUrl = `${BASE_API_URL}/confessions`;

    const backendBody: Record<string, unknown> = {
      message: confessionContent,
      body: confessionContent,
    };

    if (title) backendBody.title = title;
    if (gender) backendBody.gender = gender;
    if (stellarTxHash) backendBody.stellarTxHash = stellarTxHash;

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backendBody),
      });

      if (!response.ok) {
        const isDemoMode =
          process.env.NODE_ENV === "development" ||
          process.env.DEMO_MODE === "true";

        if (
          isDemoMode &&
          (response.status === 403 ||
            response.status === 404 ||
            response.status >= 500)
        ) {
          console.warn(
            "Backend unavailable, returning demo response for testing",
          );
          return new Response(
            JSON.stringify({
              id: `demo-${Date.now()}`,
              message: confessionContent,
              title: title || null,
              body: confessionContent,
              gender: gender || null,
              createdAt: new Date().toISOString(),
              stellarTxHash: stellarTxHash || null,
              _demo: true,
            }),
            {
              status: 201,
              headers: {
                "Content-Type": "application/json",
                "X-Demo-Mode": "true",
              },
            },
          );
        }

        const errorData = await response.json().catch(() => ({}));
        return new Response(
          JSON.stringify({
            message:
              errorData.message ||
              `Failed to create confession: ${response.statusText}`,
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      const isDemoMode =
        process.env.NODE_ENV === "development" ||
        process.env.DEMO_MODE === "true";

      const errorMessage =
        fetchError instanceof Error ? fetchError.message : "Unknown error";
      const errorCode = (fetchError as { code?: string })?.code;

      if (
        isDemoMode &&
        (errorMessage?.includes("fetch failed") || errorCode === "ECONNREFUSED")
      ) {
        console.warn(
          "Backend unreachable, returning demo response for testing",
        );
        return new Response(
          JSON.stringify({
            id: `demo-${Date.now()}`,
            message: confessionContent,
            title: title || null,
            body: confessionContent,
            gender: gender || null,
            createdAt: new Date().toISOString(),
            stellarTxHash: stellarTxHash || null,
            _demo: true,
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "X-Demo-Mode": "true",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Backend service unavailable",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error creating confession:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "10") || 10);
  const sort = searchParams.get("sort") ?? "newest";
  const gender = searchParams.get("gender");

  const backendParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sort,
  });

  if (gender) {
    backendParams.append("gender", gender);
  }

  try {
    const backendUrl = `${BASE_API_URL}/confessions?${backendParams}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: {
        revalidate: 30, // Cache for 30 seconds
      },
    });

    if (!response.ok) {
      console.error(
        `Backend returned ${response.status}: ${response.statusText}`,
      );

      // Return fallback data for demo purposes
      const confessionsPerPage = limit;
      const allConfessions = [
        {
          id: "1",
          content: "I love coding.",
          createdAt: new Date().toISOString(),
          reactions: { like: 5, love: 3 },
          commentCount: 2,
          viewCount: 45,
        },
        {
          id: "2",
          content: "I secretly watch cartoons.",
          createdAt: new Date().toISOString(),
          reactions: { like: 8, love: 12 },
          commentCount: 5,
          viewCount: 123,
        },
        {
          id: "3",
          content: "I talk to my plants.",
          createdAt: new Date().toISOString(),
          reactions: { like: 2, love: 7 },
          commentCount: 1,
          viewCount: 32,
        },
        {
          id: "4",
          content: "I enjoy midnight walks.",
          createdAt: new Date().toISOString(),
          reactions: { like: 10, love: 4 },
          commentCount: 3,
          viewCount: 67,
        },
        {
          id: "5",
          content: "I write poems no one reads.",
          createdAt: new Date().toISOString(),
          reactions: { like: 3, love: 6 },
          commentCount: 0,
          viewCount: 18,
        },
        {
          id: "6",
          content: "I skip breakfast sometimes.",
          createdAt: new Date().toISOString(),
          reactions: { like: 4, love: 2 },
          commentCount: 2,
          viewCount: 42,
        },
        {
          id: "7",
          content: "I have imposter syndrome.",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          reactions: { like: 15, love: 20 },
          commentCount: 8,
          viewCount: 156,
        },
        {
          id: "8",
          content: "I talk to myself in the car.",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          reactions: { like: 9, love: 11 },
          commentCount: 4,
          viewCount: 89,
        },
      ];

      const start = (page - 1) * confessionsPerPage;
      const pagedConfessions = allConfessions.slice(
        start,
        start + confessionsPerPage,
      );
      const hasMore = start + confessionsPerPage < allConfessions.length;

      return new Response(
        JSON.stringify({
          confessions: pagedConfessions,
          hasMore,
          total: allConfessions.length,
          page,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        confessions: data.data || data.confessions || [],
        hasMore: data.hasMore !== false,
        total: data.total,
        page: data.page || page,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching confessions:", error);

    // Fallback demo data
    const confessionsPerPage = limit;
    const allConfessions = [
      {
        id: "1",
        content: "I love coding.",
        createdAt: new Date().toISOString(),
        reactions: { like: 5, love: 3 },
        commentCount: 2,
        viewCount: 45,
      },
      {
        id: "2",
        content: "I secretly watch cartoons.",
        createdAt: new Date().toISOString(),
        reactions: { like: 8, love: 12 },
        commentCount: 5,
        viewCount: 123,
      },
      {
        id: "3",
        content: "I talk to my plants.",
        createdAt: new Date().toISOString(),
        reactions: { like: 2, love: 7 },
        commentCount: 1,
        viewCount: 32,
      },
      {
        id: "4",
        content: "I enjoy midnight walks.",
        createdAt: new Date().toISOString(),
        reactions: { like: 10, love: 4 },
        commentCount: 3,
        viewCount: 67,
      },
      {
        id: "5",
        content: "I write poems no one reads.",
        createdAt: new Date().toISOString(),
        reactions: { like: 3, love: 6 },
        commentCount: 0,
        viewCount: 18,
      },
      {
        id: "6",
        content: "I skip breakfast sometimes.",
        createdAt: new Date().toISOString(),
        reactions: { like: 4, love: 2 },
        commentCount: 2,
        viewCount: 42,
      },
    ];

    const start = (page - 1) * confessionsPerPage;
    const pagedConfessions = allConfessions.slice(
      start,
      start + confessionsPerPage,
    );
    const hasMore = start + confessionsPerPage < allConfessions.length;

    return new Response(
      JSON.stringify({
        confessions: pagedConfessions,
        hasMore,
        total: allConfessions.length,
        page,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
