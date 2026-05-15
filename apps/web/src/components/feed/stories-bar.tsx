'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { storyApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { StoryViewer } from './story-viewer';

interface StoryUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
}

interface StoryGroup {
  user: StoryUser;
  stories: StoryItem[];
  seen: boolean;
}

interface StoriesBarProps {
  onStoryClick?: (groupIndex: number, storyIndex: number) => void;
}

export function StoriesBar({ onStoryClick }: StoriesBarProps) {
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const fetchStories = useCallback(async () => {
    try {
      const { data } = await storyApi.getFeed();
      setStories(data.data?.stories ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleStoryClick = (groupIndex: number, storyIndex: number = 0) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(storyIndex);
    setViewerOpen(true);
    onStoryClick?.(groupIndex, storyIndex);
  };

  const handleViewerClose = () => {
    setViewerOpen(false);
    fetchStories();
  };

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="relative border-b border-border bg-card">
        <div
          ref={scrollRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {user && (
            <button
              onClick={() => {}}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              aria-label="Add to your story"
            >
              <div className="relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Your story"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border group-hover:ring-brand-500/30 transition-all"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-brand-500 border-2 border-card flex items-center justify-center">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground max-w-[64px] truncate">
                Your story
              </span>
            </button>
          )}

          {stories.map((group, groupIndex) => (
            <button
              key={group.user.id}
              onClick={() => handleStoryClick(groupIndex)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              aria-label={`View ${group.user.username}'s story`}
            >
              <div
                className={cn(
                  'p-[2px] rounded-full transition-all',
                  group.seen
                    ? 'bg-muted'
                    : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-story-gradient'
                )}
              >
                <div className="p-[2px] bg-card rounded-full">
                  {group.user.avatar ? (
                    <img
                      src={group.user.avatar}
                      alt={group.user.username}
                      className="h-14 w-14 rounded-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {group.user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground max-w-[64px] truncate group-hover:text-foreground transition-colors">
                {group.user.displayName || group.user.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewerOpen && stories[activeGroupIndex] && (
          <StoryViewer
            stories={stories}
            initialGroupIndex={activeGroupIndex}
            initialStoryIndex={activeStoryIndex}
            onClose={handleViewerClose}
            onGroupChange={setActiveGroupIndex}
            onStoryChange={setActiveStoryIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}
