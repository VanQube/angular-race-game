import { Component, signal } from '@angular/core';

interface Car {
  id: number;
  name: string;
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
  protected readonly cars = signal<Car[]>([
    { id: 1, name: 'Nova', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 2, name: 'Blaze', color: '#5fd2ff', progress: 0, finishTimeMs: null, status: 'ready' },
    { id: 3, name: 'Volt', color: '#ffd166', progress: 0, finishTimeMs: null, status: 'ready' }
  ]);

  protected readonly newCarName = signal('');
  protected readonly newCarColor = signal('#7c4dff');
  protected readonly raceInProgress = signal(false);
  protected readonly raceFinished = signal(false);
  protected readonly leaderboard = signal<Car[]>([]);

  protected addCar(): void {
    const name = this.newCarName().trim();
    if (!name) {
      return;
    }

    this.cars.update((current) => [
      ...current,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        color: this.newCarColor(),
        progress: 0,
        finishTimeMs: null,
        status: 'ready' as const
      }
    ]);

    this.newCarName.set('');
    this.newCarColor.set('#7c4dff');
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
