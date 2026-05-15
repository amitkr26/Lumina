'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useSocket } from '@/components/socket-provider';
import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Conversation {
  id: string;
  participants: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }[];
  lastMessage?: {
    id: string;
    content?: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export default function ChatListPage() {
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.getConversations();
      const convos = data.data.conversations || data.data || [];
      setConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const other = c.participants.find((p) => true);
    const name = other?.displayName || other?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOtherParticipant = (convo: Conversation) => {
    return convo.participants[0];
  };

  const isOnline = (userId: string) => onlineUsers.includes(userId);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((convo) => {
              const other = getOtherParticipant(convo);
              const online = isOnline(other.id);

              return (
                <button
                  key={convo.id}
                  onClick={() => router.push(`/chat/${convo.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition border-b"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                      {other.avatar ? (
                        <img
                          src={other.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                          {other.displayName?.[0] || other.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {other.displayName || other.username}
                      </span>
                      {convo.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(convo.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">
                        {convo.lastMessage?.content || 'Start a conversation'}
                      </p>
                      {convo.unreadCount > 0 && (
                        <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
