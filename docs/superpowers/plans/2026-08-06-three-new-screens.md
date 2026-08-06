# Three New Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new nav screens — Showroom (favorite car models), Records (personal bests), and History (past races + rematch) — that finish wiring backend capability (`toggleFavorite`, `resolvePersonalBest`, `buildRematchRace`) which already exists in `server/` but has no frontend surface today.

**Architecture:** Two small backend additions (a new `GET /api/personal-bests` route and exposing `favoriteCarModelIds` on the public user) plus a frontend data-layer task (new `RaceDbService` methods/types), followed by three independent screen tasks. Each screen is a standalone, lazy-loaded, `authGuard`-protected route with its own local signals — no changes to the shared `RaceStateService`.

**Tech Stack:** Angular 22 (standalone components, signals, `inject()`), Vitest for both frontend (`ng test`) and backend (`npx vitest run server/...`) tests, Express/MongoDB backend.

## Global Constraints

- Do NOT set `standalone: true` or `changeDetection: ChangeDetectionStrategy.OnPush` on any `@Component` — both are the default.
- Use `input()`/`output()` functions, not decorators (not needed here — no new inputs/outputs).
- Use `inject()`, never constructor injection.
- Use native control flow (`@if`, `@for`) — no `*ngIf`/`*ngFor`.
- No `ngClass`/`ngStyle` — use `class`/`style` bindings.
- Signals only: `set`/`update`, never `mutate`.
- Dynamic status messages must use `role="alert"` or `role="status"`.
- Favor `computed()` over logic embedded in templates; no chained/nested ternaries in templates.
- Backend: throw `ApiError` + `asyncHandler`, verify resource ownership server-side, validate payloads before touching the DB (per `ENGINEERING_PRACTICES.md`).
- Every new service method and every new screen gets test coverage.

---

## File Structure

**Backend:**
- Modify `server/personal-best.model.js` — add `formatPersonalBest`.
- Modify `server/personal-best.model.spec.js` — cover it.
- Modify `server/server.js` — add `GET /api/personal-bests`.
- Modify `server/auth.model.js` — `formatPublicUser` includes `favoriteCarModelIds`.
- Modify `server/auth.model.spec.js` — cover it.

**Frontend data layer:**
- Modify `src/app/data/race-db/race-db.models.ts` — add `PersonalBestRecord`, `RematchRaceRecord`.
- Modify `src/app/data/race-db/mongo.config.ts` — add `personalBests` endpoint.
- Modify `src/app/data/race-db/race-db.service.ts` — add `getPersonalBests`, `toggleFavoriteCarModel`, `rematchRace`.
- Modify `src/app/data/race-db/race-db.service.spec.ts` — cover the three new methods.
- Modify `src/app/auth.service.ts` — `AuthUser` gains `favoriteCarModelIds: string[]`.

**Showroom screen:**
- Create `src/app/showroom-view.ts`, `.html`, `.css`, `.spec.ts`.
- Modify `src/app/app.routes.ts`, `src/app/app.html`, `src/app/app.spec.ts`.

**Records screen:**
- Create `src/app/records-view.ts`, `.html`, `.css`, `.spec.ts`.
- Modify `src/app/app.routes.ts`, `src/app/app.html`, `src/app/app.spec.ts`.

**History screen:**
- Create `src/app/history-view.ts`, `.html`, `.css`, `.spec.ts`.
- Modify `src/app/app.routes.ts`, `src/app/app.html`, `src/app/app.spec.ts`.

**Docs:**
- Modify `README.md` — add the three screens to Features, then run the full test suite once at the end.

---

### Task 1: Backend — `GET /api/personal-bests`

**Files:**
- Modify: `server/personal-best.model.js`
- Test: `server/personal-best.model.spec.js`
- Modify: `server/server.js`

**Interfaces:**
- Produces: `formatPersonalBest(record: { carModelId, finishTimeMs, achievedAt, ... }) => { carModelId, finishTimeMs, achievedAt }`, exported from `server/personal-best.model.js`.
- Produces: route `GET /api/personal-bests` (authenticated) returning `Array<{ carModelId, finishTimeMs, achievedAt }>` sorted by `finishTimeMs` ascending, scoped to `req.auth.userId`.

- [ ] **Step 1: Write the failing test for `formatPersonalBest`**

Add to the bottom of `server/personal-best.model.spec.js`, inside the existing `describe('personal-best.model', ...)` block (as a sibling to the existing `describe('resolvePersonalBest', ...)` block), and add `formatPersonalBest` to the import list at the top of the file:

```js
import { describe, expect, it } from 'vitest';
import {
  canRacerFinish,
  findRacerInRace,
  formatPersonalBest,
  markRacerFinished,
  nextRacePosition,
  resolvePersonalBest,
  validateFinishPayload
} from './personal-best.model.js';
```

