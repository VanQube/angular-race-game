# API Error Handling Policy

This document describes how the `server/*` API reports errors to clients. All
routes under `/api/*` follow this policy — it is implemented centrally in
[`server/errors.js`](server/errors.js) and consumed by
[`server/server.js`](server/server.js).

## Standard error response format

Every error response is a JSON object with a single top-level `error` key:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "registration payload is invalid",
    "details": ["password must be at least 8 characters"]
  }
}
```

| Field             | Type     | Required | Description                                                                 |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `error.code`      | string   | yes      | Machine-readable identifier from the fixed set in [Error codes](#error-codes). |
| `error.message`   | string   | yes      | Human-readable summary suitable for logs or a generic UI toast.               |
| `error.details`   | string[] | no       | Present only for multi-issue errors (e.g. field validation failures).        |

Successful responses never contain an `error` key, so clients can branch on
`response.ok` (HTTP status) and treat the presence of `error` as confirmation.

## Error codes

| Code               | HTTP status | Meaning                                                              |
| ------------------ | ----------- | --------------------------------------------------------------------- |
| `VALIDATION_ERROR`  | 400         | The request body/params failed validation.                            |
| `UNAUTHORIZED`      | 401         | Missing, invalid, or expired bearer token; or bad login credentials.  |
| `NOT_FOUND`         | 404         | The requested resource does not exist, or is not owned by the caller. |
| `CONFLICT`          | 409         | The request conflicts with existing state (e.g. duplicate email).     |
| `ROUTE_NOT_FOUND`   | 404         | No route matches the requested method/path.                           |
| `INTERNAL_ERROR`    | 500         | An unexpected/unhandled failure. Never leaks internal error details.  |

The HTTP status code is always derivable from `error.code` — clients should
not need to inspect the status separately, but both are kept in sync.

Ownership checks (e.g. a race owned by a different user) return `NOT_FOUND`
rather than `FORBIDDEN`, to avoid confirming a resource's existence to users
who don't own it.

## Implementation

- **`ApiError`** (`server/errors.js`) is a typed `Error` subclass carrying an
  `error.code` and HTTP status. Route handlers throw it directly:

  ```js
  throw ApiError.notFound('race not found');
  throw ApiError.badRequest('registration payload is invalid', validation.errors);
  ```

  Available factories: `ApiError.badRequest(message, details?)`,
  `ApiError.unauthorized(message?)`, `ApiError.notFound(message?)`,
  `ApiError.conflict(message, details?)`.

- **`asyncHandler`** wraps async route handlers so a thrown `ApiError` (or any
  rejected promise, e.g. a MongoDB failure) is forwarded to Express's error
  pipeline via `next(err)` instead of crashing the process or requiring a
  manual `try/catch` in every route.

- **`errorHandler`** is the last piece of middleware registered on the app.
  It serializes `ApiError` instances into the standard shape above. Any
  non-`ApiError` (unexpected/programmer error) is logged with `console.error`
  and reported to the client as a generic `INTERNAL_ERROR` — raw error
  messages/stack traces are never sent to clients.

- **`notFoundHandler`** is registered before `errorHandler` to catch requests
  to routes that don't exist at all, returning `ROUTE_NOT_FOUND`.

## Adding a new route

1. Register the handler wrapped in `asyncHandler(...)`.
2. Validate input up front and `throw ApiError.badRequest(...)` on failure —
   include a `details` array when there can be multiple validation issues.
3. Use `ApiError.notFound(...)` / `ApiError.conflict(...)` /
   `ApiError.unauthorized(...)` for the corresponding business-rule failures.
4. Let unexpected exceptions (DB errors, etc.) propagate — do not catch and
   re-wrap them; `asyncHandler` + `errorHandler` already produce a safe
   `INTERNAL_ERROR` response.
5. Never call `res.status(...).json({ message: ... })` or similar ad hoc
   shapes directly for error cases — always go through `ApiError` so the
   response stays consistent.

## Client-side consumption

Frontend code (e.g. `src/app/auth.service.ts`) reads `error.details` (joined)
when present, falling back to `error.message`, so multi-field validation
failures render as a single readable string while single-cause errors show
their message directly.
