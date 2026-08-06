import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

  protected readonly carModels = signal<CarModelRecord[]>([]);
  protected readonly favoriteIds = signal<string[]>(this.auth.user()?.favoriteCarModelIds ?? []);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingId = signal<string | null>(null);

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
    void this.loadCarModels();
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

  protected async toggleFavorite(carModelId: string): Promise<void> {
    this.pendingId.set(carModelId);
    this.error.set(null);
    try {
      const result = await this.raceDb.toggleFavoriteCarModel(carModelId);
      this.favoriteIds.set(result.favoriteCarModelIds);
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
