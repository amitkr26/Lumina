import { prisma } from '@lumina/database';
import { redisClient, logger } from '../index.js';

export async function updateUserAnalytics(userId: string): Promise<void> {
  try {
    const [
      postCount,
      reelCount,
      storyCount,
      totalPostLikes,
      totalPostComments,
      totalPostShares,
      totalReelLikes,
      totalReelComments,
      totalReelShares,
      totalReelViews,
      followerCount,
      followingCount,
    ] = await Promise.all([
      prisma.post.count({ where: { authorId: userId, isDraft: false } }),
      prisma.reel.count({ where: { authorId: userId, visibility: 'PUBLIC' } }),
      prisma.story.count({ where: { authorId: userId } }),
      prisma.like.count({ where: { post: { authorId: userId } } }),
      prisma.comment.count({ where: { post: { authorId: userId } } }),
      prisma.share.count({ where: { post: { authorId: userId } } }),
      prisma.like.count({ where: { reel: { authorId: userId } } }),
      prisma.comment.count({ where: { reel: { authorId: userId } } }),
      prisma.share.count({ where: { reel: { authorId: userId } } }),
      prisma.reel.aggregate({
        where: { authorId: userId },
        _sum: { viewCount: true },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    const totalEngagement =
      totalPostLikes +
      totalPostComments +
      totalPostShares +
      totalReelLikes +
      totalReelComments +
      totalReelShares;

    const avgEngagementRate =
      postCount + reelCount > 0
        ? totalEngagement / ((postCount + reelCount) * Math.max(followerCount, 1))
        : 0;

    await prisma.userAnalytics.upsert({
      where: { userId },
      update: {
        totalPosts: postCount,
        totalReels: reelCount,
        totalStories: storyCount,
        totalLikes: totalPostLikes + totalReelLikes,
        totalComments: totalPostComments + totalReelComments,
        totalFollowers: followerCount,
        totalFollowing: followingCount,
        totalViews: totalReelViews._sum.viewCount || 0,
        avgEngagement: avgEngagementRate,
        updatedAt: new Date(),
      },
      create: {
        userId,
        totalPosts: postCount,
        totalReels: reelCount,
        totalStories: storyCount,
        totalLikes: totalPostLikes + totalReelLikes,
        totalComments: totalPostComments + totalReelComments,
        totalFollowers: followerCount,
        totalFollowing: followingCount,
        totalViews: totalReelViews._sum.viewCount || 0,
        avgEngagement: avgEngagementRate,
      },
    });

    await redisClient.set(
      `analytics:user:${userId}`,
      JSON.stringify({
        postCount,
        reelCount,
        followerCount,
        followingCount,
        totalEngagement,
        avgEngagementRate,
      }),
      { EX: 1800 }
    );

    logger.debug(`Updated analytics for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to update analytics for user ${userId}:`, error);
  }
}

export async function updatePostAnalytics(postId: string): Promise<void> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!post) return;

    const hoursSinceCreation = Math.max(
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60),
      1
    );

    const totalEngagement =
      post._count.likes +
      post._count.comments * 2 +
      post._count.shares * 3 +
      post._count.bookmarks * 4;

    const engagementRate = totalEngagement / hoursSinceCreation;

    await prisma.postAnalytics.upsert({
      where: { postId },
      update: {
        engagements: totalEngagement,
        updatedAt: new Date(),
      },
      create: {
        postId,
        engagements: totalEngagement,
      },
    });

    await redisClient.set(
      `analytics:post:${postId}`,
      JSON.stringify({
        views: post.viewCount,
        likes: post.likeCount,
        comments: post.commentCount,
        shares: post.shareCount,
        bookmarks: post.saveCount,
      }),
      { EX: 900 }
    );

    logger.debug(`Updated analytics for post ${postId}`);
  } catch (error) {
    logger.error(`Failed to update analytics for post ${postId}:`, error);
  }
}

export async function updateReelAnalytics(reelId: string): Promise<void> {
  try {
    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!reel) return;

    const hoursSinceCreation = Math.max(
      (Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60),
      1
    );

    const totalEngagement =
      reel.likeCount +
      reel.commentCount * 2 +
      reel.shareCount * 3 +
      reel.saveCount * 4;

    const engagementRate = totalEngagement / hoursSinceCreation;

    const completionRate = 0; // Need to implement watch time tracking

    await prisma.reelAnalytics.upsert({
      where: { reelId },
      update: {
        plays: reel.playCount,
        avgWatchTime: 0, // Need to implement watch time tracking
        completionRate: 0,
        engagements: totalEngagement,
        updatedAt: new Date(),
      },
      create: {
        reelId,
        plays: reel.playCount,
        engagements: totalEngagement,
      },
    });

    await redisClient.set(
      `analytics:reel:${reelId}`,
      JSON.stringify({
        views: reel.viewCount,
        likes: reel.likeCount,
        comments: reel.commentCount,
        shares: reel.shareCount,
        bookmarks: reel.saveCount,
      }),
      { EX: 900 }
    );

    logger.debug(`Updated analytics for reel ${reelId}`);
  } catch (error) {
    logger.error(`Failed to update analytics for reel ${reelId}:`, error);
  }
}

export async function updateAllUserAnalytics(): Promise<void> {
  try {
    logger.info('Starting bulk user analytics update...');

    const users = await prisma.user.findMany({
      select: { id: true },
      where: { isBanned: false },
    });

    for (const user of users) {
      await updateUserAnalytics(user.id);
    }

    logger.info(`Updated analytics for ${users.length} users`);
  } catch (error) {
    logger.error('Failed to update all user analytics:', error);
  }
}

export async function updateAllPostAnalytics(): Promise<void> {
  try {
    logger.info('Starting bulk post analytics update...');

    const posts = await prisma.post.findMany({
      select: { id: true },
      where: { isDraft: false },
    });

    for (const post of posts) {
      await updatePostAnalytics(post.id);
    }

    logger.info(`Updated analytics for ${posts.length} posts`);
  } catch (error) {
    logger.error('Failed to update all post analytics:', error);
  }
}

export async function updateAllReelAnalytics(): Promise<void> {
  try {
    logger.info('Starting bulk reel analytics update...');

    const reels = await prisma.reel.findMany({
      select: { id: true },
      where: { visibility: 'PUBLIC' },
    });

    for (const reel of reels) {
      await updateReelAnalytics(reel.id);
    }

    logger.info(`Updated analytics for ${reels.length} reels`);
  } catch (error) {
    logger.error('Failed to update all reel analytics:', error);
  }
}
