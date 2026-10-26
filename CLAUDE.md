# CLAUDE.md — JESA · Magasin Central MC01

Warehouse management app for JESA / OCP's central store MC01 (Morocco). It covers stock, goods receipts (BR), exits / picking (BS), stock movements, storekeeper shift rotation, cycle-count inventory, and KPIs.
**The UI is French by default, with an English option** (chosen in « Paramètres & Droits », see « Display language » below). French labels stay exactly as they appear in `design-reference.html`, the visual and wording reference.


## How to work with the user

The user runs the warehouse and is **not a web developer**. They describe what they want in business terms; Claude chooses the technical approach (frontend, backend and/or database) on its own.

- **Before building, restate the request in plain language**: what will change, on which page, what the user will see or be able to do, where the data comes from. List assumptions and open questions, then **wait for confirmation**. Only trivial, unambiguous fixes can skip this step, and say so when one does.
- Don't ask the user to choose between technical options; decide, and only explain the visible effect.
- No jargon in replies; the final summary describes visible results, not code.
- The user writes in **English or French** (sometimes mixed, informal). Understand both and reply in the language of their message.

## Stack & layout

pnpm monorepo (`pnpm-workspace.yaml` → `apps/*`):

- `apps/api`: NestJS 11 REST API, Prisma **6** (pinned on purpose; Prisma 7 changes configuration), PostgreSQL 16. Swagger at `/api/docs`. Port 4000.
- `apps/web`: Next.js 15 App Router, React 19, Tailwind **3** (`tailwind.config.ts`: colors `jesa` / `navy`; `jesa` = logo blue #003088, set as CSS variables in `globals.css`, brighter in dark theme; logo in `src/assets/jesa-logo.png`, shown in the top bar only (the sidebar holds just the sections). No OCP logo or "JESA OCP" naming in the UI), lucide-react. Port 3000.
- `docker-compose.yml`: Postgres (`mc01` / `mc01` / db `mc01`, port 5432).
- `scripts/dev.sh`: one-command preview (`pnpm preview`), see below.

```
apps/api/prisma/schema.prisma        data model (StockMovement = central history)
apps/api/prisma/seed.ts              mockup data (TRUNCATE … RESTART IDENTITY, so stable IDs)
apps/api/src/common/stock-ledger.ts  applyStockMovement / nextDocumentNumber (shared by API + seed)
apps/api/src/<module>/               articles, zones, racks, storekeepers (+ trainings, habilitations, types), shifts,
                                     receptions, expeditions, movements, kpis, audits, settings, stock-sheets,
                                     engins, interventions (+ Excel export)
apps/api/prisma/reference-data.ts    habilitation catalogue + ENG-01 (idempotent, can run on a live DB)
apps/web/src/app/<route>/page.tsx    one page per view (server components)
apps/web/src/components/ui/          reusable components (DataTable, StatusBadge, KpiCard, HeroCard, Card…)
apps/web/src/lib/                    api.ts (typed client), types.ts, labels.ts, format.ts, nav.ts, profiles.ts
```

Routes: `/` dashboard · `/inventaire-saisie` (inventory counts) · `/cartographie` · `/shifts` (sidebar group « Personnel & Engins »: `/shifts` planning · `/shifts/magasiniers[/id]` records · `/shifts/prestations[/id[/rapport]]` support teams & contractors · `/shifts/engins[/id]` fleet tracking & maintenance) · `/stock` · `/receptions` · `/expeditions` · `/mouvements` (E/S entry form) · `/inventaire` · `/parametres`.

## Commands

```bash
./scripts/dev.sh [--open] [--reseed]   # prerequisites, .env, install, Postgres, migrate deploy, seed if empty, pnpm dev
pnpm dev                               # API + web in parallel (Postgres must already be running)
pnpm typecheck                         # tsc on both apps — run after every change
pnpm build                             # nest build + next build
pnpm --filter api prisma migrate dev --name <name>   # new migration (needs Postgres running)
pnpm --filter api prisma db seed       # reset: mockup data + replays every prisma/data/*.tsv (real data)
pnpm --filter api import:sheet prisma/data/<file>.tsv   # import a Google Sheet export (additive, idempotent)
```

## Business invariants — do not break

- **Every stock change goes through `applyStockMovement(tx, …)`** inside a `prisma.$transaction`. It updates `Article.currentStock` and writes the `StockMovement` row with `stockAfter`. Never update `currentStock` directly elsewhere; an `Article` is only created with an opening stock.
- A Reception (BR) produces an `IN` movement and an Expedition (BS) an `OUT` movement. An OUT is refused (400) if stock is insufficient, using an atomic `currentStock >= qty` guard. Cancelling a BS creates a re-credit IN movement `<BS>-ANN`.
- An E/S sheet (`StockSheet`, `/mouvements`) creates a BR (Entrée) or a BS already `LIVRE` (Sortie) plus the movement, in the same transaction. The logic lives in **`recordStockSheet` (`stock-sheets/record-sheet.ts`)**, shared by the API and the Google Sheet import: never duplicate it. Conditional fields: `supplier` is required for an Entrée; `destinationZone` (LAVERIE / TREMIE / LIAISON) + `destinationArea` are required for a Sortie (`ValidateIf` in the DTO). Its photos are uploaded via multer into `apps/api/uploads/`, and `CleanupUploadsOnErrorInterceptor` deletes them if the request fails, including on DTO validation failure.
- Document numbers: `BR-YYYY-####` / `BS-YYYY-####`, auto-generated by `nextDocumentNumber`.
- Alert status (computed, never stored): `CRITIQUE` if `stock < min`, `LIMITE` if `< min × (1 + margin)`, else `CONFORME`. The margin is a setting (`Settings.stockLimitMarginPct`, default 25 %).
- KPIs (`kpis.service.ts`):
  - OTIF = delivered on time ÷ (delivered + overdue undelivered)
  - IRA = accurate lines ÷ counted lines (completed audits)
  - rack saturation = units in racks ÷ rack capacity
- **Planning** (`Shift`): one row per magasinier and **real calendar week** (`weekStart` = Monday, `@db.Date`). `locked` = the cell can't be changed until unlocked. `Storekeeper.fixedPost` = no rotation: setting it rewrites the non-locked weeks from the current week on. `POST /shifts/extend` repeats each person's post from 4 weeks earlier (or 8 if they were on leave). Postes: MATIN, APRES_MIDI, NUIT, OFF (« Poste normal »), plus CONGE / FORMATION / ABSENT exceptions.
- **Habilitations**: status is computed, never stored (`EXPIREE` if past, `BIENTOT` within `Settings.habilitationAlertDays`, default 60, else `VALIDE`). Only the latest certificate per type is « en cours »; renewals keep older ones as history. An engin is allowed if the habilitation it requires is valid.
- **Engins** (`engins.service.ts`, config in `engins.config.ts`): a detailed record (identification, ownership = own service or rental + end of contract, technical specs, hour meter). Next preventive maintenance = last service + N months **or** + N hours (the first threshold reached wins); periodic inspection every `inspectionIntervalMonths` (default 6). « Bientôt » = within `Settings.enginAlertDays` days or `Settings.enginAlertHours` meter hours (defaults 30 / 25). A « Non conforme » inspection sets the engin to HORS_SERVICE. A breakdown opens a `MaintenanceRecord` (endDate null) and sets EN_PANNE; once no open records remain, closing sets it back to DISPONIBLE. Availability over 90 days uses **merged** downtime periods. The pre-start check-list depends on the engin family (forks / nacelle / crane / rolling); an anomaly with « mettre à l'arrêt » declares a breakdown. The hour meter only ever goes up.
- **Engins (2)**: each engin can have its own check-list (`Engin.checklist` JSON; null = family template via `checklistOf()`); past checks keep their own labels. Demo fleet: `engins.demo.ts` (ENG-D01…D10, `isDemo`, dates relative to today), loaded by the seed or `POST /engins/demo`, removed by `DELETE /engins/demo` (these routes are declared **before** `engins/:id`).
- **Inventory counts** (`src/inventory`): a magasinier enters a count (`InventoryCount` CPT-YYYY-####) with lines picked from the article referential, or free text (status DEMANDE_DESIGNATION). A responsable links the line to an existing article or creates the official reference (origin from the volet achat: OCP / Cession / JESA / **Annexe D = PDR projet**). Then « Valider & régulariser » sets the stock to the counted total (lines of the same article are summed) through `applyStockMovement` with an **INV-YYYY-####** movement. Matching (`inventory.config.ts`) ignores accents and case, rejoins codes (« DN 100 » → dn100) and tolerates small typos, **but never on words containing digits** (DN150 ≠ DN100). Linking, creating and validating are shown only to the admin profiles (EL ATYQY, AZIZI): `profile.admin`, UI only. Each count records the **poste** (header, pre-filled from the planning). Each line requires a **category** (the E/S sheet list, auto-filled from the article's last sheet category, otherwise mapped from the catalogue category) and **one photo**. `POST /inventory/counts` is multipart: field `data` = the JSON sheet, validated manually with class-validator in the controller; fields `photos` = one per line, in order.
- **Interventions** (support teams / contractors): progress = average of task progress. A task's status follows its progress (100 % → Terminée), except Bloquée. The first work-log entry sets a planned intervention to « En cours ». Engin conflict = the same engin on two unfinished tasks of active interventions with overlapping dates, or an engin not « Disponible »; it only shows a warning and never blocks.
- Time zone: **`Africa/Casablanca`** for display (`lib/format.ts`) and for seed dates. ICU tzdata puts it at **UTC+0 in October 2026**; never hard-code `+01:00`. Use `siteDateTime()` from `src/common/site-time.ts` to turn a local date/time into an instant.

## Code conventions

- TypeScript strict, **no `any`** in public signatures. API responses are typed through `*View` interfaces in the services; `apps/web/src/lib/types.ts` mirrors them by hand. Update both sides together.
- API: DTOs with class-validator. The global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted` + `transform` + `stopAtFirstError` (one message per field). class-validator evaluates decorators **bottom-up**: put the required-field check (`@IsNotEmpty` with its French message) right above the property. Error messages are in French. Module = controller + service + dto (+ mapper).
- Web: pages are server components that fetch through `api.*` (`cache: 'no-store'`, `dynamic = 'force-dynamic'` in the layout). Interactive code goes in `'use client'` components, and forms call `router.refresh()` after a write (`useSubmit`).
- **A server page can't pass a function to a client component** (Next.js runtime error that typecheck doesn't catch). Pass plain data instead, e.g. `<ConfirmButton deletePath="/habilitations/12" />`.
- Dates without a time (`@db.Date`) travel as « YYYY-MM-DD » and are shown with `fmtDay()` (no timezone conversion). Datetimes use `fmtDate`/`fmtTime`.
- **Display language (FR / EN)**: all UI text is written in French in the code and wrapped in `tr('Texte')`; the English lives in `lib/i18n/en.ts` (key = the exact French string; a missing key falls back to French, so entered data passes through untouched). Variables use `{0}`, `{1}`: `tr('{0} bons sur {1}', a, b)`. In a page: `const tr = await getT()` as the **first line** (`lib/i18n/server.ts`; it also sets the language for the server components below it). In any other component, server or client: `const tr = useT()`. Texts built by the API (alerts, warnings, error messages) are translated at display time by `tr(message)`, with regex patterns in `lib/i18n/en-patterns.ts`. Labels from `lib/labels.ts`, `nav.ts`, `profiles.ts` stay French there and are passed through `tr()` where displayed. The choice is stored in the `mc01-lang` cookie (`LanguageSelector`). **Every new French label needs its entry in `en.ts`**; `node .tooling/i18n-missing.cjs apps/web` lists `tr()` keys with no entry (identical FR/EN words are expected there). The API-side Excel export is still French only.
- French labels / colors per status are centralized in `lib/labels.ts`, and Tailwind tones in `components/ui/tones.ts`. Reuse them rather than duplicating classes.
- The dark theme is the default (`class="dark"` on `<html>`). Always provide both variants, `bg-white dark:bg-navy-light` and so on, as in the mockup.
- No hard-coded business data in pages: everything comes from the DB. Exceptions (UI configuration):
  - `lib/profiles.ts`: only the display helpers (colours, initials) for profiles. The people themselves and their rights live in the DB (`AppProfile`, see below).
  - Rack-plan annotations in `RackPlan.tsx`.
- Comments and identifiers follow the existing code (French comments, English identifiers).

## Pending / known items

- **E/S sheet options** (`apps/api/src/stock-sheets/sheet-options.ts`, the single source for validation + form + import): values marked ✅ were seen in the real Google Sheet export (02/10/2026); ⚠️ values are still assumptions to confirm (4 of the 11 categories, units `ML` / `L`, postes 3 / normal, the LIAISON sectors).
- **Real data imported** from `apps/api/prisma/data/fiches-es-2026-10.tsv` (22 sheets, 01–02/10/2026). Articles ART-1006 → ART-1027 were created by the import with **CMP = 0, min stock = 0, location « à préciser »**: they still need real prices, thresholds and locations. Items that only appear as exits got the minimal opening stock (so the history never goes negative). The real magasiniers ABDELKBIR JABBOUR (M-8806) and OULAD RHIMANI HICHAM (M-8807) have **provisional matricules**.
- Stock is counted in mixed units (U, KG…): the dashboard's « unités » total adds KG and pieces together. `Article` has no unit field yet (the unit only lives on the sheet).
- Google Drive photos from the import are stored as links (`StockSheetPhoto.externalUrl`), not files: they are private and cannot be embedded as images.
- There is no real authentication; the profile selector only hides menu items. **Profiles are stored in the DB** (`AppProfile`: name, role = title/position, phone, email, `admin`, `hiddenRoutes`, `readOnlyRoutes`; API `/profiles`, module `src/profiles`). Three access levels per menu section (`accessOf` in `lib/profiles.ts`): edit / view only / hidden. **View only** is enforced in the browser: `ProfileProvider` computes `canEdit` for the current section and calls `setApiReadOnly`, so `request()` in `lib/api.ts` refuses every non-GET call with a French message; `PageHeader` actions, `ConfirmButton` and the selection-delete button are hidden (`EditOnly`), and `ReadOnlyBanner` shows at the top of the page and edited in « Paramètres & Droits » → matrix (`ProfilesManager`: tick boxes per menu section, add / delete a person). The root layout loads them into `ProfileProvider`; the chosen person is remembered per device (`localStorage`, key = profile id). An admin always sees every section, and the API refuses to remove the last admin. The 5 original personas were inserted by the migration; the seed does not touch this table.
- **Settings page** (« Paramètres & Droits »): collapsible groups (`SettingsGroup`, closed by default), one `SettingsForm section=…` per saved group. Site identity: `appTitle`, `siteLabel` (header title, read in the root layout). Defaults: `enginInspectionMonths` (new engin form), `rotationExtendWeeks` (« Prolonger la rotation »). Language and theme are per device (cookie / localStorage), not in `Settings`.
- **Adjustable alert thresholds** (group « Réglages des alertes »): `habilitationAlertDays`, `stockLimitMarginPct`, `enginAlertDays`, `enginAlertHours`. The API keeps them in memory in `common/alert-config.ts` (loaded by `SettingsService` at start-up and after each update), so the pure helpers (`computeAlertStatus`, engin due dates) read them without a query.
- The SAP connector screen was removed from the settings page (11/10/2026) at the user's request; the `sap*` columns remain in `Settings` but nothing uses them. There is no SAP synchronization.
- The mockup's « Graphiques & Analytics » view is not implemented (it was not in the requested routes).
- The seed first loads the HTML mockup data (5 articles, 4 BR, 3 BS, 7 movements; ART-1002 = 12 units, min 25, which triggers the alert), **then replays every `prisma/data/*.tsv`**. Re-seeding wipes entries made through the site; prefer `import:sheet` (additive) when data has to be kept.

## This machine's environment (macOS, arm64) — important

- **No system Node, pnpm, Docker, Postgres or Homebrew.** A local toolchain lives in **`.tooling/`** (gitignored):
  - `.tooling/node/bin` (Node 24 + pnpm 9): `export PATH="$PWD/.tooling/node/bin:$PATH"` before any node/pnpm command. `dev.sh` does this automatically.
  - `.tooling/pg/start.mjs`: embedded Postgres (data in `.tooling/pg/data`). `dev.sh` uses it when Docker is absent. Run it in the background: `cd .tooling/pg && node start.mjs`; stop it with SIGINT/SIGTERM. It always stops Postgres cleanly — never `kill -9` it, or you leave a `postmaster.pid`.
  - `.tooling/cdp.mjs`, `.tooling/shot.mjs` (`node shot.mjs <url> <out.png> [width] [section title]`), `.tooling/form-test.mjs`: Chrome DevTools Protocol scripts (headless Chrome, port 9333) for screenshots / driving the UI. Captures go in `.tooling/shots/`.
- **`python3` and `git` are Xcode stubs**: calling them opens an "install developer tools" dialog. Don't use them; use node/perl/awk instead. The project is not a git repository.
- **The active project is `~/Desktop/warehouse BWP/raid`** (since 06/10/2026). The sibling folder `warehouse BWP/inventory management system` is the **original, frozen copy**: don't modify it. Both use the same ports (3000, 4000, 5432), so only one can run at a time. Each has its own database in `.tooling/pg/data`.
- **The project path contains spaces** ("warehouse BWP/raid"): always quote it. In Node use `fileURLToPath`, never `new URL().pathname` (that produces `%20` and once created a stray folder on the Desktop).
- Next.js listens in **IPv6 only** (`*:3000`): a `127.0.0.1` probe does not see it. To check a port, use `lsof -nP -iTCP:<port> -sTCP:LISTEN`.
- `apps/api/tsconfig.json` has `"incremental": false` on purpose: with `deleteOutDir`, a stale `.tsbuildinfo` stopped `nest start --watch` from emitting `dist/main.js`.
- **The user often keeps `./scripts/dev.sh --open` running.** Check with `pgrep -fl "scripts/dev.sh"` before starting anything: reuse their instance, never kill it, never re-seed (TRUNCATE) their database without asking, and don't run `pnpm build` while it is running (it overwrites the `.next/` and `dist/` that the dev servers use). For a migration while it is running: `prisma migrate dev` refuses to run non-interactively, so generate the SQL with `prisma migrate diff --from-migrations … --to-schema-datamodel … --shadow-database-url …/mc01_shadow --script` (create then drop the shadow DB with `prisma db execute`), then run `prisma migrate deploy`.
- Before finishing a task, stop the servers / Postgres / headless Chrome you started (`pkill -INT -f "node start.mjs"`, etc.) and check that no ports 3000/4000/5432 are left orphaned.

## Verifying a change

**Never write test data into the user's database.** Use an isolated test copy instead:
- create `mc01_test` with `DATABASE_URL=…/mc01_test prisma migrate deploy` (Prisma creates the database) and run the seed with the same variable;
- start a test API on 4001 from the compiled `dist` (`DATABASE_URL=…mc01_test API_PORT=4001 CORS_ORIGIN=http://localhost:3001 UPLOAD_DIR=/tmp/… node dist/main.js`);
- if needed, start a test web on 3001 (`NEXT_DIST_DIR=.next-test NEXT_PUBLIC_API_URL=http://localhost:4001 API_URL=http://localhost:4001 next dev -p 3001`);
- afterwards, stop both, `DROP DATABASE mc01_test` (via `$executeRawUnsafe` — `prisma db execute` runs inside a transaction, where DROP DATABASE is refused) and delete `.next-test`.
- `.tooling/shot.mjs` only expands the app frame. Don't force `height: auto` on content, or progress bars collapse.
- `.tooling/printshot.mjs` renders a page in print mode at A4 width, to check reports. There is no PDF viewer on this Mac.


1. `pnpm typecheck` (and `pnpm build` if pages or config changed).
2. Start: `./scripts/dev.sh` in the background (or Postgres + `pnpm dev`), then `curl` the affected endpoints. Write tests go through the API; then re-seed to clean up and delete any test photos from `apps/api/uploads/`.
3. UI: CDP screenshot (`.tooling/cdp.mjs`, true 400px mobile emulation via `Emulation.setDeviceMetricsOverride`). Don't rely on `--window-size` for mobile: headless Chrome enforces a minimum width and crops the capture.
