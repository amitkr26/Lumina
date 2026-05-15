'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { searchApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Search, Loader2, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  author: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export default function ExplorePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const loadExplore = useCallback(async (isRefresh = false) => {
    try {
      const params: Record<string, any> = { limit: 18 };
      if (!isRefresh && cursor) params.cursor = cursor;

      const { data } = await searchApi.getExplore(params);
      const newPosts = data.data.posts || data.data || [];

      if (isRefresh) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setCursor(data.data.nextCursor || null);
      setHasMore(!!data.data.nextCursor);
    } catch (err) {
      console.error('Failed to load explore:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  const loadTrending = useCallback(async () => {
    try {
      const { data } = await searchApi.getTrending();
      const tags = data.data.hashtags || data.data || [];
      setTrending(tags.map((t: any) => typeof t === 'string' ? t : t.tag || t.name));
    } catch (err) {
      console.error('Failed to load trending:', err);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const { data } = await searchApi.search(query.trim());
      const results = data.data.posts || data.data || [];
      setPosts(results);
      setHasMore(false);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadExplore(true);
    loadTrending();
  }, [loadExplore, loadTrending]);

  useEffect(() => {
    if (inView && hasMore && !loading && !searching) {
      loadExplore();
    }
  }, [inView, hasMore, loading, searching, loadExplore]);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, people, tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition"
            />
          </form>
        </div>

        {trending.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {trending.slice(0, 8).map((tag, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(`#${tag}`);
                }}
                className="shrink-0 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-500 text-xs font-medium hover:bg-brand-500/20 transition"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-1">
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post, index) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className={`relative aspect-square bg-muted overflow-hidden group ${
                  index % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <img
                  src={post.mediaUrl}
                  alt={post.caption || ''}
                  className="w-full h-full object-cover group-hover:opacity-90 transition"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-white" />
                      <span className="text-xs font-medium">
                        {formatNumber(post.likesCount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span className="text-xs font-medium">
                        {formatNumber(post.commentsCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div ref={ref} className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {!hasMore && posts.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No posts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
