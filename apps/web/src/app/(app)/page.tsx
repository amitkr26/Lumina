import { HomeFeed } from '@/components/feed/home-feed';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { StoriesBar } from '@/components/feed/stories-bar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      <StoriesBar />
      <HomeFeed />
      <BottomNav />
    </div>
  );
}
