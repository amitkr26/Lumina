import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export const uploadImage = async (
  fileBuffer: Buffer,
  folder: string = 'posts'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `lumina/${folder}`,
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1080, crop: 'limit' },
        ],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
          width: result!.width,
          height: result!.height,
          format: result!.format,
          bytes: result!.bytes,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const uploadVideo = async (
  fileBuffer: Buffer,
  folder: string = 'reels'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `lumina/${folder}`,
        resource_type: 'video',
        eager: [
          { width: 1080, height: 1920, crop: 'fill', video_codec: 'h264' },
          { width: 720, height: 1280, crop: 'fill', video_codec: 'h264' },
          { width: 480, height: 854, crop: 'fill', video_codec: 'h264' },
        ],
        eager_async: true,
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
          width: result!.width,
          height: result!.height,
          bytes: result!.bytes,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteMedia = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

export const generateThumbnail = (videoUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.explicit(
      videoUrl,
      {
        resource_type: 'video',
        eager: [{ width: 480, height: 854, crop: 'fill', format: 'jpg' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.eager![0].secure_url);
      }
    );
  });
};

export const getOptimizedUrl = (
  publicId: string,
  options: { width?: number; height?: number; quality?: string; format?: string } = {}
): string => {
  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);

  const transformation = transformations.length > 0
    ? transformations.join(',') + '/'
    : '';

  return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${transformation}${publicId}`;
};
