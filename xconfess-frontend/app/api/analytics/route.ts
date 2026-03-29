import { NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type ComparisonAvailability = "available" | "unavailable";
type DeltaDirection = "up" | "down" | "flat" | "unknown";

interface MetricDelta {
  percentage: number | null;
  direction: DeltaDirection;
  availability: ComparisonAvailability;
  note?: string;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDirection(value: number | null): DeltaDirection {
  if (value === null) return "unknown";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function createDelta(
  percentage: number | null,
  availability: ComparisonAvailability,
  note?: string
): MetricDelta {
  return {
    percentage,
    direction: toDirection(percentage),
    availability,
    note,
  };
}

function normalizeDelta(candidate: unknown, fallback: string): MetricDelta {
  const percentage = parseNumber(candidate);
  if (percentage !== null) {
    return createDelta(percentage, "available");
  }
  return createDelta(null, "unavailable", fallback);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const headers = authHeader ? { Authorization: authHeader } : {};

    const [statsRes, trendingRes, reactionsRes, usersRes] =
      await Promise.all([
        axios.get(`${BACKEND_URL}/analytics/stats`, { headers }),
        axios.get(`${BACKEND_URL}/analytics/trending`, { headers }),
        axios.get(`${BACKEND_URL}/analytics/reactions`, { headers }),
        axios.get(`${BACKEND_URL}/analytics/users`, { headers }),
      ]);

    const stats = statsRes.data;
    const trending = trendingRes.data;
    const reactions = reactionsRes.data;
    const users = usersRes.data;

    const metrics = {
      totalConfessions: stats.totalConfessions,
      totalUsers: stats.totalUsers,
      totalReactions: stats.totalReactions,
      activeUsers: Math.round(users.averageDAU || 0),

      // ONLY backend-provided deltas (no estimation)
      confessionsDelta: normalizeDelta(
        stats?.confessionsChange,
        "No backend comparison data"
      ),
      usersDelta: normalizeDelta(
        stats?.usersChange,
        "No backend comparison data"
      ),
      reactionsDelta: normalizeDelta(
        stats?.reactionsChange,
        "No backend comparison data"
      ),
      activeDelta: normalizeDelta(
        stats?.activeChange,
        "No backend comparison data"
      ),
    };

    const trendingConfessions = (Array.isArray(trending) ? trending : []).map(
      (item: any) => ({
        id: item.id,
        message: item.content,
        category: item.category || "General",
        reactions: { like: item.reactionCount },
        viewCount: 0,
        createdAt: item.createdAt,
      })
    );

    const reactionDistribution = (
      Array.isArray(reactions?.distribution)
        ? reactions.distribution
        : []
    ).map((item: any) => ({
      name: item.type,
      value: item.count,
    }));

    const activityData = Array.isArray(users?.dailyActivity)
      ? users.dailyActivity
      : [];

    return NextResponse.json({
      metrics,
      trendingConfessions,
      reactionDistribution,
      activityData,
      comparison: {
        enabled: false,
        availability: "unavailable",
        source: "backend",
        note: "Comparison disabled to avoid fabricated analytics",
      },
    });
  } catch (error: any) {
    console.error("Analytics Fetch Error:", error?.message);

    return NextResponse.json(
      { available: false, reason: "unavailable" },
      { status: 200 }
    );
  }
}