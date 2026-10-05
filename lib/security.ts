import { createHash, timingSafeEqual } from 'node:crypto';

const WINDOW_MS = 10 * 60 * 1000;
type Window = { startedAt: number; count: number };
const publicAttempts = new Map<string, Window>();
const adminFailures = new Map<string, Window>();

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || forwarded || 'unknown';
}

function consume(map: Map<string, Window>, key: string, limit: number) {
  const now = Date.now();
  map.forEach((value, ip) => { if (now - value.startedAt >= WINDOW_MS) map.delete(ip); });
  const current = map.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    map.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

export function allowPublicRsvp(request: Request) { return consume(publicAttempts, clientIp(request), 10); }
export function adminIsBlocked(request: Request) {
  const current = adminFailures.get(clientIp(request));
  if (!current) return false;
  if (Date.now() - current.startedAt >= WINDOW_MS) { adminFailures.delete(clientIp(request)); return false; }
  return current.count >= 5;
}
export function failAdminAttempt(request: Request) { consume(adminFailures, clientIp(request), 5); }
export function clearAdminFailures(request: Request) { adminFailures.delete(clientIp(request)); }

export function adminKeyMatches(provided: string | null, expected = process.env.RSVP_ADMIN_KEY) {
  const configured = Boolean(expected);
  const actualHash = createHash('sha256').update(provided || '').digest();
  const expectedHash = createHash('sha256').update(expected || 'unconfigured-admin-key').digest();
  return timingSafeEqual(actualHash, expectedHash) && configured && Boolean(provided);
}
