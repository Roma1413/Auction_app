export interface MarketplaceFilters {
  minPrice: string; maxPrice: string; condition: string; buying: string; status: string; seller: string; endingWithin?: string;
}
export const DEFAULT_FILTERS: MarketplaceFilters = { minPrice: '', maxPrice: '', condition: 'All', buying: 'All', status: 'active', seller: 'All' };
export function matchesFilters(item: { currentBid: number; condition: string; buyItNowPrice?: number; status: string; endTime: string; seller: { id: string } }, filters: MarketplaceFilters, now = Date.now()) {
  const active = item.status === 'active' && new Date(item.endTime).getTime() > now;
  const price = filters.buying === 'buyNow' ? item.buyItNowPrice ?? item.currentBid : item.currentBid;
  return (!filters.endingWithin || (active && new Date(item.endTime).getTime() <= now + Number(filters.endingWithin) * 60000)) && (!filters.minPrice || price >= Number(filters.minPrice)) && (!filters.maxPrice || price <= Number(filters.maxPrice)) && (filters.condition === 'All' || item.condition === filters.condition) && (filters.buying === 'All' || (filters.buying === 'buyNow' ? !!item.buyItNowPrice && active : active)) && (filters.status === 'All' || (filters.status === 'active' ? active : !active)) && (filters.seller === 'All' || item.seller.id === filters.seller);
}
