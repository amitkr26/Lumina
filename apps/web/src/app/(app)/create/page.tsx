'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { postApi, reelApi, storyApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ImagePlus,
  Video,
  Type,
  Hash,
  MapPin,
  Calendar,
  Eye,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Music,
  Sticker,
  Send,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

type TabType = 'post' | 'reel' | 'story';

export default function CreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('post');
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-1 hover:opacity-70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Create</h1>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        {(['post', 'reel', 'story'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'post' && <PostForm loading={loading} setLoading={setLoading} />}
        {activeTab === 'reel' && <ReelForm loading={loading} setLoading={setLoading} />}
        {activeTab === 'story' && <StoryForm loading={loading} setLoading={setLoading} />}
      </motion.div>
    </div>
  );
}

function PostForm({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [aiCaption, setAiCaption] = useState(false);
  const [aiHashtags, setAiHashtags] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [location, setLocation] = useState('');
  const [schedule, setSchedule] = useState('');
  const [altText, setAltText] = useState('');
  const [currentPreview, setCurrentPreview] = useState(0);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      const remaining = 10 - files.length;
      const toAdd = selected.slice(0, remaining);
      if (toAdd.length === 0) {
        toast.error('Maximum 10 files allowed');
        return;
      }
      const newFiles = [...files, ...toAdd];
      setFiles(newFiles);

      const newPreviews = toAdd.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [files]
  );

  const removeFile = useCallback(
    (index: number) => {
      URL.revokeObjectURL(previews[index]);
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      if (currentPreview >= previews.length - 1) {
        setCurrentPreview(Math.max(0, currentPreview - 1));
      }
    },
    [previews, currentPreview]
  );

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('media', file));
      formData.append('caption', caption);
      formData.append('visibility', visibility);
      if (location) formData.append('location', location);
      if (schedule) formData.append('scheduledAt', schedule);
      if (altText) formData.append('altText', altText);
      formData.append('aiCaption', String(aiCaption));
      formData.append('aiHashtags', String(aiHashtags));

      await postApi.create(formData);
      toast.success('Post created successfully');
      router.push('/');
    } catch {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        {previews.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed hover:border-purple-500 hover:bg-purple-500/5"
          >
            <ImagePlus className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Upload photos or videos</p>
              <p className="text-sm text-muted-foreground">Up to 10 files</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                src={previews[currentPreview]}
                alt="Preview"
                fill
                className="object-contain"
              />
              <button
                onClick={() => removeFile(currentPreview)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
              {previews.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPreview((p) => Math.max(0, p - 1))}
                    className={cn(
                      'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80',
                      currentPreview === 0 && 'hidden'
                    )}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPreview((p) => Math.min(previews.length - 1, p + 1))}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80',
                      currentPreview === previews.length - 1 && 'hidden'
                    )}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {previews.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          i === currentPreview ? 'bg-white' : 'bg-white/40'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previews.map((preview, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPreview(i)}
                  className={cn(
                    'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md',
                    i === currentPreview && 'ring-2 ring-purple-500'
                  )}
                >
                  <Image src={preview} alt="" fill className="object-cover" />
                </button>
              ))}
              {files.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md border-2 border-dashed"
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-4">
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={4}
            className="w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-1 text-xs text-muted-foreground">{caption.length}/2200</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAiCaption(!aiCaption)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              aiCaption
                ? 'bg-purple-500/20 text-purple-500'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Caption
          </button>
          <button
            onClick={() => setAiHashtags(!aiHashtags)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              aiHashtags
                ? 'bg-purple-500/20 text-purple-500'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Hash className="h-3.5 w-3.5" />
            AI Hashtags
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'followers' | 'private')}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="followers">Followers only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="datetime-local"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <Type className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Alt text for accessibility"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || files.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            Share Post
          </>
        )}
      </button>
    </div>
  );
}

function ReelForm({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a video');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('caption', caption);
      if (musicTitle) formData.append('musicTitle', musicTitle);
      if (musicArtist) formData.append('musicArtist', musicArtist);

      await reelApi.create(formData);
      toast.success('Reel created successfully');
      router.push('/');
    } catch {
      toast.error('Failed to create reel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed hover:border-purple-500 hover:bg-purple-500/5"
          >
            <Video className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Upload a video</p>
              <p className="text-sm text-muted-foreground">MP4, MOV up to 60 seconds</p>
            </div>
          </button>
        ) : (
          <div className="relative aspect-[9/16] max-h-96 overflow-hidden rounded-lg bg-muted">
            <video src={preview} controls className="h-full w-full object-contain" />
            <button
              onClick={() => {
                setFile(null);
                setPreview('');
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={3}
          className="w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <Music className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={musicTitle}
              onChange={(e) => setMusicTitle(e.target.value)}
              placeholder="Music title"
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <input
              type="text"
              value={musicArtist}
              onChange={(e) => setMusicArtist(e.target.value)}
              placeholder="Artist"
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            Share Reel
          </>
        )}
      </button>
    </div>
  );
}

function StoryForm({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [caption, setCaption] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption);

      await storyApi.create(formData);
      toast.success('Story posted');
      router.push('/');
    } catch {
      toast.error('Failed to post story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed hover:border-purple-500 hover:bg-purple-500/5"
          >
            <ImagePlus className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Upload photo or video</p>
              <p className="text-sm text-muted-foreground">Story will disappear in 24 hours</p>
            </div>
          </button>
        ) : (
          <div className="relative aspect-[9/16] max-h-96 overflow-hidden rounded-lg bg-muted">
            {file?.type.startsWith('video') ? (
              <video src={preview} controls className="h-full w-full object-contain" />
            ) : (
              <Image src={preview} alt="" fill className="object-contain" />
            )}
            <button
              onClick={() => {
                setFile(null);
                setPreview('');
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          rows={2}
          className="w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          <Sticker className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Stickers coming soon</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            Share to Story
          </>
        )}
      </button>
    </div>
  );
}
