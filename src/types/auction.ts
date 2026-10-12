export type ItemCondition = 'Brand New' | 'Like New' | 'Used - Good' | 'Refurbished' | 'Vintage / Antique';

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  feedbackCount: number;
  verified: boolean;
  joinedYear: number;
}

export interface BidHistoryEntry {
  id: string;
  auctionId: string;
  bidderName: string;
  bidderId: string;
  bidderAvatar?: string;
  amount: number;
  timestamp: string;
  isAutoBid?: boolean;
}

export interface AuctionItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  condition: ItemCondition;
  images: string[];
  seller: Seller;
  startingPrice: number;
  reservePrice?: number; // Minimum price seller will accept
  currentBid: number;
  buyItNowPrice?: number;
  bidCount: number;
  startTime: string;
  endTime: string; // ISO string timestamp
  status: 'active' | 'ended' | 'sold' | 'cancelled';
  closureType?: 'accepted-highest' | 'seller-cancelled';
  cancellationReason?: string;
  winnerId?: string;
  location: string;
  shippingCost: number;
  bids: BidHistoryEntry[];
  featured?: boolean;
  specs?: Record<string, string>;
  viewsCount?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  balance: number;
  watchlist: string[]; // item IDs
  biddedItemIds: string[]; // item IDs user has placed bid on
}
