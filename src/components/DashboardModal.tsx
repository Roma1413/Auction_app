import { useNow } from '../utils/useNow';
import { useState } from 'react';
import { X, Heart, Gavel, Package, Trophy, ArrowUpRight } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { AuctionItem } from '../types/auction';
import { formatPrice } from '../utils/timeFormat';
import { CountdownTimer } from './CountdownTimer';
type Tab = 'watchlist' | 'bids' | 'listings' | 'won';
interface DashboardModalProps { initialTab?: Tab; onClose: () => void; onSelectItem: (item: AuctionItem) => void }
export function DashboardModal({ initialTab = 'watchlist', onClose, onSelectItem }: DashboardModalProps) {
  const now = useNow();
  const { user, auctions, toggleWatchlist } = useAuction();
  const [tab, setTab] = useState<Tab>(initialTab);
  const active = (a: AuctionItem) => a.status === 'active' && new Date(a.endTime).getTime() > now;
  const won = (a: AuctionItem) => !active(a) && a.bids[0]?.bidderId === user.id && (a.status === 'sold' || !a.reservePrice || a.currentBid >= a.reservePrice);
  const groups = { watchlist: auctions.filter(a => user.watchlist.includes(a.id)), bids: auctions.filter(a => user.biddedItemIds.includes(a.id) && active(a)), listings: auctions.filter(a => a.seller.id === user.id && !!user.id), won: auctions.filter(a => !!user.id && won(a)) };
  const tabs = [{ id: 'watchlist' as const, label: 'Watchlist', icon: Heart }, { id: 'bids' as const, label: 'Active bids', icon: Gavel }, { id: 'listings' as const, label: 'Selling', icon: Package }, { id: 'won' as const, label: 'Purchases & wins', icon: Trophy }];
  const selling = groups.listings.filter(active);
  return <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="My Auction hub"><div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
    <header className="bg-[#233d30] text-white p-6 flex justify-between items-center"><div><span className="text-[10px] tracking-widest text-lime-200">MY AUCTION PRO</span><h2 className="text-2xl font-bold mt-2">Your finds. Your next chapter.</h2><p className="text-xs text-slate-300 mt-2">{user.id ? `${user.name} · Your buying and selling hub` : 'Sign in to save favorites and manage your activity.'}</p></div><button onClick={onClose} aria-label="Close account hub"><X/></button></header>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">{[{label:'Saved finds',value:groups.watchlist.length},{label:'Bids in play',value:groups.bids.length},{label:'Live listings',value:selling.length},{label:'Purchases & wins',value:groups.won.length}].map(stat => <div key={stat.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4"><p className="text-xs text-slate-500">{stat.label}</p><p className="text-2xl font-bold mt-2">{stat.value}</p></div>)}</div>
    <div className="px-6 flex gap-2 border-b overflow-x-auto">{tabs.map(({id,label,icon:Icon}) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 text-xs whitespace-nowrap px-3 py-4 border-b-2 ${tab===id ? 'border-[#233d30] text-[#233d30] font-bold' : 'border-transparent text-slate-500'}`}><Icon size={15}/>{label} ({groups[id].length})</button>)}</div>
    <div className="p-6 space-y-3">{groups[tab].length ? groups[tab].map(item => {
      const leading = item.bids[0]?.bidderId === user.id;
      return <div key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 border border-slate-200 rounded-2xl"><img className="w-16 h-16 rounded-xl object-cover" src={item.images[0]} alt={item.title}/><div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-wide text-slate-500">{tab==='bids' ? leading ? 'You’re leading' : 'You’ve been outbid' : tab==='won' ? item.status==='sold' ? 'Buy now purchase' : 'Auction won' : active(item) ? 'Active listing' : 'Completed listing'}</p><button onClick={() => {onClose();onSelectItem(item);}} className="text-sm font-semibold text-left hover:text-blue-700 line-clamp-2 mt-1">{item.title}</button><p className="text-xs text-slate-500 mt-2"><strong className="text-slate-900">{formatPrice(item.currentBid)}</strong> · {item.bidCount} bids · Shipping {formatPrice(item.shippingCost)}</p></div><div className="flex gap-3 items-center">{active(item) && <CountdownTimer endTime={item.endTime} compact/>}{tab==='watchlist' && <button aria-label={`Remove ${item.title} from watchlist`} onClick={() => toggleWatchlist(item.id)} className="text-rose-500"><Heart size={18} fill="currentColor"/></button>}<button aria-label={`View ${item.title}`} onClick={() => {onClose();onSelectItem(item);}} className="bg-slate-100 p-2 rounded-lg"><ArrowUpRight size={17}/></button></div></div>;
    }) : <div className="py-14 text-center"><Package className="mx-auto text-slate-300 mb-4" size={36}/><h3 className="font-semibold">{tab==='watchlist' ? 'Your next favorite belongs here.' : tab==='bids' ? 'No active bids yet.' : tab==='listings' ? 'Give something great a new home.' : 'Your first win is still ahead.'}</h3><p className="text-sm text-slate-500 mt-2">{tab==='watchlist' ? 'Tap the heart on a listing to save it for later.' : tab==='listings' ? 'Use Sell an Item to create your first listing.' : 'Explore the marketplace to get started.'}</p><button onClick={onClose} className="mt-5 bg-[#233d30] text-white rounded-full px-5 py-2 text-sm">Explore listings</button></div>}</div>
  </div></div>;
}
