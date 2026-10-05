import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyError } from '@/lib/http';
import { calculateStats } from '@/lib/stats';
import { adminIsBlocked, adminKeyMatches, allowPublicRsvp, clearAdminFailures, failAdminAttempt } from '@/lib/security';
import { getStore } from '@/lib/store';
import { validateRsvp } from '@/lib/validation';
import type { Invitee } from '@/lib/store/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers: { ...noStore, ...headers } });
}

function authorizeAdmin(request: NextRequest): NextResponse | null {
  if (adminIsBlocked(request)) return jsonError('Слишком много неудачных попыток. Повторите через 10 минут.', 429);
  if (!adminKeyMatches(request.headers.get('x-admin-key'))) {
    failAdminAttempt(request);
    return jsonError('Доступ запрещён.', 401);
  }
  clearAdminFailures(request);
  return null;
}

async function parseBody(request: NextRequest) {
  try { return await readJsonBody<Record<string, unknown>>(request); }
  catch (error) {
    if (error instanceof RequestBodyError) return error.status === 413 ? jsonError('Размер запроса превышает допустимый.', 413) : jsonError('Некорректный запрос.', 400);
    return jsonError('Некорректный запрос.', 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    const store = getStore();
    const token = request.nextUrl.searchParams.get('token');
    if (token) {
      const invitee = await store.getInviteeByToken(token);
      if (!invitee) return jsonError('Приглашение не найдено.', 404);
      const rsvp = await store.getRsvpByInvitee(invitee.id);
      return NextResponse.json({ invitee, rsvp }, { headers: noStore });
    }
    const denied = authorizeAdmin(request);
    if (denied) return denied;
    const [invitees, rsvps] = await Promise.all([store.listInvitees(), store.listRsvps()]);
    return NextResponse.json({ invitees, rsvps, stats: calculateStats(invitees, rsvps) }, { headers: noStore });
  } catch {
    return jsonError('Не удалось получить ответы.', 500);
  }
}

export async function POST(request: NextRequest) {
  if (!allowPublicRsvp(request)) return jsonError('Слишком много отправок. Попробуйте позже.', 429);
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true }, { headers: noStore });
  try {
    const store = getStore();
    const token = typeof body.token === 'string' ? body.token : '';
    const invitee: Invitee | null = token ? await store.getInviteeByToken(token) : null;
    if (token && !invitee) return jsonError('Приглашение не найдено.', 404);
    const validation = validateRsvp(body, invitee?.maxGuests ?? 3);
    if (!validation.ok) return jsonError(validation.error, 400);
    const rsvp = await store.upsertRsvp({ ...validation.value, inviteeId: invitee?.id ?? null });
    return NextResponse.json({ ok: true, rsvp }, { headers: noStore });
  } catch {
    return jsonError('Не удалось сохранить ответ.', 500);
  }
}

export async function PUT(request: NextRequest) {
  const denied = authorizeAdmin(request);
  if (denied) return denied;
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const store = getStore();
    const id = typeof body.id === 'string' ? body.id : '';
    const existing = (await store.listRsvps()).find(rsvp => rsvp.id === id);
    if (!existing) return jsonError('Запись не найдена.', 404);
    const invitee = existing.inviteeId ? (await store.listInvitees()).find(item => item.id === existing.inviteeId) || null : null;
    const validation = validateRsvp(body, invitee?.maxGuests ?? 3);
    if (!validation.ok) return jsonError(validation.error, 400);
    const updated = await store.updateRsvp(id, { ...validation.value, inviteeId: existing.inviteeId });
    if (!updated) return jsonError('Запись не найдена.', 404);
    return NextResponse.json({ rsvp: updated }, { headers: noStore });
  } catch {
    return jsonError('Не удалось изменить запись.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const denied = authorizeAdmin(request);
  if (denied) return denied;
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  try {
    const deleted = await getStore().deleteRsvp(typeof body.id === 'string' ? body.id : '');
    return deleted ? NextResponse.json({ ok: true }, { headers: noStore }) : jsonError('Запись не найдена.', 404);
  } catch {
    return jsonError('Не удалось удалить запись.', 500);
  }
}
