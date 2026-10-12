import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Helper to format Prisma auction object for API response
function formatAuction(auc: any) {
  return {
    ...auc,
    bids: (auc.bids || []).map((bid: any) => ({ ...bid, timestamp: bid.createdAt })),
    images: typeof auc.images === 'string' ? JSON.parse(auc.images) : auc.images,
    specs: typeof auc.specs === 'string' ? JSON.parse(auc.specs) : auc.specs,
    seller: auc.seller ? {
      id: auc.seller.id,
      name: auc.seller.name,
      avatar: auc.seller.avatar,
      rating: 0,
      feedbackCount: 0,
      verified: false,
      joinedYear: new Date(auc.seller.createdAt).getFullYear()
    } : undefined
  };
}

export async function getAuctions(req: Request, res: Response) {
  try {
    const { category, search, sort, status } = req.query;

    const where: any = {};
    if (category && category !== 'All') {
      where.category = String(category);
    }
    if (status) {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { category: { contains: String(search) } }
      ];
    }

    let orderBy: any = { endTime: 'asc' };
    if (sort === 'mostBids') orderBy = { bidCount: 'desc' };
    if (sort === 'newest') orderBy = { startTime: 'desc' };
    if (sort === 'priceHigh') orderBy = { currentBid: 'desc' };
    if (sort === 'priceLow') orderBy = { currentBid: 'asc' };

    const auctions = await prisma.auction.findMany({
      where,
      orderBy,
      include: {
        seller: true,
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    const formatted = auctions.map(formatAuction);
    return res.json(formatted);
  } catch (err) {
    console.error('getAuctions error:', err);
    return res.status(500).json({ message: 'Error fetching auctions' });
  }
}

export async function getAuctionById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        seller: true,
        bids: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    // Increment view count asynchronously
    prisma.auction.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

    return res.json(formatAuction(auction));
  } catch (err) {
    console.error('getAuctionById error:', err);
    return res.status(500).json({ message: 'Error fetching auction details' });
  }
}

export async function createAuction(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const {
      title,
      subtitle,
      description,
      category,
      condition,
      images,
      startingPrice,
      reservePrice,
      buyItNowPrice,
      endTime,
      location,
      shippingCost,
      specs
    } = req.body;

    if (!title || !description || !category || !startingPrice || !endTime) {
      return res.status(400).json({ message: 'Missing required auction fields' });
    }

    const startVal = parseFloat(startingPrice);
    if (!Number.isFinite(startVal) || startVal <= 0 ||
        !Number.isFinite(new Date(endTime).getTime()) || new Date(endTime) <= new Date() ||
        (reservePrice != null && (!Number.isFinite(Number(reservePrice)) || Number(reservePrice) < startVal)) ||
        (buyItNowPrice != null && (!Number.isFinite(Number(buyItNowPrice)) || Number(buyItNowPrice) < Math.max(startVal, Number(reservePrice) || 0))) ||
        (shippingCost != null && (!Number.isFinite(Number(shippingCost)) || Number(shippingCost) < 0))) {
      return res.status(400).json({ message: 'Use positive prices, a future end time, and reserve/buy-now prices at least as high as the starting price.' });
    }

    const newAuction = await prisma.auction.create({
      data: {
        title,
        subtitle: subtitle || null,
        description,
        category,
        condition: condition || 'Brand New',
        images: JSON.stringify(Array.isArray(images) ? images : [images]),
        startingPrice: startVal,
        currentBid: startVal,
        reservePrice: reservePrice ? parseFloat(reservePrice) : null,
        buyItNowPrice: buyItNowPrice ? parseFloat(buyItNowPrice) : null,
        startTime: new Date(),
        endTime: new Date(endTime),
        status: 'active',
        location: location || 'New York, NY, USA',
        shippingCost: shippingCost != null ? Number(shippingCost) : 20.0,
        specs: specs ? JSON.stringify(specs) : null,
        sellerId: userId
      },
      include: {
        seller: true,
        bids: true
      }
    });

    return res.status(201).json(formatAuction(newAuction));
  } catch (err) {
    console.error('createAuction error:', err);
    return res.status(500).json({ message: 'Error creating auction listing' });
  }
}

export async function placeBid(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = String(req.params.id);
    const { amount } = req.body;

    const bidAmount = parseFloat(amount);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) return res.status(400).json({ message: 'Invalid bid amount' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Use Prisma transaction for ACID integrity
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.auction.findUnique({
        where: { id },
        include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }
      });

      if (!target) throw new Error('Auction not found');
      if (target.status !== 'active' || new Date(target.endTime).getTime() <= Date.now()) {
        throw new Error('This auction has already ended');
      }

      if (bidAmount <= target.currentBid) {
        throw new Error(`Your bid must be higher than the current bid ($${target.currentBid.toLocaleString()})`);
      }

      if (target.sellerId === userId) throw new Error('You cannot bid on your own auction');
      // Record bid
      const newBid = await tx.bid.create({
        data: {
          auctionId: target.id,
          bidderId: user.id,
          bidderName: user.name,
          amount: bidAmount
        }
      });

      const changed = await tx.auction.updateMany({ where: { id: target.id, currentBid: target.currentBid, status: 'active', endTime: { gt: new Date() } }, data: { currentBid: bidAmount, bidCount: { increment: 1 } } });
      if (changed.count !== 1) throw new Error('Auction changed. Refresh and try again');
      // Load auction current bid and count
      const updatedAuction = await tx.auction.findUniqueOrThrow({
        where: { id: target.id },
        include: {
          seller: true,
          bids: { orderBy: { createdAt: 'desc' } }
        }
      });

      return { auction: updatedAuction, bid: newBid };
    });

    req.app.get('io')?.emit('bid-updated', { auctionId: id, currentBid: result.auction.currentBid, bidCount: result.auction.bidCount, newBid: { ...result.bid, timestamp: result.bid.createdAt }, auction: formatAuction(result.auction) });
    return res.json({
      success: true,
      message: 'Bid placed successfully!',
      auction: formatAuction(result.auction),
      bid: result.bid
    });

  } catch (err: any) {
    console.error('placeBid error:', err);
    return res.status(400).json({ message: err.message || 'Failed to place bid' });
  }
}