```js
  describe('formatPersonalBest', () => {
    it('keeps only the public shape, stripping internal fields', () => {
      const record = {
        _id: 'mongo-id',
        ownerId: 'user-1',
        carModelId: 'Vanta',
        finishTimeMs: 1840,
        achievedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(formatPersonalBest(record)).toEqual({
        carModelId: 'Vanta',
        finishTimeMs: 1840,
        achievedAt: '2024-01-01T00:00:00.000Z'
      });
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/personal-best.model.spec.js`
Expected: FAIL — `formatPersonalBest is not a function` (or import error).

- [ ] **Step 3: Implement `formatPersonalBest`**

Add to the bottom of `server/personal-best.model.js`:

```js
export function formatPersonalBest(record) {
  return {
    carModelId: record.carModelId,
    finishTimeMs: record.finishTimeMs,
    achievedAt: record.achievedAt
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/personal-best.model.spec.js`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 5: Wire the route into `server/server.js`**

In the import block at the top of `server/server.js` (currently lines 18–26), add `formatPersonalBest` to the destructured import from `./personal-best.model.js`:

```js
import {
  PERSONAL_BEST_COLLECTION_NAME,
  canRacerFinish,
  findRacerInRace,
  formatPersonalBest,
  markRacerFinished,
  nextRacePosition,
  resolvePersonalBest,
  validateFinishPayload
} from './personal-best.model.js';
```

Then add the new route directly after the `/api/car-models/:carModelId/favorite` route (the block that ends with `res.status(200).json({ carModelId, favorited, favoriteCarModelIds });\n  })\n);`) and before the `/api/races` `GET` route:

```js
app.get(
  '/api/personal-bests',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const records = await db
      .collection(PERSONAL_BEST_COLLECTION_NAME)
      .find({ ownerId: req.auth.userId })
      .sort({ finishTimeMs: 1 })
      .toArray();

    res.json(records.map(formatPersonalBest));
  })
);
```

- [ ] **Step 6: Sanity-check the server still boots**

Run: `node --check server/server.js`
Expected: no output (syntax is valid). This does not require a running MongoDB.

- [ ] **Step 7: Commit**

```bash
git add server/personal-best.model.js server/personal-best.model.spec.js server/server.js
git commit -m "feat(api): add GET /api/personal-bests endpoint"
```

---

### Task 2: Backend — expose `favoriteCarModelIds` on the public user

**Files:**
- Modify: `server/auth.model.js:178-185`
- Test: `server/auth.model.spec.js`

**Interfaces:**
- Produces: `formatPublicUser(user)` now includes `favoriteCarModelIds: string[]` (defaults to `[]` when the user document has none), consumed by every route that returns a user (`/api/register`, `/api/login`, `/api/me`).

- [ ] **Step 1: Write the failing tests**

Add `formatPublicUser` to the import list at the top of `server/auth.model.spec.js`:

```js
import {
  createAuthToken,
  verifyAuthToken,
  validateLoginPayload,
  validateRegisterPayload,
  formatPublicUser,
  hashPassword,
  verifyPassword
} from './auth.model.js';
```

Append to the bottom of the `describe('auth.model', ...)` block, before its closing `});`:

```js
  it('defaults favoriteCarModelIds to an empty array when the user has none', () => {
    const publicUser = formatPublicUser({
      _id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01T00:00:00.000Z'
    });

    expect(publicUser.favoriteCarModelIds).toEqual([]);
  });

  it('passes through existing favoriteCarModelIds', () => {
    const publicUser = formatPublicUser({
      _id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01T00:00:00.000Z',
      favoriteCarModelIds: ['Vanta', 'Rift']
    });

    expect(publicUser.favoriteCarModelIds).toEqual(['Vanta', 'Rift']);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/auth.model.spec.js`
Expected: FAIL — `publicUser.favoriteCarModelIds` is `undefined`.

- [ ] **Step 3: Implement the change**

In `server/auth.model.js`, replace the `formatPublicUser` function (currently lines 178–185):

```js
export function formatPublicUser(user) {
  return {
    id: user._id?.toString?.() ?? user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}
```

with:

