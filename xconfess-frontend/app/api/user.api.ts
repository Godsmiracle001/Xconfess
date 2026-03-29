import {
    AppError,
    getStatusMessage,
    getStatusCodeString,
    logError
} from '@/app/lib/utils/errorHandler';

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  isAnonymous: boolean;
}

export interface UserStats {
  totalConfessions: number;
  totalReactions: number;
  mostPopularConfession: string;
  badges: string[];
  streak: number;
}

const ensureApiResponse = async (
  res: Response,
  action: string,
  fallbackMessage: string,
): Promise<void> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const status = res.status;
    const message =
      (body as any)?.message || (body as any)?.error || getStatusMessage(status);
    const code = getStatusCodeString(status);
    const apiError = new AppError(message || fallbackMessage, code, status, {
      responseBody: body,
      action,
      status,
    });

    logError(apiError, `userApi.${action}`);
    throw apiError;
  }
};

export const fetchUserProfile = async (): Promise<UserProfile> => {
  const res = await fetch('/api/users/profile');
  await ensureApiResponse(res, 'fetchUserProfile', 'Failed to fetch profile');
  return res.json();
};

export const fetchPublicProfile = async (id: string): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${id}/public-profile`);
  await ensureApiResponse(res, 'fetchPublicProfile', 'Failed to fetch public profile');
  return res.json();
};

export const updateProfile = async (data: Partial<UserProfile>) => {
  const res = await fetch('/api/users/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await ensureApiResponse(res, 'updateProfile', 'Failed to update profile');
  return res.json();
};

export const fetchUserStats = async (): Promise<UserStats> => {
  const res = await fetch('/api/users/stats');
  await ensureApiResponse(res, 'fetchUserStats', 'Failed to fetch stats');
  return res.json();
};
