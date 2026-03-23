

//  The stable shape that all frontend components consume. 
export interface NormalizedConfession {
  id: string;
  content: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  reactions: Record<string, number>;
  gender?: string | null;
  author?: {
    id: string;
    username?: string;
    avatar?: string;
    stellarAddress?: string;
  };
  _demo?: boolean;
  isAnchored?: boolean;
  stellarTxHash?: string | null;
  tipStats?: any | null;
}

// Raw shape as it may arrive from the backend. 
export interface RawConfession {
  id?: string;
 
  message?: string;
  body?: string;
  content?: string;

  created_at?: string;
  createdAt?: string;

  view_count?: number;
  viewCount?: number;

  comments?: unknown[];
  commentCount?: number;
  // Reactions: either an array of { type, count } or an already-normalized object
  reactions?: Array<{ type: string; count?: number }> | Record<string, number>;
  gender?: string | null;
  author?: {
    id: string;
    username?: string;
    avatar?: string;
  };
  _demo?: boolean;
  isAnchored?: boolean;
  stellarTxHash?: string | null;
  stellar_tx_hash?: string | null;
  tipStats?: any | null;
}

//   Reduces an array of reaction objects `[{ type, count }]` into a plain record `{ like: 5, love: 3 }`. Returns the input unchanged if it is already a plain object.

function normalizeReactions(
  raw: RawConfession["reactions"],
): Record<string, number> {
  if (!raw) return { like: 0, love: 0 };

  // Already a plain object (normalized or from demo data)
  if (!Array.isArray(raw)) {
    return raw as Record<string, number>;
  }

  // Array of { type: string; count?: number }
  return raw.reduce<Record<string, number>>((acc, reaction) => {
    if (reaction?.type) {
      acc[reaction.type] = (acc[reaction.type] ?? 0) + (reaction.count ?? 1);
    }
    return acc;
  }, {});
}

// Maps any raw confession object (from the backend or demo fallback) into the
// stable `NormalizedConfession` shape consumed by the frontend.
export function normalizeConfession(raw: RawConfession): NormalizedConfession {
  return {
    id: raw.id ?? "",
    content: raw.message ?? raw.body ?? raw.content ?? "",
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    viewCount: raw.view_count ?? raw.viewCount ?? 0,
    commentCount:
      raw.commentCount ??
      (Array.isArray(raw.comments) ? raw.comments.length : 0),
    reactions: normalizeReactions(raw.reactions),
    gender: raw.gender ?? null,
    author: raw.author,
    isAnchored: raw.isAnchored ?? false,
    stellarTxHash: raw.stellar_tx_hash ?? raw.stellarTxHash ?? null,
    tipStats: raw.tipStats ?? null,
    ...(raw._demo !== undefined ? { _demo: raw._demo } : {}),
  };
}
