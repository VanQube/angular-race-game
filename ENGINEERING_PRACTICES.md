# Engineering Practices

Scope: this document governs the Angular/TypeScript client (`src/`). The Node/Express API
(`server/`) follows the lighter "API & Backend" section at the end. It supersedes ad-hoc
conventions and is the checklist used in code review.

## TypeScript Best Practices

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid the `any` type; use `unknown` when the type is uncertain, then narrow it.
- Avoid the non-null assertion operator (`!`). Narrow with a guard, an `if`, or restructure
  state so the value can't be missing instead of asserting it away.

## Angular Best Practices

- Always use standalone components over NgModules.
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the
  default in Angular v22+.
- Use signals for state management.
- Implement lazy loading for feature routes (`loadComponent` / `loadChildren`), not eager
  `component:` imports. Only the shell/auth entry point should be eager.
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the
  `host` object of the `@Component` or `@Directive` decorator instead.
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.
- Use the `inject()` function instead of constructor injection, including in components that
  only forward an injected service — do not accept the service as a constructor parameter.
- Don't re-expose an injected service's signals through redundant component fields assigned in
  the constructor. Inject the service as a field (`protected readonly raceState =
  inject(RaceStateService)`) and read its signals directly (`raceState.cars()`) from the
  template instead of copying each signal onto a same-named component property.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA
  attributes.
- Dynamic status messages (form errors, success confirmations, async result banners) MUST be
  programmatically announced: use `role="alert"` (or `role="status"` for non-urgent updates)
  or an `aria-live` region so screen reader users are notified without moving focus.
- Never remove the focus outline (`outline: none`) without an equally visible replacement.
  A replacement indicator needs at least 3:1 contrast against its background and should be
  visible on all interactive states it's meant to cover, not just a subtle color shift.

### Components

- Keep components small and focused on a single responsibility.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Prefer inline templates for small components.
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular
  v22+ and provide signal-based state, type-safe field access, and schema-based validation.
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones. Manually
  wiring a signal per field with `(input)` handlers and casting `event.target` is not a
  substitute for either — it reimplements form state without validation or type safety.
- Do NOT use `ngClass`, use `class` bindings instead.
- Do NOT use `ngStyle`, use `style` bindings instead.
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state.
- Use `computed()` for derived state.
- Keep state transformations pure and predictable.
- Do NOT use `mutate` on signals, use `update` or `set` instead.
- Don't derive record identifiers from `Date.now() + Math.random()`. It's not collision-safe
  and drifts from the identity assigned by the source of truth. Use `crypto.randomUUID()` for
  client-only placeholders, and prefer the id returned by the backend once one exists.

## Templates

- Keep templates simple and avoid complex logic. A nested/chained ternary in an interpolation
  is complex logic — compute it as a named `computed()` in the component instead.
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use the async pipe to handle observables.
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility.
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton
  services (Angular v22+). Apply it consistently — don't mix `@Service()` and
  `@Injectable({ providedIn: 'root' })` across sibling services in the same app.
- Use the `inject()` function instead of constructor injection.
- Don't reach for browser globals (`window.setTimeout`, `performance.now()`, `Date.now()`)
  directly inside service logic that drives state transitions. They make the service harder to
  test and assume a browser runtime that may not hold under SSR. Where a full clock/scheduler
  abstraction is overkill, at minimum keep such calls isolated and well-contained rather than
  interleaved with business logic.

## Testing

- Every service and guard that holds non-trivial logic (auth flows, token handling, guards
  redirecting based on auth state) needs a spec file. Don't ship a state-changing service
  without one.
- Tests may reach into private fields via `as any` to substitute a mock (e.g. swapping in a
  fake `RaceDbService`); that's an accepted trade-off for test setup and not a violation on its
  own.

## API & Backend (Node/Express, `server/`)

- Centralize error shaping: throw a typed `ApiError` (see `server/errors.js`) from route
  handlers and let a single `errorHandler` middleware translate it to a response body. Don't
  hand-roll `res.status(...).json({...})` for error cases in individual routes.
- Wrap async route handlers (`asyncHandler`) so rejected promises reach the error middleware
  instead of crashing the process or hanging the request.
- Every resource route that's scoped to a user (races, racers, results) must verify ownership
  server-side before reading or mutating it — never trust a client-supplied id alone.
- Validate request payloads before touching the database and return a `400` with actionable
  `details` on failure.
