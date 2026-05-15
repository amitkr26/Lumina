'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MoreHorizontal, Flag, Pencil, Trash2, Pin } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, timeAgo, formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  likesCount: number;
  repliesCount: number;
  isLiked: boolean;
  isPinned: boolean;
  createdAt: string;
}

interface CommentCardProps {
  comment: Comment;
  isReply?: boolean;
  isOwn?: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  className?: string;
}

function highlightHashtags(content: string) {
  const parts = content.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} className="text-blue-500 hover:underline cursor-pointer">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function CommentCard({
  comment,
  isReply = false,
  isOwn = false,
  onLike,
  onReply,
  onDelete,
  onEdit,
  className,
}: CommentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const menuItems = [
    ...(isOwn
      ? [
          { icon: Pencil, label: 'Edit', action: onEdit },
          { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
        ]
      : [{ icon: Flag, label: 'Report', danger: true }]),
  ];

  return (
    <div className={cn('flex gap-3 group', isReply && 'ml-4', className)}>
      <Avatar
        src={comment.author.avatarUrl}
        alt={comment.author.username}
        size="sm"
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${comment.author.username}`}
            className="text-sm font-semibold hover:underline truncate"
          >
            {comment.author.username}
          </Link>
          {comment.isPinned && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.createdAt)}
          </span>

          <div className="ml-auto relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border bg-popover shadow-lg overflow-hidden"
                >
                  {menuItems.map((item, i) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action?.();
                        setShowMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                        item.danger && 'text-red-500',
                        i > 0 && 'border-t',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        </div>

        <p className="text-sm mt-0.5 break-words">{highlightHashtags(comment.content)}</p>

        <div className="flex items-center gap-4 mt-1.5">
          <button
            onClick={onLike}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              comment.isLiked
                ? 'text-red-500'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', comment.isLiked && 'fill-current')} />
            {formatNumber(comment.likesCount)}
          </button>

          <button
            onClick={onReply}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Reply
          </button>

          {comment.repliesCount > 0 && !isReply && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
