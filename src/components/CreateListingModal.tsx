import React, { useRef, useState } from 'react';
import { X, Image as ImageIcon, Gavel, DollarSign, Clock, Camera } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import type { ItemCondition } from '../types/auction';
import { prepareProductPhoto } from '../utils/productPhoto';

interface CreateListingModalProps {
  onClose: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose }) => {
  const { createAuction } = useAuction();

  const [title, setTitle] = useState('');
  const [subtitle] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [condition, setCondition] = useState<ItemCondition>('Like New');
  const [startingPrice, setStartingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [buyItNowPrice, setBuyItNowPrice] = useState('');
  const [duration, setDuration] = useState('3d');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const choosePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try { setPhoto(await prepareProductPhoto(file)); setImageUrl(''); }
    catch (error) { setPhotoError((error as Error).message); }
    finally { setPhotoBusy(false); }
  };
  const [location] = useState('New York, NY, USA');
  const [description, setDescription] = useState('');

  // Sample preset images for quick selection
  const presets = [
    { label: 'Rolex Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000' },
    { label: 'Laptop', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000' },
    { label: 'Sports Car', url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000' },
    { label: 'Camera Lens', url: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?q=80&w=1000' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || photoBusy || !title.trim() || !startingPrice || !description.trim()) return;

    const startVal = parseFloat(startingPrice);
    const finalImg = photo || imageUrl || presets[0].url;

    // Calculate end time
    const now = new Date();
    let endTimeDate = new Date();

    if (duration === '5m') endTimeDate = new Date(now.getTime() + 5 * 60 * 1000);
    else if (duration === '1h') endTimeDate = new Date(now.getTime() + 60 * 60 * 1000);
    else if (duration === '1d') endTimeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    else if (duration === '3d') endTimeDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    else if (duration === '7d') endTimeDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setIsSubmitting(true);
    try { await createAuction({
      title,
      subtitle: subtitle || undefined,
      category,
      condition,
      startingPrice: startVal,
      reservePrice: reservePrice ? parseFloat(reservePrice) : undefined,
      buyItNowPrice: buyItNowPrice ? parseFloat(buyItNowPrice) : undefined,
      endTime: endTimeDate.toISOString(),
      images: [finalImg],
      description,
      location,
      shippingCost: 20
    }); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="listing-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="listing-dialog bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-bold">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Create New Auction Listing</h2>
              <p className="text-xs text-slate-400">Set minimum starting bid and timer to start selling</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close listing form"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="listing-form p-6 space-y-5">
          
          {/* Title & Subtitle */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sony WH-1000XM5 Wireless Headphones - Mint Condition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="Watches & Jewelry">Watches & Jewelry</option>
                <option value="Electronics">Electronics</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Collectibles & Art">Collectibles & Art</option>
                <option value="Gaming">Gaming</option>
                <option value="Music & Instruments">Music & Instruments</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Item Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Used - Good">Used - Good</option>
                <option value="Refurbished">Refurbished</option>
                <option value="Vintage / Antique">Vintage / Antique</option>
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Auction Pricing & Reserve
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Starting Bid ($) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="50"
                  min="0.01"
                  step="0.01"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reserve Price ($)
                </label>
                <input
                  type="number"
                  placeholder="Optional min"
                  min={startingPrice || '0.01'}
                  step="0.01"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Buy It Now Price ($)
                </label>
                <input
                  type="number"
                  placeholder="Optional fixed"
                  min={reservePrice || startingPrice || '0.01'}
                  step="0.01"
                  value={buyItNowPrice}
                  onChange={(e) => setBuyItNowPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Auction Duration */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Auction Duration
            </label>
            <div className="duration-options grid grid-cols-5 gap-2">
              {[
                { id: '5m', label: '5 Mins (Fast Test)' },
                { id: '1h', label: '1 Hour' },
                { id: '1d', label: '1 Day' },
                { id: '3d', label: '3 Days' },
                { id: '7d', label: '7 Days' }
              ].map(d => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all ${
                    duration === d.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Image URL & Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-violet-600" />
              Product photo
            </label>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={choosePhoto} className="hidden" aria-label="Take a product photo"/>
            <input ref={galleryInput} type="file" accept="image/*" onChange={choosePhoto} className="hidden" aria-label="Choose a product photo"/>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" disabled={photoBusy || isSubmitting} onClick={() => cameraInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-xs font-semibold"><Camera size={18}/>Take photo</button>
              <button type="button" disabled={photoBusy || isSubmitting} onClick={() => galleryInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-xs font-semibold"><ImageIcon size={18}/>Choose from photos</button>
            </div>
            {photoBusy && <p className="text-xs text-slate-500 mb-2" role="status">Preparing photo…</p>}
            {photoError && <p className="text-xs text-rose-600 mb-2" role="alert">{photoError}</p>}
            {(photo || imageUrl) && <div className="mb-3"><img src={photo || imageUrl} alt="Product photo preview" className="w-full max-h-52 object-contain rounded-xl bg-slate-50"/><button type="button" disabled={photoBusy || isSubmitting} onClick={() => { setPhoto(''); setImageUrl(''); setPhotoError(''); }} className="text-xs underline mt-2">Remove photo</button></div>}
            <p className="text-xs text-slate-500 mb-2">Take a photo on your phone, choose a picture, or paste an image link.</p>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setPhoto(''); }}
              disabled={photoBusy || isSubmitting}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden mb-2"
            />
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Or select sample image:</span>
              <div className="flex gap-1.5 overflow-x-auto">
                {presets.map(p => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => { setImageUrl(p.url); setPhoto(''); }}
                    disabled={photoBusy || isSubmitting}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded-md transition-colors shrink-0"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe item condition, accessories included, original packaging..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden"
            />
          </div>

          {/* Submit CTA Button */}
          <div className="listing-submit pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || photoBusy}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
            >
              {isSubmitting ? 'Publishing…' : 'Publish Live Auction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
