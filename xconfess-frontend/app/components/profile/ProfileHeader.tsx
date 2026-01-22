'use client';

import { User, Badge } from '@/app/lib/types/user';
import { cn } from '@/app/lib/utils/cn';
import { formatDate } from '@/app/lib/utils/formatDate';
import { BadgeDisplay } from './BadgeDisplay';
import { Camera, Calendar, Settings, Globe, Lock } from 'lucide-react';
import { useState, useRef } from 'react';

interface ProfileHeaderProps {
  user: User;
  badges: Badge[];
  onAvatarChange?: (file: File) => void;
  onSettingsClick?: () => void;
  isOwnProfile?: boolean;
}

export function ProfileHeader({
  user,
  badges,
  onAvatarChange,
  onSettingsClick,
  isOwnProfile = true,
}: ProfileHeaderProps) {
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(file);
    }
  };

  const earnedBadges = badges.filter((b) => b.earnedAt !== null);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Cover/Banner */}
      <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 sm:h-40" />

      {/* Profile Info */}
      <div className="relative px-4 pb-6 sm:px-6">
        {/* Avatar */}
        <div className="relative -mt-16 sm:-mt-20">
          <div
            className={cn(
              'relative inline-block rounded-full border-4 border-white bg-white shadow-md',
              isOwnProfile && 'cursor-pointer'
            )}
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            onClick={handleAvatarClick}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="h-24 w-24 rounded-full object-cover sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-3xl font-bold text-white sm:h-32 sm:w-32 sm:text-4xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}

            {isOwnProfile && isHoveringAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* User Details */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
              {user.isProfilePublic ? (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
            </div>

            {user.bio && (
              <p className="max-w-md text-gray-600">{user.bio}</p>
            )}

            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatDate(user.createdAt, 'MMMM yyyy')}</span>
            </div>

            {/* Badges Preview */}
            {earnedBadges.length > 0 && (
              <div className="mt-3">
                <BadgeDisplay badges={earnedBadges} compact showProgress={false} />
              </div>
            )}
          </div>

          {/* Settings Button */}
          {isOwnProfile && onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
