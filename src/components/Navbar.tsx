import { useEffect, useState } from 'react';
import { Gavel, Search, Heart, Plus, Bell, X, ArrowUpRight, LogOut, UserRound } from 'lucide-react';
import { useAuction } from '../context/useAuction';

interface NavbarProps { onOpenDashboard: (tab?: 'watchlist' | 'bids' | 'listings') => void }
export function Navbar({ onOpenDashboard }: NavbarProps) {
  const { searchQuery, setSearchQuery, setActiveCategory, user, logout, setIsCreateModalOpen, liveNotifications, clearNotifications, isBackendConnected } = useAuction();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  useEffect(() => {
    const open = () => { setShowNotifications(value => !value); setShowAccount(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    window.addEventListener('auction-notifications', open);
    return () => window.removeEventListener('auction-notifications', open);
  }, []);
  const signIn = () => window.dispatchEvent(new Event('auction-sign-in'));
  return <header className="site-header">
    <div className="nav-main">
      <button className="nav-brand" onClick={() => { setActiveCategory('All'); setSearchQuery(''); }} aria-label="Auction Pro home"><span className="brand-symbol"><Gavel size={23}/></span><span>auction<span className="brand-pro">pro</span><small>Objects with a next chapter.</small></span></button>
      <label className="nav-search"><Search size={19}/><input type="search" aria-label="Search auctions" placeholder="Find something extraordinary" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/>{searchQuery && <button aria-label="Clear search" onClick={() => setSearchQuery('')}><X size={16}/></button>}</label>
      <nav className="nav-actions" aria-label="Account navigation">
        <button className="nav-icon" aria-label="Watchlist" onClick={() => user.id ? onOpenDashboard('watchlist') : signIn()}><Heart size={20}/>{user.watchlist.length > 0 && <span className="nav-count">{user.watchlist.length}</span>}</button>
        <div className="nav-popover-wrap"><button className="nav-icon" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => {setShowNotifications(!showNotifications);setShowAccount(false);}}><Bell size={20}/>{liveNotifications.length > 0 && <span className="notification-dot"/>}</button>
          {showNotifications && <div className="nav-popover"><div className="popover-heading"><strong>Notifications</strong><button aria-label="Close notifications" onClick={() => setShowNotifications(false)}><X size={17}/></button></div>{liveNotifications.length ? <><button className="popover-link" onClick={clearNotifications}>Clear all</button>{liveNotifications.map(notification => <div className="notification-entry" key={notification.id}><p>{notification.message}</p><small>{notification.timestamp}</small></div>)}</> : <p className="popover-empty">You’re all caught up. Bid updates will appear here.</p>}</div>}
        </div>
        <span className="nav-divider"/>
        {user.id ? <div className="nav-popover-wrap"><button className="nav-account" aria-expanded={showAccount} onClick={() => {setShowAccount(!showAccount);setShowNotifications(false);}}><UserRound size={17}/><span>{user.name.split(' ')[0]}</span></button>{showAccount && <div className="nav-popover account-menu"><strong className="popover-heading">Your account</strong>{([{label:'Watchlist',tab:'watchlist'},{label:'My bids',tab:'bids'},{label:'My listings',tab:'listings'}] as const).map(item => <button key={item.tab} onClick={() => {onOpenDashboard(item.tab);setShowAccount(false);}}>{item.label}<ArrowUpRight size={15}/></button>)}<button onClick={() => {logout();setShowAccount(false);}}>Sign out<LogOut size={15}/></button></div>}</div> : <button className="nav-signin" onClick={signIn}>Sign in<ArrowUpRight size={15}/></button>}
        <button aria-label="Sell an item" className="nav-sell" onClick={() => setIsCreateModalOpen(true)}><Plus size={17}/><span>Sell an item</span></button>
      </nav>
    </div>
    <div className="nav-caption"><span>A little curiosity. A great find.</span><span className="connection-label"><i className={isBackendConnected ? 'connected' : ''}/>{isBackendConnected ? 'Live updates connected' : 'Connecting live updates'}</span></div>
  </header>;
}
