import type { Invitee } from './store/types.ts';

export type RsvpInput = { guest: string; attending: boolean; guests: string[] };
export type ValidationResult = { ok: true; value: RsvpInput } | { ok: false; error: string };

export function validateRsvp(input: unknown, maxGuests = 3): ValidationResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Проверьте заполненные поля.' };
  const value = input as Record<string, unknown>;
  const guest = typeof value.guest === 'string' ? value.guest.trim() : '';
  if (!guest || guest.length > 80) return { ok: false, error: 'Укажите имя приглашённого (до 80 символов).' };
  if (typeof value.attending !== 'boolean') return { ok: false, error: 'Выберите, сможете ли вы прийти.' };
  if (!Array.isArray(value.guests) || !value.guests.every(name => typeof name === 'string')) return { ok: false, error: 'Имена гостей указаны неверно.' };
  const guests = value.guests.map(name => name.trim());
  if (guests.some(name => !name || name.length > 80)) return { ok: false, error: 'Каждое имя должно содержать от 1 до 80 символов.' };
  if (!value.attending) return guests.length === 0 ? { ok: true, value: { guest, attending: false, guests: [] } } : { ok: false, error: 'Для отказа список гостей должен быть пустым.' };
  if (!Number.isInteger(maxGuests) || maxGuests < 1 || guests.length < 1 || guests.length > maxGuests) return { ok: false, error: `Можно указать от одного до ${maxGuests} гостей.` };
  const normalized = guests.map(name => name.toLocaleLowerCase('ru').replace(/\s+/g, ' '));
  if (new Set(normalized).size !== guests.length) return { ok: false, error: 'Имена гостей не должны повторяться.' };
  if (normalized[0] !== guest.toLocaleLowerCase('ru').replace(/\s+/g, ' ')) return { ok: false, error: 'Первым в списке укажите приглашённого.' };
  return { ok: true, value: { guest, attending: true, guests } };
}

export function maxGuestsFor(invitee: Invitee | null) { return invitee?.maxGuests ?? 3; }
