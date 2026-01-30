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

export const fetchUserProfile = async (): Promise<UserProfile> => {
  const res = await fetch("/api/users/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
};

export const fetchPublicProfile = async (id: string): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${id}/public-profile`);
  if (!res.ok) throw new Error("Failed to fetch public profile");
  return res.json();
};

export const updateProfile = async (data: Partial<UserProfile>) => {
  const res = await fetch("/api/users/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
};

export const fetchUserStats = async (): Promise<UserStats> => {
  const res = await fetch("/api/users/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
};