```js
export function formatPublicUser(user) {
  return {
    id: user._id?.toString?.() ?? user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    favoriteCarModelIds: user.favoriteCarModelIds ?? []
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run server/auth.model.spec.js`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add server/auth.model.js server/auth.model.spec.js
git commit -m "feat(api): expose favoriteCarModelIds on the public user"
```

---

### Task 3: Frontend data layer — types, `RaceDbService` methods, `AuthUser`

**Files:**
- Modify: `src/app/data/race-db/race-db.models.ts`
- Modify: `src/app/data/race-db/mongo.config.ts`
- Modify: `src/app/data/race-db/race-db.service.ts`
- Test: `src/app/data/race-db/race-db.service.spec.ts`
- Modify: `src/app/auth.service.ts:4-9`

**Interfaces:**
- Consumes: `MONGO_CONFIG.endpoints.carModels`/`races` (existing), `this.authHeaders`, `this.baseUrl` (existing private members of `RaceDbService`).
- Produces (consumed by Tasks 4–6):
  - `PersonalBestRecord { carModelId: string; finishTimeMs: number; achievedAt: string }`
  - `RematchRaceRecord { id: string; name: string; status: string; createdAt: string; racers: RacerRecord[]; results: RaceResultRecord[] }`
  - `RaceDbService.getPersonalBests(): Promise<PersonalBestRecord[]>`
  - `RaceDbService.toggleFavoriteCarModel(carModelId: string): Promise<{ favorited: boolean; favoriteCarModelIds: string[] }>`
  - `RaceDbService.rematchRace(raceId: string): Promise<RematchRaceRecord>`
  - `AuthUser.favoriteCarModelIds: string[]`

- [ ] **Step 1: Write the failing tests**

Append to the bottom of the `describe('RaceDbService', ...)` block in `src/app/data/race-db/race-db.service.spec.ts`, before its closing `});`:

```ts
  it('loads personal bests from the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ carModelId: 'Vanta', finishTimeMs: 1840, achievedAt: '2024-01-01T00:00:00.000Z' }]
    } as Response);

    const bests = await service.getPersonalBests();

    expect(bests).toHaveLength(1);
    expect(bests[0].carModelId).toBe('Vanta');
  });

  it('toggles a favorite car model via the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ favorited: true, favoriteCarModelIds: ['Vanta'] })
    } as Response);

    const result = await service.toggleFavoriteCarModel('Vanta');

    expect(result.favorited).toBe(true);
    expect(result.favoriteCarModelIds).toEqual(['Vanta']);
  });

  it('creates a rematch race via the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'race-2',
        name: 'Night Sprint (Rematch)',
        status: 'pending',
        createdAt: '2024-01-02T00:00:00.000Z',
        racers: [],
        results: []
      })
    } as Response);

    const rematch = await service.rematchRace('race-1');

    expect(rematch.id).toBe('race-2');
    expect(rematch.name).toBe('Night Sprint (Rematch)');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --include=src/app/data/race-db/race-db.service.spec.ts --watch=false`
Expected: FAIL — `service.getPersonalBests is not a function` (and similarly for the other two).

- [ ] **Step 3: Add the new types**

Append to the bottom of `src/app/data/race-db/race-db.models.ts`:

```ts
export interface PersonalBestRecord {
  carModelId: string;
  finishTimeMs: number;
  achievedAt: string;
}

export interface RematchRaceRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  racers: RacerRecord[];
  results: RaceResultRecord[];
}
```

- [ ] **Step 4: Add the `personalBests` endpoint to `MONGO_CONFIG`**

In `src/app/data/race-db/mongo.config.ts`, replace:

```ts
  endpoints: {
    races: '/api/races',
    carModels: '/api/car-models'
  },
```

with:

```ts
  endpoints: {
    races: '/api/races',
    carModels: '/api/car-models',
    personalBests: '/api/personal-bests'
  },
```

- [ ] **Step 5: Implement the three `RaceDbService` methods**

In `src/app/data/race-db/race-db.service.ts`, update the `import type` line at the top:

```ts
import type { CarModelRecord, PersonalBestRecord, RaceRecord, RematchRaceRecord, RaceResultRecord, RaceSummary, RacerRecord } from './race-db.models';
```

Then add these three methods to the end of the class, after `getRacers` and before the closing `}`:

```ts
  async getPersonalBests(): Promise<PersonalBestRecord[]> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.personalBests}`, {
      headers: { ...this.authHeaders }
    });

    if (!response.ok) {
      throw new Error('Unable to load personal bests from MongoDB API.');
    }

    return response.json() as Promise<PersonalBestRecord[]>;
  }

  async toggleFavoriteCarModel(carModelId: string): Promise<{ favorited: boolean; favoriteCarModelIds: string[] }> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.carModels}/${carModelId}/favorite`, {
      method: 'POST',
      headers: { ...this.authHeaders }
    });

    if (!response.ok) {
      throw new Error('Unable to update favorite car models in MongoDB.');
    }

    return response.json() as Promise<{ favorited: boolean; favoriteCarModelIds: string[] }>;
  }

  async rematchRace(raceId: string): Promise<RematchRaceRecord> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}/${raceId}/rematch`, {
      method: 'POST',
      headers: { ...this.authHeaders }
    });

    if (!response.ok) {
      throw new Error('Unable to create a rematch in MongoDB.');
    }

    return response.json() as Promise<RematchRaceRecord>;
  }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --include=src/app/data/race-db/race-db.service.spec.ts --watch=false`
Expected: PASS (all tests in the file).

- [ ] **Step 7: Add `favoriteCarModelIds` to `AuthUser`**

In `src/app/auth.service.ts`, replace the `AuthUser` interface (currently lines 4–9):

```ts
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}
```

with:

```ts
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  favoriteCarModelIds: string[];
}
```

- [ ] **Step 8: Run the full frontend suite to confirm nothing else broke**

Run: `npx ng test --watch=false`
Expected: PASS (existing tests use `(auth as any).userSource.set({...})`, which bypasses the type check, so no other file needs to change).

- [ ] **Step 9: Commit**

