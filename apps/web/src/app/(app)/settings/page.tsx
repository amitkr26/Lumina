'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { userApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Shield,
  Bell,
  MessageSquare,
  Activity,
  ChevronLeft,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<
    'profile' | 'account' | 'privacy' | 'notifications'
  >('profile');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {(
          [
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'account', label: 'Account', icon: Lock },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ] as const
        ).map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeSection === section.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeSection === 'profile' && <ProfileSettings />}
        {activeSection === 'account' && <AccountSettings />}
        {activeSection === 'privacy' && <PrivacySettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
      </motion.div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await userApi.updateProfile({
        displayName,
        bio,
        website,
        location,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Profile Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full resize-none rounded-lg border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-1 text-xs text-muted-foreground">{bio.length}/150</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Your city or region"
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </button>
    </div>
  );
}

function AccountSettings() {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Theme</h2>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                theme === t.id
                  ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                  : 'hover:bg-muted'
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Email</h2>
        <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{user?.email}</span>
          {user?.isVerified && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
              <Check className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Change Password</h2>
        <div className="space-y-4">
          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium">Current Password</label>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium">New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  const [privateAccount, setPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);
  const [messagePermissions, setMessagePermissions] = useState<'everyone' | 'followers' | 'nobody'>('everyone');

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await userApi.updateProfile({ [key]: value });
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Privacy</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Private Account</p>
              <p className="text-sm text-muted-foreground">
                Only approved followers can see your posts
              </p>
            </div>
            <button
              onClick={() => {
                setPrivateAccount(!privateAccount);
                handleToggle('isPrivate', !privateAccount);
              }}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                privateAccount ? 'bg-purple-600' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  privateAccount ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Activity Status</p>
              <p className="text-sm text-muted-foreground">
                Show when you&apos;re active
              </p>
            </div>
            <button
              onClick={() => {
                setActivityStatus(!activityStatus);
                handleToggle('showActivityStatus', !activityStatus);
              }}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                activityStatus ? 'bg-purple-600' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  activityStatus ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Messages</h2>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Who can send you messages</p>
          <div className="flex gap-2">
            {(['everyone', 'followers', 'nobody'] as const).map((perm) => (
              <button
                key={perm}
                onClick={() => {
                  setMessagePermissions(perm);
                  handleToggle('messagePermissions', true);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm capitalize transition-colors',
                  messagePermissions === perm
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                    : 'hover:bg-muted'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {perm}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    storyReplies: true,
    liveVideos: false,
    recommendations: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const items = [
    { key: 'likes' as const, label: 'Likes', desc: 'When someone likes your content' },
    { key: 'comments' as const, label: 'Comments', desc: 'When someone comments on your content' },
    { key: 'follows' as const, label: 'New Followers', desc: 'When someone follows you' },
    { key: 'mentions' as const, label: 'Mentions', desc: 'When someone mentions you' },
    { key: 'messages' as const, label: 'Messages', desc: 'When you receive a direct message' },
    { key: 'storyReplies' as const, label: 'Story Replies', desc: 'When someone replies to your story' },
    { key: 'liveVideos' as const, label: 'Live Videos', desc: 'When someone you follow goes live' },
    { key: 'recommendations' as const, label: 'Recommendations', desc: 'Suggested content and accounts' },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Notification Preferences</h2>
      <div className="space-y-4">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => toggleNotification(key)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                notifications[key] ? 'bg-purple-600' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  notifications[key] ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
