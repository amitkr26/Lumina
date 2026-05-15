'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Send, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import { storyApi } from '@/lib/api';

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

interface StoryViewerProps {
  stories: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex: number;
  onClose: () => void;
  onGroupChange: (index: number) => void;
  onStoryChange: (index: number) => void;
}

const STORY_DURATION = 5000;
const PROGRESS_HEIGHT = 3;

export function StoryViewer({
  stories,
  initialGroupIndex,
  initialStoryIndex,
  onClose,
  onGroupChange,
  onStoryChange,
}: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef(0);

  const currentGroup = stories[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  const resetProgress = useCallback(() => {
    setProgress(0);
    lastTickRef.current = Date.now();
  }, []);

  const advanceStory = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      onStoryChange(storyIndex + 1);
      resetProgress();
    } else if (groupIndex < stories.length - 1) {
      setGroupIndex((prev) => prev + 1);
      onGroupChange(groupIndex + 1);
      setStoryIndex(0);
      onStoryChange(0);
      resetProgress();
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, stories.length, onClose, onGroupChange, onStoryChange, resetProgress]);

  const goBack = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      onStoryChange(storyIndex - 1);
      resetProgress();
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      onGroupChange(groupIndex - 1);
      const prevGroup = stories[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      onStoryChange(prevGroup.stories.length - 1);
      resetProgress();
    } else {
      setProgress(0);
      resetProgress();
    }
  }, [storyIndex, groupIndex, stories, onGroupChange, onStoryChange, resetProgress]);

  useEffect(() => {
    resetProgress();

    if (currentStory?.mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [groupIndex, storyIndex, currentStory, resetProgress]);

  useEffect(() => {
    if (currentStory?.mediaType === 'image') {
      lastTickRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        setProgress((prev) => {
          const increment = (delta / STORY_DURATION) * 100;
          const next = prev + increment;
          if (next >= 100) {
            if (timerRef.current) clearInterval(timerRef.current);
            advanceStory();
            return 100;
          }
          return next;
        });
      }, 50);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [groupIndex, storyIndex, currentStory, advanceStory]);

  const handleVideoEnd = () => {
    advanceStory();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goBack();
      else advanceStory();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !currentStory) return;
    try {
      await storyApi.reply(currentStory.id, replyText.trim());
      setReplyText('');
    } catch {
      // silently fail
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-3 space-y-2">
          <div className="flex gap-1">
            {currentGroup.stories.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{
                    width:
                      i < storyIndex
                        ? '100%'
                        : i === storyIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href={`/${currentGroup.user.username}`}
              className="flex items-center gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              {currentGroup.user.avatar ? (
                <img
                  src={currentGroup.user.avatar}
                  alt={currentGroup.user.username}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-white/30"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {currentGroup.user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white text-sm font-semibold">{currentGroup.user.username}</p>
                <p className="text-white/60 text-xs">{timeAgo(currentStory.createdAt)}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted(!muted)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close story"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center">
          <div className="absolute inset-0 flex">
            <button
              onClick={goBack}
              className="flex-1 cursor-default"
              aria-label="Previous story"
            />
            <button
              onClick={advanceStory}
              className="flex-1 cursor-default"
              aria-label="Next story"
            />
          </div>

          {currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="h-full w-full object-contain"
              autoPlay
              muted={muted}
              playsInline
              onEnded={handleVideoEnd}
            />
          ) : (
            <Image
              src={currentStory.mediaUrl}
              alt="Story"
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pb-6 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              placeholder={`Reply to ${currentGroup.user.username}...`}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder:text-white/50 focus:outline-none focus:border-white/40"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className={cn(
                'p-2.5 rounded-full transition-colors',
                replyText.trim()
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'bg-white/10 text-white/30'
              )}
              aria-label="Send reply"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
