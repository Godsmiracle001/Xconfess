'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile';
import { UpdateProfileDto } from '../types/user';

export const profileKeys = {
  all: ['profile'] as const,
  profile: () => [...profileKeys.all, 'user'] as const,
  stats: () => [...profileKeys.all, 'stats'] as const,
  confessions: (page: number, limit: number) => [...profileKeys.all, 'confessions', page, limit] as const,
  publicProfile: (userId: number) => [...profileKeys.all, 'public', userId] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile(),
    queryFn: profileApi.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: profileKeys.stats(),
    queryFn: profileApi.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserConfessions(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: profileKeys.confessions(page, limit),
    queryFn: () => profileApi.getConfessions(page, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function usePublicProfile(userId: number) {
  return useQuery({
    queryKey: profileKeys.publicProfile(userId),
    queryFn: () => profileApi.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileDto) => profileApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile() });
      queryClient.invalidateQueries({ queryKey: profileKeys.stats() });
    },
  });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileApi.deactivateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile() });
    },
  });
}

export function useReactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileApi.reactivateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile() });
    },
  });
}
