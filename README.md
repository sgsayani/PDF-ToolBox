# PDF Toolbox

A single workspace for common PDF operations — upload a document once, then organize, split or merge it without hopping between disconnected tools.

This is **Phase 2**: the Phase 1 organization core, plus basic content editing and security. Everything described below is implemented and working; everything else on the [roadmap](#roadmap) is intentionally not built yet, and is marked "Soon" in the product rather than pretending to work.

## Features

**Organize** (Phase 1)
- **Upload** — drag-and-drop or file picker, with client-side pre-validation and full server-side validation (file type, size, and PDF structure).
- **Organize pages** — reorder by dragging, rotate, and delete pages on one canvas, with undo/redo, then commit every change as a single new PDF.
- **Split & extract** — pull out a page selection or a typed range (`1-3, 5, 8-10`) into a new document.
- **Merge** — combine any number of PDFs, reorder the file list by dragging, and produce one combined document.

**Edit + Security** (Phase 2)
- **Watermark** — stamp text on a page, positioned anywhere in a 3×3 grid (the centre position draws diagonally), with adjustable opacity and size, on every page or a chosen selection.
- **Page numbers** — number pages along any edge, starting from any number, on every page or a chosen selection.
- **Metadata** — view a document's title, author, subject, keywords, creator and producer, and download a copy with all of it stripped.
- **Password protection** — set a password (AES-256) so the file can't be opened without it. This app can only *add* a password, not remove one — a PDF that's already protected must be unlocked elsewhere first.
- **Signature** — draw a signature with a mouse or finger, then place it on one page at a chosen position and size. A basic electronic signature (an image placed on the page), not a certified digital signature.

**Throughout**
- **Consistent lifecycle** — every operation shows upload progress, a processing state, a success screen with a real download link, and human-readable errors for invalid, corrupted, encrypted, or oversized files.

## Tech stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack Query, dnd-kit, pdf.js (client-side page rendering), react-hook-form + Zod.

**Backend** — Node.js, TypeScript (ESM), Express, Mongoose/MongoDB (optional, for history only), pdf-lib, [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib) (password protection only — see below), Multer, Zod.

**Monorepo** — npm workspaces, two packages: [`client/`](client) and [`server/`](server).

## Architecture

```
client/src/
  components/   ui primitives, upload flow, workspace panels, landing sections
  pages/        route-level screens (Landing, Workspace, NotFound)
  layouts/      shared page chrome
  hooks/        upload queue, page selection, undo/redo, pdf.js preview, ...
  services/     typed API client (apiClient.ts, pdfApi.ts)
  lib/          pure helpers: formatting, page-range parsing, tool catalogue
  types/        shared frontend types

server/src/
  routes/       thin route definitions (validation + controller wiring only)
  controllers/  request/response shaping, no document logic
  services/     pdf.service (content transforms), security.service (password
                 protection), storage.service, job.service
  models/       Job (Mongoose) — processing history only
  middleware/   upload (multer), validate (zod), errorHandler, rateLimit
  validators/   zod schemas, shared between routes
  errors/       AppError — the one error type that ever reaches a client
  config/       env (validated at boot), database
```

**Design decisions worth knowing about:**

- **One page-plan primitive.** Deleting, reordering and rotating pages are the same underlying operation — "keep these source pages, in this order, turned by this much" — so they share one service method (`pdf.service.organize`) and one API endpoint (`POST /api/pdf/organize`). The workspace commits a whole editing session as one atomic request instead of chaining three calls that could each fail independently. `POST /api/pdf/split` reuses the identical implementation with a different intent (and output name).
- **One placement primitive.** Watermark text, page numbers and a signature image all reduce to "put a box of this size at this position on the page" — a single `anchorFor()` helper resolves any of the nine grid positions (and the diagonal rotation the centre position gets for watermarks) to an (x, y) anchor. Adding a sixth stamp-like feature later means calling that helper, not inventing new placement math.
- **Files are processed, not stored.** An upload becomes a working file in a server-side temp directory, named with 16 random bytes — never the client's filename — and is served back only through that opaque id. Files are swept on a timer (`FILE_TTL_MINUTES`, default 60) and the directory is purged on every server boot. Nothing PDF-shaped is ever written to MongoDB.
- **MongoDB is optional and additive.** If `MONGODB_URI` is unset or unreachable, the API logs a warning and runs with history recording disabled — no PDF operation depends on the database being up.
- **Previews render in the browser.** Once a file is uploaded, page thumbnails are rasterised from the local bytes via pdf.js — no extra round trip per page, and thumbnails are cached per source page so reordering/rotating never re-renders.
- **Every error a client sees is an `AppError`.** Anything else thrown is logged in full server-side and converted to a generic message; validation failures carry a stable `code` and field-level messages the UI maps to plain language.
- **Password protection uses a second PDF library, deliberately contained.** `pdf-lib` can read encrypted PDFs (when told to ignore the encryption) but cannot write them — it has no encryption support at all. `security.service.ts` uses `@cantoo/pdf-lib`, an actively maintained fork that adds AES-256 encryption on the same API, and nothing else in the app imports it. Because the output can't be read back by `pdf-lib`, protecting a file is the one operation that doesn't go through the shared `executeOperation` pipeline (which re-parses every other operation's output as a sanity check) — `security.controller.ts` mirrors that pipeline's shape without the re-parse.

## Setup

Requires Node.js ≥ 20.

```bash
npm install
cp .env.example server/.env
npm run dev
```

This starts the API on `http://localhost:4000` and the client on `http://localhost:5173` (Vite proxies `/api` to the backend in development). Open the client URL.

MongoDB is optional. If you have one running, set `MONGODB_URI` in `server/.env`; otherwise leave it unset and the app runs normally without processing history.

### Environment variables

See [`.env.example`](.env.example) for the full list with defaults. The ones you're most likely to change:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `MONGODB_URI` | *(unset)* | Enables processing-history recording when set |
| `MAX_FILE_SIZE_MB` | `50` | Per-file upload limit |
| `MAX_FILES_PER_REQUEST` | `20` | Merge file-count limit |
| `FILE_TTL_MINUTES` | `60` | How long a working file survives before cleanup |
| `VITE_API_BASE_URL` | *(unset)* | Leave empty in dev; set for a separately-hosted API in production |

Never commit `server/.env` — it's gitignored.

### Development commands

```bash
npm run dev          # both apps, with hot reload
npm run typecheck    # both workspaces
npm run lint         # both workspaces
npm run build        # both workspaces (production build)
npm start            # run the built server (after npm run build)
```

## API overview

All routes are under `/api`. Every response follows one of two shapes: the operation's own JSON, or `{ "error": { "code", "message", "details?" } }`.

| Method & path | Purpose |
|---|---|
| `GET /api/health` | Liveness, plus the limits the client validates against |
| `POST /api/files` | Upload one PDF (`multipart/form-data`, field `file`) → `{ file, pages }` |
| `GET /api/files/:id/download` | Download a working file |
| `GET /api/files/:id/metadata` | Read a working file's document metadata |
| `DELETE /api/files/:id` | Release a working file early |
| `POST /api/pdf/organize` | Apply a full page plan (delete + reorder + rotate) → new file |
| `POST /api/pdf/split` | Extract a page plan into a new file |
| `POST /api/pdf/merge` | Concatenate `fileIds` in order → new file |
| `POST /api/pdf/watermark` | Stamp text on chosen pages → new file |
| `POST /api/pdf/page-numbers` | Number chosen pages, from a start number → new file |
| `POST /api/pdf/remove-metadata` | Strip the Info dictionary → new file |
| `POST /api/pdf/sign` | Place a signature image on one page → new file |
| `POST /api/security/protect` | Encrypt with a password (AES-256) → new file |
| `GET /api/stats` | Aggregate operation counts (empty when history isn't enabled) |

A "page plan" is `{ fileId, pages: [{ source, rotate }] }` — `source` is the 1-based page number in the *original* file, `rotate` is a signed multiple of 90. Pages absent from the plan are dropped; the array's order becomes the new page order.

Watermark and page-numbers take `pages: 'all' | number[]` (source page numbers) to say which pages get the stamp — this is separate from, and doesn't reorder, the document itself. Positions across watermark, page-numbers and signature share one 3×3 grid: `top-left | top-center | top-right | middle-left | center | middle-right | bottom-left | bottom-center | bottom-right` (page numbers only accept the six edge positions).

## Security considerations

- **Server-side validation is authoritative.** The client screens files for immediate feedback, but the server independently checks file type, size, and PDF structure (magic bytes + a real parse) before touching anything.
- **No path traversal.** Working files are addressed only by a random 32-hex-character id; the storage layer validates that id against a pattern and confirms the resolved path stays inside the storage directory before every read, write, or delete.
- **No executable uploads.** Only files with a `.pdf` extension and a PDF-compatible MIME type are accepted, and the bytes must actually parse as a PDF.
- **Rate limiting** on upload and processing endpoints, keyed by IP.
- **Encrypted PDFs are rejected with a clear message**, not silently mishandled — including a file this app protected itself.
- **Security headers** via Helmet, strict CORS allowlist, JSON body-size cap.
- **No secrets in the repo.** All configuration is via environment variables, validated at boot with Zod; `.env` is gitignored.
- **The signature image is validated defensively.** It's the one place the app accepts arbitrary client-supplied binary content: the data URL is size-capped (~2 MB decoded) and checked against the real PNG magic bytes before it's embedded, on top of the usual JSON body-size limit.
- **A password is only as good as the person who set it.** This app validates length (6–128 characters) but not strength, and there is no way to recover a lost password — by design, since a recoverable password wouldn't be a real one. `AES-256` is used unconditionally.

## Roadmap

Implemented in Phase 1: **Organize** (merge, split, reorder, delete, rotate).

Implemented in Phase 2: **Edit** (watermark, page numbers, signature) and part of **Security** (add password, view/remove metadata).

Planned, shown in the UI as "Soon" and not yet functional:

- **Edit** — form filling
- **Security** — remove password
- **Convert** — PDF ⇄ Word, PDF ⇄ JPG
- **Optimize** — compress, scanner cleanup
- **Extract** — text extraction, OCR

The backend is structured so each of these becomes a new service method, validator, and route — no restructuring required.
