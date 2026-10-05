'use client';

import { useMemo, useState } from 'react';
import type { Invitee, Rsvp } from '@/lib/store/types';

type Stats = { invited: number; answered: number; attending: number; totalGuests: number; declined: number; unanswered: Invitee[] };
type Data = { invitees: Invitee[]; rsvps: Rsvp[]; stats: Stats };
type Filter = 'all' | 'yes' | 'no' | 'pending';

export default function Admin() {
  const [key, setKey] = useState(''); const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(''); const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all'); const [sort, setSort] = useState<'new' | 'old'>('new');
  const [editing, setEditing] = useState<Rsvp | null>(null); const [saving, setSaving] = useState(false);

  async function load(event: React.FormEvent) {
    event.preventDefault(); setError('');
    try {
      const response = await fetch('/api/rsvp', { headers: { 'x-admin-key': key }, cache: 'no-store' });
      if (!response.ok) { setError(response.status === 401 ? 'Доступ запрещён. Проверьте ключ организатора.' : 'Не удалось загрузить ответы.'); return; }
      setData(await response.json());
    } catch { setError('Не удалось подключиться к серверу.'); }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || !data) return;
    setSaving(true); setError('');
    const form = new FormData(event.currentTarget);
    const attending = form.get('attending') === 'yes';
    const max = data.invitees.find(item => item.id === editing.inviteeId)?.maxGuests ?? 3;
    const additional = attending ? Array.from({ length: Math.max(0, max - 1) }, (_, index) => String(form.get(`guest-${index + 1}`) || '').trim()).filter(Boolean) : [];
    const guests = attending ? [String(form.get('guest') || '').trim(), ...additional] : [];
    const payload = { id: editing.id, guest: String(form.get('guest') || ''), attending, guests };
    try {
      const response = await fetch('/api/rsvp', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Не удалось сохранить запись.');
      const refreshed = await fetch('/api/rsvp', { headers: { 'x-admin-key': key }, cache: 'no-store' });
      if (refreshed.ok) setData(await refreshed.json());
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить запись.'); }
    finally { setSaving(false); }
  }

  async function remove(rsvp: Rsvp) {
    if (!window.confirm(`Удалить ответ ${rsvp.guest}?`)) return;
    const response = await fetch('/api/rsvp', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify({ id: rsvp.id }) });
    if (!response.ok) { setError('Не удалось удалить ответ.'); return; }
    const refreshed = await fetch('/api/rsvp', { headers: { 'x-admin-key': key }, cache: 'no-store' });
    if (refreshed.ok) setData(await refreshed.json());
  }

  const visible = useMemo(() => {
    if (!data) return [];
    return data.rsvps.filter(item => {
      const guestNames = `${item.guest} ${item.guests.join(' ')}`.toLocaleLowerCase('ru');
      const matchesSearch = guestNames.includes(search.toLocaleLowerCase('ru'));
      const matchesFilter = filter === 'all' || (filter === 'yes' && item.attending) || (filter === 'no' && !item.attending);
      return matchesSearch && matchesFilter;
    }).sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (sort === 'old' ? 1 : -1));
  }, [data, search, filter, sort]);

  const pending = useMemo(() => data?.stats.unanswered.filter(item => item.name.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))) || [], [data, search]);
  const editMax = editing && data ? data.invitees.find(item => item.id === editing.inviteeId)?.maxGuests ?? 3 : 3;

  return <main className="admin-page">
    <a href="/" className="admin-back">← К приглашению</a><span className="eyebrow">СВАДЬБА АЯН & ҚАЗЫНА · 06.11.2026</span><h1>Ответы гостей</h1>
    {!data ? <form className="admin-login" onSubmit={load}><label htmlFor="key">Ключ организатора</label><input id="key" type="password" autoComplete="current-password" value={key} onChange={event => setKey(event.target.value)} required/><button className="submit-button">Показать ответы <span>↗</span></button>{error && <p className="form-error" role="alert">{error}</p>}</form> : <>
      <div className="stats"><div><small>Приглашено</small><strong>{data.stats.invited}</strong></div><div><small>Ответили</small><strong>{data.stats.answered}</strong></div><div><small>Придут</small><strong>{data.stats.attending}</strong></div><div><small>Всего гостей</small><strong>{data.stats.totalGuests}</strong></div><div><small>Не придут</small><strong>{data.stats.declined}</strong></div><div><small>Без ответа</small><strong>{data.stats.unanswered.length}</strong></div></div>
      <div className="admin-controls"><label className="search-control"><span>Поиск по именам</span><input type="search" placeholder="Приглашённый или гость" value={search} onChange={event => setSearch(event.target.value)} /></label><label><span>Ответ</span><select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">Все ответы</option><option value="yes">Придёт</option><option value="no">Не придёт</option><option value="pending">Без ответа</option></select></label><label><span>Сортировка</span><select value={sort} onChange={event => setSort(event.target.value as 'new' | 'old')}><option value="new">Сначала новые</option><option value="old">Сначала старые</option></select></label></div>
      {filter === 'pending' ? <div className="pending-list">{pending.map(invitee => <article className="response-card" key={invitee.id}><strong>{invitee.name}</strong><span>Нет ответа · до {invitee.maxGuests} гостей</span><small>Персональная ссылка: /?g={invitee.token}</small></article>)}{pending.length === 0 && <p className="empty-admin">Нет приглашённых без ответа.</p>}</div> : <>
        <div className="table-wrap"><table><thead><tr><th>Приглашённый</th><th>Ответ</th><th>Кол-во</th><th>Гости</th><th>Дата ответа</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td>{item.guest}{item.inviteeId ? '' : <small className="uninvited">Без приглашения</small>}</td><td>{item.attending ? 'Придёт' : 'Не придёт'}</td><td>{item.guests.length}</td><td>{item.guests.join(', ') || '—'}</td><td>{new Date(item.createdAt).toLocaleString('ru-RU')}</td><td><button className="edit-button" onClick={() => { setEditing(item); setError(''); }}>Изменить</button><button className="edit-button" onClick={() => remove(item)}>Удалить</button></td></tr>)}</tbody></table>{visible.length === 0 && <p className="empty-admin">Ответы не найдены.</p>}</div>
        <div className="response-cards">{visible.map(item => <article className="response-card" key={item.id}><div className="card-heading"><strong>{item.guest}</strong><span>{item.attending ? 'Придёт' : 'Не придёт'}</span></div>{!item.inviteeId && <p>Без приглашения</p>}<p><b>Гостей:</b> {item.guests.length}</p><p><b>Имена:</b> {item.guests.join(', ') || '—'}</p><p><b>Дата:</b> {new Date(item.createdAt).toLocaleString('ru-RU')}</p><button className="edit-button" onClick={() => { setEditing(item); setError(''); }}>Изменить</button><button className="edit-button" onClick={() => remove(item)}>Удалить</button></article>)}</div>
      </>}
    </>}
    {editing && <div className="edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><section className="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title"><button className="dialog-close" aria-label="Закрыть" onClick={() => setEditing(null)}>×</button><span className="eyebrow">КОРРЕКТИРОВКА RSVP</span><h2 id="edit-title">Изменить ответ</h2><form onSubmit={saveEdit}><label>Приглашённый<input name="guest" defaultValue={editing.guest} required maxLength={80}/></label><label>Ответ<select name="attending" defaultValue={editing.attending ? 'yes' : 'no'}><option value="yes">Придёт</option><option value="no">Не придёт</option></select></label>{editing.attending && Array.from({ length: Math.max(0, editMax - 1) }, (_, index) => <label key={index}>Гость {index + 2}<input name={`guest-${index + 2}`} defaultValue={editing.guests[index + 1] || ''} maxLength={80}/></label>)}{error && <p className="form-error">{error}</p>}<button className="submit-button" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить изменения'} <span>↗</span></button></form></section></div>}
  </main>;
}
