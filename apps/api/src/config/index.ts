import { z } from 'zod';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@lumina.app',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },

  openai: {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export function validateEnvironment() {
  const isProd = config.nodeEnv === 'production';
  const missing: string[] = [];

  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.jwt.secret || config.jwt.secret === 'dev-jwt-secret-change-in-production') {
    if (isProd) missing.push('JWT_SECRET');
  }
  if (!config.jwt.refreshSecret || config.jwt.refreshSecret === 'dev-jwt-refresh-secret-change-in-production') {
    if (isProd) missing.push('JWT_REFRESH_SECRET');
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(`[WARN] ${msg}`);
  }

  if (isProd && !config.corsOrigin.some((o) => o !== 'http://localhost:3000')) {
    console.warn('[WARN] CORS_ORIGIN only allows localhost in production mode');
  }
}

// Validation schemas
export const emailSchema = z.string().email();
export const usernameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
export const passwordSchema = z.string().min(8).max(100);
