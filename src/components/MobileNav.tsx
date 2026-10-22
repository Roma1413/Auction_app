import { Home, Heart, Plus, Bell, UserRound } from 'lucide-react';
import { useAuction } from '../context/useAuction';

export function MobileNav({ onOpenDashboard }: { onOpenDashboard: (tab: 'watchlist' | 'listings') => void }) {
  const { user, setSearchQuery, setActiveCategory, setIsCreateModalOpen, liveNotifications } = useAuction();
  const openAccount = (tab: 'watchlist' | 'listings') => user.id ? onOpenDashboard(tab) : window.dispatchEvent(new Event('auction-sign-in'));
  return <nav className="mobile-dock" aria-label="Mobile navigation">
    <button type="button" onClick={() => { setSearchQuery(''); setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Home size={20}/><span>Explore</span></button>
    <button type="button" onClick={() => openAccount('watchlist')}><Heart size={20}/><span>Saved</span></button>
    <button type="button" className="mobile-dock-sell" onClick={() => setIsCreateModalOpen(true)}><span className="dock-plus"><Plus size={25}/></span><span>Sell</span></button>
    <button type="button" onClick={() => window.dispatchEvent(new Event('auction-notifications'))}><span className="dock-icon"><Bell size={20}/>{liveNotifications.length > 0 && <i/>}</span><span>Activity</span></button>
    <button type="button" onClick={() => openAccount('listings')}><UserRound size={20}/><span>{user.id ? 'Account' : 'Sign in'}</span></button>
  </nav>;
}
