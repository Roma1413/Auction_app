import { useNow } from '../utils/useNow';
import React, { useState } from 'react';
import { 
  Heart, 
  Gavel, 
  MapPin, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Eye
} from 'lucide-react';
import type { AuctionItem } from '../types/auction';
import { useAuction } from '../context/useAuction';
import { formatPrice } from '../utils/timeFormat';
import { CountdownTimer } from './CountdownTimer';

interface AuctionCardProps {
  item: AuctionItem;
  onSelect: (item: AuctionItem) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ item, onSelect }) => {
  const now = useNow();
  const { user, toggleWatchlist, placeBid } = useAuction();
  const isWatched = user.watchlist.includes(item.id);
  const isUserHighestBidder = item.bids.length > 0 && item.bids[0].bidderId === user.id;

  const [bidError, setBidError] = useState<string | null>(null);

  // Next bid increment formula
  const minIncrement = item.currentBid < 1000 ? 50 : item.currentBid < 10000 ? 250 : 1000;
  const nextBid = item.currentBid + minIncrement;

  const handleQuickBid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBidError(null);
    const res = await placeBid(item.id, nextBid);
    if (!res.success) {
      setBidError(res.message);
      setTimeout(() => setBidError(null), 3000);
    }
  };

  return (
    <div 
      onClick={() => onSelect(item)}
      className="auction-card group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col cursor-pointer relative"
    >
      {/* Image Header Container */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        <img
          src={item.images[0]}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
              {item.condition}
            </span>
            {item.featured && (
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                HOT
              </span>
            )}
          </div>

          {/* Watchlist Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(item.id);
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 shadow-md ${
              isWatched 
                ? 'bg-rose-500 text-white' 
                : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
            title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Heart className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Live Timer Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10">
          <CountdownTimer endTime={item.endTime} compact />
        </div>

        {/* User Bidding Status Pill */}
        {isUserHighestBidder && (
          <div className="absolute bottom-3 right-3 z-10 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            HIGHEST BIDDER
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Location */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold text-blue-600 uppercase tracking-wider">{item.category}</span>
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.location}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>
        </div>

        {/* Price & Bidding Info */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {item.bidCount === 0 ? 'Starting Price' : 'Current High Bid'}
              </div>
              <div className="text-xl font-black text-slate-900 flex items-baseline gap-1">
                <span>{formatPrice(item.currentBid)}</span>
                {item.buyItNowPrice && (
                  <span className="text-[10px] font-medium text-slate-500">
                    Buy now {formatPrice(item.buyItNowPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-slate-600 flex items-center justify-end gap-1">
                <Gavel className="w-3.5 h-3.5 text-blue-600" />
                <span>{item.bidCount} {item.bidCount === 1 ? 'bid' : 'bids'}</span>
              </div>
              {item.buyItNowPrice && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                  {item.status === "active" && new Date(item.endTime).getTime() > now ? "Buy now available" : "Completed"}
                </span>
              )}
            </div>
          </div>

          {bidError && (
            <div className="mt-2 text-[11px] font-semibold text-red-600 bg-red-50 p-1.5 rounded-md text-center">
              {bidError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={item.status !== "active" || new Date(item.endTime).getTime() <= now}
              onClick={handleQuickBid}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Bid {formatPrice(nextBid)}</span>
            </button>

            <button
              onClick={() => onSelect(item)}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
