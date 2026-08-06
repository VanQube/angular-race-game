import { Component, inject } from '@angular/core';
import { RaceStateService } from './race-state.service';

@Component({
  selector: 'app-leaderboard-view',
  imports: [],
  templateUrl: './leaderboard-view.html',
  styleUrl: './leaderboard-view.css'
})
export class LeaderboardView {
  protected readonly raceState = inject(RaceStateService);

  protected closeLeaderboard(): void {
    this.raceState.closeLeaderboard();
  }
}
