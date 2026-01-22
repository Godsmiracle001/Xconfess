'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Gender, UpdateProfileDto } from '@/app/lib/types/user';
import { cn } from '@/app/lib/utils/cn';
import { X, Save, Loader2, Globe, Lock, AlertTriangle } from 'lucide-react';

interface ProfileSettingsProps {
  user: User;
  onSave: (data: UpdateProfileDto) => Promise<void>;
  onClose: () => void;
  onDeactivate?: () => Promise<void>;
  isOpen: boolean;
}

export function ProfileSettings({
  user,
  onSave,
  onClose,
  onDeactivate,
  isOpen,
}: ProfileSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileDto>({
    defaultValues: {
      bio: user.bio || '',
      gender: user.gender || undefined,
      age: user.age || undefined,
      canReceiveMessages: user.canReceiveMessages,
      isProfilePublic: user.isProfilePublic,
    },
  });

  const isProfilePublic = watch('isProfilePublic');

  const onSubmit = async (data: UpdateProfileDto) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (onDeactivate) {
      setIsSubmitting(true);
      try {
        await onDeactivate();
        onClose();
      } catch (error) {
        console.error('Failed to deactivate account:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-5">
            {/* Bio */}
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="bio"
                {...register('bio', { maxLength: 500 })}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.bio && (
                <p className="mt-1 text-xs text-red-500">Bio must be less than 500 characters</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                id="gender"
                {...register('gender')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Prefer not to say</option>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="mb-1.5 block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                id="age"
                type="number"
                {...register('age', { min: 0, max: 150, valueAsNumber: true })}
                placeholder="Your age"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.age && (
                <p className="mt-1 text-xs text-red-500">Please enter a valid age</p>
              )}
            </div>

            {/* Privacy Toggle */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {isProfilePublic ? (
                    <Globe className="mt-0.5 h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="mt-0.5 h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <label htmlFor="isProfilePublic" className="block font-medium text-gray-900">
                      Public Profile
                    </label>
                    <p className="text-sm text-gray-500">
                      {isProfilePublic
                        ? 'Others can view your profile and stats'
                        : 'Your profile is only visible to you'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    id="isProfilePublic"
                    {...register('isProfilePublic')}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100"></div>
                </label>
              </div>
            </div>

            {/* Can Receive Messages */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor="canReceiveMessages" className="block font-medium text-gray-900">
                    Allow Messages
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive messages from other users on your confessions
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    id="canReceiveMessages"
                    {...register('canReceiveMessages')}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Deactivate Account
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                  isSubmitting || !isDirty
                    ? 'cursor-not-allowed bg-indigo-400'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </form>

        {/* Deactivate Confirmation Modal */}
        {showDeactivateConfirm && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <div className="m-4 max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Deactivate Account?</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Your account will be deactivated and your profile will be hidden. You can reactivate
                it later by logging in again.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileSettings;
