'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, ImageOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { postApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { StoriesBar } from './stories-bar';
import { PostCard } from './post-card';

interface PostAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isVerified: boolean;
}

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface PostData {
  id: string;
  author: PostAuthor;
  media: PostMedia[];
  caption?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isVerified: boolean;
}

const POSTS_PER_PAGE = 10;

export function HomeFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [emptyState, setEmptyState] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setCursor(null);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await postApi.getFeed({
        limit: POSTS_PER_PAGE,
        cursor: isRefresh ? undefined : cursor ?? undefined,
      });

      const newPosts = data.data?.posts ?? [];
      const nextCursor = data.data?.nextCursor ?? null;

      if (isRefresh) {
        setPosts(newPosts);
        setEmptyState(newPosts.length === 0);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      if (isRefresh) setEmptyState(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const { data } = await userApi.getSuggestions({ limit: 5 });
      setSuggestedUsers(data.data?.users ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchFeed(true);
    if (isAuthenticated) fetchSuggestions();
  }, [fetchFeed, fetchSuggestions, isAuthenticated]);

  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      fetchFeed(false);
    }
  }, [inView, hasMore, loadingMore, fetchFeed]);

  const handleLike = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    postApi.like(postId).catch(() => {});
  }, []);

  const handleSave = useCallback((postId: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleComment = useCallback((_postId: string) => {
    // Open comment modal - to be implemented
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="border-b border-border">
          <div className="flex gap-4 px-4 py-3 overflow-x-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-b border-border md:border md:rounded-xl md:mb-4 md:mx-0">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="aspect-square bg-muted animate-pulse" />
            <div className="px-3 py-2.5 space-y-2">
              <div className="flex gap-4">
                <div className="h-6 w-6 rounded bg-muted animate-pulse" />
                <div className="h-6 w-6 rounded bg-muted animate-pulse" />
                <div className="h-6 w-6 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <StoriesBar />

      <AnimatePresence>
        {emptyState ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center"
          >
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No posts yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Follow people to see their posts in your feed.
            </p>

            {suggestedUsers.length > 0 && (
              <div className="w-full">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Suggested for you</p>
                </div>
                <div className="space-y-3">
                  {suggestedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold">{user.username}</p>
                          {user.displayName && (
                            <p className="text-xs text-muted-foreground">{user.displayName}</p>
                          )}
                        </div>
                      </div>
                      <button className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedPosts.has(post.id)}
                isSaved={savedPosts.has(post.id)}
                onLike={handleLike}
                onSave={handleSave}
                onComment={handleComment}
              />
            ))}

            {hasMore && (
              <div ref={ref} className="flex justify-center py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                </motion.div>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up!
                </p>
              </div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
