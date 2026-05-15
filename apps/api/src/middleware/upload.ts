import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from './errorHandler.js';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
];

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

const storage = multer.memoryStorage();

const fileFilter = (
  allowedTypes: string[],
  maxSize: number,
  mediaType: 'image' | 'video'
) => {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new AppError(
          `Invalid ${mediaType} type. Allowed types: ${allowedTypes.join(', ')}`,
          400
        )
      );
    }
    cb(null, true);
  };
};

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, 'image'),
});

export const uploadVideo = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: fileFilter(ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE, 'video'),
});

export const uploadSingleImage = uploadImage.single('file');
export const uploadSingleVideo = uploadVideo.single('file');
export const uploadMultipleImages = uploadImage.array('files', 10);

export const handleMulterError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the maximum allowed limit', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};
