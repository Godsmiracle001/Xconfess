export class TrendingConfessionDto {
  id: number;
  content: string;
  viewCount: number;
  recentReactions: number;
  totalReactions: number;
  createdAt: Date;
  trendingScore: number;
  authorId?: number;
}

export class TrendingConfessionsResponseDto {
  confessions: TrendingConfessionDto[];
  count: number;
}
