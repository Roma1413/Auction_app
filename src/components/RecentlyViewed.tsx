import { Clock3, ArrowUpRight } from 'lucide-react';
import { useAuction } from '../context/useAuction';
import { formatPrice } from '../utils/timeFormat';
export function RecentlyViewed() {
  const { recentItemIds: ids, auctions, setSelectedItem, clearRecentHistory } = useAuction();
  const items=ids.map(id => auctions.find(a => a.id === id)).filter(a => a !== undefined);
  if (!items.length) return null;
  return <section className="max-w-7xl mx-auto w-full px-6 pb-10"><div className="flex items-center justify-between mb-4"><h2 className="font-bold flex items-center gap-2"><Clock3 size={18}/> Your recent discoveries</h2><button className="text-xs text-slate-500" onClick={clearRecentHistory}>Clear history</button></div><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{items.map(item => <button key={item.id} onClick={() => setSelectedItem(item)} className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-500 transition-colors"><img src={item.images[0]} alt={item.title} className="w-full h-28 object-cover"/><div className="p-3"><p className="text-xs line-clamp-2 mb-2">{item.title}</p><span className="text-xs font-bold">{formatPrice(item.currentBid)}</span><ArrowUpRight size={14} className="float-right"/></div></button>)}</div></section>;
}
