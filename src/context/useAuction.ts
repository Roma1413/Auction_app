import { createContext, useContext } from 'react';
import type { AuctionItem, UserProfile } from '../types/auction';

export type ActionResult = { success: boolean; message: string };

interface AuctionContextType {
  auctions: AuctionItem[];
  user: UserProfile;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedItem: AuctionItem | null;
  recentItemIds: string[];
  clearRecentHistory: () => void;
  setSelectedItem: (item: AuctionItem | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  placeBid: (auctionId: string, amount: number) => Promise<ActionResult>;
  buyItNow: (auctionId: string) => Promise<ActionResult>;
  closeAuction: (auctionId: string, action: 'cancel' | 'accept-highest', reason?: string, expectedBidId?: string) => Promise<ActionResult>;
  toggleWatchlist: (auctionId: string) => void;
  createAuction: (newAuctionData: Omit<AuctionItem, 'id' | 'seller' | 'currentBid' | 'bidCount' | 'status' | 'bids' | 'startTime'>) => Promise<void>;
  liveNotifications: { id: string; message: string; timestamp: string }[];
  clearNotifications: () => void;
  isBackendConnected: boolean;
  isLoading: boolean;
  loadError: string;
  refreshAuctions: () => Promise<void>;
  authenticate: (email: string, password: string, name?: string) => Promise<ActionResult>;
  authenticateGoogle: (credential: string) => Promise<ActionResult>;
  logout: () => void;
}

export const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) throw new Error('useAuction must be used within an AuctionProvider');
  return context;
};
