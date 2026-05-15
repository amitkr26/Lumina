'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  hasStory?: boolean;
  storySeen?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-xl',
};

const ringSizeClasses = {
  sm: 'p-[2px]',
  md: 'p-[2px]',
  lg: 'p-[3px]',
  xl: 'p-[3px]',
};

const onlineDotSizes = {
  sm: 'h-2.5 w-2.5 border',
  md: 'h-3 w-3 border-2',
  lg: 'h-3.5 w-3.5 border-2',
  xl: 'h-5 w-5 border-2',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  alt,
  size = 'md',
  online = false,
  hasStory = false,
  storySeen = false,
  className,
  onClick,
}: AvatarProps) {
  const initials = getInitials(alt);

  const ringColor = hasStory
    ? storySeen
      ? 'from-gray-400 to-gray-500'
      : 'from-purple-500 via-pink-500 to-orange-400'
    : null;

  return (
    <div className="relative inline-flex flex-shrink-0">
      {ringColor ? (
        <div
          className={cn(
            'rounded-full bg-gradient-to-tr p-[2px]',
            ringSizeClasses[size],
            ringColor,
            onClick && 'cursor-pointer',
          )}
          onClick={onClick}
        >
          <div className="rounded-full bg-background p-[2px]">
            <div
              className={cn(
                'relative rounded-full overflow-hidden bg-muted flex items-center justify-center font-medium text-foreground',
                sizeClasses[size],
                className,
              )}
            >
              {src ? (
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-cover"
                  sizes={size === 'xl' ? '96px' : size === 'lg' ? '56px' : size === 'md' ? '40px' : '32px'}
                />
              ) : (
                initials
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'relative rounded-full overflow-hidden bg-muted flex items-center justify-center font-medium text-foreground',
            sizeClasses[size],
            onClick && 'cursor-pointer',
            className,
          )}
          onClick={onClick}
        >
          {src ? (
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              sizes={size === 'xl' ? '96px' : size === 'lg' ? '56px' : size === 'md' ? '40px' : '32px'}
            />
          ) : (
            initials
          )}
        </div>
      )}

      {online && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-green-500 border-background',
            onlineDotSizes[size],
          )}
        />
      )}
    </div>
  );
}
