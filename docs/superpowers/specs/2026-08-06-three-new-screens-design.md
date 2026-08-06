# Three new screens: Showroom, Records, History

## Context

The backend already has capability with no frontend surface:

- `toggleFavorite` (`server/car-model.model.js`) is wired into `POST /api/car-models/:carModelId/favorite`, but no client ever calls it and the favorited state isn't returned to the client.
- `resolvePersonalBest` (`server/personal-best.model.js`) is computed and persisted to the `personalBests` collection whenever a racer finishes, but there is no endpoint to read it back.
- `buildRematchRace` (`server/race.model.js`) is wired into `POST /api/races/:raceId/rematch`, but no client ever calls it.

This spec adds three screens/tabs that finish wiring that capability end to end, following the `prompts/create-navigation-item.prompt.md` template.

## Screens

### 1. Showroom (`/showroom`)

Browse every car model as a card (name, tag, accent-color swatch) with a favorite toggle. Favorited models are visually distinguished (e.g. filled star, highlighted border) and sort first.

- Data: `GET /api/car-models` (existing) for the catalog; `auth.user()?.favoriteCarModelIds` (new field) for initial favorited state.
- Action: toggling a star calls `POST /api/car-models/:id/favorite` (existing endpoint) and updates local component state from the response's `favoriteCarModelIds`.

### 2. Records (`/records`)

Shows the user's personal-best lap time per car model, fastest first, with the date achieved. Empty state when the user has no personal bests yet.

- Data: `GET /api/personal-bests` (new endpoint), scoped to the authenticated user.

### 3. History (`/history`)

Lists past races (name, status, created date, racer/result counts). Selecting a race loads its detail (racers + results) and offers a **Rematch** button.

- Data: `GET /api/races` (existing, via `getRaceSummaries`) for the list; `GET /api/races/:raceId` (existing, via `getRace`) for detail.
- Action: **Rematch** calls `POST /api/races/:raceId/rematch` (existing endpoint), creating a new race with the same racers reset to the start line. On success, show a confirmation message and prepend the new race to the visible list. It does **not** auto-load into the live race simulator — `RaceStateService` has no concept of loading an arbitrary race by id today, and adding one is out of scope for this change (YAGNI).

## Backend changes

- `server/personal-best.model.js`: add a pure `formatPersonalBest(record)` helper that shapes a Mongo doc into `{ carModelId, finishTimeMs, achievedAt }`, covered by a unit test in `personal-best.model.spec.js`.
- `server/server.js`: add `GET /api/personal-bests`, authenticated, querying the `personalBests` collection by `ownerId: req.auth.userId`, sorted by `finishTimeMs` ascending, mapped through `formatPersonalBest`.
- `server/auth.model.js`: `formatPublicUser` includes `favoriteCarModelIds: user.favoriteCarModelIds ?? []`. Covered by a new unit test in `auth.model.spec.js`.

## Frontend changes

- `src/app/data/race-db/race-db.models.ts`: add `PersonalBestRecord { carModelId: string; finishTimeMs: number; achievedAt: string }`.
- `src/app/data/race-db/race-db.service.ts`: add
  - `getPersonalBests(): Promise<PersonalBestRecord[]>`
  - `toggleFavoriteCarModel(carModelId: string): Promise<{ favorited: boolean; favoriteCarModelIds: string[] }>`
  - `rematchRace(raceId: string): Promise<RaceSummary>`
  Each follows the existing fetch-wrapper pattern (auth header, throw on non-ok response) and gets spec coverage in `race-db.service.spec.ts`.
- `src/app/auth.service.ts`: `AuthUser` interface gains `favoriteCarModelIds: string[]`.
- Three new standalone components, each with its own local signals for loading/data/error state (no changes to `RaceStateService` — these are read-mostly views scoped to their own data, and coupling them into the race-simulation service would cross a responsibility boundary for no benefit):
  - `src/app/showroom-view.{ts,html,css,spec.ts}`
  - `src/app/records-view.{ts,html,css,spec.ts}`
  - `src/app/history-view.{ts,html,css,spec.ts}`
- `src/app/app.routes.ts`: three new lazy (`loadComponent`) routes, each behind `authGuard`, matching the existing route shape.
- `src/app/app.html`: three new nav links inside the existing `@if (auth.isAuthenticated())` block, following current tab order (Race, Garage, Leaderboard, **Showroom, Records, History**).
- Styling reuses the existing panel/card/pill CSS vocabulary (see `garage-view.css`, `leaderboard-view.css`) so the new screens read as part of the same app rather than a bolted-on style.

## Testing

- Backend: unit tests for `formatPersonalBest` and the updated `formatPublicUser`, matching the existing per-model unit-test convention (no route-level integration tests exist in this repo today, so none are added here).
- Frontend: spec coverage for the three new `RaceDbService` methods, and a component spec per new view (TestBed + mocked `RaceDbService`/`AuthService`, matching the pattern in `race-state.service.spec.ts`).

## Accessibility

- Favorite toggle buttons use `aria-pressed` and an accessible label (e.g. `aria-label="Favorite Vanta"`), not a bare icon.
- Rematch success/error feedback uses `role="status"` / `role="alert"` per the repo's accessibility rule for dynamic status messages.
- All new interactive elements are keyboard-operable buttons/links with visible focus states, consistent with existing views.

## Out of scope

- Auto-loading a rematched race into the live race simulator.
- Any change to the existing Race/Garage/Leaderboard screens beyond adding the new nav links.
