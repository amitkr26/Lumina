import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaBg: PrismaClient | undefined;
};

const SLOW_QUERY_THRESHOLD_MS = 100;

function createPrismaClient(options: { bg?: boolean } = {}) {
  const prefix = options.bg ? '[BG]' : '[REQ]';

  const client = new PrismaClient({
    log: [
      ...(process.env.NODE_ENV === 'development'
        ? (['query', 'warn', 'error'] as const)
        : (['warn', 'error'] as const)),
    ],
  });

  return client;
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

export const prismaBg =
  globalForPrisma.prismaBg ??
  createPrismaClient({ bg: true });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaBg = prismaBg;
}

export * from '@prisma/client';
