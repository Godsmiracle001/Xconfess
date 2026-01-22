'use client';

import { useState } from 'react';
import {
  ProfileHeader,
  ProfileStats,
  ConfessionHistory,
  ProfileSettings,
  BadgeDisplay,
} from '@/app/components/profile';
import { User, UserStats, BadgeType, Gender, UpdateProfileDto } from '@/app/lib/types/user';
import { Confession } from '@/app/lib/types/confession';

// ============ MOCK DATA FOR TESTING ============
const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  isAdmin: false,
  is_active: true,
  avatarUrl: null,
  bio: 'Just someone who likes to share thoughts anonymously.',
  gender: Gender.OTHER,
  age: 25,
  canReceiveMessages: true,
  isProfilePublic: true,
  createdAt: '2024-06-15T10:30:00Z',
  updatedAt: '2025-01-20T14:00:00Z',
};

const mockStats: UserStats = {
  totalConfessions: 23,
  totalReactionsReceived: 156,
  totalViews: 1240,
  mostPopularConfession: {
    id: 'abc-123',
    message: 'I secretly enjoy pineapple on pizza and I am not ashamed of it anymore. Life is too short to care what others think about food choices!',
    reactionCount: 45,
    viewCount: 320,
    createdAt: '2025-01-10T08:00:00Z',
  },
  badges: [
    {
      type: BadgeType.FIRST_CONFESSION,
      name: 'First Confession',
      description: 'Posted your first confession',
      earnedAt: '2024-06-15T12:00:00Z',
      progress: { current: 1, required: 1 },
    },
    {
      type: BadgeType.CONFESSION_STARTER,
      name: 'Confession Starter',
      description: 'Posted 10 confessions',
      earnedAt: '2024-08-20T09:30:00Z',
      progress: { current: 10, required: 10 },
    },
    {
      type: BadgeType.PROLIFIC_CONFESSOR,
      name: 'Prolific Confessor',
      description: 'Posted 50 confessions',
      earnedAt: null,
      progress: { current: 23, required: 50 },
    },
    {
      type: BadgeType.POPULAR_VOICE,
      name: 'Popular Voice',
      description: 'Had a confession with 100+ reactions',
      earnedAt: null,
      progress: { current: 45, required: 100 },
    },
    {
      type: BadgeType.COMMUNITY_FAVORITE,
      name: 'Community Favorite',
      description: 'Had 5 confessions with 50+ reactions each',
      earnedAt: null,
      progress: { current: 1, required: 5 },
    },
  ],
  activityStreak: {
    current: 5,
    longest: 12,
  },
  joinedAt: '2024-06-15T10:30:00Z',
  confessionsByMonth: [
    { month: '2025-02', count: 0 },
    { month: '2025-03', count: 2 },
    { month: '2025-04', count: 4 },
    { month: '2025-05', count: 1 },
    { month: '2025-06', count: 3 },
    { month: '2025-07', count: 2 },
    { month: '2025-08', count: 5 },
    { month: '2025-09', count: 1 },
    { month: '2025-10', count: 0 },
    { month: '2025-11', count: 2 },
    { month: '2025-12', count: 1 },
    { month: '2026-01', count: 2 },
  ],
};

const mockConfessions: Confession[] = [
  {
    id: 'conf-1',
    message: 'I secretly enjoy pineapple on pizza and I am not ashamed of it anymore.',
    gender: Gender.OTHER,
    createdAt: '2025-01-10T08:00:00Z',
    viewCount: 320,
    reactionCount: 45,
    moderationStatus: 'approved',
  },
  {
    id: 'conf-2',
    message: 'Sometimes I pretend to be on a phone call to avoid talking to people I know in public.',
    gender: Gender.OTHER,
    createdAt: '2025-01-08T14:30:00Z',
    viewCount: 180,
    reactionCount: 28,
    moderationStatus: 'approved',
  },
  {
    id: 'conf-3',
    message: 'I have been learning to play guitar for 2 years but still tell people I just started.',
    gender: Gender.OTHER,
    createdAt: '2025-01-05T20:15:00Z',
    viewCount: 95,
    reactionCount: 12,
    moderationStatus: 'approved',
  },
  {
    id: 'conf-4',
    message: 'I always say "you too" when the waiter says "enjoy your meal" and I think about it for hours.',
    gender: Gender.OTHER,
    createdAt: '2024-12-28T11:00:00Z',
    viewCount: 450,
    reactionCount: 67,
    moderationStatus: 'approved',
  },
  {
    id: 'conf-5',
    message: 'I have a secret snack drawer at work that nobody knows about.',
    gender: Gender.OTHER,
    createdAt: '2024-12-20T16:45:00Z',
    viewCount: 120,
    reactionCount: 19,
    moderationStatus: 'approved',
  },
];
// ============ END MOCK DATA ============

export default function ProfilePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confessionPage, setConfessionPage] = useState(1);
  const [user, setUser] = useState<User>(mockUser);

  const handleSaveProfile = async (data: UpdateProfileDto) => {
    // Mock save - update local state
    setUser((prev) => ({ ...prev, ...data }));
    console.log('Profile updated:', data);
  };

  const handleDeactivateAccount = async () => {
    console.log('Account deactivation requested');
    alert('Account deactivation requested (mock)');
  };

  const handleAvatarChange = async (file: File) => {
    console.log('Avatar file selected:', file.name);
    // Mock avatar upload - create a local URL
    const url = URL.createObjectURL(file);
    setUser((prev) => ({ ...prev, avatarUrl: url }));
  };

  // Pagination for mock data
  const itemsPerPage = 10;
  const totalPages = Math.ceil(mockConfessions.length / itemsPerPage);
  const paginatedConfessions = mockConfessions.slice(
    (confessionPage - 1) * itemsPerPage,
    confessionPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          badges={mockStats.badges}
          onAvatarChange={handleAvatarChange}
          onSettingsClick={() => setIsSettingsOpen(true)}
          isOwnProfile={true}
        />

        {/* Tab Navigation */}
        <div className="mt-8 space-y-8">
          {/* Statistics Section */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Statistics</h2>
            <ProfileStats stats={mockStats} isLoading={false} />
          </section>

          {/* Badges Section */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Badges</h2>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <BadgeDisplay badges={mockStats.badges} showProgress />
            </div>
          </section>

          {/* Confession History Section */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Confession History</h2>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <ConfessionHistory
                confessions={paginatedConfessions}
                total={mockConfessions.length}
                page={confessionPage}
                totalPages={totalPages}
                onPageChange={setConfessionPage}
                isLoading={false}
              />
            </div>
          </section>
        </div>

        {/* Settings Modal */}
        <ProfileSettings
          user={user}
          onSave={handleSaveProfile}
          onClose={() => setIsSettingsOpen(false)}
          onDeactivate={handleDeactivateAccount}
          isOpen={isSettingsOpen}
        />
      </div>
    </div>
  );
}
