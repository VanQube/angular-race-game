import { Component, OnInit, PendingTasks, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RaceDbService } from './data/race-db';
import type { CarModelRecord, PersonalBestRecord } from './data/race-db';

@Component({
  selector: 'app-records-view',
  imports: [DatePipe],
  templateUrl: './records-view.html',
  styleUrl: './records-view.css'
})
export class RecordsView implements OnInit {
  private readonly raceDb = inject(RaceDbService);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly personalBests = signal<PersonalBestRecord[]>([]);
  protected readonly carModels = signal<CarModelRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const models = new Map(this.carModels().map((model) => [model.id, model]));

    return [...this.personalBests()]
      .sort((first, second) => first.finishTimeMs - second.finishTimeMs)
      .map((best) => ({ best, model: models.get(best.carModelId) }));
  });

  ngOnInit(): void {
    this.pendingTasks.run(() => this.loadRecords());
  }

  private async loadRecords(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [personalBests, carModels] = await Promise.all([
        this.raceDb.getPersonalBests(),
        this.raceDb.getCarModels()
      ]);
      this.personalBests.set(personalBests);
      this.carModels.set(carModels);
    } catch {
      this.error.set('Unable to load personal bests. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }
}
