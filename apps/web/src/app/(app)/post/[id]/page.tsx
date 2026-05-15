'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { postApi, commentApi, bookmarkApi } from '@/lib/api';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  MapPin,
  Hash,
  AtSign,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface PostData {
  id: string;
  mediaUrls: string[];
  mediaType: string;
  caption: string;
  location: string;
  likesCount: number;
  commentsCount: number;
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
  replies?: CommentData[];
  repliesCount?: number;
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    loadPost();
  }, [params.id]);

  useEffect(() => {
    if (post) loadComments();
  }, [post]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const { data } = await postApi.getById(params.id);
      setPost(data.data);
      setLiked(data.data.isLiked);
      setSaved(data.data.isSaved);
    } catch {
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await commentApi.getPostComments(params.id, { limit: 20 });
      setComments(data.data?.comments || []);
    } catch {
      toast.error('Failed to load comments');
    }
  };

  const handleLike = async () => {
    try {
      await postApi.like(params.id);
      setLiked(!liked);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likesCount: prev.likesCount + (liked ? -1 : 1),
              isLiked: !liked,
            }
          : null
      );
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async () => {
    try {
      await bookmarkApi.toggle({ postId: params.id });
      setSaved(!saved);
      toast.success(saved ? 'Removed from saved' : 'Saved');
    } catch {
      toast.error('Failed to save post');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on Lumina',
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
      await commentApi.create({ content: commentText.trim(), postId: params.id });
      setCommentText('');
      loadComments();
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderCaption = (caption: string) => {
    const parts = caption.split(/(#\w+|@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-purple-500">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-500">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">Post not found</p>
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center gap-4 md:hidden">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">Post</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-3/5">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <Image
              src={post.mediaUrls[currentMedia]}
              alt={post.caption || 'Post'}
              fill
              className="object-contain"
            />

            {post.mediaUrls.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentMedia((p) => Math.max(0, p - 1))}
                  className={cn(
                    'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80',
                    currentMedia === 0 && 'hidden'
                  )}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentMedia((p) => Math.min(post.mediaUrls.length - 1, p + 1))
                  }
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80',
                    currentMedia === post.mediaUrls.length - 1 && 'hidden'
                  )}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {post.mediaUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentMedia(i)}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        i === currentMedia ? 'bg-white' : 'bg-white/40'
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="transition-transform hover:scale-110"
              >
                <Heart
                  className={cn(
                    'h-6 w-6',
                    liked ? 'fill-red-500 text-red-500' : 'text-foreground'
                  )}
                />
              </button>
              <button className="transition-transform hover:scale-110">
                <MessageCircle className="h-6 w-6" />
              </button>
              <button
                onClick={handleShare}
                className="transition-transform hover:scale-110"
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>
            <button
              onClick={handleSave}
              className="transition-transform hover:scale-110"
            >
              <Bookmark
                className={cn(
                  'h-6 w-6',
                  saved ? 'fill-foreground text-foreground' : 'text-foreground'
                )}
              />
            </button>
          </div>

          <p className="mt-2 font-semibold">{formatNumber(post.likesCount)} likes</p>
        </div>

        <div className="lg:w-2/5">
          <div className="flex items-center gap-3 border-b pb-4">
            <button
              onClick={() => router.push(`/${post.author.username}`)}
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
            >
              <Image
                src={post.author.avatar || '/default-avatar.png'}
                alt={post.author.username}
                fill
                className="object-cover"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                onClick={() => router.push(`/${post.author.username}`)}
                className="font-semibold hover:underline"
              >
                {post.author.username}
              </button>
              {post.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {post.location}
                </div>
              )}
            </div>
            <button className="rounded-full p-1.5 hover:bg-muted">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-4 lg:max-h-[400px]">
            <div className="mb-4">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => router.push(`/${post.author.username}`)}
                  className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full"
                >
                  <Image
                    src={post.author.avatar || '/default-avatar.png'}
                    alt={post.author.username}
                    fill
                    className="object-cover"
                  />
                </button>
                <div>
                  <p className="text-sm">
                    <button
                      onClick={() => router.push(`/${post.author.username}`)}
                      className="font-semibold hover:underline"
                    >
                      {post.author.username}
                    </button>{' '}
                    {post.caption && renderCaption(post.caption)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(post.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-start gap-2"
                >
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
                        onClick={() => router.push(`/${comment.author.username}`)}
                        className="font-semibold hover:underline"
                      >
                        {comment.author.username}
                      </button>{' '}
                      {comment.content}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{timeAgo(comment.createdAt)}</span>
                      <span>{comment.likesCount} likes</span>
                      {comment.repliesCount && comment.repliesCount > 0 && (
                        <button className="font-medium hover:underline">
                          View {comment.repliesCount}{' '}
                          {comment.repliesCount === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-2 ml-4 space-y-2 border-l-2 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <button
                              onClick={() => router.push(`/${reply.author.username}`)}
                              className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                            >
                              <Image
                                src={reply.author.avatar || '/default-avatar.png'}
                                alt={reply.author.username}
                                fill
                                className="object-cover"
                              />
                            </button>
                            <p className="text-xs">
                              <button
                                onClick={() => router.push(`/${reply.author.username}`)}
                                className="font-semibold hover:underline"
                              >
                                {reply.author.username}
                              </button>{' '}
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="border-t pt-3">
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
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
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
      </div>
    </div>
  );
}
