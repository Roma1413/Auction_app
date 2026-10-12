import express, { type ErrorRequestHandler } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
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

app.use(express.json({ limit: '1mb' }));

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

// One production origin serves the app, API, and live updates over HTTPS.
app.use('/api', (_req, res) => { res.status(404).json({ message: 'API route not found' }); });
const apiErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (!req.path.startsWith('/api/')) return next(error);
  const malformedBody = error instanceof SyntaxError && 'body' in error;
  const tooLarge = error?.type === 'entity.too.large';
  res.status(tooLarge ? 413 : malformedBody ? 400 : 500).json({ message: tooLarge ? 'The listing is too large. Use a smaller photo.' : malformedBody ? 'Invalid request body. Please refresh and try again.' : 'Server error. Check the listing status before trying again.' });
};
app.use(apiErrorHandler);
if (process.env.NODE_ENV === 'production') {
  const frontend = fileURLToPath(new URL('../../dist/', import.meta.url));
  app.use(express.static(frontend, {
    setHeaders(res, path) {
      if (path.endsWith('sw.js') || path.endsWith('index.html') || path.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (path.endsWith('manifest.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io') || req.path.split('/').pop()?.includes('.')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.sendFile('index.html', { root: frontend });
  });
}

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
