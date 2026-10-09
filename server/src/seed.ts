import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.watchlist.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.auction.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Demo Seller Users
  const sellerRolex = await prisma.user.create({
    data: {
      email: 'seller.chronos@example.com',
      password: hashedPassword,
      name: 'Chronos Vault LTD',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      balance: 50000.0
    }
  });

  const sellerTech = await prisma.user.create({
    data: {
      email: 'seller.tech@example.com',
      password: hashedPassword,
      name: 'TechReserve Store',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      balance: 15000.0
    }
  });

  const sellerCars = await prisma.user.create({
    data: {
      email: 'seller.apex@example.com',
      password: hashedPassword,
      name: 'Apex Supercars Direct',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      balance: 200000.0
    }
  });

  // Main Demo User (Alex Rivera)
  const mainUser = await prisma.user.create({
    data: {
      email: 'alex@example.com',
      password: hashedPassword,
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      balance: 25000.0
    }
  });

  // Simulated Competitor Bidder
  const botBidder = await prisma.user.create({
    data: {
      email: 'bidder.vault@example.com',
      password: hashedPassword,
      name: 'vault_hunter99',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
      balance: 100000.0
    }
  });

  const now = new Date();

  // Helper date adders
  const addMins = (mins: number) => new Date(now.getTime() + mins * 60 * 1000);
  const addHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);

  // 1. Rolex Submariner (Ending in 15 mins for fast test!)
  const rolex = await prisma.auction.create({
    data: {
      title: 'Rolex Submariner Date 126610LN - 41mm Stainless Steel (2023 Full Set)',
      subtitle: 'Original Box, Papers, Factory Warranty until 2028',
      description: 'Mint condition Rolex Submariner Date reference 126610LN with black dial and black Cerachrom bezel. Purchased originally from an Authorized Dealer in late 2023.',
      category: 'Watches & Jewelry',
      condition: 'Like New',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1547996160-012745cc5876?q=80&w=1000&auto=format&fit=crop'
      ]),
      startingPrice: 9500,
      currentBid: 11850,
      buyItNowPrice: 14200,
      bidCount: 4,
      startTime: new Date(now.getTime() - 24 * 3600 * 1000),
      endTime: addMins(15),
      status: 'active',
      location: 'Geneva, Switzerland',
      shippingCost: 85,
      featured: true,
      specs: JSON.stringify({
        'Brand': 'Rolex',
        'Model': 'Submariner Date',
        'Reference': '126610LN',
        'Case Diameter': '41 mm',
        'Movement': 'Automatic Calibre 3235'
      }),
      sellerId: sellerRolex.id
    }
  });

  // Bids for Rolex
  await prisma.bid.create({
    data: {
      auctionId: rolex.id,
      bidderId: botBidder.id,
      bidderName: 'vault_hunter99',
      amount: 11850,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000)
    }
  });

  await prisma.bid.create({
    data: {
      auctionId: rolex.id,
      bidderId: mainUser.id,
      bidderName: 'Alex Rivera (You)',
      amount: 11200,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000)
    }
  });

  // 2. MacBook Pro M3 Max
  const macbook = await prisma.auction.create({
    data: {
      title: 'Apple MacBook Pro 16" M3 Max (64GB RAM, 2TB SSD) - Space Black',
      subtitle: '16-Core CPU, 40-Core GPU, Liquid Retina XDR Display',
      description: 'Barely used workstation laptop. Pristine condition with zero scratches. Includes original Apple MagSafe 3 charger and box.',
      category: 'Electronics',
      condition: 'Like New',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop'
      ]),
      startingPrice: 2200,
      currentBid: 2950,
      buyItNowPrice: 3400,
      bidCount: 2,
      startTime: new Date(now.getTime() - 12 * 3600 * 1000),
      endTime: addHours(3),
      status: 'active',
      location: 'San Jose, CA, United States',
      shippingCost: 35,
      featured: true,
      specs: JSON.stringify({
        'Processor': 'Apple M3 Max (16-Core)',
        'RAM': '64 GB Unified Memory',
        'Storage': '2 TB PCIe SSD'
      }),
      sellerId: sellerTech.id
    }
  });

  // 3. BMW M3 Competition
  await prisma.auction.create({
    data: {
      title: 'BMW M3 Competition xDrive (503 HP) Carbon Edition - Isle of Man Green',
      subtitle: 'Low Mileage: 4,800 miles, Carbon Ceramic Brakes',
      description: 'Stunning 2023 BMW M3 Competition in flagship Isle of Man Green metallic with full Kyalami Orange leather interior.',
      category: 'Vehicles',
      condition: 'Used - Good',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1000&auto=format&fit=crop'
      ]),
      startingPrice: 55000,
      currentBid: 68500,
      buyItNowPrice: 79000,
      bidCount: 15,
      startTime: new Date(now.getTime() - 48 * 3600 * 1000),
      endTime: addHours(28),
      status: 'active',
      location: 'Munich, Germany',
      shippingCost: 1200,
      featured: true,
      specs: JSON.stringify({
        'Year': '2023',
        'Engine': '3.0L Twin-Turbo Inline-6',
        'Horsepower': '503 HP'
      }),
      sellerId: sellerCars.id
    }
  });

  // Add Watchlist items for mainUser
  await prisma.watchlist.create({
    data: {
      userId: mainUser.id,
      auctionId: rolex.id
    }
  });

  await prisma.watchlist.create({
    data: {
      userId: mainUser.id,
      auctionId: macbook.id
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log(`Demo User Created: Email: alex@example.com | Password: password123`);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
