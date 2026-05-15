import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateTokens = (user: { id: string; email: string; username: string; role: string; isVerified: boolean }) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isVerified: user.isVerified,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, config.jwt.refreshSecret) as { id: string };
};

export const generateOtpCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateVerificationToken = (email: string): string => {
  return jwt.sign({ email, type: 'email-verification' }, config.jwt.secret, { expiresIn: '24h' });
};

export const generatePasswordResetToken = (email: string): string => {
  return jwt.sign({ email, type: 'password-reset' }, config.jwt.secret, { expiresIn: '1h' });
};
