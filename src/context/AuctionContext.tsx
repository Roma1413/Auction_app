import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import type { AuctionItem, UserProfile, BidHistoryEntry } from '../types/auction';


const API_BASE = '/api';
const SOCKET_URL = window.location.origin;
type ActionResult = { success: boolean; message: string };
async function request(path: string, method = 'GET', body?: unknown) {
  const token = localStorage.getItem('auction-token');
  const res = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

interface AuctionContextType {
  auctions: AuctionItem[];
  user: UserProfile;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedItem: AuctionItem | null;
  setSelectedItem: (item: AuctionItem | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  placeBid: (auctionId: string, amount: number) => Promise<ActionResult>;
  buyItNow: (auctionId: string) => Promise<ActionResult>;
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

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

const INITIAL_USER: UserProfile = {
  id: '',
  name: 'Guest',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
  balance: 0,
  watchlist: [],
  biddedItemIds: []
};

export const AuctionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; message: string; timestamp: string }[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const refreshAuctions = useCallback(async () => {
    setIsLoading(true);
    try { setAuctions(await request('/auctions')); setLoadError(''); }
    catch { setLoadError('Could not load listings. Check your connection and try again.'); }
    finally { setIsLoading(false); }
  }, []);

  // Initialize Socket.io connection and REST API sync
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      timeout: 3000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to backend WebSocket server!');
      request("/health").then(() => setIsBackendConnected(true)).catch(() => setIsBackendConnected(false));
      void refreshAuctions();
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Backend WebSocket disconnected');
      setIsBackendConnected(false);
    });

    // Listen for live bids from other users via WebSockets
    newSocket.on('global-live-bid', (data: { auctionId: string; title: string; amount: number; bidderName: string }) => {
      setLiveNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          message: `New high bid of $${data.amount.toLocaleString()} on "${data.title}" by ${data.bidderName}`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 4)
      ]);
    });

    newSocket.on('bid-updated', (data: { auctionId: string; currentBid: number; bidCount: number; newBid: BidHistoryEntry; auction: AuctionItem }) => {
      setAuctions(prev => prev.map(auc => {
        if (auc.id === data.auctionId) {
          return {
            ...auc,
            currentBid: data.currentBid,
            bidCount: data.bidCount,
            bids: [data.newBid, ...auc.bids.filter(b => b.id !== data.newBid.id)]
          };
        }
        return auc;
      }));
    });

    newSocket.on('auction-ended', (data: { auctionId: string; winner: any; title: string; status?: 'ended' | 'sold' }) => {
      setAuctions(prev => prev.map(auc => {
        if (auc.id === data.auctionId) {
          return { ...auc, status: data.status || 'ended' };
        }
        return auc;
      }));

      setLiveNotifications(prev => [
        {
          id: `notif-ended-${Date.now()}`,
          message: `🏁 Auction Finished: "${data.title.slice(0, 30)}..." Winner: ${data.winner ? data.winner.bidderName : 'No Winner'}`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 4)
      ]);
    });

    setSocket(newSocket);

    void refreshAuctions();
    if (localStorage.getItem('auction-token')) request('/auth/me').then(data => setUser(data.user)).catch(() => localStorage.removeItem('auction-token'));

    return () => {
      newSocket.disconnect();
    };
  }, [refreshAuctions]);

  // Subscribe selected item to Socket room
  useEffect(() => {
    if (socket && selectedItem) {
      socket.emit('join-auction', selectedItem.id);
      return () => {
        socket.emit('leave-auction', selectedItem.id);
      };
    }
  }, [socket, selectedItem]);

  // Keep selected item updated when auctions state changes
  useEffect(() => {
    if (selectedItem) {
      const updated = auctions.find(a => a.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  }, [auctions]);

  const notify = (message: string) => setLiveNotifications(prev => [{ id: crypto.randomUUID(), message, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
  const authenticate = async (email: string, password: string, name?: string): Promise<ActionResult> => {
    try {
      const data = await request(name ? '/auth/register' : '/auth/login', 'POST', { email, password, name });
      localStorage.setItem('auction-token', data.token);
      const profile = await request('/auth/me');
      setUser(profile.user);
      return { success: true, message: 'Signed in' };
    } catch (error) { return { success: false, message: (error as Error).message }; }
  };
  const logout = () => { localStorage.removeItem('auction-token'); setUser(INITIAL_USER); };
  const authenticateGoogle = async (credential: string): Promise<ActionResult> => {
    try {
      const data = await request('/auth/google', 'POST', { credential });
      localStorage.setItem('auction-token', data.token);
      const profile = await request('/auth/me');
      setUser(profile.user);
      return { success: true, message: 'Signed in' };
    } catch (error) { return { success: false, message: (error as Error).message }; }
  };
  const saveAction = async (path: string, body?: unknown): Promise<ActionResult> => {
    if (!user.id) { window.dispatchEvent(new Event('auction-sign-in')); return { success: false, message: 'Please sign in first.' }; }
    try {
      const data = await request(path, 'POST', body);
      setAuctions(prev => prev.map(auction => auction.id === data.auction.id ? data.auction : auction));
      try { const profile = await request('/auth/me'); setUser(profile.user); }
      catch { notify('Your action succeeded, but account activity could not refresh.'); }
      confetti({ particleCount: 60, spread: 60 });
      return { success: true, message: data.message };
    } catch (error) { return { success: false, message: (error as Error).message }; }
  };
  const placeBid = (auctionId: string, amount: number) => saveAction('/auctions/' + auctionId + '/bid', { amount });
  const buyItNow = (auctionId: string) => saveAction('/auctions/' + auctionId + '/buy-now');
  const toggleWatchlist = async (auctionId: string) => {
    if (!user.id) { window.dispatchEvent(new Event('auction-sign-in')); return; }
    try {
      const data = await request('/user/watchlist/' + auctionId, 'POST');
      setUser(prev => ({ ...prev, watchlist: data.watched ? Array.from(new Set([...prev.watchlist, auctionId])) : prev.watchlist.filter(id => id !== auctionId) }));
    } catch (error) { notify((error as Error).message); }
  };
  const createAuction = async (newAuctionData: Omit<AuctionItem, 'id' | 'seller' | 'currentBid' | 'bidCount' | 'status' | 'bids' | 'startTime'>) => {
    if (!user.id) { notify('Please sign in before creating a listing.'); return; }
    try {
      const auction = await request('/auctions', 'POST', newAuctionData);
      setAuctions(prev => [auction, ...prev]);
      setIsCreateModalOpen(false);
      notify('Your auction was saved.');
    } catch (error) { notify((error as Error).message); }
  };

  const clearNotifications = () => setLiveNotifications([]);

  return (
    <AuctionContext.Provider value={{
      auctions,
      user,
      activeCategory,
      setActiveCategory,
      searchQuery,
      setSearchQuery,
      selectedItem,
      setSelectedItem,
      isCreateModalOpen,
      setIsCreateModalOpen: open => { if (!open || user.id) setIsCreateModalOpen(open); else window.dispatchEvent(new Event("auction-sign-in")); },
      placeBid,
      buyItNow,
      toggleWatchlist,
      createAuction,
      liveNotifications,
      clearNotifications,
      isBackendConnected,
      isLoading,
      loadError,
      refreshAuctions,
      authenticate,
      authenticateGoogle,
      logout
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) throw new Error('useAuction must be used within an AuctionProvider');
  return context;
};
