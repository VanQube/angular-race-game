import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { RaceDbService } from './data/race-db';
import { AuthService } from './auth.service';

export interface CarModel {
  id: string;
  name: string;
  tag: string;
  accent: string;
}

export interface Car {
  id: number;
  name: string;
  model: string;
  color: string;
  progress: number;
  finishTimeMs: number | null;
  status: 'ready' | 'racing' | 'finished';
  dbRacerId?: string;
}

@Injectable({ providedIn: 'root' })
export class RaceStateService {
  private readonly raceDb = inject(RaceDbService);
  private readonly auth = inject(AuthService);
  private currentRaceId: string | null = null;

  protected readonly availableCarModelsSource = signal<CarModel[]>([]);

  protected readonly carsSource = signal<Car[]>([]);

  protected readonly newCarNameSource = signal('');
  protected readonly newCarModelSource = signal<string>('Vanta');
  protected readonly newCarColorSource = signal('#7df9ff');
  protected readonly raceInProgressSource = signal(false);
  protected readonly racePausedSource = signal(false);
  protected readonly raceFinishedSource = signal(false);
  protected readonly leaderboardSource = signal<Car[]>([]);

  readonly availableCarModels = this.availableCarModelsSource.asReadonly();
  readonly cars = this.carsSource.asReadonly();
  readonly newCarName = this.newCarNameSource.asReadonly();
  readonly newCarModel = this.newCarModelSource.asReadonly();
  readonly newCarColor = this.newCarColorSource.asReadonly();
  readonly raceInProgress = this.raceInProgressSource.asReadonly();
  readonly racePaused = this.racePausedSource.asReadonly();
  readonly raceFinished = this.raceFinishedSource.asReadonly();
  readonly leaderboard = this.leaderboardSource.asReadonly();

