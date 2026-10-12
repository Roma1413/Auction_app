import { Router } from 'express';
import { register, login, getMe, googleLogin } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authMiddleware, getMe);

export default router;
