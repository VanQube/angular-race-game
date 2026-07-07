import { Component, type Signal } from '@angular/core';
import { type Car, RaceStateService } from './race-state.service';

@Component({
  selector: 'app-leaderboard-view',
  imports: [],
  templateUrl: './leaderboard-view.html',
  styleUrl: './leaderboard-view.css'
})
export class LeaderboardView {
  protected readonly leaderboard: Signal<Car[]>;
  protected readonly raceFinished: Signal<boolean>;

  constructor(protected readonly raceState: RaceStateService) {
    this.leaderboard = this.raceState.leaderboard;
    this.raceFinished = this.raceState.raceFinished;
  }

  protected closeLeaderboard(): void {
    this.raceState.closeLeaderboard();
  }
}
