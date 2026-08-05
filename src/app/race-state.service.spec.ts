import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { RaceStateService } from './race-state.service';

describe('RaceStateService', () => {
  let service: RaceStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RaceStateService);

    (service as any).raceDb = {
      addRacer: jasmine.createSpy().and.resolveTo('racer-id'),
      createRace: jasmine.createSpy().and.resolveTo('race-id'),
      addResult: jasmine.createSpy().and.resolveTo(undefined),
      getCarModels: jasmine.createSpy().and.resolveTo([]),
      getRaceSummaries: jasmine.createSpy().and.resolveTo([]),
      getRace: jasmine.createSpy().and.resolveTo(null)
    };

    (service as any).carsSource.set([
      { id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' },
      { id: 2, name: 'Blaze', model: 'Kestrel', color: '#5fd2ff', progress: 0, finishTimeMs: null, status: 'ready' }
    ]);
  });

  it('should pause and resume the race without losing progress', fakeAsync(() => {
    let completed = false;
    const runPromise = service.startRace().then(() => {
      completed = true;
    });

    tick(20);
    service.pauseRace();
    expect(service.racePaused()).toBeTrue();

    tick(200);
    const progressBeforeResume = service.cars()[0].progress;

    service.resumeRace();
    expect(service.racePaused()).toBeFalse();

    tick(3000);
    expect(completed).toBeTrue();
    expect(service.cars()[0].progress).toBeGreaterThan(progressBeforeResume);

    runPromise.then();
  }));
});
