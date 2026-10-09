import type { AuctionItem } from '../types/auction';

const now = new Date();

// Helper to set future/past date
const addMinutes = (mins: number) => new Date(now.getTime() + mins * 60 * 1000).toISOString();
const addHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

export const INITIAL_AUCTIONS: AuctionItem[] = [
  {
    id: 'auc-1',
    title: 'Rolex Submariner Date 126610LN - 41mm Stainless Steel (2023 Full Set)',
    subtitle: 'Original Box, Papers, Factory Warranty until 2028',
    description: 'Mint condition Rolex Submariner Date reference 126610LN with black dial and black Cerachrom bezel. Purchased originally from an Authorized Dealer in late 2023. Comes complete with inner/outer boxes, green chronometer hangtag, white serial tag, bezel protector, booklet, and guarantee card.',
    category: 'Watches & Jewelry',
    condition: 'Like New',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547996160-012745cc5876?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-101',
      name: 'Chronos Vault LTD',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      rating: 99.8,
      feedbackCount: 1420,
      verified: true,
      joinedYear: 2018
    },
    startingPrice: 9500,
    currentBid: 11850,
    buyItNowPrice: 14200,
    bidCount: 18,
    startTime: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    endTime: addMinutes(14), // Ending VERY SOON for instant demo!
    status: 'active',
    location: 'Geneva, Switzerland (Insured Express Shipping)',
    shippingCost: 85,
    featured: true,
    viewsCount: 1840,
    specs: {
      'Brand': 'Rolex',
      'Model': 'Submariner Date',
      'Reference': '126610LN',
      'Case Diameter': '41 mm',
      'Movement': 'Automatic Calibre 3235',
      'Water Resistance': '300m / 1000ft'
    },
    bids: [
      { id: 'b-101', auctionId: 'auc-1', bidderName: 'm***8', bidderId: 'u-88', amount: 11850, timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString() },
      { id: 'b-100', auctionId: 'auc-1', bidderName: 'j***k', bidderId: 'u-42', amount: 11600, timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString() },
      { id: 'b-99', auctionId: 'auc-1', bidderName: 'v***0', bidderId: 'u-19', amount: 11200, timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString() },
      { id: 'b-98', auctionId: 'auc-1', bidderName: 'm***8', bidderId: 'u-88', amount: 10800, timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'auc-2',
    title: 'Apple MacBook Pro 16" M3 Max (64GB RAM, 2TB SSD) - Space Black',
    subtitle: '16-Core CPU, 40-Core GPU, Liquid Retina XDR Display',
    description: 'Barely used workstation laptop. Pristine condition with zero scratches. Includes original Apple MagSafe 3 charger, braided black cable, and original box. AppleCare+ active until December 2026.',
    category: 'Electronics',
    condition: 'Like New',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-102',
      name: 'TechReserve Store',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      rating: 100,
      feedbackCount: 512,
      verified: true,
      joinedYear: 2020
    },
    startingPrice: 2200,
    currentBid: 2950,
    buyItNowPrice: 3400,
    bidCount: 24,
    startTime: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    endTime: addHours(3),
    status: 'active',
    location: 'San Jose, CA, United States',
    shippingCost: 35,
    featured: true,
    viewsCount: 2110,
    specs: {
      'Processor': 'Apple M3 Max (16-Core)',
      'Memory': '64 GB Unified Memory',
      'Storage': '2 TB PCIe NVMe SSD',
      'Screen Size': '16.2 inch Mini-LED',
      'Color': 'Space Black'
    },
    bids: [
      { id: 'b-203', auctionId: 'auc-2', bidderName: 'a***p', bidderId: 'u-12', amount: 2950, timestamp: new Date(now.getTime() - 8 * 60 * 1000).toISOString() },
      { id: 'b-202', auctionId: 'auc-2', bidderName: 'd***x', bidderId: 'u-55', amount: 2800, timestamp: new Date(now.getTime() - 32 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'auc-3',
    title: 'BMW M3 Competition xDrive (503 HP) Carbon Edition - Isle of Man Green',
    subtitle: 'Low Mileage: 4,800 miles, Carbon Ceramic Brakes, Kyalami Orange Interior',
    description: 'Stunning 2023 BMW M3 Competition in flagship Isle of Man Green metallic with full Kyalami Orange leather interior. Carbon fiber exterior package, M Carbon bucket seats, Harman Kardon audio system, Executive Package. No accidents, single owner, stored in heated garage.',
    category: 'Vehicles',
    condition: 'Used - Good',
    images: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-103',
      name: 'Apex Supercars Direct',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      rating: 98.9,
      feedbackCount: 89,
      verified: true,
      joinedYear: 2019
    },
    startingPrice: 55000,
    currentBid: 68500,
    buyItNowPrice: 79000,
    bidCount: 31,
    startTime: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
    endTime: addHours(28),
    status: 'active',
    location: 'Munich, Germany',
    shippingCost: 1200,
    featured: true,
    viewsCount: 5490,
    specs: {
      'Year': '2023',
      'Engine': '3.0L Twin-Turbo Inline-6',
      'Horsepower': '503 HP',
      'Transmission': '8-Speed Sport Automatic',
      'Drivetrain': 'xDrive All-Wheel Drive'
    },
    bids: [
      { id: 'b-302', auctionId: 'auc-3', bidderName: 'k***7', bidderId: 'u-99', amount: 68500, timestamp: new Date(now.getTime() - 4 * 3600 * 1000).toISOString() },
      { id: 'b-301', auctionId: 'auc-3', bidderName: 'b***2', bidderId: 'u-31', amount: 67000, timestamp: new Date(now.getTime() - 10 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: 'auc-4',
    title: '1999 Pokémon 1st Edition Shadowless Charizard Holo #4 - PSA 9 Mint',
    subtitle: 'Graded & Encapsulated by PSA with Security Verification Hologram',
    description: 'Iconic Holy Grail of Trading Cards! Original 1999 Base Set 1st Edition Shadowless Charizard Holographic card graded PSA 9 Mint. Crystal clear slab with flawless centering and vibrant color.',
    category: 'Collectibles & Art',
    condition: 'Vintage / Antique',
    images: [
      'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-104',
      name: 'Grail Vault Collectibles',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
      rating: 99.9,
      feedbackCount: 3890,
      verified: true,
      joinedYear: 2015
    },
    startingPrice: 12000,
    currentBid: 16400,
    buyItNowPrice: 21000,
    bidCount: 22,
    startTime: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    endTime: addHours(4),
    status: 'active',
    location: 'Tokyo, Japan (Special Security Courier)',
    shippingCost: 150,
    featured: true,
    viewsCount: 3820,
    specs: {
      'Card Name': 'Charizard Holo #4',
      'Set': '1999 Base Set (1st Edition)',
      'Grade': 'PSA 9 MINT',
      'Certification #': '74920184'
    },
    bids: [
      { id: 'b-401', auctionId: 'auc-4', bidderName: 'p***k', bidderId: 'u-77', amount: 16400, timestamp: new Date(now.getTime() - 1 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: 'auc-5',
    title: 'Sony PlayStation 5 Pro Console (2TB Digital Edition + DualSense Edge Controller)',
    subtitle: 'Brand New Sealed in Box with Receipt',
    description: 'Official PS5 Pro console package with advanced AI-driven PSSR upscaling, 2TB high-speed storage, and Wi-Fi 7. Comes paired with the PS5 DualSense Edge wireless controller.',
    category: 'Gaming',
    condition: 'Brand New',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-105',
      name: 'NextGen Gaming',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      rating: 97.5,
      feedbackCount: 210,
      verified: true,
      joinedYear: 2022
    },
    startingPrice: 650,
    currentBid: 820,
    buyItNowPrice: 950,
    bidCount: 14,
    startTime: new Date(now.getTime() - 10 * 3600 * 1000).toISOString(),
    endTime: addDays(2),
    status: 'active',
    location: 'London, United Kingdom',
    shippingCost: 25,
    specs: {
      'Brand': 'Sony Interactive Entertainment',
      'Model': 'PS5 Pro (CFI-7000)',
      'Storage': '2TB SSD',
      'Includes': 'DualSense Edge Controller + HDMI 2.1 Cable'
    },
    bids: [
      { id: 'b-501', auctionId: 'auc-5', bidderName: 'g***m', bidderId: 'u-101', amount: 820, timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'auc-6',
    title: 'Gibson Custom Shop 1959 Les Paul Standard Reissue VOS - Dark Burst',
    subtitle: 'Hand-selected Flame Maple Top, Custombucker Pickups, Lifton Case',
    description: 'The pinnacle of Gibson craftsmanship! 2024 Custom Shop 59 Reissue in dark burst VOS finish. Perfectly balanced 8.2 lbs, 1-piece solid mahogany body, hide glue construction, and original Lifton hardshell case with Certificate of Authenticity.',
    category: 'Music & Instruments',
    condition: 'Brand New',
    images: [
      'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?q=80&w=1000&auto=format&fit=crop'
    ],
    seller: {
      id: 'seller-106',
      name: 'Vintage Tone Guitars',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
      rating: 100,
      feedbackCount: 740,
      verified: true,
      joinedYear: 2017
    },
    startingPrice: 4800,
    currentBid: 5600,
    buyItNowPrice: 6500,
    bidCount: 9,
    startTime: new Date(now.getTime() - 36 * 3600 * 1000).toISOString(),
    endTime: addHours(6),
    status: 'active',
    location: 'Nashville, TN, United States',
    shippingCost: 75,
    specs: {
      'Body Material': '1-Piece Solid Lightweight Mahogany',
      'Top Material': '2-Piece Figured Maple',
      'Neck Profile': '59 Medium C-Shape',
      'Pickups': 'Custombucker Alnico III (Unpotted)'
    },
    bids: [
      { id: 'b-601', auctionId: 'auc-6', bidderName: 'r***x', bidderId: 'u-44', amount: 5600, timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString() }
    ]
  }
];
