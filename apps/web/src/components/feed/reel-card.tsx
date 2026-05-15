'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatNumber } from '@/lib/utils';

interface ReelCardProps {
  reel: {
    id: string;
    thumbnailUrl: string;
    author: {
      id: string;
      username: string;
      avatar?: string;
    };
    viewCount: number;
  };
  className?: string;
}

export function ReelCard({ reel, className }: ReelCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn('relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group', className)}
    >
      <Link href={`/reels/${reel.id}`} className="absolute inset-0">
        <Image
          src={reel.thumbnailUrl}
          alt={`Reel by ${reel.author.username}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-2">
            {reel.author.avatar ? (
              <img
                src={reel.author.avatar}
                alt={reel.author.username}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/30"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {reel.author.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-white text-xs font-medium truncate drop-shadow-sm">
              @{reel.author.username}
            </span>
          </div>

          <div className="flex items-center gap-1 text-white/80">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">{formatNumber(reel.viewCount)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
