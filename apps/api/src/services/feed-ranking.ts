import { prisma } from '@lumina/database';
import { redisClient, logger } from '../index.js';

const RECENCY_HALF_LIFE_HOURS = 48;
const ENGAGEMENT_WEIGHT = 0.3;
const RECENCY_WEIGHT = 0.25;
const AFFINITY_WEIGHT = 0.2;
const CONTENT_PREF_WEIGHT = 0.15;
const DIVERSITY_WEIGHT = 0.1;

interface ScoredPost {
  id: string;
  score: number;
  authorId: string;
  contentType: string;
  createdAt: Date;
}

function recencyDecay(createdAt: Date): number {
  const hoursSinceCreation =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.exp(-hoursSinceCreation / RECENCY_HALF_LIFE_HOURS);
}

async function getAuthorAffinityScore(
  userId: string,
  authorId: string
): Promise<number> {
  const cacheKey = `affinity:${userId}:${authorId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return parseFloat(cached);

  const interactions = await prisma.interaction.groupBy({
    by: ['type'],
    where: {
      userId,
      authorId,
    },
    _count: true,
  });

  const weights: Record<string, number> = {
    LIKE: 1,
    COMMENT: 3,
    SHARE: 5,
    VIEW: 0.1,
    SAVE: 4,
  };

  let score = 0;
  for (const interaction of interactions) {
    score += (weights[interaction.type] ?? 1) * interaction._count;
  }

  const normalizedScore = Math.min(score / 50, 1);

  await redisClient.set(cacheKey, normalizedScore.toString(), { EX: 3600 });

  return normalizedScore;
}

async function getUserContentTypePreferences(
  userId: string
): Promise<Record<string, number>> {
  const cacheKey = `content_prefs:${userId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const interactions = await prisma.interaction.groupBy({
    by: ['contentType'],
    where: { userId },
    _count: true,
  });

  const total = interactions.reduce((sum, i) => sum + i._count, 0);
  const preferences: Record<string, number> = {};

  for (const interaction of interactions) {
    preferences[interaction.contentType ?? 'unknown'] =
      interaction._count / Math.max(total, 1);
  }

  await redisClient.set(cacheKey, JSON.stringify(preferences), { EX: 7200 });

  return preferences;
}

export async function rankFeedPosts(userId: string): Promise<ScoredPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        isDraft: false,
        author: {
          isBanned: false,
        },
      },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const contentPreferences = await getUserContentTypePreferences(userId);
    const seenAuthors = new Set<string>();
    const seenContentTypes = new Set<string>();

    const scoredPosts: ScoredPost[] = [];

    for (const post of posts) {
      const hoursSinceCreation = Math.max(
        (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60),
        1
      );

      const totalEngagements =
        (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 3;
      const engagementRate = totalEngagements / hoursSinceCreation;
      const normalizedEngagement = Math.min(engagementRate / 100, 1);

      const recencyScore = recencyDecay(post.createdAt);

      const affinityScore =
        post.authorId === userId
          ? 1
          : await getAuthorAffinityScore(userId, post.authorId);

      const contentType = 'post';
      const contentPrefScore = contentPreferences[contentType] ?? 0;

      const authorDiversity = seenAuthors.has(post.authorId) ? 0 : 1;
      const typeDiversity = seenContentTypes.has(contentType) ? 0 : 1;
      const diversityScore = (authorDiversity + typeDiversity) / 2;

      const score =
        normalizedEngagement * ENGAGEMENT_WEIGHT +
        recencyScore * RECENCY_WEIGHT +
        affinityScore * AFFINITY_WEIGHT +
        contentPrefScore * CONTENT_PREF_WEIGHT +
        diversityScore * DIVERSITY_WEIGHT;

      scoredPosts.push({
        id: post.id,
        score,
        authorId: post.authorId,
        contentType,
        createdAt: post.createdAt,
      });

      seenAuthors.add(post.authorId);
      seenContentTypes.add(contentType);
    }

    scoredPosts.sort((a, b) => b.score - a.score);

    return scoredPosts;
  } catch (error) {
    logger.error('Failed to rank feed posts:', error);
    return [];
  }
}
