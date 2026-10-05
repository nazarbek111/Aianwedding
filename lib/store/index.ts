import type { RsvpStore } from './types.ts';
import { JsonRsvpStore } from './json-store.ts';

let store: RsvpStore | undefined;

export function getStore(): RsvpStore {
  if (store) return store;
  const adapter = process.env.STORAGE || 'json';
  if (adapter === 'json') return (store = new JsonRsvpStore());
  throw new Error(`Unsupported STORAGE adapter: ${adapter}`);
}
