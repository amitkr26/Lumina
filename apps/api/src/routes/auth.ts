import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { authRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';
import { generateTokens, verifyRefreshToken, generateOtpCode, generatePasswordResetToken } from '../utils/tokens.js';
import { sendVerificationEmail, sendOtpEmail, sendPasswordResetEmail } from '../services/email.js';
import { redisClient } from '../index.js';
import { config } from '../config/index.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

authRouter.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });

  if (existingUser) {
    throw new AppError('Email or username already exists', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      displayName: data.displayName || data.username,
      passwordHash,
      settings: {
        notifications: {
          likes: true,
          comments: true,
          follows: true,
          mentions: true,
          messages: true,
          storyViews: true,
        },
        privacy: {
          privateAccount: false,
          showActivityStatus: true,
          allowMessagesFrom: 'everyone',
        },
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      isVerified: true,
      createdAt: true,
    },
  });

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: 'USER',
    isVerified: user.isVerified,
  });

  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: refreshToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ success: true, data: { user, accessToken } });
}));

authRouter.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { accounts: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isBanned) {
    throw new AppError('Account has been banned', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isVerified: user.isVerified,
  });

  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: refreshToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
      accessToken,
    },
  });
}));

authRouter.post('/otp/request', strictRateLimiter, asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpRecord.create({
    data: { email, code, purpose: 'VERIFICATION', expiresAt },
  });

  await sendOtpEmail(email, code, 'Verification');

  res.json({ success: true, message: 'OTP sent to your email' });
}));

authRouter.post('/otp/verify', authRateLimiter, asyncHandler(async (req, res) => {
  const data = otpSchema.parse(req.body);

  const otp = await prisma.otpRecord.findFirst({
    where: {
      email: data.email,
      code: data.code,
      purpose: 'VERIFICATION',
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  await prisma.otpRecord.update({ where: { id: otp.id }, data: { used: true } });

  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), isVerified: true },
    });
  }

  res.json({ success: true, message: 'OTP verified successfully' });
}));

authRouter.post('/forgot-password', strictRateLimiter, asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  }

  const token = generatePasswordResetToken(email);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await sendPasswordResetEmail(email, resetUrl);

  res.json({ success: true, message: 'Password reset email sent' });
}));

authRouter.post('/reset-password', authRateLimiter, asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const decoded = z.object({ email: z.string().email() }).parse(
    jwt.verify(token, config.jwt.secret)
  );

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: decoded.email },
    data: { passwordHash },
  });

  res.json({ success: true, message: 'Password reset successfully' });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 401);
  }

  const decoded = verifyRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { sessionToken: refreshToken },
  });

  if (!session || !session.isActive || session.expires < new Date()) {
    throw new AppError('Invalid session', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || user.isBanned) {
    throw new AppError('User not found or banned', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isVerified: user.isVerified,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { sessionToken: newRefreshToken },
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, data: { accessToken } });
}));

authRouter.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await prisma.session.updateMany({
      where: { sessionToken: refreshToken },
      data: { isActive: false },
    });
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({ success: true, message: 'Logged out successfully' });
}));

authRouter.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      coverImage: true,
      bio: true,
      website: true,
      location: true,
      isVerified: true,
      isCreator: true,
      creatorBadge: true,
      role: true,
      theme: true,
      language: true,
      settings: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: { where: { isDraft: false } },
          reels: true,
        },
      },
    },
  });

  res.json({ success: true, data: user });
}));

authRouter.get('/sessions', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      expires: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: sessions });
}));

authRouter.delete('/sessions/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await prisma.session.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ success: true, message: 'Session terminated' });
}));
