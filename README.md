# Neon Speedway

Neon Speedway is a small Angular 22 demo app where you can create custom racers, start a race, and watch them compete in a colorful, animated track with a live leaderboard.

## Features

- Create your own racers with custom names and colors
- Start a race and watch progress update in real time
- See finish times and a ranked leaderboard at the end of each race
- Browse the Showroom and favorite your go-to car models
- Track your personal-best lap times per car model in Records
- Revisit past races and one-click rematch them from History
- Built with Angular, signals, and modern component-based UI patterns

## Engineering practices

Coding standards and conventions for this repo (TypeScript, Angular, accessibility, testing,
and API/backend patterns) are documented in [ENGINEERING_PRACTICES.md](ENGINEERING_PRACTICES.md).
Read it before making non-trivial changes, and use it as the checklist in code review.

## Development

Install dependencies and start the app locally:

```bash
npm install
npm start
```

Then open http://localhost:4200/ in your browser.

## Local MongoDB setup

1. Install and start MongoDB locally on port 27017.
2. In a separate terminal, start the local API server:

```bash
cd server
npm install
npm run dev
```

The API server listens on `http://127.0.0.1:3001` by default, and the API routes are under `/api/*`. All error responses follow the format described in [API_ERROR_HANDLING.md](API_ERROR_HANDLING.md).

3. Keep the Angular app and the API server running together.

## Playwright E2E tests

Install Playwright browsers and run tests:

```bash
npm install
npm run e2e:install
npm run test:e2e
```

## Build

```bash
npm run build
```
