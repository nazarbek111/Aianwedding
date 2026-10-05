# Аян & Қазына — wedding invitation

Mobile-first Next.js invitation and RSVP app. RSVP data is accessed through `RsvpStore`; the current adapter stores JSON in `data/rsvps.json`.

## Run locally

```sh
npm install
RSVP_ADMIN_KEY='choose-a-private-key' STORAGE=json npm run dev
```

`RSVP_ADMIN_KEY` protects organizer API requests. Configure it in the production environment; it is not included in client code. `STORAGE` currently supports `json` only. The JSON adapter requires one server instance and a persistent writable disk; it is not suitable for Vercel's ephemeral filesystem. Use a database adapter for Vercel or multi-instance hosting.

## Invitees and personal links

Copy `data/invitees.example.csv` to `data/invitees.csv` and add a `name` column plus an optional `maxGuests` column. The private file is ignored by Git. Import with Node.js 22 or newer:

```sh
npm run import:invitees
```

The script writes invitation records to the configured store and prints a personal link token for each. Re-importing duplicate names stops with an error. If two invitees share the same name, distinguish one name in the import list (for example, by adding a patronymic) so the importer can protect against accidental duplicate entries.

Answers from personal links update the same invitee's record. Responses without a token are stored separately and marked «Без приглашения» in the organizer data. The admin endpoint requires `RSVP_ADMIN_KEY` and returns no-cache data.
