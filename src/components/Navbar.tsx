import React, { useState } from 'react';
import { 
  Gavel, 
  Search, 
  Heart, 
  PlusCircle, 
  Bell, 
  Layers, 
  Zap, 
  X,
  Wallet
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatPrice } from '../utils/timeFormat';

interface NavbarProps {
  onOpenDashboard: (tab?: 'watchlist' | 'bids' | 'listings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDashboard }) => {
  const { 
    searchQuery, 
    setSearchQuery, 
    activeCategory, 
    setActiveCategory, 
    user, 
    setIsCreateModalOpen,
    liveNotifications,
    clearNotifications
  } = useAuction();

  const [showNotifications, setShowNotifications] = useState(false);

  const categories = [
    'All',
    'Watches & Jewelry',
    'Electronics',
    'Vehicles',
    'Collectibles & Art',
    'Gaming',
    'Music & Instruments'
  ];

  const watchlistCount = user.watchlist.length;
  const activeBidsCount = user.biddedItemIds.length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner Ticker */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            AUCTION PRO
          </span>
          <span className="hidden sm:inline">Discover · Bid · Make it yours</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1 text-slate-400">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>Available Balance: <strong className="text-white">{formatPrice(user.balance)}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Account: <strong className="text-white">{user.name}</strong></span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <button 
            onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
            className="flex items-center gap-2.5 text-left shrink-0 group focus:outline-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Gavel className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-slate-900">AUCTION</span>
                <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-blue-600 text-white uppercase tracking-wider">PRO</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 -mt-1">Find your next favorite</p>
            </div>
          </button>

          {/* Search Bar with Category Dropdown */}
          <div className="flex-1 max-w-2xl hidden md:flex items-center gap-0 bg-slate-100 rounded-xl p-1 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <div className="relative border-r border-slate-200">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="appearance-none bg-transparent pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search auctions (e.g. Rolex, MacBook, BMW, PS5)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors shadow-xs cursor-pointer">
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Create Auction Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Sell an Item</span>
              <span className="sm:hidden">Sell</span>
            </button>

            {/* Watchlist Button */}
            <button
              onClick={() => onOpenDashboard('watchlist')}
              className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Watchlist"
            >
              <Heart className="w-5 h-5" />
              {watchlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {watchlistCount}
                </span>
              )}
            </button>

            {/* My Active Bids Button */}
            <button
              onClick={() => onOpenDashboard('bids')}
              className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex cursor-pointer"
              title="My Bids"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              {activeBidsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeBidsCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {liveNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Your notifications</h4>
                    </div>
                    {liveNotifications.length > 0 && (
                      <button 
                        onClick={clearNotifications}
                        className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {liveNotifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No new bidding notifications yet. Place a bid or watch an item!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveNotifications.map(notif => (
                        <div key={notif.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <div className="text-slate-800 font-medium">{notif.message}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{notif.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar Button */}
            <button
              onClick={() => user.id ? onOpenDashboard() : window.dispatchEvent(new Event("auction-sign-in"))}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-500/20"
              />
              <span className="text-xs font-semibold text-slate-800 hidden lg:inline">{user.name.split(' ')[0]}</span>
            </button>

          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="mt-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="Search active auctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
    </header>
  );
};
