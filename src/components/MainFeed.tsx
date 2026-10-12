import React, { useState } from 'react';
import { useNow } from '../utils/useNow';
import { 
  SearchX, 
  SlidersHorizontal,
  ArrowUpRight,
  ArrowRight
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { AuctionItem } from '../types/auction';
import { AuctionCard } from './AuctionCard';
import { DEFAULT_FILTERS, matchesFilters, type MarketplaceFilters } from '../utils/marketplace';
import { BookmarkPlus, X, RotateCcw } from 'lucide-react';
interface SavedSearch { id: string; query: string; category: string; filters: MarketplaceFilters; sort: 'endingSoon' | 'mostBids' | 'newest' | 'priceHigh' | 'priceLow' }


interface MainFeedProps {
  onSelectItem: (item: AuctionItem) => void;
}

export const MainFeed: React.FC<MainFeedProps> = ({ onSelectItem }) => {
  const { auctions, activeCategory, searchQuery, setSearchQuery, setActiveCategory, setIsCreateModalOpen, isLoading, loadError, refreshAuctions } = useAuction();
  const now = useNow();

  const [sortBy, setSortBy] = useState<'endingSoon' | 'mostBids' | 'newest' | 'priceHigh' | 'priceLow'>('endingSoon');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = Object.entries(filters).filter(([key, value]) => value && value !== DEFAULT_FILTERS[key as keyof MarketplaceFilters]).length;
  const [searches, setSearches] = useState<SavedSearch[]>(() => { try { const data = JSON.parse(localStorage.getItem('auction-searches') || '[]'); return Array.isArray(data) ? data.filter(s => s && typeof s.id === 'string' && typeof s.query === 'string' && s.filters) : []; } catch { return []; } });
  const update = (key: keyof MarketplaceFilters, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const persistSearches = (next: SavedSearch[]) => { setSearches(next); localStorage.setItem('auction-searches', JSON.stringify(next)); };
  const saveSearch = () => persistSearches([{ id: crypto.randomUUID(), query: searchQuery, category: activeCategory, filters: { ...filters }, sort: sortBy }, ...searches].slice(0, 8));
  const featured = auctions.find(item => item.featured) || auctions[0];
  const sellers = [...new Map(auctions.map(a => [a.seller.id, a.seller])).values()];
  // Filter items by activeCategory and searchQuery
  const filteredAuctions = auctions.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch && matchesFilters(item, filters, now);
  });

  // Sort items
  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    if (sortBy === 'endingSoon') {
      return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
    }
    if (sortBy === 'mostBids') {
      return b.bidCount - a.bidCount;
    }
    if (sortBy === 'newest') {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    }
    if (sortBy === 'priceHigh') {
      return b.currentBid - a.currentBid;
    }
    if (sortBy === 'priceLow') {
      return a.currentBid - b.currentBid;
    }
    return 0;
  });

  return (
    <main className="market-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      <section className="market-hero" aria-label="Discover the marketplace">
        <div className="hero-copy">
          <span className="hero-eyebrow"><span/> THE NEXT CHAPTER STARTS WITH YOU</span>
          <h1>Good things.<br/><em>Great finds.</em></h1>
          <p>Extraordinary objects, everyday discoveries. Find something you love and make it yours.</p>
          <div className="hero-actions">
            <button className="hero-explore" onClick={() => document.getElementById('marketplace-results')?.scrollIntoView({behavior:'smooth',block:'start'})}>Explore the marketplace<ArrowRight size={18}/></button>
            <button className="hero-sell" onClick={() => setIsCreateModalOpen(true)}>Have something to sell?<ArrowUpRight size={16}/></button>
          </div>
          <div className="hero-foot"><span>01 / DISCOVER</span><span>02 / BID</span><span>03 / MAKE IT YOURS</span></div>
        </div>
        <div className="hero-showcase">
          <span className="showcase-caption">OBJECTS WORTH A SECOND LOOK</span>
          {featured ? <button className="showcase-object" onClick={() => onSelectItem(featured)} aria-label={`Explore ${featured.title}`}><img src={featured.images[0]} alt={featured.title}/><span className="showcase-info"><span><small>{featured.category}</small><strong>{featured.title}</strong></span><span className="showcase-arrow"><ArrowUpRight size={23}/></span></span></button> : <div className="showcase-placeholder"><SearchX size={52} strokeWidth={1}/><span>Your next discovery awaits.</span></div>}
          <span className="showcase-stamp">A NEW HOME.<br/>A NEW STORY.</span>
        </div>
      </section>
      {/* Filter and Sorting Header Bar */}
      <div id="marketplace-results" className="results-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>{activeCategory === 'All' ? 'The marketplace' : activeCategory}</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {sortedAuctions.length} listings
            </span>
          </h2>
          {searchQuery && (
            <p className="text-xs text-slate-500 mt-0.5">
              Showing search results matching: "<strong className="text-slate-900">{searchQuery}</strong>"
            </p>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer shadow-xs"
          >
            <option value="endingSoon">Ending soonest</option>
            <option value="mostBids">Most bids</option>
            <option value="newest">Newly listed</option>
            <option value="priceHigh">Price: high to low</option>
            <option value="priceLow">Price: low to high</option>
          </select>
        </div>
      </div>

      <section className="market-filters bg-white border border-slate-200 rounded-2xl p-5 space-y-4" aria-label="Marketplace filters">
        <button type="button" className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="market-filter-fields" onClick={() => setFiltersOpen(value => !value)}><span><SlidersHorizontal size={17}/>Filters {filterCount > 0 && <b>{filterCount}</b>}</span><span>{filtersOpen ? 'Hide' : 'Refine your finds'}</span></button>
        <div id="market-filter-fields" className={`market-filter-fields space-y-4 ${filtersOpen ? 'is-open' : ''}`}>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={filters.endingWithin === '60'} onChange={e => update('endingWithin', e.target.checked ? '60' : '')}/> Ending within an hour</label>
        <div className="flex justify-between items-center"><h3 className="font-bold text-sm flex items-center gap-2"><SlidersHorizontal size={16}/> Find it your way</h3><button className="text-xs text-slate-500 flex gap-1 items-center" onClick={() => {setFilters(DEFAULT_FILTERS);setSearchQuery('');setActiveCategory('All');}}><RotateCcw size={13}/> Reset</button></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="text-xs text-slate-500">Minimum price<input aria-label="Minimum price" type="number" min="0" value={filters.minPrice} onChange={e => update('minPrice',e.target.value)} placeholder="$ 0" className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900"/></label>
          <label className="text-xs text-slate-500">Maximum price<input aria-label="Maximum price" type="number" min="0" value={filters.maxPrice} onChange={e => update('maxPrice',e.target.value)} placeholder="No limit" className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900"/></label>
          <label className="text-xs text-slate-500">Condition<select value={filters.condition} onChange={e => update('condition',e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900">{['All','Brand New','Like New','Used - Good','Refurbished','Vintage / Antique'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs text-slate-500">Buying format<select value={filters.buying} onChange={e => update('buying',e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900"><option value="All">All formats</option><option value="auction">Live auctions</option><option value="buyNow">Buy it now</option></select></label>
          <label className="text-xs text-slate-500">Availability<select value={filters.status} onChange={e => update('status',e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900"><option value="active">Active listings</option><option value="ended">Completed listings</option><option value="All">All listings</option></select></label>
          <label className="text-xs text-slate-500">Seller<select value={filters.seller} onChange={e => update('seller',e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 mt-1 text-slate-900"><option value="All">All sellers</option>{sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        </div>
        {filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice) && <p role="alert" className="text-xs text-rose-600">Maximum price must be greater than minimum price.</p>}
        <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3"><button onClick={saveSearch} className="flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-2 text-xs"><BookmarkPlus size={14}/> Save this search</button><span className="text-[10px] text-slate-400">Saved on this device</span>{searches.map(saved => <div className="flex items-center rounded-full bg-slate-100 text-xs" key={saved.id}><button className="px-3 py-2" onClick={() => {setSearchQuery(saved.query);setActiveCategory(saved.category);setFilters(saved.filters);setSortBy(saved.sort);}}>{saved.query || saved.category}{saved.filters.buying === 'buyNow' ? ' · Buy now' : ''}</button><button className="pr-2" aria-label="Remove saved search" onClick={() => persistSearches(searches.filter(s => s.id !== saved.id))}><X size={12}/></button></div>)}</div>
        </div>
      </section>
      {/* Grid of Auctions */}
      {loadError ? <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center"><p>{loadError}</p><button disabled={isLoading} onClick={() => void refreshAuctions()} className="mt-4 bg-slate-900 text-white rounded-xl px-4 py-2 disabled:opacity-50">{isLoading ? 'Retrying…' : 'Try again'}</button></div> : isLoading && auctions.length === 0 ? <p role="status" className="p-12 text-center text-slate-500">Loading listings…</p> : sortedAuctions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No auctions match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different category to view active listings.
          </p>
          <button onClick={() => { setFilters({ ...DEFAULT_FILTERS, status: 'All' }); setSearchQuery(''); setActiveCategory('All'); }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Browse all listings, including completed auctions</button>
        </div>
      ) : (
        <div className="auction-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAuctions.map(item => (
            <AuctionCard
              key={item.id}
              item={item}
              onSelect={onSelectItem}
            />
          ))}
        </div>
      )}

      {/* Bottom CTA Box */}
      <div className="seller-banner rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-xl font-black">Got something to sell?</h3>
          <p className="text-xs text-emerald-100 max-w-lg">
            List your items with a starting price, set your auction duration, and let buyers compete to give you the highest price!
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-white text-emerald-900 hover:bg-emerald-50 font-black px-6 py-3 rounded-2xl text-xs shadow-lg transition-transform hover:scale-105 shrink-0"
        >
          Create Auction Listing
        </button>
      </div>

    </main>
  );
};
