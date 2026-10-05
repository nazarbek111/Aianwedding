import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '../lib/store/index.ts';
import type { NewInvitee } from '../lib/store/types.ts';

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV содержит незакрытую кавычку.');
  row.push(cell.trim());
  if (row.some(value => value !== '')) rows.push(row);
  return rows;
}

async function main() {
  const file = path.join(process.cwd(), 'data', 'invitees.csv');
  const rows = parseCsv(await readFile(file, 'utf8'));
  if (rows.length < 2) throw new Error('В data/invitees.csv нужны заголовки и хотя бы одна строка приглашённого.');
  const headers = rows[0].map(header => header.toLocaleLowerCase('ru'));
  const nameIndex = headers.indexOf('name');
  const limitIndex = headers.indexOf('maxguests');
  if (nameIndex < 0) throw new Error('CSV должен содержать столбец name; maxGuests необязателен.');
  const parsed: NewInvitee[] = rows.slice(1).map((values, index) => {
    const name = values[nameIndex]?.trim() || '';
    const rawLimit = limitIndex < 0 ? '' : values[limitIndex]?.trim();
    const maxGuests = rawLimit ? Number(rawLimit) : 3;
    if (!name || name.length > 80) throw new Error(`Строка ${index + 2}: укажите имя длиной не более 80 символов.`);
    if (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 80) throw new Error(`Строка ${index + 2}: maxGuests должен быть целым числом от 1 до 80.`);
    return { token: randomBytes(24).toString('base64url'), name, maxGuests };
  });
  const store = getStore();
  const existing = await store.listInvitees();
  const knownNames = new Set(existing.map(invitee => invitee.name.toLocaleLowerCase('ru').replace(/\s+/g, ' ')));
  for (const invitee of parsed) {
    const key = invitee.name.toLocaleLowerCase('ru').replace(/\s+/g, ' ');
    if (knownNames.has(key)) throw new Error(`Приглашённый «${invitee.name}» уже есть в хранилище или повторяется в CSV.`);
    knownNames.add(key);
  }
  const added = await store.addInvitees(parsed);
  for (const invitee of added) console.log(`${invitee.name}\t/?g=${invitee.token}`);
  console.log(`Добавлено приглашённых: ${added.length}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Не удалось импортировать приглашённых.'); process.exitCode = 1; });
