'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { CommentCard } from './comment-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ChevronDown, Loader2 } from 'lucide-react';

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
  replies?: Comment[];
}

interface CommentSectionProps {
  postId?: string;
  reelId?: string;
  className?: string;
}

export function CommentSection({ postId, reelId, className }: CommentSectionProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const targetId = postId || reelId;
  const targetKey = postId ? 'postId' : 'reelId';

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['comments', targetKey, targetId],
    queryFn: async ({ pageParam }) => {
      if (!targetId) return { comments: [], nextCursor: null };
      const res = postId
        ? await commentApi.getPostComments(postId, {
            limit: 20,
            cursor: pageParam as string | null,
          })
        : await commentApi.getReelComments(reelId!, {
            limit: 20,
            cursor: pageParam as string | null,
          });
      return res.data.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor,
    enabled: !!targetId,
  });

  const comments = data?.pages.flatMap((page) => (page as any).comments) as Comment[] || [];

  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await commentApi.create({
        content,
        postId,
        reelId,
        parentId: replyTo || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', targetKey, targetId] });
      setNewComment('');
      setReplyTo(null);
    },
  });

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      await commentApi.like(commentId);
      queryClient.invalidateQueries({ queryKey: ['comments', targetKey, targetId] });
    },
    [queryClient, targetKey, targetId],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await commentApi.delete(commentId);
      queryClient.invalidateQueries({ queryKey: ['comments', targetKey, targetId] });
    },
    [queryClient, targetKey, targetId],
  );

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createComment.mutate(newComment.trim());
  };

  const replyingTo = replyTo
    ? comments.find((c) => c.id === replyTo)
    : null;

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-4 p-4', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              layout
            >
              <CommentCard
                comment={comment}
                onLike={() => handleLikeComment(comment.id)}
                onDelete={() => handleDeleteComment(comment.id)}
                onReply={() => setReplyTo(comment.id)}
              />

              {comment.repliesCount > 0 && (
                <div className="ml-6 mt-2">
                  {!expandedReplies[comment.id] ? (
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                      View {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                    </button>
                  ) : (
                    <div className="space-y-3 border-l-2 border-border pl-4">
                      {comment.replies?.map((reply) => (
                        <CommentCard
                          key={reply.id}
                          comment={reply}
                          isReply
                          onLike={() => handleLikeComment(reply.id)}
                          onDelete={() => handleDeleteComment(reply.id)}
                          onReply={() => setReplyTo(reply.id)}
                        />
                      ))}
                      {comment.repliesCount > (comment.replies?.length || 0) && (
                        <Button variant="ghost" size="sm" className="text-sm">
                          Load more replies
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-4">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">
              Replying to <span className="font-medium text-foreground">@{replyingTo.author.username}</span>
            </span>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
