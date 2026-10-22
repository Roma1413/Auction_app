import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import type { AuctionItem, UserProfile, BidHistoryEntry } from '../types/auction';
import { readApiResponse } from '../utils/apiResponse';
import { AuctionContext, type ActionResult } from './useAuction';


const API_BASE = '/api';
const SOCKET_URL = window.location.origin;
async function request(path: string, method = 'GET', body?: unknown) {
  const token = localStorage.getItem('auction-token');
  const res = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return readApiResponse(res);
}

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
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuctionItem | null>(null);
  const selectedItemId = selectedSnapshot?.id;
  // Read the latest listing directly; no effect or duplicate auction state to synchronize.
  const selectedItem = auctions.find(auction => auction.id === selectedItemId) || selectedSnapshot;
  const [recentItemIds, setRecentItemIds] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('auction-recent') || '[]');
      return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
    } catch { return []; }
  });
  const setSelectedItem = (item: AuctionItem | null) => {
    setSelectedSnapshot(item);
    if (item && item.id !== selectedItemId) {
      setRecentItemIds(previous => [item.id, ...previous.filter(id => id !== item.id)].slice(0, 6));
    }
  };
  const clearRecentHistory = () => setRecentItemIds([]);
  useEffect(() => {
    try {
      if (recentItemIds.length) localStorage.setItem('auction-recent', JSON.stringify(recentItemIds));
      else localStorage.removeItem('auction-recent');
    } catch { /* Keep history usable in memory if browser storage is unavailable. */ }
  }, [recentItemIds]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; message: string; timestamp: string }[]>([]);
  // Create without connecting; the effect owns connection setup and cleanup.
  const [socket] = useState<Socket>(() => io(SOCKET_URL, {
    autoConnect: false,
    reconnectionAttempts: 5,
    timeout: 3000,
  }));
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const loadAuctions = useCallback(() => request('/auctions')
    .then(data => { setAuctions(data); setLoadError(''); })
    .catch(() => setLoadError('Could not load listings. Check your connection and try again.'))
    .finally(() => setIsLoading(false)), []);
  const refreshAuctions = useCallback(() => {
    setIsLoading(true);
    return loadAuctions();
  }, [loadAuctions]);

  // Initialize Socket.io connection and REST API sync
  useEffect(() => {
    const newSocket = socket;

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

    newSocket.on('auction-ended', (data: { auctionId: string; winner: any; title: string; status?: AuctionItem['status']; auction?: AuctionItem }) => {
      setAuctions(prev => prev.map(auc => {
        if (auc.id === data.auctionId) {
          return data.auction || { ...auc, status: data.status || 'ended' };
        }
        return auc;
      }));

      if (data.auction) return;
      setLiveNotifications(prev => [
        {
          id: `notif-ended-${Date.now()}`,
          message: `🏁 Auction Finished: "${data.title.slice(0, 30)}..." Winner: ${data.winner ? data.winner.bidderName : 'No Winner'}`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 4)
      ]);
    });

    newSocket.connect();

    void loadAuctions();
    if (localStorage.getItem('auction-token')) request('/auth/me').then(data => setUser(data.user)).catch(() => localStorage.removeItem('auction-token'));

    return () => {
      newSocket.off();
      newSocket.disconnect();
    };
  }, [socket, loadAuctions, refreshAuctions]);

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await request('/user/notifications');
        if (!cancelled) setLiveNotifications(previous => [...data.notifications, ...previous.filter(n => !data.notifications.some((saved: { id: string }) => saved.id === n.id))].slice(0, 50));
      } catch { /* Keep notices when the connection is interrupted. */ }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    const onEnd = () => { void load(); };
    socket?.on('auction-ended', onEnd);
    return () => { cancelled = true; window.clearInterval(timer); socket?.off('auction-ended', onEnd); };
  }, [user.id, socket]);

  // Subscribe selected item to Socket room
  useEffect(() => {
    if (!selectedItemId) return;
    const join = () => socket.emit('join-auction', selectedItemId);
    if (socket.connected) join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leave-auction', selectedItemId);
    };
  }, [socket, selectedItemId]);

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
  const logout = () => { localStorage.removeItem('auction-token'); setUser(INITIAL_USER); setLiveNotifications([]); };
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
  const closeAuction = async (auctionId: string, action: 'cancel' | 'accept-highest', reason?: string, expectedBidId?: string): Promise<ActionResult> => {
    try {
      const data = await request('/auctions/' + auctionId + '/close', 'POST', { action, reason, expectedBidId });
      setAuctions(previous => previous.map(a => a.id === auctionId ? data.auction : a));
      notify(data.message);
      return { success: true, message: data.message };
    } catch (error) {
      await refreshAuctions();
      return { success: false, message: (error as Error).message };
    }
  };
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

  const clearNotifications = () => {
    const ids = liveNotifications.map(n => n.id);
    if (!user.id) { setLiveNotifications([]); return; }
    request('/user/notifications/clear', 'POST', { ids }).then(() => setLiveNotifications(previous => previous.filter(n => !ids.includes(n.id)))).catch(() => notify('Could not clear notifications. Please try again.'));
  };

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
      recentItemIds,
      clearRecentHistory,
      isCreateModalOpen,
      setIsCreateModalOpen: open => { if (!open || user.id) setIsCreateModalOpen(open); else window.dispatchEvent(new Event("auction-sign-in")); },
      placeBid,
      buyItNow,
      closeAuction,
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
