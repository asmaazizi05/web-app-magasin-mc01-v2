# JESA OCP – Magasin Central MC01

Full-stack warehouse management application for the MC01 central store.

| Layer    | Stack                                                                 |
| -------- | --------------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router, TypeScript), Tailwind CSS 3, lucide-react     |
| Backend  | NestJS 11 (REST), class-validator DTOs, Swagger (`/api/docs`)         |
| Data     | Prisma 6 + PostgreSQL 16 (docker-compose)                             |
| Monorepo | pnpm workspaces – `apps/web` (Next.js) and `apps/api` (NestJS)        |

The UI reproduces `design-reference.html` (dark navy theme, OCP green `#008343` / `#00A859`, navy `#0A1A2E` / `#132A45` / `#050D17`) with every French label kept. All page data comes from the API / database.

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm` or `corepack enable`)
- Docker (for PostgreSQL)

## Quick preview (one command)

```bash
./scripts/dev.sh            # or: pnpm preview
./scripts/dev.sh --open     # also opens http://localhost:3000 in the browser
./scripts/dev.sh --reseed   # resets the example data before starting
```

The script checks Node ≥ 20 / pnpm, creates any missing `.env` files, runs `pnpm install` if needed, and starts PostgreSQL. For PostgreSQL it uses an instance already listening on 5432, otherwise `docker compose up -d`. It then applies the migrations (`prisma migrate deploy`), loads the example data on the first run, and starts the API and web app. Ctrl+C stops everything.

## Importing Google Sheet data (« Mouvements de stock (E/S) » form)

1. In Google Sheets: **File → Download → Tab-separated values (.tsv)**.
2. Put the file in `apps/api/prisma/data/` (e.g. `fiches-es-2026-11.tsv`).
3. Import it, with the app running or not:

```bash
pnpm --filter api import:sheet prisma/data/fiches-es-2026-11.tsv
```

The import is **additive and idempotent**: rows already imported (same timestamp + designation) are skipped, so you can re-import an export that grew since the last time. Each row goes through the same transaction as a form submission (BR or BS + movement + stock). Columns are found by their header name. Unknown articles are created automatically with CMP = 0, min stock = 0 and location « à préciser », to be completed afterwards. Unknown magasiniers are created with a provisional matricule. Google Drive photo links are kept as links. Every `prisma/data/*.tsv` file is also replayed by `prisma db seed`.

## Setup & run (step by step)

From the repository root:

```bash
# 1. Install dependencies (also generates the Prisma client)
pnpm install

# 2. Environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start PostgreSQL (localhost:5432, user/password/db = mc01)
docker compose up -d

# 4. Apply the database migrations
pnpm --filter api prisma migrate dev

# 5. Load the example data from the mockup
pnpm --filter api prisma db seed

# 6. Start the API (port 4000) and the web app (port 3000) together
pnpm dev
```

- Application: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

To reset the data, run `pnpm --filter api prisma db seed` again: the seed clears the tables before inserting.

### Environment variables

| File                  | Variable              | Default                                                    |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| `apps/api/.env`       | `DATABASE_URL`        | `postgresql://mc01:mc01@localhost:5432/mc01?schema=public` |
|                       | `API_PORT`            | `4000`                                                     |
|                       | `CORS_ORIGIN`         | `http://localhost:3000` (comma-separated list allowed)     |
|                       | `UPLOAD_DIR`          | `uploads` (sheet photos, served under `/uploads/`)        |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:4000`                                    |
|                       | `API_URL` (optional)  | Server-side API URL; defaults to `NEXT_PUBLIC_API_URL`     |

### Other scripts

```bash
pnpm build                          # build api + web
pnpm typecheck                      # tsc on both apps
pnpm --filter api prisma studio     # browse the database
```

---

## Structure

```
apps/
  api/                       NestJS
    prisma/schema.prisma     data model
    prisma/migrations/       SQL migrations
    prisma/seed.ts           mockup data
    src/common/stock-ledger.ts   transactional stock movements (shared by API + seed)
    src/<module>/            articles, zones, racks, storekeepers, shifts, receptions,
                             expeditions, movements, kpis, audits, settings
  web/                       Next.js
    src/app/                 one route per view
    src/components/          AppShell, KpiCard, HeroCard, AlertBanner, DataTable,
                             StatusBadge, ShiftCard, RackPlan, MovementHistory, forms…
    src/lib/                 typed API client, types, French labels, formatting
docker-compose.yml           PostgreSQL 16
design-reference.html        design mockup (reference)
```

## Pages

| Route           | View                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `/`             | Tableau de bord & KPIs: alerts, shift assignments, hero KPIs, OTIF / IRA / saturation / prep time, pie charts, ABC Pareto, valuation & occupancy per zone |
| `/cartographie` | Cartographie 2D: 5-zone selector (`?zone=`), clickable R1–R6 rack plan with per-level contents           |
| `/shifts`       | Planning des postes on real calendar weeks: click a cell to change the poste (Matin / A-M / Nuit / Normal / Congé / Formation / Absent) or lock it. 📌 = fixed poste. « Prolonger la rotation ». Coverage per week |
| `/shifts/magasiniers` | Magasinier records: identity, next 6 weeks, habilitations (automatic expiry, renewal, history, attached certificate), training, authorised engins |
| `/shifts/prestations` | Support teams & contractors: intervention, team, tasks (intervenants + engins with conflict warnings), progress, work log, **printable PDF report** and **Excel report** |
| `/shifts/engins` | Engin fleet: status, required habilitation, bookings on tasks |
| `/stock`        | Article catalogue, Origine filter (`?origin=`), global search (`?q=`), « Ajouter un Article »            |
| `/receptions`   | Goods-receipt (BR) table + « Créer Bon de Réception (BR) »                                               |
| `/expeditions`  | Exit (BS) table + « Créer Bon de Sortie / Picking », Servi / Annuler actions                             |
| `/mouvements`   | « Mouvements de stock (E/S) » form: Entrée/Sortie entry sheet (11 questions, mandatory photos). Each submission creates the BR or BS, the movement and the stock update in one transaction, plus a « Dernières saisies » table |
| `/inventaire`   | Entries / exits / net flow, audit schedule for the month, IRA KPIs, movement history with Tous / Entrées / Sorties filter (via `GET /movements?type=`) |
| `/parametres`   | SAP S/4HANA connector (editable), current rotation week, access-rights matrix                            |

## Main endpoints

| Method                  | Route                                                                  | Description                                                    |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| GET                     | `/kpis/dashboard`                                                      | Dashboard aggregates                                           |
| GET/POST/PATCH/DELETE   | `/articles`                                                            | CRUD; `alertStatus` computed; filters `q`, `origin`, `zoneId`, `rackId`, `alertOnly` |
| GET/POST/PATCH          | `/zones`, `/racks`                                                     | With occupancy / saturation and contents                       |
| GET/POST/PATCH/DELETE   | `/storekeepers`                                                        | Storekeepers (magasiniers)                                     |
| GET, GET `/current`, PUT | `/shifts`                                                             | Rotation, assignment for the current week, upsert              |
| GET/POST, PATCH `/:id/status` | `/receptions`                                                    | **POST = BR + IN movement + stock increase in one transaction** |
| GET/POST, PATCH `/:id/status` | `/expeditions`                                                   | **POST = BS + OUT movement + stock decrease** (refused if stock is insufficient); cancelling re-credits the stock |
| GET                     | `/movements?type=IN\|OUT`, `/movements/summary`                        | History and totals                                             |
| GET, GET `/options`, POST (multipart) | `/stock-sheets` | E/S sheets: option lists, latest sheets, entry (`photos` field, 1–5 images ≤ 5 MB), `supplier` for an Entrée, `destinationZone` + `destinationArea` for a Sortie → sheet + BR/BS + movement + stock |
| GET, PATCH              | `/audits`, `/audits/kpis`                                              | Cycle counts, IRA, financial variance                          |
| GET/PATCH               | `/settings`                                                            | Site and SAP connector settings                                |

## Business rules

- **Alert status**: `CRITIQUE` when `currentStock < minStock` (« ALERTE REAPPRO »), `LIMITE` when below `minStock × 1.25` (« Limite Approche »), otherwise `CONFORME`.
- **Stock movements**: every BR/BS goes through `applyStockMovement`, which updates `Article.currentStock` and writes `StockMovement` with `stockAfter` inside the same transaction. An exit only decrements stock behind an atomic `currentStock >= qty` guard.
- **Document numbers**: generated automatically as `BR-YYYY-####` / `BS-YYYY-####` when none is supplied.
- **OTIF**: BS delivered on time ÷ (BS delivered + BS overdue and not delivered).
- **IRA**: accurate lines ÷ counted lines over completed audits. **Financial variance**: |variance value| ÷ counted value.
- **Rack saturation**: units stored in racks ÷ total rack capacity.
- **Times**: displayed in the site time zone `Africa/Casablanca`.

## Notes

- **E/S sheet option lists** live in `apps/api/src/stock-sheets/sheet-options.ts`, a single file that feeds API validation, form rendering and the import. Values marked ✅ come from the real Google Sheet export. Values marked ⚠️ (4 categories, units ML / L, 3rd / normal poste, LIAISON sectors) are still to be confirmed.
- **Real data**: `apps/api/prisma/data/fiches-es-2026-10.tsv` holds the 22 sheets of 01–02/10/2026. The articles it created (ART-1006 → ART-1027) still need their **CMP price, minimum stock and location**. The magasiniers ABDELKBIR JABBOUR and OULAD RHIMANI HICHAM have **provisional matricules** (M-8806, M-8807).
- Quantities are in mixed units (U, KG…), so the dashboard's « unités » total adds them together.
- Sheet photos are stored on disk in `apps/api/uploads/` (gitignored). Re-running the seed empties the database but does not delete the files.
- The user profile selector (5 personas from the mockup) and the access matrix are UI configuration (`apps/web/src/lib/profiles.ts`): they hide menu items but do not provide authentication.
- The seed contains the mockup data: 5 storekeepers M-8801 → M-8805, 5 articles ART-1001 → ART-1005, 4 BR, 3 BS and the resulting 7 movements (opening stock is recalculated so final stocks match the mockup: ART-1002 = 12 units, minimum 25).
- The mockup's « Graphiques & Analytics » view (time series, Top 20, dormant stock) is not part of the requested routes and has not been implemented.
