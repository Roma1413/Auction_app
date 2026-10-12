import React, { useState } from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { Navbar } from './components/Navbar';
import { AccountBar } from './components/AccountBar';
import { RecentlyViewed } from './components/RecentlyViewed';
import { InstallApp } from './components/InstallApp';
import { CategoryBar } from './components/CategoryBar';
import { MainFeed } from './components/MainFeed';
import { ItemDetailModal } from './components/ItemDetailModal';
import { CreateListingModal } from './components/CreateListingModal';
import { DashboardModal } from './components/DashboardModal';
import { Zap, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    selectedItem, 
    setSelectedItem, 
    isCreateModalOpen, 
    setIsCreateModalOpen,
    liveNotifications,
    clearNotifications
  } = useAuction();

  const [dashboardTab, setDashboardTab] = useState<'watchlist' | 'bids' | 'listings' | 'won' | null>(null);

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar 
        onOpenDashboard={(tab = 'watchlist') => setDashboardTab(tab)} 
      />

      {/* Category Bar */}
      <AccountBar />
      <CategoryBar />

      {/* Main Grid Feed */}
      <MainFeed 
        onSelectItem={(item) => setSelectedItem(item)} 
      />

      <RecentlyViewed />
      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-white">
            <span>AUCTION PRO</span>
            <span className="text-slate-600">•</span>
            <span className="text-blue-400">Real-Time Bidding Marketplace</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Discover unique finds. Save your favorites. Give something great a new home.
          </p>
          <InstallApp />
        </div>
      </footer>

      {/* Selected Item Detail View Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Create Listing Seller Modal */}
      {isCreateModalOpen && (
        <CreateListingModal
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Dashboard Modal */}
      {dashboardTab && (
        <DashboardModal
          initialTab={dashboardTab}
          onClose={() => setDashboardTab(null)}
          onSelectItem={(item) => setSelectedItem(item)}
        />
      )}

      {/* Floating Live WebSocket Notification Toast */}
      {liveNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2 animate-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          {liveNotifications.slice(0, 2).map((notif) => (
            <div 
              key={notif.id} 
              className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs flex items-center justify-between gap-3 pointer-events-auto"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 animate-bounce" />
                </div>
                <span className="font-medium text-slate-200">{notif.message}</span>
              </div>
              <button
                onClick={clearNotifications}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <AuctionProvider>
      <AppContent />
    </AuctionProvider>
  );
}