```bash
git add src/app/data/race-db/race-db.models.ts src/app/data/race-db/mongo.config.ts src/app/data/race-db/race-db.service.ts src/app/data/race-db/race-db.service.spec.ts src/app/auth.service.ts
git commit -m "feat(data): add personal-bests and favorite/rematch methods to RaceDbService"
```

---

### Task 4: Showroom screen (`/showroom`)

**Files:**
- Create: `src/app/showroom-view.ts`
- Create: `src/app/showroom-view.html`
- Create: `src/app/showroom-view.css`
- Test: `src/app/showroom-view.spec.ts`
- Modify: `src/app/app.routes.ts:11-15`
- Modify: `src/app/app.html:26-32`
- Modify: `src/app/app.spec.ts:38-56`

**Interfaces:**
- Consumes: `RaceDbService.getCarModels(): Promise<CarModelRecord[]>` (existing), `RaceDbService.toggleFavoriteCarModel(id): Promise<{ favorited, favoriteCarModelIds }>` (Task 3), `AuthService.user(): AuthUser | null` with `favoriteCarModelIds` (Task 3).
- Produces: `ShowroomView` component, route `path: 'showroom'`.

- [ ] **Step 1: Write the component test file (will fail to import until Step 3)**

Create `src/app/showroom-view.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShowroomView } from './showroom-view';
import { AuthService } from './auth.service';

function mockRaceDb() {
  return {
    getCarModels: vi.fn().mockResolvedValue([
      { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
      { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' }
    ]),
    toggleFavoriteCarModel: vi.fn().mockResolvedValue({ favorited: true, favoriteCarModelIds: ['Vanta'] })
  };
}

describe('ShowroomView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ShowroomView>>;
  let component: ShowroomView;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    const auth = TestBed.inject(AuthService);
    (auth as any).userSource.set({
      id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01',
      favoriteCarModelIds: []
    });

    fixture = TestBed.createComponent(ShowroomView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads car models and renders them as cards', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vanta');
    expect(compiled.textContent).toContain('Rift');
  });

  it('toggles a favorite and reflects it in the UI', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const favoriteButton = compiled.querySelector('button[aria-label="Favorite Vanta"]') as HTMLButtonElement;
    favoriteButton.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('button[aria-label="Unfavorite Vanta"]')).not.toBeNull();
  });

  it('shows an error banner when loading car models fails', async () => {
    (component as any).raceDb.getCarModels.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load car models');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --include=src/app/showroom-view.spec.ts --watch=false`
Expected: FAIL — cannot resolve `./showroom-view`.

- [ ] **Step 3: Create the component**

Create `src/app/showroom-view.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RaceDbService } from './data/race-db';
import type { CarModelRecord } from './data/race-db';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-showroom-view',
  imports: [],
  templateUrl: './showroom-view.html',
  styleUrl: './showroom-view.css'
})
export class ShowroomView implements OnInit {
  private readonly raceDb = inject(RaceDbService);
  private readonly auth = inject(AuthService);

  protected readonly carModels = signal<CarModelRecord[]>([]);
  protected readonly favoriteIds = signal<string[]>(this.auth.user()?.favoriteCarModelIds ?? []);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingId = signal<string | null>(null);

  protected readonly cards = computed(() => {
    const favorites = new Set(this.favoriteIds());

    return [...this.carModels()]
      .map((model) => {
        const favorited = favorites.has(model.id);
        return {
          model,
          favorited,
          favoriteLabel: `${favorited ? 'Unfavorite' : 'Favorite'} ${model.name}`
        };
      })
      .sort((first, second) => Number(second.favorited) - Number(first.favorited));
  });

  ngOnInit(): void {
    void this.loadCarModels();
  }

  private async loadCarModels(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.carModels.set(await this.raceDb.getCarModels());
    } catch {
      this.error.set('Unable to load car models. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleFavorite(carModelId: string): Promise<void> {
    this.pendingId.set(carModelId);
    this.error.set(null);
    try {
      const result = await this.raceDb.toggleFavoriteCarModel(carModelId);
      this.favoriteIds.set(result.favoriteCarModelIds);
    } catch {
      this.error.set('Unable to update favorites. Try again shortly.');
    } finally {
      this.pendingId.set(null);
    }
  }

  protected isPending(carModelId: string): boolean {
    return this.pendingId() === carModelId;
  }
}
```

Create `src/app/showroom-view.html`:

```html
<section class="showroom-panel">
  <div class="showroom-header">
    <h2>Showroom</h2>
    <p>Every chassis in the fleet. Star your favorites to find them faster next time.</p>
  </div>

  @if (error()) {
    <p class="status-banner status-banner--error" role="alert">{{ error() }}</p>
  }

  @if (loading()) {
    <p class="status-banner" role="status">Loading car models…</p>
  } @else {
    <div class="showroom-grid">
      @for (card of cards(); track card.model.id) {
        <div class="showroom-card" [class.favorited]="card.favorited">
          <div class="showroom-card__swatch" [style.background]="card.model.accent"></div>
          <div class="showroom-card__body">
            <strong>{{ card.model.name }}</strong>
            <p>{{ card.model.tag }}</p>
          </div>
          <button
            type="button"
            class="favorite-btn"
            [class.active]="card.favorited"
            [attr.aria-pressed]="card.favorited"
            [attr.aria-label]="card.favoriteLabel"
            [disabled]="isPending(card.model.id)"
            (click)="toggleFavorite(card.model.id)"
          >★</button>
        </div>
      }
    </div>
  }
</section>
```

