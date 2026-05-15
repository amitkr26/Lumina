import { prisma, Role } from '../src/index.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lumina.app' },
    update: {},
    create: {
      email: 'admin@lumina.app',
      username: 'admin',
      displayName: 'Lumina Admin',
      passwordHash,
      isVerified: true,
      role: Role.ADMIN,
      bio: 'Official Lumina administrator account',
    },
  });
  console.log('Created admin user:', adminUser.username);

  const creatorUser = await prisma.user.upsert({
    where: { email: 'creator@lumina.app' },
    update: {},
    create: {
      email: 'creator@lumina.app',
      username: 'creator',
      displayName: 'Featured Creator',
      passwordHash,
      isVerified: true,
      isCreator: true,
      creatorBadge: 'blue',
      bio: 'Content creator on Lumina',
    },
  });
  console.log('Created creator user:', creatorUser.username);

  const demoUsers = [];
  const demoNames = [
    { username: 'alex_photo', displayName: 'Alex Photography' },
    { username: 'sarah_travels', displayName: 'Sarah | Travel' },
    { username: 'mike_fitness', displayName: 'Mike Fitness' },
    { username: 'emma_cooks', displayName: 'Emma Kitchen' },
    { username: 'david_music', displayName: 'David Beats' },
    { username: 'lisa_art', displayName: 'Lisa Creates' },
    { username: 'james_tech', displayName: 'James Tech' },
    { username: 'nina_style', displayName: 'Nina Fashion' },
  ];

  for (const name of demoNames) {
    const user = await prisma.user.upsert({
      where: { email: `${name.username}@demo.lumina.app` },
      update: {},
      create: {
        email: `${name.username}@demo.lumina.app`,
        username: name.username,
        displayName: name.displayName,
        passwordHash,
        isVerified: Math.random() > 0.5,
        isCreator: Math.random() > 0.5,
        bio: `Hey! I'm ${name.displayName}. Welcome to my Lumina!`,
      },
    });
    demoUsers.push(user);
    console.log('Created demo user:', user.username);
  }

  const hashtags = [
    'photography', 'travel', 'fitness', 'food', 'music', 'art', 'tech', 'fashion',
    'nature', 'sunset', 'love', 'instagood', 'photooftheday', 'beautiful', 'happy',
    'cute', 'followme', 'picoftheday', 'follow', 'me', 'selfie', 'summer', 'friends',
    'fun', 'smile', 'life', 'like4like', 'instalike', 'family', 'amazing',
  ];

  for (const name of hashtags) {
    await prisma.hashtag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log(`Created ${hashtags.length} hashtags`);

  console.log('Seeding complete!');
  console.log('\nDemo credentials:');
  console.log('  Admin: admin@lumina.app / password123');
  console.log('  Creator: creator@lumina.app / password123');
  console.log('  Demo: alex_photo@demo.lumina.app / password123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
