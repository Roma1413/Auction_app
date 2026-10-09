import { Router } from 'express';
import { toggleWatchlist } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/watchlist/:auctionId', authMiddleware, toggleWatchlist);

export default router;
