'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { userApi } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Link2,
  UserPlus,
  UserCheck,
  Grid3X3,
  Clapperboard,
  UserSquare2,
  ArrowLeft,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  website: string;
  location: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isPrivate: boolean;
}

interface PostItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tagged'>('posts');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const isOwnProfile = currentUser?.username === params.username;

  useEffect(() => {
    loadProfile();
  }, [params.username]);

  useEffect(() => {
    if (activeTab === 'posts') loadPosts();
    else if (activeTab === 'reels') loadReels();
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await userApi.getByUsername(params.username);
      setProfile(data.data);
      setFollowing(data.data.isFollowing);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const { data } = await userApi.getPosts(params.username, { limit: 20 });
      setPosts(data.data?.posts || []);
    } catch {
      toast.error('Failed to load posts');
    }
  };

  const loadReels = async () => {
    try {
      const { data } = await userApi.getReels(params.username, { limit: 20 });
      setPosts(data.data?.reels || []);
    } catch {
      toast.error('Failed to load reels');
    }
  };

  const handleFollow = async () => {
    try {
      await userApi.follow(params.username);
      setFollowing(!following);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: !following,
              followersCount: prev.followersCount + (following ? -1 : 1),
            }
          : null
      );
      toast.success(following ? 'Unfollowed' : 'Following');
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">User not found</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-purple-500 hover:text-purple-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'posts' as const, label: 'Posts', icon: Grid3X3 },
    { id: 'reels' as const, label: 'Reels', icon: Clapperboard },
    { id: 'tagged' as const, label: 'Tagged', icon: UserSquare2 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4 md:hidden">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">{profile.username}</h1>
      </div>

      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
        <div className="mx-auto flex-shrink-0 md:mx-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-full md:h-36 md:w-36">
            <Image
              src={profile.avatar || '/default-avatar.png'}
              alt={profile.username}
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="mb-4 flex flex-col items-center gap-3 md:flex-row md:gap-4">
            <h2 className="text-xl font-semibold">{profile.username}</h2>
            {isOwnProfile ? (
              <button
                onClick={() => router.push('/settings')}
                className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm hover:bg-muted/80"
              >
                <Settings className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                  following
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                )}
              >
                {following ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mb-4 flex justify-center gap-6 md:justify-start">
            <div className="text-center">
              <span className="font-semibold">{formatNumber(profile.postsCount)}</span>
              <span className="ml-1 text-muted-foreground">posts</span>
            </div>
            <div className="text-center">
              <span className="font-semibold">{formatNumber(profile.followersCount)}</span>
              <span className="ml-1 text-muted-foreground">followers</span>
            </div>
            <div className="text-center">
              <span className="font-semibold">{formatNumber(profile.followingCount)}</span>
              <span className="ml-1 text-muted-foreground">following</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{profile.displayName}</p>
            {profile.bio && <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-purple-500 hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 border-t py-3 text-sm transition-colors md:flex-none md:gap-2 md:px-6',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'tagged' ? (
              <div className="py-16 text-center text-muted-foreground">
                <UserSquare2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>No tagged posts yet</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {activeTab === 'posts' ? (
                  <Grid3X3 className="mx-auto mb-3 h-12 w-12 opacity-30" />
                ) : (
                  <Clapperboard className="mx-auto mb-3 h-12 w-12 opacity-30" />
                )}
                <p>No {activeTab} yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() =>
                      router.push(
                        activeTab === 'reels' ? `/reel/${post.id}` : `/post/${post.id}`
                      )
                    }
                    className="group relative aspect-square overflow-hidden bg-muted"
                  >
                    <Image
                      src={post.mediaUrl}
                      alt={post.caption || 'Post'}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex items-center gap-4 text-white">
                        <span className="flex items-center gap-1 text-sm font-semibold">
                          ❤️ {formatNumber(post.likesCount)}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold">
                          💬 {formatNumber(post.commentsCount)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
