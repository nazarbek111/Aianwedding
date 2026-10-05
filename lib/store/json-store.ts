import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EditableRsvp, Invitee, NewInvitee, NewRsvp, Rsvp, RsvpStore } from './types.ts';

type State = { invitees: Invitee[]; rsvps: Rsvp[] };
const file = path.join(process.cwd(), 'data', 'rsvps.json');
let writeQueue = Promise.resolve();

function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function migrateLegacy(value: unknown): State {
  if (Array.isArray(value)) {
    const rsvps: Rsvp[] = value.flatMap((row: Record<string, unknown>) => {
      if (typeof row.guest !== 'string' || typeof row.attending !== 'boolean') return [];
      const legacyNames = typeof row.names === 'string' ? row.names : '';
      const guests = row.attending
        ? Array.from(new Set(legacyNames.split(/[,;\n]/).map(name => name.trim()).filter(Boolean)))
        : [];
      if (row.attending && guests.length === 0) guests.push(row.guest.trim());
      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
      return [{ id: typeof row.id === 'string' ? row.id : randomUUID(), inviteeId: null, guest: row.guest.trim(), attending: row.attending, guests, createdAt, updatedAt: createdAt }];
    });
    return { invitees: [], rsvps };
  }
  if (value && typeof value === 'object') {
    const state = value as Partial<State>;
    return { invitees: Array.isArray(state.invitees) ? state.invitees : [], rsvps: Array.isArray(state.rsvps) ? state.rsvps : [] };
  }
  return { invitees: [], rsvps: [] };
}

async function readState(): Promise<State> {
  try { return migrateLegacy(JSON.parse(await readFile(file, 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { invitees: [], rsvps: [] }; throw error; }
}

async function writeState(state: State) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
  await rename(temporary, file);
}

export class JsonRsvpStore implements RsvpStore {
  async listInvitees() { return (await readState()).invitees; }
  async getInviteeByToken(token: string) { return (await readState()).invitees.find(invitee => invitee.token === token) || null; }
  async addInvitees(invitees: NewInvitee[]) {
    return serializeWrite(async () => {
      const state = await readState();
      const added = invitees.map(invitee => ({ ...invitee, id: randomUUID() }));
      state.invitees.push(...added);
      await writeState(state);
      return added;
    });
  }
  async listRsvps() { return (await readState()).rsvps; }
  async getRsvpByInvitee(inviteeId: string) { return (await readState()).rsvps.find(rsvp => rsvp.inviteeId === inviteeId) || null; }
  async upsertRsvp(input: NewRsvp) {
    return serializeWrite(async () => {
      const state = await readState();
      const existingIndex = input.inviteeId ? state.rsvps.findIndex(rsvp => rsvp.inviteeId === input.inviteeId) : -1;
      const now = new Date().toISOString();
      if (existingIndex >= 0) {
        const existing = state.rsvps[existingIndex];
        const updated = { ...existing, ...input, updatedAt: now };
        state.rsvps[existingIndex] = updated;
        await writeState(state);
        return updated;
      }
      const created: Rsvp = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
      state.rsvps.push(created);
      await writeState(state);
      return created;
    });
  }
  async updateRsvp(id: string, changes: EditableRsvp) {
    return serializeWrite(async () => {
      const state = await readState();
      const index = state.rsvps.findIndex(rsvp => rsvp.id === id);
      if (index < 0) return null;
      const updated = { ...state.rsvps[index], ...changes, updatedAt: new Date().toISOString() };
      state.rsvps[index] = updated;
      await writeState(state);
      return updated;
    });
  }
  async deleteRsvp(id: string) {
    return serializeWrite(async () => {
      const state = await readState();
      const next = state.rsvps.filter(rsvp => rsvp.id !== id);
      if (next.length === state.rsvps.length) return false;
      state.rsvps = next;
      await writeState(state);
      return true;
    });
  }
}
