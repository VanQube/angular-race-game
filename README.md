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

## Run with Docker Compose

Runs the Angular frontend (built and served by nginx), the API server, and MongoDB together in
containers. Requires [Docker](https://www.docker.com/) to be installed and running.

```bash
docker compose up -d
```

Then open http://localhost:8080/ in your browser. The API is published on
`http://localhost:3001` (the frontend calls it directly, so that port must stay free on the
host). To stop and remove the containers:

```bash
docker compose down
```

## Run on a local Kubernetes cluster (k3d)

Deploys the same three services to a local [k3d](https://k3d.io/) cluster using the manifests in
[k8s/](k8s/). Requires Docker, [k3d](https://k3d.io/#installation), and `kubectl`.

1. Build the images:

   ```bash
   docker build -t angular-race-game-web:local -f Dockerfile .
   docker build -t angular-race-game-api:local -f server/Dockerfile server
   ```

2. Create the cluster. Traefik is disabled so the app's own `web` service can bind host port 80
   inside the cluster; ports 8080 and 3001 must be free on the host:

   ```bash
   k3d cluster create race-game \
     -p "8080:80@loadbalancer" \
     -p "3001:3001@loadbalancer" \
     --k3s-arg "--disable=traefik@server:*" \
     --wait
   ```

3. Import the images into the cluster (k3d clusters can't pull images that only exist in your
   local Docker daemon):

   ```bash
   k3d image import angular-race-game-web:local angular-race-game-api:local -c race-game
   ```

4. Create the API secret from the template, then apply the manifests:

   ```bash
   cp k8s/02-api-secret.yaml.example k8s/02-api-secret.yaml.local
   sed -i '' "s/replace-me/$(openssl rand -hex 32)/" k8s/02-api-secret.yaml.local

   kubectl apply -f k8s/00-namespace.yaml \
     -f k8s/01-mongo.yaml \
     -f k8s/02-api-secret.yaml.local \
     -f k8s/03-api.yaml \
     -f k8s/04-web.yaml
   ```

5. Wait for everything to come up, then open http://localhost:8080/:

   ```bash
   kubectl -n race-game rollout status statefulset/mongo
   kubectl -n race-game rollout status deployment/api
   kubectl -n race-game rollout status deployment/web
   ```

After a code change, rebuild the affected image, re-run `k3d image import`, then restart the
deployment so it picks up the new image:

```bash
kubectl -n race-game rollout restart deployment/api   # or deployment/web
```

To tear the cluster down:

```bash
k3d cluster delete race-game
```

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
