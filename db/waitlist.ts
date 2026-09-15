import { env } from 'cloudflare:workers';
export async function saveEmail(email: string) {
  if (!env.DB) throw new Error('Waitlist unavailable');
  await env.DB.prepare('INSERT INTO waitlist (email, created_at, consent) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(email, new Date().toISOString(), 'launch-updates-v1').run();
}
