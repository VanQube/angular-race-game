import { Component, OnInit, PendingTasks, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RaceDbService } from './data/race-db';
import type { RaceRecord, RaceSummary } from './data/race-db';

@Component({
  selector: 'app-history-view',
  imports: [DatePipe],
  templateUrl: './history-view.html',
  styleUrl: './history-view.css'
})
export class HistoryView implements OnInit {
  private readonly raceDb = inject(RaceDbService);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly summaries = signal<RaceSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly selectedRaceId = signal<string | null>(null);
  protected readonly selectedRace = signal<RaceRecord | undefined>(undefined);
  protected readonly detailLoading = signal(false);
  protected readonly rematching = signal(false);

  protected readonly hasRaces = computed(() => this.summaries().length > 0);

  ngOnInit(): void {
    this.pendingTasks.run(() => this.loadSummaries());
  }

  private async loadSummaries(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summaries.set(await this.raceDb.getRaceSummaries());
    } catch {
      this.error.set('Unable to load race history. Try again shortly.');
    } finally {
      this.loading.set(false);
    }
  }

  protected selectRace(raceId: string): void {
    this.pendingTasks.run(() => this.doSelectRace(raceId));
  }

  private async doSelectRace(raceId: string): Promise<void> {
    this.selectedRaceId.set(raceId);
    this.selectedRace.set(undefined);
    this.detailLoading.set(true);
    this.error.set(null);
    try {
      this.selectedRace.set(await this.raceDb.getRace(raceId));
    } catch {
      this.error.set('Unable to load race details. Try again shortly.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected rematch(raceId: string): void {
    this.pendingTasks.run(() => this.doRematch(raceId));
  }

  private async doRematch(raceId: string): Promise<void> {
    this.rematching.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      const rematch = await this.raceDb.rematchRace(raceId);
      this.summaries.set(await this.raceDb.getRaceSummaries());
      this.success.set(`${rematch.name} is saved. Reload the app to race it in the Garage.`);
    } catch {
      this.error.set('Unable to create a rematch. Try again shortly.');
    } finally {
      this.rematching.set(false);
    }
  }
}
