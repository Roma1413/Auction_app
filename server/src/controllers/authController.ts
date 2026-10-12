import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db.js';
import { JWT_SECRET, AuthRequest } from '../middleware/authMiddleware.js';

export async function googleLogin(req: Request, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ message: 'Google sign-in is not configured yet.' });
  if (typeof req.body.credential !== 'string' || !req.body.credential) {
    return res.status(400).json({ message: 'Google credential is required.' });
  }
  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: req.body.credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Google sign-in could not be verified. Please try again.' });
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return res.status(401).json({ message: 'A verified Google email is required.' });
  }
  try {
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: payload.email } });
      if (existing) {
        // Only link when Google is authoritative for ownership of this email.
        if (existing.googleId || !(payload.email.endsWith('@gmail.com') || payload.hd)) {
          return res.status(409).json({ message: 'Please sign in with your password for this existing account.' });
        }
        user = await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } });
      } else {
        user = await prisma.user.create({ data: {
          googleId: payload.sub, email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          ...(payload.picture ? { avatar: payload.picture } : {})
        } });
      }
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Could not sign in with Google. Please try again.' });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password and name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        watchlist: true,
        bids: { select: { auctionId: true }, distinct: ['auctionId'] }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance,
        watchlist: user.watchlist.map(w => w.auctionId),
        biddedItemIds: user.bids.map(b => b.auctionId)
      }
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
