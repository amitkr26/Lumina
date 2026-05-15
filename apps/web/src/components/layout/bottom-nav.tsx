'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, Clapperboard, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Explore', href: '/explore' },
  { icon: Plus, label: 'Create', href: '/create', special: true },
  { icon: Clapperboard, label: 'Reels', href: '/reels' },
  { icon: User, label: 'Profile', href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" role="navigation" aria-label="Mobile navigation">
      <div className="bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map(({ icon: Icon, label, href, special }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

            if (special) {
              return (
                <div key={label} className="flex items-center -mt-6">
                  <Link href={href} aria-label={label}>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/30"
                    >
                      <Plus className="h-7 w-7" />
                    </motion.div>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors',
                  isActive ? 'text-brand-500' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-brand-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div whileTap={{ scale: 0.85 }}>
                  <Icon className="h-6 w-6" />
                </motion.div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
