// app/(dashboard)/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ProfileHeader } from "./ProfileHeader";
import { UserStatistics } from "./UserStatistics";
import { ActivityTimeline } from "./ActiveTimeline";

interface UserProfile {
  id: string;
  username: string;
  isAnonymous: boolean;
  joinDate: string;
  lastActive: string;
  statistics: UserStatistics;
  badges?: Badge[];
}

interface UserStatistics {
  confessionsPosted: number;
  totalViews: number;
  reactionsGiven: number;
  reactionsReceived: number;
  tipsSent: number;
  tipsReceived: number;
  totalTipsSentAmount: number;
  totalTipsReceivedAmount: number;
  badgesEarned: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user ID from auth context/session
      // This is a placeholder - replace with your actual auth implementation
      const userId = "current-user-id";

      const response = await fetch(`/api/users/${userId}/profile`);

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Error Loading Profile
          </h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchUserProfile}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <ProfileHeader
          username={profile.username}
          isAnonymous={profile.isAnonymous}
          joinDate={profile.joinDate}
          badges={profile.badges || []}
        />

        {/* Statistics Cards */}
        <div className="mt-8">
          <UserStatistics statistics={profile.statistics} />
        </div>

        {/* Activity Timeline */}
        <div className="mt-8">
          <ActivityTimeline userId={profile.id} />
        </div>
      </div>
    </div>
  );
}
