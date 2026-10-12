import { Router } from 'express';
import { 
  getAuctions, 
  getAuctionById, 
  createAuction, 
  placeBid, 
  buyItNow,
  closeAuction
} from '../controllers/auctionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getAuctions);
router.get('/:id', getAuctionById);
router.post('/', authMiddleware, createAuction);
router.post('/:id/bid', authMiddleware, placeBid);
router.post('/:id/buy-now', authMiddleware, buyItNow);
router.post('/:id/close', authMiddleware, closeAuction);

export default router;
