import { Component, computed, inject } from '@angular/core';
import { RaceStateService } from './race-state.service';

@Component({
  selector: 'app-race-view',
  imports: [],
  templateUrl: './race-view.html',
  styleUrl: './race-view.css'
})
export class RaceView {
  protected readonly raceState = inject(RaceStateService);

  protected readonly statusMessage = computed(() => {
    if (this.raceState.raceInProgress()) {
      return 'The racers are blazing down the lane.';
    }

    return this.raceState.raceFinished() ? 'A new record has been set.' : 'The grid is ready for launch.';
  });

  protected startRace(): void {
    void this.raceState.startRace();
  }

  protected resetRace(): void {
    this.raceState.resetRace();
  }

  protected pauseRace(): void {
    this.raceState.pauseRace();
  }

  protected resumeRace(): void {
    this.raceState.resumeRace();
  }
}
