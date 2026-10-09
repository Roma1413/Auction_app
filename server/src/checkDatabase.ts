import { prisma } from './db.js';
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Database connected.');
  console.table(await prisma.$queryRaw`SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name IN ('Auction', 'Bid', 'Watchlist') ORDER BY tc.table_name, kcu.column_name`);
  console.log({ users: await prisma.user.count(), auctions: await prisma.auction.count(), bids: await prisma.bid.count(), watchlist: await prisma.watchlist.count() });
} catch { console.error('Database check failed. Check server/.env and database availability.'); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
