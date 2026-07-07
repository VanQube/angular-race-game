import { Component, type Signal } from '@angular/core';
import { type Car, type CarModel, RaceStateService } from './race-state.service';

@Component({
  selector: 'app-garage-view',
  imports: [],
  templateUrl: './garage-view.html',
  styleUrl: './garage-view.css'
})
export class GarageView {
  protected readonly availableCarModels: Signal<CarModel[]>;
  protected readonly newCarName: Signal<string>;
  protected readonly newCarModel: Signal<string>;
  protected readonly newCarColor: Signal<string>;
  protected readonly selectedCarModel: Signal<CarModel>;
  protected readonly cars: Signal<Car[]>;
  protected readonly raceInProgress: Signal<boolean>;

  constructor(protected readonly raceState: RaceStateService) {
    this.availableCarModels = this.raceState.availableCarModels;
    this.newCarName = this.raceState.newCarName;
    this.newCarModel = this.raceState.newCarModel;
    this.newCarColor = this.raceState.newCarColor;
    this.selectedCarModel = this.raceState.selectedCarModel;
    this.cars = this.raceState.cars;
    this.raceInProgress = this.raceState.raceInProgress;
  }

  protected addCar(): void {
    this.raceState.addCar();
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
