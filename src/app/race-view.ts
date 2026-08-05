import { Component, type Signal } from '@angular/core';
import { type Car, RaceStateService } from './race-state.service';

@Component({
  selector: 'app-race-view',
  imports: [],
  templateUrl: './race-view.html',
  styleUrl: './race-view.css'
})
export class RaceView {
  protected readonly cars: Signal<Car[]>;
  protected readonly raceInProgress: Signal<boolean>;
  protected readonly raceFinished: Signal<boolean>;
  protected readonly racePaused: Signal<boolean>;
  protected readonly leaderboard: Signal<Car[]>;

  constructor(protected readonly raceState: RaceStateService) {
    this.cars = this.raceState.cars;
    this.raceInProgress = this.raceState.raceInProgress;
    this.raceFinished = this.raceState.raceFinished;
    this.racePaused = this.raceState.racePaused;
    this.leaderboard = this.raceState.leaderboard;
  }

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
