'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookmarkApi } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  BookmarkPlus,
  Grid3X3,
  Clapperboard,
  Plus,
  X,
  ChevronLeft,
  Heart,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface BookmarkItem {
  id: string;
  post?: {
    id: string;
    mediaUrl: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
  };
  reel?: {
    id: string;
    thumbnailUrl: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
  };
  createdAt: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  itemsCount: number;
  isPrivate: boolean;
}

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'reels'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCollection]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookmarksRes, collectionsRes] = await Promise.all([
        bookmarkApi.getAll(
          selectedCollection ? { collectionId: selectedCollection } : undefined
        ),
        bookmarkApi.getCollections(),
      ]);
      setItems(bookmarksRes.data.data?.bookmarks || []);
      setCollections(collectionsRes.data.data?.collections || []);
    } catch {
      toast.error('Failed to load saved items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    try {
      await bookmarkApi.createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || undefined,
      });
      toast.success('Collection created');
      setNewCollectionName('');
      setNewCollectionDesc('');
      setShowCreateCollection(false);
      loadData();
    } catch {
      toast.error('Failed to create collection');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'posts') return !!item.post;
    if (activeFilter === 'reels') return !!item.reel;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Saved</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-full md:w-64 md:flex-shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Collections</h2>
            <button
              onClick={() => setShowCreateCollection(true)}
              className="rounded-full p-1.5 hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCollection(null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                !selectedCollection ? 'bg-muted font-medium' : 'hover:bg-muted'
              )}
            >
              <Bookmark className="h-4 w-4" />
              All Posts
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setSelectedCollection(collection.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedCollection === collection.id
                    ? 'bg-muted font-medium'
                    : 'hover:bg-muted'
                )}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span className="flex-1 truncate">{collection.name}</span>
                <span className="text-xs text-muted-foreground">
                  {collection.itemsCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
            {(['all', 'posts', 'reels'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium capitalize transition-colors',
                  activeFilter === filter
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {filter === 'posts' && <Grid3X3 className="h-3.5 w-3.5" />}
                {filter === 'reels' && <Clapperboard className="h-3.5 w-3.5" />}
                {filter}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bookmark className="mb-3 h-12 w-12 text-muted-foreground opacity-30" />
              <p className="font-medium">No saved items</p>
              <p className="text-sm text-muted-foreground">
                Save posts and reels to view them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence>
                {filteredItems.map((item) => {
                  const post = item.post;
                  const reel = item.reel;
                  const mediaUrl = post?.mediaUrl || reel?.thumbnailUrl || '';
                  const id = post?.id || reel?.id || '';
                  const isReel = !!reel;

                  return (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() =>
                        router.push(isReel ? `/reel/${id}` : `/post/${id}`)
                      }
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <Image
                        src={mediaUrl}
                        alt=""
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex items-center gap-3 text-white">
                          <span className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 fill-current" />
                            {formatNumber(post?.likesCount || reel?.likesCount || 0)}
                          </span>
                          <span className="flex items-center gap-1 text-sm">
                            <MessageCircle className="h-4 w-4" />
                            {formatNumber(post?.commentsCount || reel?.commentsCount || 0)}
                          </span>
                        </div>
                      </div>
                      {isReel && (
                        <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1">
                          <Clapperboard className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCreateCollection(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-background p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create Collection</h3>
                <button
                  onClick={() => setShowCreateCollection(false)}
                  className="rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g., Travel inspiration"
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    placeholder="Add a description"
                    className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleCreateCollection}
                  className="w-full rounded-lg bg-purple-600 py-2.5 font-medium text-white transition-colors hover:bg-purple-700"
                >
                  Create Collection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
