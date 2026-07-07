import { Injectable, computed, signal } from '@angular/core';

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
}

@Injectable({ providedIn: 'root' })
export class RaceStateService {
  protected readonly availableCarModelsSource = signal<CarModel[]>([
    { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
    { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' },
    { id: 'Axiom', name: 'Axiom', tag: 'Neural chassis', accent: '#7b61ff' },
    { id: 'Spectra', name: 'Spectra', tag: 'Lightwave shell', accent: '#ffd166' },
    { id: 'Kestrel', name: 'Kestrel', tag: 'Skyline racer', accent: '#15f5b3' },
    { id: 'Nox', name: 'Nox', tag: 'Shadow sprint', accent: '#ff5f7d' }
  ]);

  protected readonly carsSource = signal<Car[]>([
    { id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 2, name: 'Blaze', model: 'Kestrel', color: '#5fd2ff', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 3, name: 'Volt', model: 'Spectra', color: '#ffd166', progress: 0, finishTimeMs: null, status: 'ready' }
  ]);

  protected readonly newCarNameSource = signal('');
  protected readonly newCarModelSource = signal<string>('Vanta');
  protected readonly newCarColorSource = signal('#7df9ff');
  protected readonly raceInProgressSource = signal(false);
  protected readonly raceFinishedSource = signal(false);
  protected readonly leaderboardSource = signal<Car[]>([]);

  readonly availableCarModels = this.availableCarModelsSource.asReadonly();
  readonly cars = this.carsSource.asReadonly();
  readonly newCarName = this.newCarNameSource.asReadonly();
  readonly newCarModel = this.newCarModelSource.asReadonly();
  readonly newCarColor = this.newCarColorSource.asReadonly();
  readonly raceInProgress = this.raceInProgressSource.asReadonly();
  readonly raceFinished = this.raceFinishedSource.asReadonly();
  readonly leaderboard = this.leaderboardSource.asReadonly();

  readonly selectedCarModel = computed(() =>
    this.availableCarModels().find((model) => model.id === this.newCarModel()) ?? this.availableCarModels()[0]
  );

  addCar(): void {
    const name = this.newCarName().trim();
    const selectedModel = this.selectedCarModel();

    if (!name) {
      return;
    }

    this.carsSource.update((current) => [
      ...current,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        model: selectedModel.id,
        color: this.newCarColor(),
        progress: 0,
        finishTimeMs: null,
        status: 'ready' as const
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

  startRace(): void {
    if (this.raceInProgress() || this.cars().length === 0) {
      return;
    }

    this.raceInProgressSource.set(true);
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
      const startTime = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startTime;
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

    void Promise.all(promises).then(() => {
      const ranked = [...this.cars()].sort(
        (first, second) => (first.finishTimeMs ?? Number.POSITIVE_INFINITY) - (second.finishTimeMs ?? Number.POSITIVE_INFINITY)
      );

      this.leaderboardSource.set(ranked);
      this.raceInProgressSource.set(false);
      this.raceFinishedSource.set(true);
    });
  }

  resetRace(): void {
    this.raceInProgressSource.set(false);
    this.raceFinishedSource.set(false);
    this.leaderboardSource.set([]);
    this.carsSource.update((current) => current.map((car) => ({ ...car, progress: 0, finishTimeMs: null, status: 'ready' as const })));
  }

  closeLeaderboard(): void {
    this.raceFinishedSource.set(false);
  }

  private updateCar(id: number, patch: Partial<Car>): void {
    this.carsSource.update((current) => current.map((car) => (car.id === id ? { ...car, ...patch } : car)));
  }
}
