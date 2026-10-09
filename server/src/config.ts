import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from the server directory, even when launched from the project root.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
