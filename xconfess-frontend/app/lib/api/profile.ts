import apiClient from './client';
import { User, UserStats, PublicProfile, UpdateProfileDto } from '../types/user';
import { ConfessionListResponse } from '../types/confession';

export const profileApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileDto): Promise<User> => {
    const response = await apiClient.patch<User>('/users/profile', data);
    return response.data;
  },

  getStats: async (): Promise<UserStats> => {
    const response = await apiClient.get<UserStats>('/users/stats');
    return response.data;
  },

  getPublicProfile: async (userId: number): Promise<PublicProfile> => {
    const response = await apiClient.get<PublicProfile>(`/users/${userId}/public-profile`);
    return response.data;
  },

  getConfessions: async (page: number = 1, limit: number = 10): Promise<ConfessionListResponse> => {
    const response = await apiClient.get<ConfessionListResponse>('/users/confessions', {
      params: { page, limit },
    });
    return response.data;
  },

  deactivateAccount: async (): Promise<User> => {
    const response = await apiClient.post<User>('/users/deactivate');
    return response.data;
  },

  reactivateAccount: async (): Promise<User> => {
    const response = await apiClient.post<User>('/users/reactivate');
    return response.data;
  },
};

export default profileApi;
