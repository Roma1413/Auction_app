import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db.js';

import authRoutes from './routes/authRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { setupSocketHandlers } from './socket.js';
import { startAuctionScheduler } from './services/schedulerService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for web client
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', message: 'Database connection failed' });
  }
});

// Configure Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Setup WebSocket Handlers
setupSocketHandlers(io);

// Start Background Job Scheduler for ended auctions
startAuctionScheduler(io);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Auction Backend Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server active on ws://localhost:${PORT}`);
});
