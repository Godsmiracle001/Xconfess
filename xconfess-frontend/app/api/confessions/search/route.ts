const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
  const sort = searchParams.get("sort") ?? "newest";
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const minReactions = searchParams.get("minReactions") ?? undefined;
  const gender = searchParams.get("gender") ?? undefined;

  const backendParams = new URLSearchParams();
  backendParams.set("page", String(page));
  backendParams.set("limit", String(limit));
  backendParams.set("sort", sort);
  if (q) backendParams.set("q", q);
  if (dateFrom) backendParams.set("dateFrom", dateFrom);
  if (dateTo) backendParams.set("dateTo", dateTo);
  if (minReactions != null && minReactions !== "")
    backendParams.set("minReactions", minReactions);
  if (gender) backendParams.set("gender", gender);

  const searchUrl = `${BASE_API_URL}/confessions/search?${backendParams}`;

  try {
    const res = await fetch(searchUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      const text = await res.text();
      let body: { message?: string } = {};
      try {
        body = JSON.parse(text) as { message?: string };
      } catch {
        /* ignore */
      }
      return Response.json(
        {
          message: body.message ?? `Search failed: ${res.statusText}`,
          errorType: "upstream_error",
          degraded: true,
          partial: false,
          warnings: [],
          confessions: [],
          hasMore: false,
          total: 0,
          page,
          meta: {
            page,
            limit,
            searchType: "error",
          },
        },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      data?: unknown[];
      confessions?: unknown[];
      hasMore?: boolean;
      total?: number;
      page?: number;
      limit?: number;
      degraded?: boolean;
      partial?: boolean;
      message?: string;
      warnings?: string[];
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
        searchType?: string;
        degraded?: boolean;
        partial?: boolean;
        warning?: string;
        warnings?: string[];
        message?: string;
      };
    };

    const confessions = data.data ?? data.confessions ?? [];
    const totalCount = parseNumber(data.total ?? data.meta?.total, 0);
    const currentPage = parseNumber(data.page ?? data.meta?.page, page);
    const currentLimit = parseNumber(data.limit ?? data.meta?.limit, limit);
    const hasMore =
      typeof data.hasMore === "boolean"
        ? data.hasMore
        : currentPage * currentLimit < totalCount;

    const warnings = [
      ...(Array.isArray(data.warnings) ? data.warnings : []),
      ...(Array.isArray(data.meta?.warnings) ? data.meta.warnings : []),
      ...(typeof data.meta?.warning === "string" ? [data.meta.warning] : []),
    ].filter((entry) => typeof entry === "string" && entry.trim().length > 0);

    const inferredPartialFromSearchType =
      data.meta?.searchType === "fallback" ||
      data.meta?.searchType === "ilike" ||
      data.meta?.searchType === "partial";

    const partial = parseBoolean(
      data.partial ?? data.meta?.partial ?? inferredPartialFromSearchType,
      false
    );
    const degraded = parseBoolean(
      data.degraded ?? data.meta?.degraded,
      warnings.length > 0
    );

    return Response.json({
      confessions,
      hasMore,
      total: totalCount,
      page: currentPage,
      partial,
      degraded,
      warnings,
      message:
        (typeof data.message === "string" && data.message) ||
        (typeof data.meta?.message === "string" && data.meta.message) ||
        undefined,
      meta: {
        total: totalCount,
        page: currentPage,
        limit: currentLimit,
        searchType: data.meta?.searchType ?? "unknown",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Search service unavailable";
    return Response.json(
      {
        message,
        errorType: "network_error",
        degraded: true,
        partial: false,
        warnings: [],
        confessions: [],
        hasMore: false,
        total: 0,
        page,
        meta: {
          page,
          limit,
          searchType: "error",
        },
      },
      { status: 503 }
    );
  }
}
