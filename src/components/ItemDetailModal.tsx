import { useNow } from '../utils/useNow';
import React, { useState } from 'react';
import { 
  X, 
  Gavel, 
  Heart, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';
import type { AuctionItem } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import { formatPrice, formatTimeAgo } from '../utils/timeFormat';
import { CountdownTimer } from './CountdownTimer';

interface ItemDetailModalProps {
  item: AuctionItem;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
  const now = useNow();
  const { user, toggleWatchlist, placeBid, buyItNow, auctions, setSelectedItem } = useAuction();
  
  const [showSeller, setShowSeller] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isWatched = user.watchlist.includes(item.id);
  const isHighestBidder = item.bids.length > 0 && item.bids[0].bidderId === user.id;

  const isActive = item.status === 'active' && new Date(item.endTime).getTime() > now;
  const minBidAllowed = item.currentBid + (item.currentBid < 1000 ? 50 : 250);

  const handlePlaceBid = async (amountToBid?: number) => {
    setFeedbackMsg(null);
    const amount = amountToBid || parseFloat(customBidAmount);

    if (isNaN(amount)) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid numeric bid amount.' });
      return;
    }

    const result = await placeBid(item.id, amount);
    if (result.success) {
      setFeedbackMsg({ type: 'success', text: result.message });
      setCustomBidAmount('');
    } else {
      setFeedbackMsg({ type: 'error', text: result.message });
    }
  };

  const handleBuyNow = async () => {
    const result = await buyItNow(item.id);
    if (result.success) {
      setFeedbackMsg({ type: 'success', text: result.message });
    } else {
      setFeedbackMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 relative flex flex-col max-h-[90vh]">
        
        {/* Header bar */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              {item.category}
            </span>
            <span className="text-slate-400 text-xs truncate max-w-xs sm:max-w-md">ID: {item.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist(item.id)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isWatched ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isWatched ? 'Watching' : 'Add to Watchlist'}</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Image Gallery */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-4/3 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <img
                  src={item.images[selectedImgIndex]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-xs">
                  {selectedImgIndex + 1} of {item.images.length} photos
                </span>
              </div>

              {/* Thumbnails */}
              {item.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {item.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImgIndex === idx ? 'border-blue-600 scale-95 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Specifications Table */}
              {item.specs && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Item Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(item.specs).map(([key, val]) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 font-medium block">{key}</span>
                        <span className="text-slate-900 font-bold">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Title, Bidding Controls, Seller Card */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Title & Status */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {item.condition}
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    {item.viewsCount || 420} views today
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {item.title}
                </h1>
                {item.subtitle && (
                  <p className="text-xs text-slate-500 mt-1 font-medium">{item.subtitle}</p>
                )}
              </div>

              {/* Seller Trust Profile Card */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={item.seller.avatar}
                    alt={item.seller.name}
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setShowSeller(!showSeller)} className="text-xs font-bold text-blue-700 underline underline-offset-2">{item.seller.name} · View shop</button>
                      {item.seller.verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 fill-blue-100 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Member since {item.seller.joinedYear}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowSeller(!showSeller)} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                  Seller shop
                </button>
              </div>

              {/* Live Countdown Timer Banner */}
              <CountdownTimer endTime={item.endTime} />

              {/* Current Bidding Panel */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl">
                
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Highest Bid</span>
                    <div className="text-3xl sm:text-4xl font-black text-white">
                      {formatPrice(item.currentBid)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Total Bids</span>
                    <span className="text-lg font-bold text-blue-400">{item.bidCount} bids placed</span>
                  </div>
                </div>

                {isHighestBidder && (
                  <div className="bg-emerald-500/20 text-emerald-300 p-2.5 rounded-xl border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>You are currently the winning bidder!</span>
                  </div>
                )}

                {/* Feedback Notification Box */}
                {feedbackMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    feedbackMsg.type === 'success' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-rose-500 text-white'
                  }`}>
                    {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                {/* Bidding Controls */}
                {isActive ? <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="text-xs text-slate-300 font-semibold">
                    Quick Bid Increments (Minimum required: <span className="text-emerald-400">{formatPrice(minBidAllowed)}</span>)
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[minBidAllowed, minBidAllowed + 100, minBidAllowed + 250, minBidAllowed + 500].map(val => (
                      <button
                        key={val}
                        onClick={() => handlePlaceBid(val)}
                        className="bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 rounded-xl border border-slate-700 transition-colors"
                      >
                        {formatPrice(val)}
                      </button>
                    ))}
                  </div>

                  {/* Custom Bid Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                      <input
                        type="number"
                        placeholder={`Enter ${minBidAllowed} or higher`}
                        value={customBidAmount}
                        onChange={(e) => setCustomBidAmount(e.target.value)}
                        className="w-full bg-slate-800 text-white pl-7 pr-3 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handlePlaceBid()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
                    >
                      <Gavel className="w-4 h-4" />
                      <span>Place Bid</span>
                    </button>
                  </div>

                  {/* Buy It Now Option */}
                  {item.buyItNowPrice && item.status === 'active' && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Skip the auction & buy immediately</span>
                        <span className="text-lg font-bold text-amber-400">{formatPrice(item.buyItNowPrice)}</span>
                      </div>
                      <button
                        onClick={handleBuyNow}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Buy It Now</span>
                      </button>
                    </div>
                  )}
                </div> : <p className="text-sm text-slate-400 border-t border-slate-800 pt-4">This listing has ended. Explore the seller’s shop for more finds.</p>}

              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">${item.shippingCost} Shipping</span>
                  <span className="text-[10px] text-slate-400">Seller listed shipping</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">Account required</span>
                  <span className="text-[10px] text-slate-400">Sign in to purchase</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <RefreshCw className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">Item condition</span>
                  <span className="text-[10px] text-slate-400">{item.condition}</span>
                </div>
              </div>

            </div>
          </div>

          {showSeller && <section className="border border-slate-200 rounded-2xl p-5 bg-slate-50"><div className="flex justify-between mb-4"><div><h3 className="font-bold">More from {item.seller.name}</h3><p className="text-xs text-slate-500 mt-1">Member since {item.seller.joinedYear} · {auctions.filter(a => a.seller.id === item.seller.id).length} listings</p></div><button className="text-xs" onClick={() => setShowSeller(false)}>Close shop</button></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{auctions.filter(a => a.seller.id === item.seller.id && a.id !== item.id).map(a => <button className="bg-white border rounded-xl p-3 text-left" key={a.id} onClick={() => {setSelectedItem(a);setSelectedImgIndex(0);}}><img className="w-full h-24 rounded-lg object-cover mb-2" src={a.images[0]} alt={a.title}/><p className="text-xs line-clamp-2">{a.title}</p><strong className="text-xs">{formatPrice(a.currentBid)}</strong></button>)}</div>{!auctions.some(a => a.seller.id === item.seller.id && a.id !== item.id) && <p className="text-sm text-slate-500">This is the seller’s only listing right now.</p>}</section>}
          {/* Description Section */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Item Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {item.description}
            </p>
          </div>

          {/* Real-time Bid History Feed */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Bid Activity Log ({item.bids.length} entries)
                </h3>
              </div>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Socket Live Sync
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3 pl-4">Bidder</th>
                    <th className="p-3">Bid Amount</th>
                    <th className="p-3">Time</th>
                    <th className="p-3 pr-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {item.bids.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No bids placed yet. Be the first to bid!
                      </td>
                    </tr>
                  ) : (
                    item.bids.map((b, idx) => (
                      <tr key={b.id} className={idx === 0 ? 'bg-blue-50/50 font-bold' : ''}>
                        <td className="p-3 pl-4 text-slate-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            #{item.bids.length - idx}
                          </span>
                          <span>{b.bidderName}</span>
                          {idx === 0 && (
                            <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm">
                              HIGH BID
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-900 font-bold text-sm">
                          {formatPrice(b.amount)}
                        </td>
                        <td className="p-3 text-slate-500">
                          {formatTimeAgo(b.timestamp)}
                        </td>
                        <td className="p-3 pr-4 text-slate-400">
                          {b.isAutoBid ? 'Proxy Auto-Bid' : 'Manual Bid'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
