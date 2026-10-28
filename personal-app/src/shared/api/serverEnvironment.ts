import { env } from 'cloudflare:workers';

export const backendUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const neonAuthUrl = env.NEON_AUTH_BASE_URL?.replace(/\/+$/, '');
