'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  BadgeCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatNumber, timeAgo } from '@/lib/utils';

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface PostAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isVerified: boolean;
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

interface PostCardProps {
  post: PostData;
  isLiked: boolean;
  isSaved: boolean;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onComment: (postId: string) => void;
}

export function PostCard({ post, isLiked, isSaved, onLike, onSave, onComment }: PostCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [isCaptionTruncated, setIsCaptionTruncated] = useState(false);

  const hasMultipleMedia = post.media.length > 1;

  const checkCaptionTruncation = useCallback(() => {
    if (captionRef.current) {
      setIsCaptionTruncated(captionRef.current.scrollHeight > captionRef.current.clientHeight);
    }
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) onLike(post.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike, post.id]);

  const goToSlide = (index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, post.media.length - 1)));
  };

  const currentMedia = post.media[currentSlide];
  const isCaptionLong = (post.caption?.length ?? 0) > 100;
  const displayCaption = !captionExpanded && isCaptionLong
    ? post.caption?.slice(0, 100) + '...'
    : post.caption;

  return (
    <article className="bg-card border-b border-border md:border md:rounded-xl md:mb-4">
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link href={`/${post.author.username}`} className="flex items-center gap-2.5">
          <div className="relative">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.displayName || post.author.username}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-transparent hover:ring-brand-500/30 transition-all"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {(post.author.displayName || post.author.username).charAt(0).toUpperCase()}
              </div>
            )}
            {post.author.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border border-card">
                <BadgeCheck className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold hover:underline">{post.author.username}</p>
          </div>
        </Link>
        <button className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="More options">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="relative" onClick={handleDoubleTap}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  poster={currentMedia.thumbnailUrl}
                  className="h-full w-full object-cover"
                  controls={false}
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={currentMedia.url}
                  alt="Post media"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="h-20 w-20 text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        {hasMultipleMedia && (
          <>
            {currentSlide > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(currentSlide - 1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {currentSlide < post.media.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(currentSlide + 1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.media.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(i);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === currentSlide ? 'w-4 bg-brand-500' : 'w-1.5 bg-white/60 hover:bg-white/80'
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onLike(post.id)}
              className="p-0.5 -m-0.5"
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={cn(
                  'h-6 w-6 transition-colors',
                  isLiked ? 'text-red-500 fill-red-500' : 'hover:text-muted-foreground'
                )}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onComment(post.id)}
              className="p-0.5 -m-0.5"
              aria-label="Comment"
            >
              <MessageCircle className="h-6 w-6 hover:text-muted-foreground transition-colors" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.8 }}
              className="p-0.5 -m-0.5"
              aria-label="Share"
            >
              <Send className="h-6 w-6 hover:text-muted-foreground transition-colors" />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => onSave(post.id)}
            className="p-0.5 -m-0.5"
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <Bookmark
              className={cn(
                'h-6 w-6 transition-colors',
                isSaved ? 'text-foreground fill-foreground' : 'hover:text-muted-foreground'
              )}
            />
          </motion.button>
        </div>

        <p className="text-sm font-semibold mb-1">{formatNumber(post.likeCount + (isLiked ? 1 : 0))} likes</p>

        {post.caption && (
          <div className="mb-1">
            <p className="text-sm" ref={captionRef}>
              <Link href={`/${post.author.username}`} className="font-semibold mr-1.5 hover:underline">
                {post.author.username}
              </Link>
              <span className="text-foreground/90">{displayCaption}</span>
            </p>
            {isCaptionLong && (
              <button
                onClick={() => setCaptionExpanded(!captionExpanded)}
                className="text-sm text-muted-foreground mt-0.5"
              >
                {captionExpanded ? 'Show less' : '...more'}
              </button>
            )}
          </div>
        )}

        {post.commentCount > 0 && (
          <button
            onClick={() => onComment(post.id)}
            className="text-sm text-muted-foreground mb-1"
          >
            View all {post.commentCount} comments
          </button>
        )}

        <time className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {timeAgo(post.createdAt)}
        </time>
      </div>
    </article>
  );
}
