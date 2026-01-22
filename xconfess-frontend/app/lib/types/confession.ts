import { Gender } from './user';

export interface Confession {
  id: string;
  message: string;
  gender: Gender | null;
  createdAt: string;
  viewCount: number;
  reactionCount: number;
  moderationStatus: string;
}

export interface ConfessionListResponse {
  confessions: Confession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  createdAt: string;
}