export async function buyItNow(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = String(req.params.id);

    const updatedAuction = await prisma.$transaction(async tx => {
      const target = await tx.auction.findUniqueOrThrow({ where: { id } });
      if (target.sellerId === userId) throw new Error('You cannot purchase your own auction');
      if (!target.buyItNowPrice || target.status !== 'active' || target.endTime <= new Date()) throw new Error('Item unavailable for purchase');
      const changed = await tx.auction.updateMany({ where: { id, status: 'active', currentBid: target.currentBid, endTime: { gt: new Date() } }, data: { status: 'sold', currentBid: target.buyItNowPrice } });
      if (changed.count !== 1) throw new Error('Auction changed. Refresh and try again');
      await tx.bid.create({ data: { auctionId: id, bidderId: userId, bidderName: (await tx.user.findUniqueOrThrow({ where: { id: userId } })).name, amount: target.buyItNowPrice } });
      return tx.auction.update({ where: { id }, data: { bidCount: { increment: 1 } }, include: { seller: true, bids: { orderBy: { createdAt: 'desc' } } } });
    });
    req.app.get('io')?.emit('auction-ended', { auctionId: id, title: updatedAuction.title, status: 'sold', winner: updatedAuction.bids[0] });

    return res.json({
      success: true,
      message: 'Item purchased!',
      auction: formatAuction(updatedAuction)
    });
  } catch (err) {
    console.error('buyItNow error:', err);
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Error purchasing item' });
  }
}

export async function closeAuction(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = String(req.params.id);
  const { action, reason, expectedBidId } = req.body;
  if (action !== 'accept-highest' && action !== 'cancel') return res.status(400).json({ message: 'Invalid seller action' });
  try {
    const auction = await prisma.$transaction(async tx => {
      const target = await tx.auction.findUnique({ where: { id }, include: { bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }] } } });
      if (!target) throw new Error('Auction not found');
      if (target.sellerId !== userId) throw new Error('Only the seller can end this auction');
      if (target.status !== 'active' || target.endTime <= new Date()) throw new Error('This auction has already ended');
      const highest = target.bids[0];
      const accepting = action === 'accept-highest';
      if (accepting && (!highest || expectedBidId !== highest.id)) throw new Error('The highest bid changed. Refresh and review the buyer and price again.');
      const cancellationReason = typeof reason === 'string' ? reason.trim() : '';
      if (!accepting && highest && (cancellationReason.length < 10 || cancellationReason.length > 500)) throw new Error('Explain why the item is damaged or unavailable (10–500 characters).');
      if (!accepting && cancellationReason.length > 500) throw new Error('Keep the cancellation reason within 500 characters.');
      const changed = await tx.auction.updateMany({
        where: { id, sellerId: userId, status: 'active', currentBid: target.currentBid, bidCount: target.bidCount, endTime: { gt: new Date() } },
        data: { status: accepting ? 'sold' : 'cancelled', endTime: new Date(), closureType: accepting ? 'accepted-highest' : 'seller-cancelled', winnerId: accepting ? highest.bidderId : null, cancellationReason: accepting ? null : cancellationReason || 'Cancelled by the seller before any bids.' }
      });
      if (changed.count !== 1) throw new Error('Auction changed. Refresh and review it again.');
      const message = accepting
        ? `The seller ended "${target.title}" early and accepted ${highest.bidderName}'s highest bid of $${highest.amount.toLocaleString()}.`
        : `The seller cancelled "${target.title}". Reason: ${cancellationReason || 'Cancelled before any bids.'} No winning bid or purchase was recorded.`;
      const recipients = [...new Set(target.bids.map(bid => bid.bidderId))];
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, message })) });
      return tx.auction.findUniqueOrThrow({ where: { id }, include: { seller: true, bids: { orderBy: { createdAt: 'desc' } } } });
    });
    req.app.get('io')?.emit('auction-ended', { auctionId: id, title: auction.title, status: auction.status, auction: formatAuction(auction), winner: auction.status === 'sold' ? auction.bids.find(bid => bid.bidderId === auction.winnerId) : null });
    return res.json({ success: true, message: auction.status === 'sold' ? 'Highest bid accepted. Auction sold.' : 'Auction cancelled.', auction: formatAuction(auction) });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Could not end auction' });
  }
}
