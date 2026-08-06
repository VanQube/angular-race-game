import { Component, OnInit, PendingTasks, computed, inject, signal } from '@angular/core';
import { RaceDbService } from './data/race-db';
import type { CarModelRecord } from './data/race-db';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-showroom-view',
  imports: [],
  templateUrl: './showroom-view.html',
  styleUrl: './showroom-view.css'
})
export class ShowroomView implements OnInit {
  private readonly raceDb = inject(RaceDbService);
  private readonly auth = inject(AuthService);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly carModels = signal<CarModelRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingId = signal<string | null>(null);

  protected readonly favoriteIds = computed(() => this.auth.user()?.favoriteCarModelIds ?? []);

  protected readonly cards = computed(() => {
    const favorites = new Set(this.favoriteIds());

    return [...this.carModels()]
      .map((model) => {
        const favorited = favorites.has(model.id);
        return {
          model,
          favorited,
          favoriteLabel: `${favorited ? 'Unfavorite' : 'Favorite'} ${model.name}`
        };
      })
      .sort((first, second) => Number(second.favorited) - Number(first.favorited));
  });

  ngOnInit(): void {
    this.pendingTasks.run(() => this.loadCarModels());
  }

  private async loadCarModels(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.carModels.set(await this.raceDb.getCarModels());
    } catch {
      this.error.set('Unable to load car models. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }

  protected toggleFavorite(carModelId: string): void {
    this.pendingTasks.run(() => this.doToggleFavorite(carModelId));
  }

  private async doToggleFavorite(carModelId: string): Promise<void> {
    this.pendingId.set(carModelId);
    this.error.set(null);
    try {
      const result = await this.raceDb.toggleFavoriteCarModel(carModelId);
      this.auth.setFavoriteCarModelIds(result.favoriteCarModelIds);
    } catch {
      this.error.set('Unable to update favorites. Try again shortly.');
    } finally {
      this.pendingId.set(null);
    }
  }

  protected isPending(carModelId: string): boolean {
    return this.pendingId() === carModelId;
  }
}
