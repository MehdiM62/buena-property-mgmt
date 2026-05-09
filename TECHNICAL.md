# Technical Documentation — Buena Property Management

> Companion to `README.md`. Covers every piece of logic, every restriction, every data
> contract, and how all parts connect. Intended for engineers reading the code.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [Domain Rules & Constraints](#3-domain-rules--constraints)
4. [Backend — Module Reference](#4-backend--module-reference)
   - 4.1 Properties
   - 4.2 Buildings
   - 4.3 Units
   - 4.4 Extraction
5. [API Reference](#5-api-reference)
6. [Frontend — Component Architecture](#6-frontend--component-architecture)
7. [State Machines](#7-state-machines)
8. [Data Flow: Key Scenarios](#8-data-flow-key-scenarios)
9. [Validation Rules](#9-validation-rules)
10. [Error Handling](#10-error-handling)
11. [Using the App — Full Walkthrough](#11-using-the-app--full-walkthrough)

---

## 1. System Architecture

```
Browser (Next.js 14 — port 3000)
        │
        │  HTTP via Next.js rewrites (/api/* → localhost:3001/*)
        ▼
NestJS API (port 3001)
        │
        │  Prisma Client (type-safe query builder)
        ▼
PostgreSQL 15 (port 5432, database: buena_db)
        │
        │  Local disk
        ▼
./uploads/  (uploaded PDFs stored here)
```

### Request path for a typical mutation

```
1. Browser calls  POST /api/properties/:id/buildings
2. Next.js rewrite proxies to  POST http://localhost:3001/properties/:id/buildings
3. NestJS global ValidationPipe runs class-validator against the DTO
4. BuildingsController.create() is invoked
5. BuildingsService.create() checks the property exists (404 if not)
6. PrismaService creates the row; returns Building with units: []
7. NestJS serialises the response as JSON
8. Next.js forwards it to the browser
```

### Technology choices and why

| Concern | Choice | Reason |
|---------|--------|--------|
| API framework | NestJS | Decorators, module isolation, DI out of the box |
| ORM | Prisma 5 | Schema-first, auto-generated type-safe client, clean migrations |
| DB | PostgreSQL 15 | Relational data, JSONB for extraction blob, cascade deletes |
| Frontend | Next.js 14 App Router | Server components by default, file-based routing |
| Styling | Tailwind CSS | Utility classes, no runtime CSS-in-JS |
| Toasts | react-hot-toast | Lightweight; must be rendered client-side only (see §6) |
| File upload | multer (disk storage) | Zero external dependency; adequate for demo |

---

## 2. Database Schema

Full Prisma schema lives in `backend/prisma/schema.prisma`.

### Entity relationship diagram

```
Property (1) ────< Building (1) ────< Unit
    │
    └─────────────< Extraction
```

- A **Property** has zero or more **Buildings**.
- A **Building** has zero or more **Units**.
- A **Property** has zero or more **Extractions** (at most one meaningful one at a time; each new extraction trigger deletes the previous).
- All child records cascade-delete when the parent is deleted.

### Property table

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | UUID | No | PK, `@default(uuid())` |
| name | String | No | — |
| object_number | String | No | `@unique` — no two properties may share it |
| management_type | Enum | No | `WEG` or `MV` |
| status | Enum | No | `draft` (default) or `active` |
| property_manager_name | String | Yes | — |
| property_manager_company | String | Yes | — |
| accountant_name | String | Yes | — |
| accountant_company | String | Yes | — |
| document_url | String | Yes | Set to `/uploads/<filename>` after PDF upload |
| created_at | DateTime | No | `@default(now())` |
| updated_at | DateTime | No | `@updatedAt` — auto-updated on every PATCH |

### Building table

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| property_id | UUID | No | FK → Property, `onDelete: Cascade` |
| name | String | No | — |
| street | String | No | — |
| house_number | String | No | — |
| additional_info | String | Yes | Free text, e.g. "10557 Berlin, 5 floors, elevator" |
| construction_year | Int | Yes | — |
| created_at | DateTime | No | `@default(now())` |

### Unit table

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| building_id | UUID | No | FK → Building, `onDelete: Cascade` |
| unit_number | String | No | — |
| type | Enum | No | `apartment`, `office`, `garden`, or `parking` |
| floor | String | Yes | e.g. `EG`, `1.OG`, `UG` |
| entrance | String | Yes | e.g. `A`, `B` |
| size_sqm | Decimal(10,2) | No | PostgreSQL `DECIMAL(10,2)` |
| co_ownership_share | String | No | Stored as string, format validated at API layer |
| construction_year | Int | Yes | — |
| rooms | Int | Yes | Null for parking/garden/office |
| created_at | DateTime | No | `@default(now())` |

### Extraction table

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| property_id | UUID | No | FK → Property, `onDelete: Cascade` |
| status | Enum | No | `pending`, `done`, or `failed`; default `pending` |
| raw_result | Json | Yes | JSONB; stores the full mock extraction payload |
| created_at | DateTime | No | `@default(now())` |

### Cascade delete behaviour

Deleting a **Property** cascades to all its **Buildings**, then from each **Building** to all its **Units**, and also to all **Extractions**. A single `DELETE /properties/:id` removes the entire tree atomically at the database level.

---

## 3. Domain Rules & Constraints

These rules are enforced at the **service layer** (NestJS), not just at the DB level.

### Property

| Rule | Where enforced | Error thrown |
|------|---------------|--------------|
| `object_number` must be globally unique | `PropertiesService.create` and `PropertiesService.update` | `409 Conflict` |
| `object_number` format must match `^\d{2}-\d{3}-[A-Z]{3}$` | DTO (`class-validator @Matches`) | `400 Bad Request` |
| Cannot delete an `active` property | `PropertiesService.remove` | `400 Bad Request` |
| Cannot publish an already-`active` property | `PropertiesService.publish` | `400 Bad Request` |
| `management_type` must be `WEG` or `MV` | DTO (`@IsEnum`) | `400 Bad Request` |

**object_number uniqueness on update**: When PATCHing a property's `object_number`, the uniqueness check explicitly excludes the property being updated (`WHERE object_number = ? AND id != ?`), so setting the same value again is allowed.

### Building

| Rule | Where enforced | Error thrown |
|------|---------------|--------------|
| Parent property must exist | `BuildingsService.create` | `404 Not Found` |
| `name`, `street`, `house_number` are required | DTO (`@IsNotEmpty`) | `400 Bad Request` |

**No restriction on number of buildings per property.** There is no upper bound enforced.

### Unit

| Rule | Where enforced | Error thrown |
|------|---------------|--------------|
| Parent building must exist | `UnitsService.create` and `UnitsService.bulkCreate` | `404 Not Found` |
| `type` must be one of `apartment`, `office`, `garden`, `parking` | DTO (`@IsEnum`) | `400 Bad Request` |
| `co_ownership_share` must match `^\d+(\.\d+)?\/\d+$` | DTO (`@Matches`) | `400 Bad Request` |
| `unit_number` is required and non-empty | DTO (`@IsNotEmpty`) | `400 Bad Request` |
| `size_sqm` is required | DTO (`@IsNotEmpty`) | `400 Bad Request` |
| Bulk create is atomic | `UnitsService.bulkCreate` — `prisma.$transaction` | All-or-nothing; any one failure rolls back all |

**There is no uniqueness constraint on `unit_number` within a building.** The API will accept duplicates; uniqueness is a UI-level concern only.

### Extraction

| Rule | Where enforced | Error thrown |
|------|---------------|--------------|
| Property must exist before extraction can be triggered | `ExtractionService.triggerExtraction` | `404 Not Found` |
| Only a `done` extraction can be applied | `ExtractionService.applyExtraction` | `400 Bad Request` |
| Triggering a new extraction replaces any prior one | `ExtractionService.triggerExtraction` — `deleteMany` | No error; silent replacement |
| Applying extraction **destroys existing buildings and units** | `ExtractionService.applyExtraction` — `building.deleteMany` | No error; destructive, reviewed by user in UI before apply |

---

## 4. Backend — Module Reference

### Module dependency graph

```
AppModule
├── PrismaModule (global, exported — available to all)
├── PropertiesModule  (PropertiesController, PropertiesService)
├── BuildingsModule   (BuildingsController, BuildingsService)
├── UnitsModule       (UnitsController, UnitsService)
└── ExtractionModule  (ExtractionController, ExtractionService)
```

`PrismaModule` is decorated `@Global()` and exports `PrismaService`, so no other module needs to import it explicitly.

### 4.1 PropertiesModule

**`PropertiesService.findAll()`**

Returns a lightweight list projection — only `id`, `name`, `object_number`, `management_type`, `status`, `created_at`, and a `_count.buildings` number. Full building/unit data is deliberately excluded for performance (it is loaded lazily in `findOne`).

**`PropertiesService.findOne(id)`**

Returns the full property with `buildings` included, each building including its `units`. Used by the detail page and the wizard "continue editing" flow.

**`PropertiesService.update(id, dto)`**

Accepts any subset of the property fields (all optional via `PartialType`). The uniqueness check on `object_number` only runs if the caller sends that field. The `status` field is intentionally **not** in the DTO — status transitions go through `publish()` only, not through a generic PATCH.

**`PropertiesService.publish(id)`**

One-way transition: `draft → active`. There is no `unpublish` endpoint. Once published, a property remains active permanently (unless deleted, which is blocked).

### 4.2 BuildingsModule

**`BuildingsService.create(propertyId, dto)`**

Verifies property existence before creating. Returns the new building with `units: []` (empty array, since a building cannot have units at creation time via this endpoint).

**`BuildingsService.remove(id)`**

Cascade delete via Prisma `onDelete: Cascade` — all units belonging to this building are automatically deleted at the database level. No explicit unit deletion needed.

### 4.3 UnitsModule

**`UnitsService.bulkCreate(buildingId, units[])`**

Core performance endpoint. Wraps all inserts in `prisma.$transaction([...])`. If any single unit fails validation or insertion, the entire batch rolls back. This matches the atomic guarantee described in the case study — "either all or none".

The bulk endpoint is used by the unit grid's "Save units" button. New rows (blue background) in the grid are collected, stripped of their internal `_tempId`/`_dirty`/`_new` flags, and posted to this endpoint. Existing modified rows (yellow background) are PATCH'd individually in parallel (`Promise.all`).

**`UnitsService.update(id, dto)`**

Does not validate business-level constraints beyond existence. Any field can be overwritten individually. The frontend dirty-tracking ensures only genuinely changed cells generate PATCH calls.

### 4.4 ExtractionModule

**`ExtractionService.triggerExtraction(propertyId, documentUrl?)`**

Steps performed in order:
1. Verify property exists (404 if not)
2. Delete any prior extraction rows for this property (`deleteMany`)
3. If a file was uploaded, update `property.document_url`
4. Create a new `Extraction` row with `status: 'done'` and the hardcoded `MOCK_EXTRACTION_RESULT` as `raw_result`
5. Return `{ extraction_id, status }`

The extraction is synchronous and immediate (mock). In production this would be asynchronous (file → queue → worker → webhook).

**`ExtractionService.applyExtraction(propertyId)`**

This is a **destructive write** — it replaces all buildings and units for the property. Steps:
1. Verify property exists
2. Find the most recent `done` extraction (400 if none)
3. `PATCH` the property's `name`, `management_type`, `property_manager_name`, `accountant_name` from `raw_result.property`
4. `deleteMany` all buildings for the property (cascades units)
5. For each building in `raw_result.buildings`: `INSERT` a new building row and record the mapping `{ "Haus A": uuid, "Haus A – Parkside": uuid }`
6. For each unit in `raw_result.units`: resolve `unit.building` string to a building UUID using the mapping, then queue a `prisma.unit.create`
7. Run all unit inserts in `prisma.$transaction([...])`
8. Return the full updated property with buildings and units

**Building name resolution during apply** (step 6): The `units[].building` field in the extraction payload contains a short name like `"Haus A"`. The building map stores two keys per building: the short prefix before `" – "` (e.g. `"Haus A"`) and the full name (e.g. `"Haus A – Parkside"`). The resolution first tries exact match, then falls back to `Object.keys(map).find(k => k.startsWith(unit.building))`. A 400 is thrown if no match is found.

---

## 5. API Reference

Base URL: `http://localhost:3001` (or via Next.js proxy: `http://localhost:3000/api`)

All request bodies are JSON (`Content-Type: application/json`) except the PDF upload endpoint which is `multipart/form-data`.

Global behaviour:
- **`ValidationPipe`** with `whitelist: true` is applied globally — any unknown fields in request bodies are silently stripped.
- **`transform: true`** is enabled — strings sent for `@Type(() => Number)` fields are automatically coerced.
- All IDs are UUID v4 strings.

### Properties

---

#### `GET /properties`

Returns all properties, newest first.

**Response 200**
```json
[
  {
    "id": "uuid",
    "name": "Parkview Residences Berlin",
    "object_number": "10-557-PRB",
    "management_type": "WEG",
    "status": "draft",
    "created_at": "2026-05-09T10:00:00.000Z",
    "_count": { "buildings": 2 }
  }
]
```

Note: `buildings` and `units` are **not** included here. Use `GET /properties/:id` for full detail.

---

#### `POST /properties`

Creates a new property with `status: draft`.

**Request body**
```json
{
  "name": "Parkview Residences Berlin",
  "object_number": "10-557-PRB",
  "management_type": "WEG",
  "property_manager_name": "ImmoGuard Berlin GmbH",
  "property_manager_company": "ImmoGuard",
  "accountant_name": "FinanzExpertise Müller & Co KG",
  "accountant_company": "FinanzExpertise"
}
```

Required fields: `name`, `object_number`, `management_type`.
Optional: `property_manager_name`, `property_manager_company`, `accountant_name`, `accountant_company`.

**Restrictions**
- `object_number` must match `^\d{2}-\d{3}-[A-Z]{3}$` → `400`
- `management_type` must be `"WEG"` or `"MV"` → `400`
- `object_number` must be globally unique → `409`

**Response 201** — the created property object.

---

#### `GET /properties/:id`

Returns the full property with nested buildings and units.

**Response 200**
```json
{
  "id": "uuid",
  "name": "...",
  "object_number": "10-557-PRB",
  "management_type": "WEG",
  "status": "draft",
  "property_manager_name": "...",
  "property_manager_company": "...",
  "accountant_name": "...",
  "accountant_company": "...",
  "document_url": "/uploads/1234567890-file.pdf",
  "created_at": "...",
  "updated_at": "...",
  "buildings": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "name": "Haus A – Parkside",
      "street": "Am Fiktivpark",
      "house_number": "12",
      "additional_info": "10557 Berlin, 5 floors, elevator",
      "construction_year": 2023,
      "created_at": "...",
      "units": [
        {
          "id": "uuid",
          "building_id": "uuid",
          "unit_number": "01",
          "type": "apartment",
          "floor": "EG",
          "entrance": "A",
          "size_sqm": "95.00",
          "co_ownership_share": "110.0/1000",
          "construction_year": 2023,
          "rooms": 3,
          "created_at": "..."
        }
      ]
    }
  ]
}
```

Note: `size_sqm` is returned as a **string** by Prisma when using `Decimal` — parse to float before arithmetic.

**Response 404** — if the ID does not exist.

---

#### `PATCH /properties/:id`

Updates any subset of property fields. All fields are optional.

**Request body** — any combination of fields from `POST /properties`. Fields not present are left unchanged.

**Restrictions**
- If `object_number` is sent, uniqueness is checked (excluding the current property).
- `status` is **not** a patchable field via this endpoint; use `POST /properties/:id/publish`.

**Response 200** — the updated property (without buildings/units — it's a flat update).

---

#### `DELETE /properties/:id`

Deletes the property and all its buildings, units, and extractions.

**Restrictions**
- Property must have `status: "draft"` → `400` if active.

**Response 204** — no body.

---

#### `POST /properties/:id/publish`

Transitions property status from `draft` to `active`.

**Restrictions**
- Property must currently be `draft` → `400` if already active.
- No body required.

**Response 200** — the updated property with `status: "active"`.

---

### Buildings

---

#### `POST /properties/:propertyId/buildings`

Adds a building to an existing property.

**Request body**
```json
{
  "name": "Haus A – Parkside",
  "street": "Am Fiktivpark",
  "house_number": "12",
  "additional_info": "10557 Berlin, 5 floors, elevator",
  "construction_year": 2023
}
```

Required: `name`, `street`, `house_number`. Optional: `additional_info`, `construction_year`.

**Restrictions**
- Property must exist → `404`

**Response 201** — the created building with `units: []`.

---

#### `GET /properties/:propertyId/buildings`

Returns all buildings for a property, each with their units.

**Response 200** — array of building objects.

---

#### `PATCH /buildings/:id`

Updates any subset of building fields.

**Restrictions**
- Building must exist → `404`

**Response 200** — the updated building with units.

---

#### `DELETE /buildings/:id`

Deletes the building and all its units.

**Restrictions**
- Building must exist → `404`

**Response 204** — no body.

---

### Units

---

#### `POST /buildings/:buildingId/units`

Creates a single unit.

**Request body**
```json
{
  "unit_number": "01",
  "type": "apartment",
  "floor": "EG",
  "entrance": "A",
  "size_sqm": 95.0,
  "co_ownership_share": "110.0/1000",
  "rooms": 3,
  "construction_year": 2023
}
```

Required: `unit_number`, `type`, `size_sqm`, `co_ownership_share`.
Optional: `floor`, `entrance`, `rooms`, `construction_year`.

**Restrictions**
- Building must exist → `404`
- `type` must be `apartment`, `office`, `garden`, or `parking` → `400`
- `co_ownership_share` must match `^\d+(\.\d+)?\/\d+$` (e.g. `"110.0/1000"`) → `400`

**Response 201** — the created unit.

---

#### `POST /buildings/:buildingId/units/bulk`

Creates multiple units in a single database transaction.

**Request body**
```json
{
  "units": [
    { "unit_number": "01", "type": "apartment", "size_sqm": 95.0, "co_ownership_share": "110.0/1000" },
    { "unit_number": "02", "type": "parking", "size_sqm": 12.5, "co_ownership_share": "1.0/1000" }
  ]
}
```

Each unit in the array is validated with the same rules as the single-create endpoint.

**Restrictions**
- Building must exist → `404`
- All units must pass validation → `400` (the transaction rolls back if any fail)

**Response 201** — array of created unit objects.

---

#### `PATCH /units/:id`

Updates any subset of unit fields.

**Restrictions**
- Unit must exist → `404`

**Response 200** — the updated unit.

---

#### `DELETE /units/:id`

Deletes a single unit.

**Restrictions**
- Unit must exist → `404`

**Response 204** — no body.

---

### Extraction

---

#### `POST /properties/:propertyId/extract`

Accepts a PDF upload and triggers extraction.

**Request** — `multipart/form-data`
- Field name: `file`
- Accepted MIME type: `application/pdf` only — multer rejects any other type with `400`
- File is stored to `./uploads/<timestamp>-<random>.<ext>` on disk

**What this endpoint actually does**
1. Saves the file to disk
2. Deletes any prior `Extraction` rows for this property
3. Updates `property.document_url` to the saved path
4. Creates a new `Extraction` row with `status: "done"` and the hardcoded mock payload as `raw_result`
5. Returns `{ extraction_id: "uuid", status: "done" }`

The PDF content is **not read or parsed**. The mock result is always the Parkview Residences dataset regardless of what file is uploaded.

**Restrictions**
- Property must exist → `404`
- Uploaded file must be `application/pdf` → multer throws `400`

---

#### `GET /properties/:propertyId/extraction`

Returns the most recent extraction result for a property.

**Response 200 (no extraction yet)**
```json
{ "status": "none", "raw_result": null }
```

**Response 200 (extraction exists)**
```json
{
  "id": "uuid",
  "status": "done",
  "raw_result": {
    "property": { ... },
    "buildings": [ ... ],
    "units": [ ... ]
  }
}
```

---

#### `POST /properties/:propertyId/extraction/apply`

Applies the most recent `done` extraction to the property. **Destructive**: replaces all existing buildings and units.

**Restrictions**
- Property must exist → `404`
- A `done` extraction must exist for this property → `400`
- No request body needed

**Response 200** — the full updated property with nested buildings and units (same shape as `GET /properties/:id`).

---

## 6. Frontend — Component Architecture

### File tree

```
src/
├── app/
│   ├── layout.tsx               Server component; nav bar + ToasterProvider
│   ├── page.tsx                 Dashboard: property list table
│   └── properties/
│       ├── [id]/
│       │   └── page.tsx         Property detail view (read + actions)
│       └── new/
│           └── page.tsx         Suspense wrapper → PropertyWizard
├── components/
│   ├── Portal.tsx               ReactDOM.createPortal wrapper (client-only)
│   ├── ToasterProvider.tsx      'use client' wrapper around react-hot-toast Toaster
│   └── wizard/
│       ├── PropertyWizard.tsx   Step orchestrator; owns property state
│       ├── Step1BasicInfo.tsx   Form + PDF upload + extraction trigger
│       ├── ExtractionReview.tsx Modal (rendered via Portal)
│       ├── Step2Buildings.tsx   Building add/remove
│       └── Step3Units.tsx       Inline editable unit grid
└── lib/
    ├── api.ts                   Typed fetch wrapper; all API calls
    └── types.ts                 Shared TypeScript interfaces
```

### Why `ToasterProvider` is a separate file

`layout.tsx` is a **Server Component** (no `'use client'`). The `Toaster` from `react-hot-toast` uses browser APIs (`document`, `MutationObserver`). Importing a client-only library directly into a server component causes an SSR/hydration mismatch — the server renders one DOM structure, the client hydrates a different one, and React throws a `removeChild` error when it tries to reconcile. The fix is to isolate `Toaster` in its own `'use client'` component so Next.js correctly marks that subtree as client-only and skips SSR for it.

### Why `Portal` wraps the extraction modal

`ExtractionReview` is conditionally rendered inside a `grid` div in `Step1BasicInfo`. When file selection triggers multiple state updates (`setUploadState → setExtraction → setShowReview`), React re-renders the grid and its children. If a prior hydration mismatch has left React's virtual DOM out of sync with the real DOM, React's attempt to `removeChild` the modal from the grid fails. Rendering via `ReactDOM.createPortal` attaches the modal directly to `document.body`, completely outside the component subtree, so its mount/unmount lifecycle is independent of any parent re-renders.

### `PropertyWizard` — state ownership

`PropertyWizard` is the single owner of the `property` state object. Steps communicate upward via callbacks:

```
PropertyWizard
│   state: property (Property | null), step (0 | 1 | 2)
│
├── Step1BasicInfo
│       onSave(data)          → wizard calls create or update, sets property, advances to step 1
│       onExtractionApplied() → wizard sets property from apply response, advances to step 1
│
├── Step2Buildings
│       onNext()              → wizard advances to step 2
│       onBack()              → wizard goes back to step 0
│
└── Step3Units
        onPublish()           → wizard calls publish, navigates to dashboard
        onBack()              → wizard goes back to step 1
```

Each step independently fetches what it needs (`Step2Buildings` and `Step3Units` both call `api.properties.get(property.id)` on mount) to ensure they reflect any server-side changes from extraction apply.

### `Step3Units` — unit grid row lifecycle

Each row in the grid carries three internal flags that are never sent to the API:

| Flag | Meaning | Visual indicator |
|------|---------|-----------------|
| `_new: true` | Row was added this session, not yet persisted | Blue background |
| `_dirty: true` | Row exists in DB but has unsaved changes | Yellow background |
| neither | Row is clean (matches DB state) | No highlight |

When "Save units" is clicked:
1. All `_new` rows for the active building are collected and sent as a single `POST /bulk` request.
2. On success, temp rows are replaced with the server-returned rows (which have real UUIDs).
3. All `_dirty` rows are updated in parallel with individual `PATCH /units/:id` calls.
4. All flags are cleared.

Deleting a `_new` row (not yet in DB) removes it from local state only — no API call. Deleting a persisted row calls `DELETE /units/:id` immediately (no "Save" required).

### MEA live calculation

The MEA (Miteigentumsanteil) total is recalculated on every row change or building tab switch:

```
totalMEA = sum of parseFloat(row.co_ownership_share.split('/')[0])
           for all rows where row.building_id === selectedBuilding
```

If `totalMEA > 0` and `Math.abs(totalMEA - 1000) > 0.1`, a red warning shows: "MEA total: X.X/1000 ⚠ expected 1000". If it is within 0.1 of 1000, a green "✓" shows. The threshold of 0.1 accounts for floating-point rounding in the displayed shares.

### `api.ts` — typed fetch client

All API calls go through the `request<T>()` helper:

```typescript
async function request<T>(path, options): Promise<T>
```

- Prefixes all calls with `/api` (hits the Next.js rewrite proxy)
- Parses the JSON response and returns it typed
- Throws an `Error` with the server's `message` field if status is not 2xx
- Returns `undefined` for `204 No Content` responses

The PDF upload bypasses this helper (uses raw `fetch` with `FormData` — cannot set `Content-Type: application/json` when uploading a file).

---

## 7. State Machines

### Property status

```
         POST /properties
               │
               ▼
           [ draft ]  ◄──── (default on create)
               │
               │  POST /properties/:id/publish
               │
               ▼
           [ active ]
```

- `draft → active`: allowed, via `POST /properties/:id/publish`
- `active → draft`: **not allowed** (no endpoint exists)
- `active → deleted`: **not allowed** (`DELETE` returns `400`)
- `draft → deleted`: allowed, via `DELETE /properties/:id`

### Extraction flow

```
No extraction
      │
      │  POST /extract  (PDF upload)
      │  Deletes any prior extraction first
      ▼
  status: done  (immediate, mock — no async step)
      │
      │  GET /extraction   (frontend polls or reads)
      │
      │  POST /extraction/apply
      │  (user clicked "Apply extracted data" in review modal)
      ▼
  Property + buildings + units updated
  (Extraction row remains; triggering again replaces it)
```

### Wizard step transitions

```
Step 0 (Basic Info)
    │  "Create property" or "Save & continue"
    │  → API create or update succeeds
    │  OR: extraction applied (skips step 0 save requirement)
    ▼
Step 1 (Buildings)
    │  "Next: Units →"
    │  → at least 1 building must exist
    ▼
Step 2 (Units)
    │  "Publish property"
    │  → calls POST /properties/:id/publish
    │  → navigates to dashboard
```

Backward navigation is always allowed (step > 0 can go to any previous step by clicking the step indicator). The `?id=` query parameter in the URL persists the property ID across refreshes.

---

## 8. Data Flow: Key Scenarios

### Scenario A: Manual property creation (no document upload)

```
1. User fills form in Step 1
2. Clicks "Create property"
   → POST /properties  →  201 Property{status: draft}
   → wizard stores property, advances to step 1

3. User adds a building in Step 2
   → POST /properties/:id/buildings  →  201 Building{units:[]}

4. User clicks "Next: Units →"
   → Step 3 mounts, calls GET /properties/:id
   → Buildings loaded with units (empty)
   → selectedBuilding = first building's ID

5. User clicks "+ Add unit", fills cells (row turns blue)
   → state only, no API call yet

6. User clicks "Save units"
   → POST /buildings/:id/units/bulk { units: [...] }
   → prisma.$transaction([...inserts...])
   → rows replaced with persisted data (no more blue)

7. User clicks "Publish property"
   → POST /properties/:id/publish  →  200 Property{status: active}
   → router.push('/')
```

### Scenario B: Document-assisted onboarding (PDF upload path)

```
1. User fills Step 1 form, clicks "Create property"
   → POST /properties  →  201 Property{status: draft}

2. User clicks "Click to upload PDF" in the sidebar panel
   → <input type="file"> opens
   → File selected → handleFileChange fires
   → e.target.value = ''  (reset so same file can be re-selected)
   → setUploadState('uploading')

3. POST /properties/:id/extract  (multipart/form-data)
   → multer saves file to ./uploads/
   → ExtractionService:
       deleteMany(property_id)   — clear any prior extraction
       property.update(document_url)
       extraction.create({ status: 'done', raw_result: MOCK })
   → returns { extraction_id, status: 'done' }

4. GET /properties/:id/extraction
   → returns { id, status: 'done', raw_result: { property, buildings, units } }
   → setExtraction(result)
   → setUploadState('done')
   → setShowReview(true)

5. ExtractionReview modal opens (rendered via Portal at document.body)
   → User reviews property fields, 2 buildings, 14 units

6. User clicks "Apply extracted data"
   → POST /properties/:id/extraction/apply
   → property.update(name, management_type, manager, accountant)
   → building.deleteMany(property_id)  — clears any manual buildings added earlier
   → buildings re-created from raw_result.buildings
   → units bulk-created in prisma.$transaction
   → returns full Property with buildings + units
   → onExtractionApplied(updated) called in wizard
   → wizard advances to Step 1 (Buildings)

7. Step 2: buildings already populated from extraction, user confirms
8. Step 3: 14 unit rows pre-loaded (no blue — they're already in DB)
9. User may edit cells → rows turn yellow → "Save units" patches them
10. "Publish property" → POST /publish → dashboard
```

---

## 9. Validation Rules

### Summary table

| Field | Rule | Regex / enum |
|-------|------|-------------|
| `object_number` | Required, unique, formatted | `^\d{2}-\d{3}-[A-Z]{3}$` |
| `management_type` | Enum | `WEG` or `MV` |
| `co_ownership_share` | Required, formatted | `^\d+(\.\d+)?\/\d+$` |
| `unit.type` | Enum | `apartment`, `office`, `garden`, `parking` |
| `unit.unit_number` | Required, non-empty string | — |
| `unit.size_sqm` | Required, non-empty | No range check |
| `building.name` | Required, non-empty string | — |
| `building.street` | Required, non-empty string | — |
| `building.house_number` | Required, non-empty string | — |
| `construction_year` | Optional integer | Coerced by `@Type(() => Number)` |
| `rooms` | Optional integer | Coerced by `@Type(() => Number)` |

### `object_number` format breakdown

```
^\d{2}-\d{3}-[A-Z]{3}$
  ──    ─────   ───────
  10  - 557  - PRB
```

Exactly 2 digits, hyphen, 3 digits, hyphen, 3 uppercase letters. No spaces. No lowercase. Frontend shows `pattern="\d{2}-\d{3}-[A-Z]{3}"` on the HTML input for native browser validation before the API call.

### `co_ownership_share` format breakdown

```
^\d+(\.\d+)?\/\d+$
  ────────────  ───
  110.0        1000
```

A numeric numerator (integer or decimal), a `/`, then a numeric denominator. Examples: `"110.0/1000"`, `"1/1000"`, `"5.5/1000"`. No spaces. The denominator is conventionally 1000 (MEA), but any number is accepted by the API.

### Global `ValidationPipe` settings

`whitelist: true` — strips any request body fields not declared in the DTO. This prevents callers from injecting fields like `status` or `id`.
`transform: true` — automatically transforms query/body primitives to their declared TypeScript types (e.g., numeric strings `"2023"` become `2023` for `@IsInt` fields).

---

## 10. Error Handling

### HTTP status codes used

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PATCH, POST (publish/apply) |
| 201 | Created | Successful POST create |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failure, business rule violation |
| 404 | Not Found | Unknown ID |
| 409 | Conflict | Duplicate `object_number` |

### Error response shape

NestJS default:
```json
{
  "statusCode": 400,
  "message": "object_number must match format XX-XXX-XXX (e.g. 10-557-PRB)",
  "error": "Bad Request"
}
```

For validation pipe failures with multiple fields, `message` becomes an array:
```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "object_number must match format XX-XXX-XXX (e.g. 10-557-PRB)"
  ],
  "error": "Bad Request"
}
```

### Frontend error handling

The `request<T>()` function in `api.ts` reads the `message` field from the error body and throws a JavaScript `Error` with that message. Components catch it in `try/catch` and call `toast.error(e.message)` to display it. This means server validation messages are surfaced directly to the user.

---

## 11. Using the App — Full Walkthrough

### Starting from the dashboard

- **Clicking a property row** navigates to `/properties/:id` (the detail view).
- **"Edit"** button on any row opens the wizard pre-loaded with that property's data.
- **"Publish"** button (draft only) publishes without entering the wizard.
- **"Delete"** button (draft only) asks for confirmation, then calls `DELETE /properties/:id`.

### Creating a property — required fields

You cannot create a property without:
1. **Name** — any non-empty string
2. **Object number** — must match `XX-XXX-XXX` exactly (e.g. `10-557-PRB`)
3. **Management type** — select WEG or MV

All other fields (managers, accountants) are optional at every stage.

### When can a property be published?

There is no server-side check requiring buildings or units before publishing. Publishing is allowed from any state as long as `status === 'draft'`. The wizard's "Publish property" button in Step 3 is the primary publish path, but the dashboard "Publish" button works at any time.

### What applying extraction overwrites

Clicking "Apply extracted data" in the review modal overwrites:
- `property.name`
- `property.management_type`
- `property.property_manager_name`
- `property.accountant_name`

It **does not overwrite**:
- `object_number` (must remain unique; the extracted value is shown for reference but not applied)
- `property_manager_company`, `accountant_company`
- `document_url` (set earlier by the upload step)

It **destroys and rebuilds**:
- All buildings
- All units (cascaded from building deletion)

If you had manually added buildings and units before uploading a document, **they will be gone after apply**. The review modal warns: "Applying this data will replace any existing buildings and units."

### Switching buildings in Step 3

When a property has multiple buildings (e.g., Haus A and Haus B after extraction apply), building tabs appear at the top of Step 3. Each tab shows only that building's units. The MEA total shown in the header is per-building, not cross-building.

**"Save units" only saves units for the currently selected building tab.** If you add units to Haus A and then switch to Haus B without saving, the Haus A additions are still in local state (blue rows) but not persisted. Switch back to Haus A and click "Save units" before navigating away.

### Re-uploading a document

Uploading a new PDF is always allowed, even if extraction was already applied. The new upload:
1. Replaces the stored `document_url` on the property
2. Replaces the `Extraction` row
3. Shows the review modal again

It does **not** automatically re-apply — you must click "Apply extracted data" again. This re-application will again destroy existing buildings and units.

### Deleting vs. navigating away from a draft

Navigating away from the wizard (clicking "← Back") does **not** delete the draft property. The property is saved as a draft and will appear in the dashboard. It can be resumed at any time via the "Edit" button.

To permanently remove a property, use the "Delete" button in the dashboard (only visible for drafts) or on the detail page.

### Active properties

Once a property is published:
- It **cannot be deleted** (API returns 400)
- It **cannot be unpublished** (no endpoint exists)
- It **can still be edited** via the wizard's "Edit in wizard" link — PATCH calls on name, buildings, and units continue to work regardless of status
- It appears in the dashboard without Publish/Delete buttons
- Clicking the row goes to the read-only detail page showing all buildings and units

---

*End of technical documentation.*
