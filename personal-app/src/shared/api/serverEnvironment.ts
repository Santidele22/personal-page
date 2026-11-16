import { env } from 'cloudflare:workers';
import type { EdgeCacheStore } from './contentCache';

export const backendUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const neonAuthUrl = env.NEON_AUTH_BASE_URL?.replace(/\/+$/, '');
export const contentCacheKv = (env as unknown as { CONTENT_CACHE?: EdgeCacheStore }).CONTENT_CACHE;
