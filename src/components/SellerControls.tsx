import { useState } from 'react';
import type { AuctionItem } from '../types/auction';
import { useAuction } from '../context/useAuction';
import { formatPrice } from '../utils/timeFormat';

export function SellerControls({ item }: { item: AuctionItem }) {
  const { user, closeAuction } = useAuction();
  const [action, setAction] = useState<'cancel' | 'accept-highest' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewedBid, setReviewedBid] = useState<AuctionItem['bids'][number] | null>(null);
  if (!user.id || user.id !== item.seller.id || item.status !== 'active') return null;
  const highest = [...item.bids].sort((a, b) => b.amount - a.amount)[0];
  const changed = action === 'accept-highest' && highest?.id !== reviewedBid?.id;
  return <section className="seller-controls" aria-label="Seller controls">
    <h3>Manage your auction</h3>
    {!action ? <div className="seller-control-buttons">
      {highest && <button type="button" onClick={() => { setReviewedBid(highest); setMessage(''); setAction('accept-highest'); }}>Accept highest bid & end auction</button>}
      <button type="button" onClick={() => { setMessage(''); setAction('cancel'); }}>Cancel auction</button>
    </div> : <form onSubmit={async event => {
      event.preventDefault(); if (busy || changed) return;
      setBusy(true); setMessage('');
      try {
        const result = await closeAuction(item.id, action, reason, reviewedBid?.id);
        if (result.success) setAction(null); else setMessage(result.message);
      } finally { setBusy(false); }
    }}>
      {action === 'accept-highest' ? <>
        <p>Sell to <strong>{reviewedBid?.bidderName}</strong> for <strong>{formatPrice(reviewedBid?.amount || 0)}</strong> and end bidding now? All bidders will be notified. This cannot be undone.</p>
        {item.reservePrice && reviewedBid && reviewedBid.amount < item.reservePrice && <p>You are accepting a price below your reserve of {formatPrice(item.reservePrice)}.</p>}
        {changed && <p role="alert">A new highest bid arrived. Go back and review the new buyer and price.</p>}
      </> : <>
        <p>{highest ? 'Cancel only if the item is damaged or unavailable. Explain what happened; your reason will be visible on the listing and sent to all bidders.' : 'No bids have been placed. You can cancel this listing freely.'} This cannot be undone.</p>
        <label>Reason {highest ? '(required)' : '(optional)'}<textarea value={reason} onChange={event => setReason(event.target.value)} required={!!highest} minLength={highest ? 10 : undefined} maxLength={500} placeholder="Explain why the item is damaged or unavailable" rows={3}/></label>
      </>}
      {message && <p role="alert">{message}</p>}
      <div className="seller-control-buttons"><button type="submit" disabled={busy || changed}>{busy ? 'Please wait…' : action === 'accept-highest' ? 'Confirm sale & end auction' : 'Confirm cancellation'}</button><button type="button" disabled={busy} onClick={() => setAction(null)}>Go back</button></div>
    </form>}
  </section>;
}
