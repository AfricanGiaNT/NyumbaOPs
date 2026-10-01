// NEXT_PUBLIC_API_BASE_URL is the Nest server origin, without /api.
const origin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export const API_BASE_URL = `${origin}/api`;
