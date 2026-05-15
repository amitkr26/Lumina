'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { notificationApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Mail,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
  read: boolean;
  content?: string;
  actor: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  post?: {
    id: string;
    mediaUrl?: string;
  };
  createdAt: string;
}

const notificationIconMap = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  message: Mail,
  system: CheckCheck,
};

const notificationColorMap = {
  like: 'text-red-500 bg-red-500/10',
  comment: 'text-blue-500 bg-blue-500/10',
  follow: 'text-brand-500 bg-brand-500/10',
  mention: 'text-purple-500 bg-purple-500/10',
  message: 'text-green-500 bg-green-500/10',
  system: 'text-muted-foreground bg-muted',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      const params: Record<string, any> = { limit: 20 };
      if (!isRefresh && cursor) params.cursor = cursor;

      const { data } = await notificationApi.getAll(params);
      const newNotifs = data.data.notifications || data.data || [];

      if (isRefresh) {
        setNotifications(newNotifs);
      } else {
        setNotifications((prev) => [...prev, ...newNotifs]);
      }

      setCursor(data.data.nextCursor || null);
      setHasMore(!!data.data.nextCursor);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadNotifications();
    }
  }, [inView, hasMore, loading, loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationText = (notif: Notification) => {
    const name = notif.actor.displayName || notif.actor.username;
    switch (notif.type) {
      case 'like':
        return `${name} liked your post`;
      case 'comment':
        return `${name} commented: ${notif.content || ''}`;
      case 'follow':
        return `${name} started following you`;
      case 'mention':
        return `${name} mentioned you: ${notif.content || ''}`;
      case 'message':
        return `${name} sent you a message`;
      case 'system':
        return notif.content || 'System notification';
      default:
        return '';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead || unreadCount === 0}
              className="text-sm text-brand-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingAllRead ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => {
              const Icon = notificationIconMap[notif.type] || CheckCheck;
              const colorClass = notificationColorMap[notif.type] || notificationColorMap.system;

              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition ${
                    !notif.read ? 'bg-brand-500/5' : ''
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${notif.actor.username}`}
                      className="flex items-center gap-2 mb-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted overflow-hidden shrink-0">
                        {notif.actor.avatar ? (
                          <img
                            src={notif.actor.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {notif.actor.displayName?.[0] || notif.actor.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        {notif.actor.displayName || notif.actor.username}
                      </span>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {getNotificationText(notif)}
                    </p>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {notif.post?.mediaUrl && (
                    <div className="shrink-0 w-11 h-11 rounded-lg overflow-hidden">
                      <img
                        src={notif.post.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {!notif.read && (
                    <div className="shrink-0 w-2.5 h-2.5 rounded-full bg-brand-500 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div ref={ref} className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
