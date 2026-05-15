import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Lumina — Share Your World',
    template: '%s | Lumina',
  },
  description: 'A modern creator-first social platform for sharing photos, videos, reels, and stories. Connect, create, and grow your audience.',
  keywords: ['social media', 'creator platform', 'photos', 'videos', 'reels', 'stories', 'content creation'],
  authors: [{ name: 'Lumina' }],
  creator: 'Lumina',
  publisher: 'Lumina',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://lumina.app',
    title: 'Lumina — Share Your World',
    description: 'A modern creator-first social platform for sharing photos, videos, reels, and stories.',
    siteName: 'Lumina',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Lumina' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina — Share Your World',
    description: 'A modern creator-first social platform.',
    images: ['/og-image.jpg'],
    creator: '@lumina',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
