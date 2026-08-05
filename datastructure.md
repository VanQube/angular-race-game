# Race feature data structure

## Goal
The race app now includes a lightweight database-oriented layer for the racing feature. The design focuses on three persistent concepts:
- race sessions
- racers participating in a session
- race results captured after a run completes

## Schema overview

### 1. RaceRecord
Represents a single race session.

```ts
interface RaceRecord {
  id: string;
  name: string;
  status: 'scheduled' | 'running' | 'finished' | 'cancelled';
  createdAt: string;
  racers: RacerRecord[];
  results: RaceResultRecord[];
}
```

### 2. RacerRecord
Represents a driver and their selected car model.

```ts
interface RacerRecord {
  id: string;
  driverName: string;
  carModelId: string;
  color: string;
  progress: number;
  finishTimeMs: number | null;
  status: 'ready' | 'racing' | 'finished';
}
```

### 3. RaceResultRecord
Represents a recorded finish result for one racer.

```ts
interface RaceResultRecord {
  id: string;
  racerId: string;
  position: number;
  finishTimeMs: number;
  notes?: string;
}
```

### 4. CarModelRecord
Represents the catalog of available car models used by racers.

```ts
interface CarModelRecord {
  id: string;
  name: string;
  tag: string;
  accent: string;
}
```

## Folder structure

```text
src/app/data/
  race-db/
    index.ts
    race-db.models.ts
    race-db.config.ts
    race-db.service.ts
    race-db.service.spec.ts
```

## Starter configuration
The configuration module defines the default race name, the initial status, and a seeded catalog of six car models.

## Notes
This scaffold is intentionally simple and frontend-friendly. It can later evolve into a real persistence layer such as IndexedDB, Firebase, or a backend API without changing the core model shape.