  readonly selectedCarModel = computed(() =>
    this.availableCarModels().find((model) => model.id === this.newCarModel()) ?? this.availableCarModels()[0]
  );

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.bootstrapFromMongo();
      } else {
        this.resetLocalState();
      }
    });
  }

  async addCar(): Promise<void> {
    const name = this.newCarName().trim();
    const selectedModel = this.selectedCarModel();

    if (!this.auth.isAuthenticated() || !name) {
      return;
    }

    const raceId = await this.ensureRaceSession();
    const dbRacerId = await this.raceDb.addRacer(raceId, {
      driverName: name,
      carModelId: selectedModel.id,
      color: this.newCarColor(),
      progress: 0,
      finishTimeMs: null,
      status: 'ready'
    });

    this.carsSource.update((current) => [
      ...current,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        model: selectedModel.id,
        color: this.newCarColor(),
        progress: 0,
        finishTimeMs: null,
        status: 'ready' as const,
        dbRacerId
      }
    ]);

    this.newCarNameSource.set('');
    this.newCarModelSource.set(selectedModel.id);
    this.newCarColorSource.set(selectedModel.accent);
  }

  setNewCarName(value: string): void {
    this.newCarNameSource.set(value);
  }

  setNewCarColor(value: string): void {
    this.newCarColorSource.set(value);
  }

  selectCarModel(modelId: string): void {
    const model = this.availableCarModels().find((entry) => entry.id === modelId);

    if (!model) {
      return;
    }

    this.newCarModelSource.set(model.id);
    this.newCarColorSource.set(model.accent);
  }

  async startRace(): Promise<void> {
    if (!this.auth.isAuthenticated() || this.raceInProgress() || this.cars().length === 0) {
      return;
    }

    await this.ensureRaceSession();

    this.raceInProgressSource.set(true);
    this.racePausedSource.set(false);
    this.raceFinishedSource.set(false);
    this.leaderboardSource.set([]);

    const racers = this.cars().map((car) => ({
      ...car,
      progress: 0,
      finishTimeMs: null,
      status: 'racing' as const
    }));

    this.carsSource.set(racers);

    const promises = racers.map((car) => new Promise<void>((resolve) => {
      const duration = 1800 + Math.random() * 1600;
      let elapsed = 0;
      let lastTick = performance.now();

      const tick = () => {
        const now = performance.now();
        if (!this.racePausedSource()) {
          elapsed += now - lastTick;
        }
        lastTick = now;

        const progress = Math.min(100, Math.round((elapsed / duration) * 100));

        this.updateCar(car.id, {
          progress,
          status: progress >= 100 ? 'finished' : 'racing',
          finishTimeMs: progress >= 100 ? Math.round(elapsed) : null
        });

        if (progress < 100) {
          window.setTimeout(tick, 16);
        } else {
          resolve();
        }
      };

      tick();
    }));

    await Promise.all(promises);

    const ranked = [...this.cars()].sort(
      (first, second) => (first.finishTimeMs ?? Number.POSITIVE_INFINITY) - (second.finishTimeMs ?? Number.POSITIVE_INFINITY)
    );

    if (this.currentRaceId) {
      await Promise.all(ranked.map((car, index) => {
        if (!car.dbRacerId) {
          return Promise.resolve();
        }

        return this.raceDb.addResult(this.currentRaceId!, car.dbRacerId, {
          position: index + 1,
          finishTimeMs: car.finishTimeMs ?? 0,
          notes: 'Recorded from local race flow'
        });
      }));
    }

    this.leaderboardSource.set(ranked);
    this.raceInProgressSource.set(false);
    this.raceFinishedSource.set(true);
  }

  resetRace(): void {
    this.raceInProgressSource.set(false);
    this.racePausedSource.set(false);
    this.raceFinishedSource.set(false);
    this.leaderboardSource.set([]);
    this.carsSource.update((current) => current.map((car) => ({ ...car, progress: 0, finishTimeMs: null, status: 'ready' as const })));
  }

  pauseRace(): void {
    if (!this.raceInProgressSource()) {
      return;
    }

    this.racePausedSource.set(true);
  }

  resumeRace(): void {
    if (!this.raceInProgressSource()) {
      return;
    }

    this.racePausedSource.set(false);
  }

  closeLeaderboard(): void {
    this.raceFinishedSource.set(false);
  }

  private resetLocalState(): void {
    this.currentRaceId = null;
    this.availableCarModelsSource.set([]);
    this.carsSource.set([]);
    this.newCarNameSource.set('');
    this.raceInProgressSource.set(false);
    this.racePausedSource.set(false);
    this.raceFinishedSource.set(false);
    this.leaderboardSource.set([]);
  }

  private async bootstrapFromMongo(): Promise<void> {
    try {
      const models = await this.raceDb.getCarModels();
      this.availableCarModelsSource.set(models.map((model) => ({ ...model })));

      const summaries = await this.raceDb.getRaceSummaries();
      if (summaries.length === 0) {
        return;
      }

      this.currentRaceId = summaries[0].id;
      const race = await this.raceDb.getRace(this.currentRaceId);
      if (!race) {
        return;
      }

      this.carsSource.set(race.racers.map((racer, index) => ({
        id: index + 1,
        name: racer.driverName,
        model: racer.carModelId,
        color: racer.color,
        progress: racer.progress,
        finishTimeMs: racer.finishTimeMs,
        status: racer.status,
        dbRacerId: racer.id
      })));

      if (race.results.length > 0) {
        const ranked = [...race.results]
          .sort((first, second) => first.position - second.position)
          .map((result) => {
            const racer = race.racers.find((entry) => entry.id === result.racerId);

            return {
              id: Date.now() + Math.floor(Math.random() * 1000),
              name: racer?.driverName ?? 'Unknown racer',
              model: racer?.carModelId ?? '',
              color: racer?.color ?? '#7df9ff',
              progress: 100,
              finishTimeMs: result.finishTimeMs,
              status: 'finished' as const,
              dbRacerId: racer?.id
            };
          });

        this.leaderboardSource.set(ranked);
        this.raceFinishedSource.set(true);
      }
    } catch (error) {
      console.error('Unable to sync race state with MongoDB.', error);
    }
  }

  private async ensureRaceSession(): Promise<string> {
    if (this.currentRaceId) {
      return this.currentRaceId;
    }

    this.currentRaceId = await this.raceDb.createRace({
      name: 'Night Sprint',
      status: 'scheduled'
    });

    return this.currentRaceId;
  }

  private updateCar(id: number, patch: Partial<Car>): void {
    this.carsSource.update((current) => current.map((car) => (car.id === id ? { ...car, ...patch } : car)));
  }
}
