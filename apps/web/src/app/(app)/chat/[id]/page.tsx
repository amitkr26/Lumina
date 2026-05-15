'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSocket } from '@/components/socket-provider';
import { timeAgo } from '@/lib/utils';
import {
  ArrowLeft,
  Send,
  Smile,
  Check,
  CheckCheck,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import Link from 'next/link';

interface Message {
  id: string;
  content?: string;
  type: string;
  mediaUrl?: string;
  senderId: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  participants: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }[];
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { user } = useAuthStore();
  const { socket, isConnected, onlineUsers } = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async (isRefresh = false) => {
    try {
      const params: Record<string, any> = { limit: 30 };
      if (!isRefresh && cursor) params.cursor = cursor;

      const { data } = await chatApi.getMessages(conversationId, params);
      const newMessages = data.data.messages || data.data || [];

      if (isRefresh) {
        setMessages(newMessages.reverse());
      } else {
        setMessages((prev) => [...newMessages.reverse(), ...prev]);
      }

      setCursor(data.data.nextCursor || null);
      setHasMore(!!data.data.nextCursor);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, cursor]);

  const loadConversation = useCallback(async () => {
    try {
      const { data } = await chatApi.getConversations();
      const convos = data.data.conversations || data.data || [];
      const convo = convos.find((c: Conversation) => c.id === conversationId);
      if (convo) setConversation(convo);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages(true);
    loadConversation();
  }, [loadMessages, loadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join-conversation', conversationId);

    socket.on('new-message', (message: Message) => {
      if (message.senderId !== user?.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setTypingUserId(userId);
        setTimeout(() => setTypingUserId(null), 3000);
      }
    });

    socket.on('message-read', ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
      );
    });

    return () => {
      socket.off('new-message');
      socket.off('typing');
      socket.off('message-read');
      socket.emit('leave-conversation', conversationId);
    };
  }, [socket, isConnected, conversationId, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const { data } = await chatApi.sendMessage(conversationId, {
        content: input.trim(),
        type: 'text',
      });

      const newMessage = data.data.message || data.data;
      setMessages((prev) => [...prev, newMessage]);

      if (socket && isConnected) {
        socket.emit('send-message', {
          conversationId,
          message: newMessage,
        });
      }

      setInput('');
      setShowEmoji(false);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleTyping = () => {
    if (socket && isConnected) {
      socket.emit('typing', { conversationId });
    }
  };

  const otherParticipant = conversation?.participants[0];
  const isOnline = otherParticipant ? onlineUsers.includes(otherParticipant.id) : false;

  const loadOlderMessages = async () => {
    if (!hasMore || loading) return;
    await loadMessages();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/chat')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {otherParticipant && (
            <Link href={`/${otherParticipant.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
                  {otherParticipant.avatar ? (
                    <img
                      src={otherParticipant.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                      {otherParticipant.displayName?.[0] || otherParticipant.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {otherParticipant.displayName || otherParticipant.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="max-w-2xl mx-auto">
          {hasMore && (
            <button
              onClick={loadOlderMessages}
              className="w-full text-center text-xs text-muted-foreground py-2 hover:text-brand-500 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Load older messages'}
            </button>
          )}

          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.senderId === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isOwn
                        ? 'bg-brand-500 text-white rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                      }`}
                  >
                    {message.content && (
                      <p className="text-sm break-words">{message.content}</p>
                    )}
                    {message.mediaUrl && (
                      <img
                        src={message.mediaUrl}
                        alt=""
                        className="rounded-lg mt-1 max-w-full"
                      />
                    )}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'
                        }`}
                    >
                      <span className="text-[10px]">
                        {timeAgo(message.createdAt)}
                      </span>
                      {isOwn && (
                        message.read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {typingUserId && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-3 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t bg-background">
        <div className="max-w-2xl mx-auto px-3 py-3">
          <div className="relative flex items-end gap-2">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="shrink-0 p-2 text-muted-foreground hover:text-brand-500 transition"
            >
              <Smile className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTyping}
                placeholder="Type a message..."
                className="w-full px-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition pr-10"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-brand-500 transition">
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 p-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {showEmoji && (
            <div className="absolute bottom-16 left-4 z-50 shadow-xl rounded-xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                searchDisabled={false}
                skinTonesDisabled
                width={320}
                height={350}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
