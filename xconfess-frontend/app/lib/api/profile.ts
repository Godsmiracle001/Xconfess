// lib/api/profile.ts

import {
  ActivityItem,
  PaginatedConfessions,
  ReactionHistoryItem,
  TipHistoryItem,
  UserProfile,
  UserStatistics,
} from "@/app/types/profile";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class ProfileAPIClient {
  private async fetchWithAuth(url: string, options?: RequestInit) {
    // Add authentication headers if needed
    const headers = {
      "Content-Type": "application/json",
      ...options?.headers,
      // Add auth token: 'Authorization': `Bearer ${token}`
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: "An error occurred",
      }));
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.fetchWithAuth(`/users/${userId}/profile`);
  }

  async getUserStatistics(userId: string): Promise<UserStatistics> {
    return this.fetchWithAuth(`/users/${userId}/statistics`);
  }

  async getUserConfessions(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedConfessions> {
    return this.fetchWithAuth(
      `/users/${userId}/confessions?page=${page}&limit=${limit}`
    );
  }

  async getUserReactions(userId: string): Promise<ReactionHistoryItem[]> {
    return this.fetchWithAuth(`/users/${userId}/reactions`);
  }

  async getUserTips(userId: string): Promise<TipHistoryItem[]> {
    return this.fetchWithAuth(`/users/${userId}/tips`);
  }

  async getUserActivities(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: string
  ): Promise<{ activities: ActivityItem[]; hasMore: boolean }> {
    const typeParam = type && type !== "all" ? `&type=${type}` : "";
    return this.fetchWithAuth(
      `/users/${userId}/activities?page=${page}&limit=${limit}${typeParam}`
    );
  }
}

export const profileAPI = new ProfileAPIClient();

// React Query hooks for better caching and state management
export const useUserProfile = (userId: string) => {
  // If using React Query:
  // return useQuery(['user-profile', userId], () => profileAPI.getUserProfile(userId));

  // Otherwise return the API client method
  return () => profileAPI.getUserProfile(userId);
};

export const useUserStatistics = (userId: string) => {
  return () => profileAPI.getUserStatistics(userId);
};

export const useUserConfessions = (
  userId: string,
  page: number,
  limit: number
) => {
  return () => profileAPI.getUserConfessions(userId, page, limit);
};
