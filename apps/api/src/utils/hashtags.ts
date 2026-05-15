import { prisma } from '@lumina/database';
import { createNotification } from '../services/notification.js';

export async function extractAndSaveHashtags(postId: string | null, reelId: string | null, text: string) {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex) || [];
  const tagNames = [...new Set(matches.map(m => m.slice(1).toLowerCase()))];

  for (const name of tagNames) {
    const hashtag = await prisma.hashtag.upsert({
      where: { name },
      create: { name },
      update: {
        postCount: postId ? { increment: 1 } : undefined,
        reelCount: reelId ? { increment: 1 } : undefined,
      },
    });

    if (postId) {
      await prisma.postHashtag.create({ data: { postId, hashtagId: hashtag.id } }).catch(() => {});
    }
    if (reelId) {
      await prisma.reelHashtag.create({ data: { reelId, hashtagId: hashtag.id } }).catch(() => {});
    }
  }
}

export async function extractAndSaveMentions(postId: string | null, reelId: string | null, storyId: string | null, text: string, authorId?: string) {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  const usernames = [...new Set(matches.map(m => m.slice(1)))];

  for (const username of usernames) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      await prisma.mention.create({
        data: { userId: user.id, postId, reelId, storyId },
      }).catch(() => {});

      if (authorId && authorId !== user.id) {
        await createNotification({
          userId: user.id,
          senderId: authorId,
          type: 'MENTION',
          postId: postId || undefined,
          reelId: reelId || undefined,
          storyId: storyId || undefined,
        });
      }
    }
  }
}
