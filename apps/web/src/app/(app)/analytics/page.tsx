'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { analyticsApi } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Users,
  Heart,
  Eye,
  TrendingUp,
  ChevronLeft,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  UserCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface OverviewStats {
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  avgEngagement: number;
  followersGrowth: number;
  likesGrowth: number;
  viewsGrowth: number;
  engagementGrowth: number;
}

interface PostPerformance {
  id: string;
  mediaUrl: string;
  caption: string;
  likes: number;
  comments: number;
  views: number;
  engagement: number;
  createdAt: string;
}

interface AudienceData {
  genderDistribution: { male: number; female: number; other: number };
  topLocations: { name: string; percentage: number }[];
  ageRanges: { range: string; percentage: number }[];
  activeHours: { hour: number; percentage: number }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [reels, setReels] = useState<PostPerformance[]>([]);
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'reels' | 'audience'>(
    'overview'
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, postsRes, reelsRes, audienceRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getPosts(),
        analyticsApi.getReels(),
        analyticsApi.getAudience(),
      ]);
      setOverview(overviewRes.data.data);
      setPosts(postsRes.data.data?.posts || []);
      setReels(reelsRes.data.data?.reels || []);
      setAudience(audienceRes.data.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your creator performance</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {(
          [
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'posts' as const, label: 'Posts', icon: TrendingUp },
            { id: 'reels' as const, label: 'Reels', icon: TrendingUp },
            { id: 'audience' as const, label: 'Audience', icon: UserCircle },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && overview && <OverviewTab data={overview} />}
        {activeTab === 'posts' && <PostsTab posts={posts} />}
        {activeTab === 'reels' && <ReelsTab reels={reels} />}
        {activeTab === 'audience' && audience && <AudienceTab data={audience} />}
      </motion.div>
    </div>
  );
}

function OverviewTab({ data }: { data: OverviewStats }) {
  const stats = [
    {
      label: 'Followers',
      value: formatNumber(data.followers),
      growth: data.followersGrowth,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Following',
      value: formatNumber(data.following),
      growth: 0,
      icon: UserCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Likes',
      value: formatNumber(data.totalLikes),
      growth: data.likesGrowth,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      label: 'Total Views',
      value: formatNumber(data.totalViews),
      growth: data.viewsGrowth,
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg Engagement',
      value: `${data.avgEngagement.toFixed(1)}%`,
      growth: data.engagementGrowth,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div
              className={cn(
                'mb-3 inline-flex rounded-lg p-2',
                stat.bgColor,
                stat.color
              )}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {stat.growth !== 0 && (
              <div
                className={cn(
                  'mt-1 flex items-center gap-1 text-xs font-medium',
                  stat.growth > 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {stat.growth > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(stat.growth).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PostsTab({ posts }: { posts: PostPerformance[] }) {
  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No post data available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={post.mediaUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {post.caption || 'Untitled'}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatNumber(post.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(post.views)}
                  </span>
                  <span>{post.engagement.toFixed(1)}% eng.</span>
                </div>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground md:block">
                <Calendar className="mx-auto mb-1 h-4 w-4" />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReelsTab({ reels }: { reels: PostPerformance[] }) {
  return (
    <div className="space-y-4">
      {reels.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No reel data available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={reel.mediaUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {reel.caption || 'Untitled'}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatNumber(reel.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(reel.views)}
                  </span>
                  <span>{reel.engagement.toFixed(1)}% eng.</span>
                </div>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground md:block">
                <Calendar className="mx-auto mb-1 h-4 w-4" />
                {new Date(reel.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AudienceTab({ data }: { data: AudienceData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Gender Distribution</h3>
        <div className="space-y-3">
          {[
            { label: 'Male', value: data.genderDistribution.male, color: 'bg-blue-500' },
            { label: 'Female', value: data.genderDistribution.female, color: 'bg-pink-500' },
            { label: 'Other', value: data.genderDistribution.other, color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-12 text-sm">{item.label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-2 rounded-full', item.color)}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Age Ranges</h3>
        <div className="space-y-3">
          {data.ageRanges.map((item) => (
            <div key={item.range} className="flex items-center gap-3">
              <span className="w-14 text-sm">{item.range}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Top Locations</h3>
        <div className="space-y-3">
          {data.topLocations.map((location, i) => (
            <div key={location.name} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {i + 1}
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{location.name}</span>
              </div>
              <span className="text-sm font-medium">{location.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Most Active Hours</h3>
        <div className="flex items-end gap-1">
          {Array.from({ length: 24 }, (_, i) => {
            const hourData = data.activeHours.find((h) => h.hour === i);
            const height = hourData ? hourData.percentage : 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-purple-500/60 transition-colors hover:bg-purple-500"
                style={{ height: `${Math.max(height * 1.5, 4)}px` }}
                title={`${i}:00 - ${height}%`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>
    </div>
  );
}
