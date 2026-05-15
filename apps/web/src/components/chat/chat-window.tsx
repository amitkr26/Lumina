'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { MessageInput } from './message-input';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, CheckCheck, ArrowUp, X, Smile, Heart, ThumbsUp, Laugh, Frown } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { username: string };
  };
  reactions: { emoji: string; count: number; userReacted: boolean }[];
  isRead: boolean;
  createdAt: string;
}

interface ChatWindowProps {
  conversationId: string;
  recipient: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
  };
  className?: string;
}

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😢'];

export function ChatWindow({ conversationId, recipient, className }: ChatWindowProps) {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const res = await chatApi.getMessages(conversationId, {
        limit: 50,
        cursor: (pageParam as unknown as string) ?? undefined,
      });
      return res.data.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor,
  });

  const messages = data?.pages.flatMap((page) => (page as any).messages) as Message[] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      await chatApi.sendMessage(conversationId, {
        content,
        replyToId: replyTo?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setReplyTo(null);
    },
    [conversationId, replyTo, queryClient],
  );

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      await chatApi.sendMessage(conversationId, {
        type: 'reaction',
        content: emoji,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setShowReactionsFor(null);
    },
    [conversationId, queryClient],
  );

  const isOwnMessage = (msg: Message) => msg.sender.id !== recipient.id;

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}
            >
              <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Avatar
          src={recipient.avatarUrl}
          alt={recipient.username}
          size="md"
          online={recipient.isOnline}
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/${recipient.username}`}
            className="font-semibold text-sm hover:underline truncate block"
          >
            {recipient.displayName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {recipient.isOnline ? 'Active now' : 'Offline'}
          </p>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        <AnimatePresence>
          {messages.map((message, index) => {
            const own = isOwnMessage(message);
            const showTimestamp =
              index === 0 ||
              new Date(message.createdAt).getTime() -
                new Date(messages[index - 1].createdAt).getTime() >
                300000;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex flex-col', own ? 'items-end' : 'items-start')}
              >
                {showTimestamp && (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {timeAgo(message.createdAt)}
                  </span>
                )}

                {message.replyTo && (
                  <div
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-t-lg border-l-2 mb-0 max-w-xs truncate',
                      own
                        ? 'bg-primary/10 border-primary text-primary-foreground/70'
                        : 'bg-muted border-muted-foreground text-muted-foreground',
                    )}
                  >
                    <span className="font-medium">
                      {message.replyTo.sender.username}
                    </span>{' '}
                    {message.replyTo.content}
                  </div>
                )}

                <div className="relative group">
                  <div
                    className={cn(
                      'px-3 py-2 max-w-xs sm:max-w-sm rounded-2xl text-sm break-words',
                      own
                        ? message.replyTo
                          ? 'bg-primary text-primary-foreground rounded-tl-none'
                          : 'bg-primary text-primary-foreground'
                        : message.replyTo
                          ? 'bg-muted text-foreground rounded-tr-none'
                          : 'bg-muted text-foreground',
                    )}
                  >
                    {message.content}
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    {own && (
                      <span className="text-muted-foreground">
                        {message.isRead ? (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {message.reactions.length > 0 && (
                    <div
                      className={cn(
                        'flex gap-0.5 mt-1',
                        own ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {message.reactions
                        .filter((r) => r.count > 0)
                        .map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleReaction(message.id, r.emoji)}
                            className={cn(
                              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border',
                              r.userReacted
                                ? 'bg-primary/10 border-primary/30'
                                : 'bg-background border-border',
                            )}
                          >
                            {r.emoji}
                            <span className="text-muted-foreground">{r.count}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5 p-1 rounded-full bg-popover border shadow-sm',
                      own ? '-left-16' : '-right-16',
                    )}
                  >
                    <button
                      onClick={() => setReplyTo(message)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() =>
                        setShowReactionsFor(
                          showReactionsFor === message.id ? null : message.id,
                        )
                      }
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {showReactionsFor === message.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                          'absolute top-0 flex gap-1 p-1.5 rounded-full bg-popover border shadow-lg z-10',
                          own ? '-left-20' : '-right-20',
                        )}
                      >
                        {EMOJI_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="hover:scale-125 transition-transform text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator />

      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/50">
          <ArrowUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium text-foreground">{replyTo.sender.username}</span>
            </p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 hover:bg-muted rounded-full"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <MessageInput onSend={handleSend} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="px-4 py-2 hidden">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
        </div>
        <span className="text-xs text-muted-foreground">typing...</span>
      </div>
    </div>
  );
}
