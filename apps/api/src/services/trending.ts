import { prisma } from '@lumina/database';
import { logger } from '../index.js';

const TRENDING_WINDOW_HOURS = 24;
const TRENDING_DECAY_FACTOR = 0.5;
const MAX_TRENDING_HASHTAGS = 20;
const MAX_TRENDING_REELS = 50;

export async function calculateHashtagTrendingScore(hashtagId: string): Promise<number> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);
  const previousWindowStart = new Date(windowStart.getTime() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);

  const [currentUsage, previousUsage, totalUsage] = await Promise.all([
    prisma.postHashtag.count({
      where: {
        hashtagId,
        post: { createdAt: { gte: windowStart } },
      },
    }) +
    prisma.reelHashtag.count({
      where: {
        hashtagId,
        reel: { createdAt: { gte: windowStart } },
      },
    }),
    prisma.postHashtag.count({
      where: {
        hashtagId,
        post: { createdAt: { gte: previousWindowStart, lt: windowStart } },
      },
    }) +
    prisma.reelHashtag.count({
      where: {
        hashtagId,
        reel: { createdAt: { gte: previousWindowStart, lt: windowStart } },
      },
    }),
    prisma.hashtag.findUnique({
      where: { id: hashtagId },
      select: { postCount: true, reelCount: true },
    }),
  ]);

  const velocity = currentUsage - previousUsage;
  const acceleration = previousUsage > 0 ? velocity / previousUsage : velocity;
  const totalUses = (totalUsage?.postCount ?? 0) + (totalUsage?.reelCount ?? 0);
  const popularityFactor = Math.log10(Math.max(totalUses, 1));

  const score = velocity * (1 + acceleration) * popularityFactor;

  return Math.max(0, score);
}

export async function calculateReelTrendingScore(reelId: string): Promise<number> {
  const now = new Date();

  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
  });

  if (!reel) return 0;

  const hoursSinceCreation = Math.max(
    (now.getTime() - reel.createdAt.getTime()) / (1000 * 60 * 60),
    1
  );

  const views = reel.views ?? 0;
  const likes = reel._count.likes;
  const comments = reel._count.comments;
  const shares = reel._count.shares;

  const engagementRate = views > 0
    ? (likes * 1 + comments * 2 + shares * 3) / views
    : 0;

  const completionRate = reel.avgWatchTime && reel.duration
    ? reel.avgWatchTime / reel.duration
    : 0;

  const recencyDecay = Math.exp(-hoursSinceCreation / (TRENDING_WINDOW_HOURS * TRENDING_DECAY_FACTOR));

  const viewScore = Math.log10(Math.max(views, 1));
  const engagementScore = engagementRate * 100;
  const completionScore = completionRate * 50;

  const score = (
    viewScore * 0.2 +
    engagementScore * 0.35 +
    completionScore * 0.25 +
    recencyDecay * 20
  );

  return Math.max(0, score);
}

export async function updateTrendingHashtags(): Promise<void> {
  try {
    logger.info('Updating trending hashtags...');

    const hashtags = await prisma.hashtag.findMany({
      where: {
        OR: [
          { postCount: { gt: 0 } },
          { reelCount: { gt: 0 } },
        ],
      },
      select: { id: true },
    });

    const scores = await Promise.all(
      hashtags.map(async (h) => ({
        id: h.id,
        score: await calculateHashtagTrendingScore(h.id),
      }))
    );

    scores.sort((a, b) => b.score - a.score);

    const topHashtags = scores.slice(0, MAX_TRENDING_HASHTAGS);

    await prisma.$transaction([
      prisma.trendingHashtag.deleteMany(),
      ...topHashtags.map((h, index) =>
        prisma.trendingHashtag.create({
          data: {
            hashtagId: h.id,
            score: h.score,
            rank: index + 1,
          },
        })
      ),
    ]);

    logger.info(`Updated ${topHashtags.length} trending hashtags`);
  } catch (error) {
    logger.error('Failed to update trending hashtags:', error);
  }
}

export async function updateTrendingReels(): Promise<void> {
  try {
    logger.info('Updating trending reels...');

    const reels = await prisma.reel.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    const scores = await Promise.all(
      reels.map(async (r) => ({
        id: r.id,
        score: await calculateReelTrendingScore(r.id),
      }))
    );

    scores.sort((a, b) => b.score - a.score);

    const topReels = scores.slice(0, MAX_TRENDING_REELS);

    await prisma.$transaction([
      prisma.trendingReel.deleteMany(),
      ...topReels.map((r, index) =>
        prisma.trendingReel.create({
          data: {
            reelId: r.id,
            score: r.score,
            rank: index + 1,
          },
        })
      ),
    ]);

    logger.info(`Updated ${topReels.length} trending reels`);
  } catch (error) {
    logger.error('Failed to update trending reels:', error);
  }
}