Create `src/app/showroom-view.css`:

```css
.showroom-panel {
  display: grid;
  gap: 20px;
}

.showroom-header h2 {
  margin: 0 0 6px;
  color: #ffffff;
}

.showroom-header p {
  margin: 0;
  color: #cdd6f7;
}

.status-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
}

.status-banner--error {
  background: rgba(255, 95, 125, 0.12);
  border-color: rgba(255, 95, 125, 0.32);
  color: #ffd7de;
}

.showroom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.showroom-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(5, 10, 29, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.showroom-card:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 249, 255, 0.24);
}

.showroom-card.favorited {
  border-color: rgba(255, 209, 102, 0.5);
}

.showroom-card__swatch {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  flex-shrink: 0;
}

.showroom-card__body {
  flex: 1;
}

.showroom-card__body strong {
  display: block;
  color: #ffffff;
}

.showroom-card__body p {
  margin: 4px 0 0;
  color: #cdd6f7;
  font-size: 0.9rem;
}

.favorite-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #cdd6f7;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
}

.favorite-btn:focus-visible {
  outline: 2px solid #7df9ff;
  outline-offset: 2px;
}

.favorite-btn.active {
  background: rgba(255, 209, 102, 0.18);
  color: #ffd166;
}

@media (max-width: 760px) {
  .showroom-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --include=src/app/showroom-view.spec.ts --watch=false`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Wire the route**

In `src/app/app.routes.ts`, insert after the `leaderboard` route (currently lines 16–20, right before the `{ path: 'auth', ... }` line):

```ts
  {
    path: 'showroom',
    loadComponent: () => import('./showroom-view').then((m) => m.ShowroomView),
    canActivate: [authGuard]
  },
```

- [ ] **Step 6: Wire the nav link**

In `src/app/app.html`, inside the `@if (auth.isAuthenticated())` block, add after the Leaderboard link:

```html
      <a routerLink="/showroom" routerLinkActive="active">Showroom</a>
```

- [ ] **Step 7: Extend `app.spec.ts` to assert the new nav link**

In the `'shows the primary navigation and race route once authenticated'` test in `src/app/app.spec.ts`, add:

```ts
    expect(compiled.textContent).toContain('Showroom');
```

right after the existing `expect(compiled.textContent).toContain('Leaderboard');` line.

- [ ] **Step 8: Run the full frontend suite**

Run: `npx ng test --watch=false`
Expected: PASS (all files, including the updated `app.spec.ts`).

- [ ] **Step 9: Commit**

```bash
git add src/app/showroom-view.ts src/app/showroom-view.html src/app/showroom-view.css src/app/showroom-view.spec.ts src/app/app.routes.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat(showroom): add Showroom screen for browsing and favoriting car models"
```

---

### Task 5: Records screen (`/records`)

**Files:**
- Create: `src/app/records-view.ts`
- Create: `src/app/records-view.html`
- Create: `src/app/records-view.css`
- Test: `src/app/records-view.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `RaceDbService.getPersonalBests(): Promise<PersonalBestRecord[]>` and `RaceDbService.getCarModels(): Promise<CarModelRecord[]>` (both from Task 3 / existing).
- Produces: `RecordsView` component, route `path: 'records'`.

- [ ] **Step 1: Write the component test file**

Create `src/app/records-view.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordsView } from './records-view';

