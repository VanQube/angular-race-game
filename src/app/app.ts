import { Component, computed, signal } from '@angular/core';

interface CarModel {
  id: string;
  name: string;
  tag: string;
  accent: string;
}

interface Car {
  id: number;
  name: string;
  model: string;
  color: string;
  progress: number;
  finishTimeMs: number | null;
  status: 'ready' | 'racing' | 'finished';
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly availableCarModels = signal<CarModel[]>([
    { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
    { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' },
    { id: 'Axiom', name: 'Axiom', tag: 'Neural chassis', accent: '#7b61ff' },
    { id: 'Spectra', name: 'Spectra', tag: 'Lightwave shell', accent: '#ffd166' },
    { id: 'Kestrel', name: 'Kestrel', tag: 'Skyline racer', accent: '#15f5b3' },
    { id: 'Nox', name: 'Nox', tag: 'Shadow sprint', accent: '#ff5f7d' }
  ]);

  protected readonly cars = signal<Car[]>([
    { id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 2, name: 'Blaze', model: 'Kestrel', color: '#5fd2ff', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 3, name: 'Volt', model: 'Spectra', color: '#ffd166', progress: 0, finishTimeMs: null, status: 'ready' }
  ]);

  protected readonly newCarName = signal('');
  protected readonly newCarModel = signal<string>(this.availableCarModels()[0].id);
  protected readonly newCarColor = signal(this.availableCarModels()[0].accent);
  protected readonly selectedCarModel = computed(() =>
    this.availableCarModels().find((model) => model.id === this.newCarModel()) ?? this.availableCarModels()[0]
  );
  protected readonly raceInProgress = signal(false);
  protected readonly raceFinished = signal(false);
  protected readonly leaderboard = signal<Car[]>([]);

  protected addCar(): void {
    const name = this.newCarName().trim();
    const selectedModel = this.selectedCarModel();

    if (!name) {
      return;
    }

    this.cars.update((current) => [
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

    this.newCarName.set('');
    this.newCarModel.set(selectedModel.id);
    this.newCarColor.set(selectedModel.accent);
  }

  protected onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (target) {
      this.newCarName.set(target.value);
    }
  }

  protected onColorInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (target) {
      this.newCarColor.set(target.value);
    }
  }

  protected onModelSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;

    if (target) {
      this.selectCarModel(target.value);
    }
  }

  protected selectCarModel(modelId: string): void {
    const model = this.availableCarModels().find((entry) => entry.id === modelId);

    if (!model) {
      return;
    }

    this.newCarModel.set(model.id);
    this.newCarColor.set(model.accent);
  }

  protected startRace(): void {
    if (this.raceInProgress() || this.cars().length === 0) {
      return;
    }

    this.raceInProgress.set(true);
    this.raceFinished.set(false);
    this.leaderboard.set([]);

    const racers = this.cars().map((car) => ({
      ...car,
      progress: 0,
      finishTimeMs: null,
      status: 'racing' as const
    }));

    this.cars.set(racers);

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

      this.leaderboard.set(ranked);
      this.raceInProgress.set(false);
      this.raceFinished.set(true);
    });
  }

  protected resetRace(): void {
    this.raceInProgress.set(false);
    this.raceFinished.set(false);
    this.leaderboard.set([]);
    this.cars.update((current) => current.map((car) => ({ ...car, progress: 0, finishTimeMs: null, status: 'ready' as const })));
  }

  protected closeLeaderboard(): void {
    this.raceFinished.set(false);
  }

  private updateCar(id: number, patch: Partial<Car>): void {
    this.cars.update((current) => current.map((car) => (car.id === id ? { ...car, ...patch } : car)));
  }
}
