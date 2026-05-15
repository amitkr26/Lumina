'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { reelApi } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/utils';
import ReactPlayer from 'react-player';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  musicUrl?: string;
  musicTitle?: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

function ReelCard({ reel, isActive }: { reel: Reel; isActive: boolean }) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const playerRef = useRef<ReactPlayer>(null);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((c) => c + 1);
        reelApi.like(reel.id).catch(() => {});
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  }, [isLiked, reel.id]);

  const toggleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((c) => c - 1);
      } else {
        setIsLiked(true);
        setLikesCount((c) => c + 1);
      }
      await reelApi.like(reel.id);
    } catch {
      setIsLiked(reel.isLiked);
      setLikesCount(reel.likesCount);
    }
  };

  const toggleSave = async () => {
    try {
      setIsSaved(!isSaved);
    } catch {
      setIsSaved(reel.isSaved);
    }
  };

  return (
    <div className="relative h-screen snap-start snap-always bg-black">
      <div onClick={handleDoubleTap} className="absolute inset-0 z-10" />

      <ReactPlayer
        ref={playerRef}
        url={reel.videoUrl}
        width="100%"
        height="100%"
        playing={isActive && isPlaying}
        loop
        muted={false}
        playsinline
        className="absolute inset-0"
        style={{ objectFit: 'cover' }}
        config={{
          file: {
            attributes: {
              style: { objectFit: 'cover', width: '100%', height: '100%' },
            },
          },
        }}
      />

      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-20 px-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/${reel.author.username}`}
              className="flex items-center gap-2 mb-3"
            >
              <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {reel.author.avatar ? (
                  <img src={reel.author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  reel.author.displayName?.[0] || reel.author.username[0].toUpperCase()
                )}
              </div>
              <span className="text-white font-semibold text-sm">
                {reel.author.displayName || reel.author.username}
              </span>
            </Link>

            {reel.caption && (
              <p className="text-white text-sm mb-2 line-clamp-2">{reel.caption}</p>
            )}

            {reel.musicTitle && (
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Music2 className="w-3.5 h-3.5" />
                <span className="truncate">{reel.musicTitle}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-5">
            <button onClick={toggleLike} className="flex flex-col items-center gap-1">
              <Heart
                className={`w-7 h-7 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
              />
              <span className="text-white text-xs font-medium">
                {formatNumber(likesCount)}
              </span>
            </button>

            <button
              onClick={() => router.push(`/reels/${reel.id}`)}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-white text-xs font-medium">
                {formatNumber(reel.commentsCount)}
              </span>
            </button>

            <button onClick={toggleSave} className="flex flex-col items-center gap-1">
              <Bookmark
                className={`w-7 h-7 ${isSaved ? 'text-white fill-white' : 'text-white'}`}
              />
              <span className="text-white text-xs font-medium">
                {formatNumber(reel.savesCount)}
              </span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-white text-xs font-medium">
                {formatNumber(reel.sharesCount)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const loadReels = useCallback(async (isRefresh = false) => {
    try {
      const params: Record<string, any> = { limit: 5 };
      if (!isRefresh && cursor) params.cursor = cursor;

      const { data } = await reelApi.getAll(params);
      const newReels = data.data.reels || data.data || [];

      if (isRefresh) {
        setReels(newReels);
      } else {
        setReels((prev) => [...prev, ...newReels]);
      }

      setCursor(data.data.nextCursor || null);
      setHasMore(!!data.data.nextCursor);
    } catch (err) {
      console.error('Failed to load reels:', err);
      setError('Failed to load reels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    loadReels(true);
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadReels();
    }
  }, [inView, hasMore, loading, loadReels]);

  if (error && reels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
        <p>{error}</p>
        <button
          onClick={() => { setError(null); loadReels(true); }}
          className="px-4 py-2 bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black snap-y snap-mandatory overflow-y-scroll">
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link href="/" className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-white font-bold text-lg">Reels</h1>
        <div className="w-6" />
      </div>

      {reels.map((reel, index) => (
        <ReelCard key={reel.id} reel={reel} isActive={true} />
      ))}

      {hasMore && (
        <div ref={ref} className="h-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
