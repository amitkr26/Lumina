'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { reelApi, commentApi, bookmarkApi } from '@/lib/api';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  Send,
  Music,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ReelData {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  musicTitle: string;
  musicArtist: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isFollowing: boolean;
  };
}

interface CommentData {
  id: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

export default function ReelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reel, setReel] = useState<ReelData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    loadReel();
  }, [params.id]);

  useEffect(() => {
    if (reel) loadComments();
  }, [reel]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const loadReel = async () => {
    try {
      setLoading(true);
      const { data } = await reelApi.getById(params.id);
      setReel(data.data);
      setLiked(data.data.isLiked);
      setSaved(data.data.isSaved);
    } catch {
      toast.error('Failed to load reel');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await commentApi.getReelComments(params.id, { limit: 20 });
      setComments(data.data?.comments || []);
    } catch {
      toast.error('Failed to load comments');
    }
  };

  const handleLike = async () => {
    try {
      await reelApi.like(params.id);
      setLiked(!liked);
      setReel((prev) =>
        prev
          ? {
              ...prev,
              likesCount: prev.likesCount + (liked ? -1 : 1),
              isLiked: !liked,
            }
          : null
      );
    } catch {
      toast.error('Failed to like reel');
    }
  };

  const handleSave = async () => {
    try {
      await bookmarkApi.toggle({ reelId: params.id });
      setSaved(!saved);
      toast.success(saved ? 'Removed from saved' : 'Saved');
    } catch {
      toast.error('Failed to save reel');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this reel on Lumina',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await commentApi.create({ content: commentText.trim(), reelId: params.id });
      setCommentText('');
      loadComments();
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      togglePlay();
    },
    [togglePlay]
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!reel) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">Reel not found</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-purple-500 hover:text-purple-400"
        >
          <ChevronLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[calc(100vh-4rem)] max-w-lg">
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex h-full items-center justify-center bg-black"
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.thumbnailUrl}
          className="h-full w-full object-contain"
          autoPlay
          loop
          playsInline
          muted={muted}
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-black/40 p-4">
              <svg
                className="h-12 w-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted(!muted);
          }}
          className="absolute right-4 top-20 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
        >
          {muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-20">
          <div className="mb-4 flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${reel.author.username}`);
              }}
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/30"
            >
              <Image
                src={reel.author.avatar || '/default-avatar.png'}
                alt={reel.author.username}
                fill
                className="object-cover"
              />
            </button>
            <div className="flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${reel.author.username}`);
                }}
                className="font-semibold text-white hover:underline"
              >
                {reel.author.username}
              </button>
              {reel.caption && (
                <p className="mt-1 text-sm text-white/90">{reel.caption}</p>
              )}
              {(reel.musicTitle || reel.musicArtist) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                  <Music className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {reel.musicTitle}
                    {reel.musicArtist && ` - ${reel.musicArtist}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <Heart
                  className={cn(
                    'h-7 w-7 text-white',
                    liked && 'fill-red-500 text-red-500'
                  )}
                />
                <span className="text-xs text-white">
                  {formatNumber(reel.likesCount)}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(true);
                }}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <MessageCircle className="h-7 w-7 text-white" />
                <span className="text-xs text-white">
                  {formatNumber(reel.commentsCount)}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <Share2 className="h-7 w-7 text-white" />
                <span className="text-xs text-white">Share</span>
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
            >
              <Bookmark
                className={cn(
                  'h-7 w-7 text-white',
                  saved && 'fill-white'
                )}
              />
              <span className="text-xs text-white">Save</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-20 max-h-[70vh] rounded-t-2xl bg-background"
          >
            <div className="relative">
              <div className="mx-auto my-2 h-1 w-10 rounded-full bg-muted" />

              <div className="flex items-center justify-between border-b px-4 pb-3">
                <h3 className="font-semibold">Comments</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="rounded-full p-1 hover:bg-muted"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-4">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs">Be the first to comment!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <button
                          onClick={() => router.push(`/${comment.author.username}`)}
                          className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full"
                        >
                          <Image
                            src={comment.author.avatar || '/default-avatar.png'}
                            alt={comment.author.username}
                            fill
                            className="object-cover"
                          />
                        </button>
                        <div className="flex-1">
                          <p className="text-sm">
                            <button
                              onClick={() =>
                                router.push(`/${comment.author.username}`)
                              }
                              className="font-semibold hover:underline"
                            >
                              {comment.author.username}
                            </button>{' '}
                            {comment.content}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{timeAgo(comment.createdAt)}</span>
                            <span>{comment.likesCount} likes</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitComment();
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-full bg-muted px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="text-purple-500 transition-colors hover:text-purple-400 disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
