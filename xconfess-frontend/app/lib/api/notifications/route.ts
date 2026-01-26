import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get auth token from headers
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const isRead = searchParams.get("isRead");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Call your backend API
    const response = await fetch(
      `${process.env.BACKEND_URL}/notifications?type=${type || ""}&isRead=${isRead || ""}&page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
