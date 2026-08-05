import { Component, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { type Car, RaceStateService } from './race-state.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly cars: Signal<Car[]>;
  protected readonly raceInProgress: Signal<boolean>;
  protected readonly raceFinished: Signal<boolean>;

  constructor(protected readonly raceState: RaceStateService, protected readonly auth: AuthService) {
    this.cars = this.raceState.cars;
    this.raceInProgress = this.raceState.raceInProgress;
    this.raceFinished = this.raceState.raceFinished;
  }
}
