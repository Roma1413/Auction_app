import { Router } from 'express';
import { toggleWatchlist, getNotifications, clearNotifications } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/watchlist/:auctionId', authMiddleware, toggleWatchlist);
router.get('/notifications', authMiddleware, getNotifications);
router.post('/notifications/clear', authMiddleware, clearNotifications);

export default router;
