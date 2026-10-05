'use client';

import { useEffect, useState } from 'react';
import { validateRsvp } from '@/lib/validation';
import type { Invitee, Rsvp } from '@/lib/store/types';

const weddingTime = Date.parse('2026-11-06T13:00:00Z');

function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, weddingTime - Date.now()));
    tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer);
  }, []);
  if (remaining === null) return <div className="countdown-placeholder" aria-hidden="true" />;
  if (remaining === 0) return <p className="today-label">СЕГОДНЯ НАШ ДЕНЬ</p>;
  const values = [Math.floor(remaining / 86400000), Math.floor((remaining % 86400000) / 3600000), Math.floor((remaining % 3600000) / 60000), Math.floor((remaining % 60000) / 1000)];
  return <div className="countdown" aria-label={`До свадьбы: ${values[0]} дней, ${values[1]} часов, ${values[2]} минут`}>
    {values.map((value, i) => <div key={i}><strong>{String(value).padStart(2, '0')}</strong><span>{['ДНЕЙ', 'ЧАСОВ', 'МИНУТ', 'СЕКУНД'][i]}</span></div>)}
  </div>;
}

function Reveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(target => observer.observe(target));
    return () => { observer.disconnect(); document.documentElement.classList.remove('motion-ready'); };
  }, []);
  return null;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guest, setGuest] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [maxGuests, setMaxGuests] = useState(3);
  const [savedRsvp, setSavedRsvp] = useState<Rsvp | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get('g');
    if (!inviteToken) return;
    setToken(inviteToken); setInviteLoading(true);
    fetch(`/api/rsvp?token=${encodeURIComponent(inviteToken)}`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Ссылка приглашения не найдена.');
      const data: { invitee: Invitee; rsvp: Rsvp | null } = await response.json();
      setInvitee(data.invitee); setMaxGuests(data.invitee.maxGuests);
      const current = data.rsvp;
      if (current) {
        setSavedRsvp(current); setGuest(current.guest); setAttending(current.attending);
        setGuests(current.guests); setStep(3);
      } else {
        setGuest(data.invitee.name); setGuests([data.invitee.name]);
      }
    }).catch(err => setError(err instanceof Error ? err.message : 'Не удалось загрузить приглашение.')).finally(() => setInviteLoading(false));
  }, []);

  function setGuestName(index: number, value: string) {
    setGuests(current => current.map((name, i) => i === index ? value : name));
    if (index === 0) setGuest(value);
  }

  function setGuestCount(next: number) {
    const target = Math.max(1, Math.min(maxGuests, next));
    setGuests(current => Array.from({ length: target }, (_, index) => current[index] ?? ''));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (token && !invitee) { setError('Персональное приглашение ещё не загружено.'); return; }
    const validation = validateRsvp({ guest, attending, guests }, maxGuests);
    if (!validation.ok) { setError(validation.error); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validation.value, token: token || undefined, website: String(form.get('website') || '') }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Не удалось отправить ответ. Попробуйте ещё раз.');
      setSavedRsvp(body.rsvp); setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Что-то пошло не так.'); }
    finally { setBusy(false); }
  }

  return <main>
    <Reveal />
    <section className="hero" aria-label="Аян и Қазына">
      <img className="hero-photo" src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=82" alt="" fetchPriority="high" />
      <div className="hero-content"><span className="eyebrow light">ПРИГЛАШЕНИЕ НА СВАДЬБУ</span><h1>Аян <i>&</i> Қазына</h1><p className="hero-date">06.11.2026</p><p className="hero-city">ЖАРКЕНТ</p></div>
      <a className="scroll-cue" href="#invitation" aria-label="Листать вниз"><span /></a>
    </section>

    <section className="invitation section" id="invitation" data-reveal><span className="eyebrow">ҚҰРМЕТТІ ҚОНАҚТАР</span><h2>Сіздерді қуанышымызға ортақ болуға шақырамыз</h2><p className="intro-copy">Өміріміздегі ерекше күнде сіздерді жанымыздан көргіміз келеді.</p></section>
    <section className="date-panel section" data-reveal><div className="date-inner"><span className="eyebrow">БІЗДІҢ КҮНІМІЗ</span><h2>6 ноября<br />2026</h2><div className="date-rule"/><p>ПЯТНИЦА <span>·</span> 18:00</p><Countdown /></div></section>
    <section className="venue section" data-reveal><span className="eyebrow">ТОЙ МЕКЕНІ</span><h2>«Гранд Холл»</h2><p>мейрамханасы<br />Жаркент</p><a className="route-button" href="https://www.google.com/maps/search/?api=1&query=Grand+Hall+restaurant+Zharkent+Kazakhstan" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ МАРШРУТ <span aria-hidden="true">↗</span></a></section>
    <section className="photo-story" aria-label="Фотографии пары" data-reveal><img className="story-image story-one" src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1400&q=82" alt="Аян и Қазына на прогулке" loading="lazy" decoding="async"/><p className="story-caption">Один день — и целая жизнь впереди.</p><img className="story-image story-two" src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=82" alt="Аян и Қазына вместе" loading="lazy" decoding="async"/></section>

    <section className="rsvp section" id="rsvp" data-reveal>
      <span className="eyebrow">RSVP</span><h2>Будем рады<br />видеть вас</h2><p className="rsvp-copy">Пожалуйста, подтвердите своё присутствие, чтобы мы могли правильно подготовить места для каждого гостя.</p>
      {inviteLoading && <p className="field-note">Загружаем персональное приглашение…</p>}
      {error && !invitee && token && <p className="form-error" role="alert">{error}</p>}
      {sent ? <div className="success" role="status"><span className="success-mark">✓</span><h3>Спасибо, будем рады видеть вас.</h3>{savedRsvp?.attending && <p>{savedRsvp.guests.join(', ')}</p>}{savedRsvp && !savedRsvp.attending && <p>Мы получили ваш ответ. Спасибо, что сообщили.</p>}</div> : <>
        {savedRsvp && <div className="saved-response"><strong>Ваш ответ уже есть</strong><p>{savedRsvp.attending ? `Придут: ${savedRsvp.guests.join(', ')}` : 'Вы сообщили, что не сможете прийти.'}</p><span>При необходимости измените его ниже.</span></div>}
        <form className="rsvp-form" onSubmit={submit}>
          <label className="honeypot" aria-hidden="true">Оставьте поле пустым<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <div className="form-step"><span className="step-number">01</span><label htmlFor="guest">Как вас зовут?</label><input id="guest" autoComplete="name" required maxLength={80} value={guest} onChange={event => { setGuest(event.target.value); if (guests.length) setGuestName(0, event.target.value); }} placeholder="Имя и фамилия"/>
            {step === 1 && <button className="continue-button" type="button" disabled={!guest.trim() || inviteLoading || Boolean(token && !invitee)} onClick={() => { setGuests([guest]); setStep(2); }}>Продолжить <span>→</span></button>}
          </div>
          {step >= 2 && <div className="form-step form-step-reveal"><span className="step-number">02</span><fieldset><legend>Вы сможете прийти?</legend><div className="answer-options"><button type="button" aria-pressed={attending === true} className={attending === true ? 'choice active' : 'choice'} onClick={() => { setAttending(true); setGuests(current => current.length ? current : [guest]); setStep(3); }}>Да, буду</button><button type="button" aria-pressed={attending === false} className={attending === false ? 'choice active' : 'choice'} onClick={() => { setAttending(false); setGuests([]); setStep(3); }}>К сожалению, не смогу</button></div></fieldset></div>}
          {step >= 3 && attending && <div className="guest-details form-step-reveal"><span className="step-number">03</span><label id="guest-count-label">Сколько всего человек придёт?</label><div className="counter" role="group" aria-labelledby="guest-count-label"><button type="button" aria-label="Уменьшить количество" disabled={guests.length <= 1} onClick={() => setGuestCount(guests.length - 1)}>−</button><span aria-live="polite">{guests.length} из {maxGuests}</span><button type="button" aria-label="Увеличить количество" disabled={guests.length >= maxGuests} onClick={() => setGuestCount(guests.length + 1)}>+</button></div>
            <span className="step-number">04</span><label>Имена гостей</label>{guests.map((name, index) => <input key={index} aria-label={index === 0 ? 'Имя приглашённого' : `Имя гостя ${index + 1}`} required maxLength={80} value={name} onChange={event => setGuestName(index, event.target.value)} placeholder={index === 0 ? 'Имя приглашённого' : 'Имя гостя'} />)}
          </div>}
          {step >= 3 && attending === false && <p className="decline-note form-step-reveal">Спасибо, что сообщили.</p>}
          {step >= 3 && <div className="submit-area form-step-reveal">{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-button" type="submit" disabled={busy || attending === null}>{busy ? 'Отправляем…' : savedRsvp ? 'Сохранить изменения' : 'Подтвердить'} <span>↗</span></button></div>}
        </form>
      </>}
    </section>
    <section className="closing-photo" aria-label="Аян и Қазына"><img className="closing-image" src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1600&q=82" alt="Аян и Қазына в день свадьбы" loading="lazy" decoding="async"/><div className="closing-overlay"><span className="eyebrow light">С ЛЮБОВЬЮ</span><h2>Аян <i>&</i> Қазына</h2><p>06.11.2026 <span>·</span> Жаркент</p></div></section>
    <footer>С нетерпением ждём встречи с вами.</footer>
  </main>;
}