function mockRaceDb() {
  return {
    getPersonalBests: vi.fn().mockResolvedValue([
      { carModelId: 'Rift', finishTimeMs: 2100, achievedAt: '2024-02-01T00:00:00.000Z' },
      { carModelId: 'Vanta', finishTimeMs: 1840, achievedAt: '2024-01-01T00:00:00.000Z' }
    ]),
    getCarModels: vi.fn().mockResolvedValue([
      { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
      { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' }
    ])
  };
}

describe('RecordsView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RecordsView>>;
  let component: RecordsView;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(RecordsView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads personal bests and lists the fastest first', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const names = Array.from(compiled.querySelectorAll('.entry-name')).map((el) => el.textContent?.trim());
    expect(names).toEqual(['Vanta', 'Rift']);
  });

  it('shows an empty state when there are no personal bests yet', async () => {
    (component as any).raceDb.getPersonalBests.mockResolvedValueOnce([]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No records yet');
  });

  it('shows an error banner when loading fails', async () => {
    (component as any).raceDb.getPersonalBests.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load personal bests');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --include=src/app/records-view.spec.ts --watch=false`
Expected: FAIL — cannot resolve `./records-view`.

- [ ] **Step 3: Create the component**

Create `src/app/records-view.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RaceDbService } from './data/race-db';
import type { CarModelRecord, PersonalBestRecord } from './data/race-db';

@Component({
  selector: 'app-records-view',
  imports: [DatePipe],
  templateUrl: './records-view.html',
  styleUrl: './records-view.css'
})
export class RecordsView implements OnInit {
  private readonly raceDb = inject(RaceDbService);

  protected readonly personalBests = signal<PersonalBestRecord[]>([]);
  protected readonly carModels = signal<CarModelRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const models = new Map(this.carModels().map((model) => [model.id, model]));

    return [...this.personalBests()]
      .sort((first, second) => first.finishTimeMs - second.finishTimeMs)
      .map((best) => ({ best, model: models.get(best.carModelId) }));
  });

  ngOnInit(): void {
    void this.loadRecords();
  }

  private async loadRecords(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [personalBests, carModels] = await Promise.all([
        this.raceDb.getPersonalBests(),
        this.raceDb.getCarModels()
      ]);
      this.personalBests.set(personalBests);
      this.carModels.set(carModels);
    } catch {
      this.error.set('Unable to load personal bests. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

Create `src/app/records-view.html`:

```html
<section class="records-panel">
  <div class="records-card">
    <div class="records-header">
      <h2>Records</h2>
      <p>Your fastest lap for every chassis you've raced.</p>
    </div>

    @if (error()) {
      <p class="status-banner status-banner--error" role="alert">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="status-banner" role="status">Loading records…</p>
    } @else if (rows().length === 0) {
      <div class="empty-state">
        <h3>No records yet</h3>
        <p>Finish a race to set your first personal best.</p>
      </div>
    } @else {
      <ol class="records-list">
        @for (row of rows(); track row.best.carModelId) {
          <li>
            <span class="place">{{ $index + 1 }}</span>
            <span class="entry-name">{{ row.model?.name ?? row.best.carModelId }}</span>
            <span class="entry-date">{{ row.best.achievedAt | date: 'mediumDate' }}</span>
            <span class="entry-time">{{ row.best.finishTimeMs }}ms</span>
          </li>
        }
      </ol>
    }
  </div>
</section>
```

Create `src/app/records-view.css`:

```css
.records-panel {
  display: flex;
  justify-content: center;
}

.records-card {
  width: min(760px, 100%);
  padding: 24px;
  border-radius: 24px;
  background: rgba(5, 10, 29, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 16px 42px rgba(3, 8, 24, 0.24);
  backdrop-filter: blur(16px);
}

.records-header h2,
.empty-state h3 {
  margin: 0 0 6px;
  color: #ffffff;
}

.records-header p,
.empty-state p {
  margin: 0;
  color: #cdd6f7;
}

.status-banner {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
}

.status-banner--error {
  background: rgba(255, 95, 125, 0.12);
  border-color: rgba(255, 95, 125, 0.32);
  color: #ffd7de;
}

.records-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.records-list li {
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fefefe;
}

.place {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7df9ff, #ff74d8);
  color: #050816;
  font-weight: 800;
  font-size: 0.85rem;
}

.entry-name {
  font-weight: 700;
}

.entry-date {
  color: #cdd6f7;
  font-size: 0.85rem;
}

.entry-time {
  color: #7df9ff;
  font-weight: 700;
}

@media (max-width: 760px) {
  .records-list li {
    grid-template-columns: 32px 1fr;
    grid-template-rows: auto auto;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --include=src/app/records-view.spec.ts --watch=false`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Wire the route**

In `src/app/app.routes.ts`, insert after the `showroom` route added in Task 4:

```ts
  {
    path: 'records',
    loadComponent: () => import('./records-view').then((m) => m.RecordsView),
    canActivate: [authGuard]
  },
```

- [ ] **Step 6: Wire the nav link**

In `src/app/app.html`, add after the Showroom link added in Task 4:

```html
      <a routerLink="/records" routerLinkActive="active">Records</a>
```

- [ ] **Step 7: Extend `app.spec.ts`**

Add, right after the `Showroom` assertion added in Task 4:

```ts
    expect(compiled.textContent).toContain('Records');
```

- [ ] **Step 8: Run the full frontend suite**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/records-view.ts src/app/records-view.html src/app/records-view.css src/app/records-view.spec.ts src/app/app.routes.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat(records): add Records screen for personal-best lap times"
```

---

### Task 6: History screen (`/history`)

**Files:**
- Create: `src/app/history-view.ts`
- Create: `src/app/history-view.html`
- Create: `src/app/history-view.css`
- Test: `src/app/history-view.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `RaceDbService.getRaceSummaries(): Promise<RaceSummary[]>` (existing), `RaceDbService.getRace(raceId): Promise<RaceRecord | undefined>` (existing), `RaceDbService.rematchRace(raceId): Promise<RematchRaceRecord>` (Task 3).
- Produces: `HistoryView` component, route `path: 'history'`.

- [ ] **Step 1: Write the component test file**

Create `src/app/history-view.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryView } from './history-view';

function mockRaceDb() {
  return {
    getRaceSummaries: vi.fn().mockResolvedValue([
      { id: 'race-1', name: 'Night Sprint', status: 'finished', createdAt: '2024-01-01T00:00:00.000Z', racerCount: 2, resultCount: 2 }
    ]),
    getRace: vi.fn().mockResolvedValue({
      id: 'race-1',
      name: 'Night Sprint',
      status: 'finished',
      createdAt: '2024-01-01T00:00:00.000Z',
      racers: [],
      results: [{ id: 'result-1', racerId: 'racer-1', position: 1, finishTimeMs: 1840 }]
    }),
    rematchRace: vi.fn().mockResolvedValue({
      id: 'race-2',
      name: 'Night Sprint (Rematch)',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00.000Z',
      racers: [],
      results: []
    })
  };
}

describe('HistoryView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HistoryView>>;
  let component: HistoryView;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(HistoryView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads and renders the race list', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Night Sprint');
  });

  it('loads and shows race detail when a race is selected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.history-row__select') as HTMLButtonElement).click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('1840ms');
  });

  it('creates a rematch and shows a success message', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.rematch-btn') as HTMLButtonElement).click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect((component as any).raceDb.rematchRace).toHaveBeenCalledWith('race-1');
    expect(compiled.querySelector('[role="status"].status-banner--success')?.textContent).toContain(
      'Night Sprint (Rematch) is ready in the Garage.'
    );
  });

  it('shows an error banner when loading the list fails', async () => {
    (component as any).raceDb.getRaceSummaries.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load race history');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --include=src/app/history-view.spec.ts --watch=false`
Expected: FAIL — cannot resolve `./history-view`.

- [ ] **Step 3: Create the component**

Create `src/app/history-view.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RaceDbService } from './data/race-db';
import type { RaceRecord, RaceSummary } from './data/race-db';

@Component({
  selector: 'app-history-view',
  imports: [DatePipe],
  templateUrl: './history-view.html',
  styleUrl: './history-view.css'
})
export class HistoryView implements OnInit {
  private readonly raceDb = inject(RaceDbService);

  protected readonly summaries = signal<RaceSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly selectedRaceId = signal<string | null>(null);
  protected readonly selectedRace = signal<RaceRecord | undefined>(undefined);
  protected readonly detailLoading = signal(false);
  protected readonly rematching = signal(false);

  protected readonly hasRaces = computed(() => this.summaries().length > 0);

  ngOnInit(): void {
    void this.loadSummaries();
  }

  private async loadSummaries(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summaries.set(await this.raceDb.getRaceSummaries());
    } catch {
      this.error.set('Unable to load race history. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async selectRace(raceId: string): Promise<void> {
    this.selectedRaceId.set(raceId);
    this.selectedRace.set(undefined);
    this.detailLoading.set(true);
    this.error.set(null);
    try {
      this.selectedRace.set(await this.raceDb.getRace(raceId));
    } catch {
      this.error.set('Unable to load race details. Try again shortly.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected async rematch(raceId: string): Promise<void> {
    this.rematching.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      const rematch = await this.raceDb.rematchRace(raceId);
      this.summaries.set(await this.raceDb.getRaceSummaries());
      this.success.set(`${rematch.name} is ready in the Garage.`);
    } catch {
      this.error.set('Unable to create a rematch. Try again shortly.');
    } finally {
      this.rematching.set(false);
    }
  }
}
```

Create `src/app/history-view.html`:

```html
<section class="history-panel">
  <div class="history-card">
    <div class="history-header">
      <h2>History</h2>
      <p>Every race you've run, with a one-click rematch.</p>
    </div>

    @if (error()) {
      <p class="status-banner status-banner--error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p class="status-banner status-banner--success" role="status">{{ success() }}</p>
    }

    @if (loading()) {
      <p class="status-banner" role="status">Loading race history…</p>
    } @else if (!hasRaces()) {
      <div class="empty-state">
        <h3>No races yet</h3>
        <p>Head to the race track to run your first race.</p>
      </div>
    } @else {
      <ul class="history-list">
        @for (summary of summaries(); track summary.id) {
          <li class="history-row" [class.selected]="selectedRaceId() === summary.id">
            <button type="button" class="history-row__select" (click)="selectRace(summary.id)">
              <strong>{{ summary.name }}</strong>
              <span>{{ summary.createdAt | date: 'medium' }} · {{ summary.racerCount }} racers · {{ summary.status }}</span>
            </button>
            <button
              type="button"
              class="ghost-btn rematch-btn"
              [disabled]="rematching()"
              (click)="rematch(summary.id)"
            >Rematch</button>
          </li>
        }
      </ul>

      @if (selectedRaceId()) {
        @if (detailLoading()) {
          <p class="status-banner" role="status">Loading race details…</p>
        } @else {
          @if (selectedRace(); as race) {
            <div class="race-detail">
              <h3>{{ race.name }}</h3>
              <ol class="race-detail__results">
                @for (result of race.results; track result.id) {
                  <li>#{{ result.position }} · {{ result.finishTimeMs }}ms</li>
                }
              </ol>
            </div>
          }
        }
      }
    }
  </div>
</section>
```

Create `src/app/history-view.css`:

```css
.history-panel {
  display: flex;
  justify-content: center;
}

.history-card {
  width: min(760px, 100%);
  padding: 24px;
  border-radius: 24px;
  background: rgba(5, 10, 29, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 16px 42px rgba(3, 8, 24, 0.24);
  backdrop-filter: blur(16px);
}

.history-header h2,
.empty-state h3 {
  margin: 0 0 6px;
  color: #ffffff;
}

.history-header p,
.empty-state p {
  margin: 0;
  color: #cdd6f7;
}

.status-banner {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #eef2ff;
}

.status-banner--error {
  background: rgba(255, 95, 125, 0.12);
  border-color: rgba(255, 95, 125, 0.32);
  color: #ffd7de;
}

.status-banner--success {
  background: rgba(21, 245, 179, 0.12);
  border-color: rgba(21, 245, 179, 0.32);
  color: #c9fff0;
}

.history-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0 0 20px;
  list-style: none;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.history-row.selected {
  border-color: rgba(125, 249, 255, 0.4);
}

.history-row__select {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: transparent;
  color: #fefefe;
  padding: 8px 12px;
  border-radius: 10px;
}

.history-row__select span {
  color: #cdd6f7;
  font-size: 0.85rem;
}

.race-detail {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.race-detail h3 {
  margin: 0 0 10px;
  color: #ffffff;
}

.race-detail__results {
  margin: 0;
  padding: 0 0 0 18px;
  color: #cdd6f7;
}

@media (max-width: 760px) {
  .history-row {
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --include=src/app/history-view.spec.ts --watch=false`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Wire the route**

In `src/app/app.routes.ts`, insert after the `records` route added in Task 5:

```ts
  {
    path: 'history',
    loadComponent: () => import('./history-view').then((m) => m.HistoryView),
    canActivate: [authGuard]
  },
```

- [ ] **Step 6: Wire the nav link**

In `src/app/app.html`, add after the Records link added in Task 5:

```html
      <a routerLink="/history" routerLinkActive="active">History</a>
```

- [ ] **Step 7: Extend `app.spec.ts`**

Add, right after the `Records` assertion added in Task 5:

```ts
    expect(compiled.textContent).toContain('History');
```

- [ ] **Step 8: Run the full frontend suite**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/history-view.ts src/app/history-view.html src/app/history-view.css src/app/history-view.spec.ts src/app/app.routes.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat(history): add History screen with race detail and rematch"
```

---

### Task 7: Docs and final verification

**Files:**
- Modify: `README.md:5-10`

- [ ] **Step 1: Update the Features list**

In `README.md`, replace:

```markdown
## Features

- Create your own racers with custom names and colors
- Start a race and watch progress update in real time
- See finish times and a ranked leaderboard at the end of each race
- Built with Angular, signals, and modern component-based UI patterns
```

with:

```markdown
## Features

- Create your own racers with custom names and colors
- Start a race and watch progress update in real time
- See finish times and a ranked leaderboard at the end of each race
- Browse the Showroom and favorite your go-to car models
- Track your personal-best lap times per car model in Records
- Revisit past races and one-click rematch them from History
- Built with Angular, signals, and modern component-based UI patterns
```

- [ ] **Step 2: Run the full frontend suite**

Run: `npx ng test --watch=false`
Expected: PASS (all spec files, including `app.spec.ts` and the three new view specs).

- [ ] **Step 3: Run the full backend suite**

Run: `npx vitest run server`
Expected: PASS (all `.spec.js` files under `server/`, including the new `personal-best.model.spec.js` and `auth.model.spec.js` cases).

- [ ] **Step 4: Type-check the whole project**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.spec.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document the Showroom, Records, and History screens"
```

---

## Self-Review Notes

- **Spec coverage:** Showroom (Task 4), Records (Task 5), History with detail + rematch (Task 6), `GET /api/personal-bests` (Task 1), `favoriteCarModelIds` on the public user (Task 2), `RaceDbService` additions + `AuthUser` type (Task 3), README update (Task 7). Accessibility requirements (`aria-pressed`/`aria-label` on the favorite toggle, `role="alert"`/`role="status"` on all dynamic banners, keyboard-operable buttons with visible `:focus-visible` styles) are included directly in each screen's template/CSS in Tasks 4–6.
- **Out of scope, confirmed not attempted:** auto-loading a rematched race into `RaceStateService`; any change to Race/Garage/Leaderboard beyond their nav link; Postman collection updates (that file has unrelated in-flight local changes).
- **Type consistency check:** `PersonalBestRecord` and `RematchRaceRecord` (Task 3) are used with matching field names in Records (Task 5: `best.carModelId`, `best.finishTimeMs`, `best.achievedAt`) and History (Task 6: `rematch.id`, `rematch.name`); `RaceDbService` method names (`getPersonalBests`, `toggleFavoriteCarModel`, `rematchRace`) match exactly between Task 3's production and Tasks 4–6's consumption.
