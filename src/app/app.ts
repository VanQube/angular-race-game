import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RaceStateService } from './race-state.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly raceState = inject(RaceStateService);
  protected readonly auth = inject(AuthService);

  protected readonly raceStatusLabel = computed(() => {
    if (this.raceState.raceInProgress()) {
      return 'Racing';
    }

    return this.raceState.raceFinished() ? 'Finished' : 'Ready';
  });
}
