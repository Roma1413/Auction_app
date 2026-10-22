import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from the server directory, even when launched from the project root.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

export function validateDatabaseConfiguration(env: { DATABASE_URL?: string } = process.env): void {
  if (!env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is missing. Configure server/.env using server/.env.example, or set DATABASE_URL in the server environment. For local PostgreSQL, start Docker Desktop and run docker compose up -d postgres.');
  }
}
