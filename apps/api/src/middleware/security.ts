import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { redisClient } from '../index.js';

export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrfToken;

  if (!token || token !== cookieToken) {
    throw new AppError('Invalid CSRF token', 403);
  }

  next();
};

export const generateCsrfToken = async (_req: Request, res: Response, next: NextFunction) => {
  const token = crypto.randomUUID();
  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000,
  });
  res.setHeader('X-CSRF-Token', token);
  next();
};

export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch {
      // Redis unavailable, continue
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        redisClient.setEx(key, duration, JSON.stringify(body));
      } catch {
        // Redis unavailable
      }
      return originalJson(body);
    };

    next();
  };
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query) as any;
  }

  next();
};
