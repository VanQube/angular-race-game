import { Component, inject } from '@angular/core';
import { RaceStateService } from './race-state.service';

@Component({
  selector: 'app-garage-view',
  imports: [],
  templateUrl: './garage-view.html',
  styleUrl: './garage-view.css'
})
export class GarageView {
  protected readonly raceState = inject(RaceStateService);

  protected addCar(): void {
    void this.raceState.addCar();
  }

  protected onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (target) {
      this.raceState.setNewCarName(target.value);
    }
  }

  protected onColorInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (target) {
      this.raceState.setNewCarColor(target.value);
    }
  }

  protected onModelSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;

    if (target) {
      this.raceState.selectCarModel(target.value);
    }
  }
}
