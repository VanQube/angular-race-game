import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RaceStateService } from './race-state.service';
import { AuthService } from './auth.service';

function mockRaceDb() {
  return {
    addRacer: vi.fn().mockResolvedValue('racer-id'),
    createRace: vi.fn().mockResolvedValue('race-id'),
    addResult: vi.fn().mockResolvedValue(undefined),
    getCarModels: vi.fn().mockResolvedValue([]),
    getRaceSummaries: vi.fn().mockResolvedValue([]),
    getRace: vi.fn().mockResolvedValue(undefined)
  };
}

describe('RaceStateService', () => {
  describe('when authenticated', () => {
    let service: RaceStateService;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
      vi.spyOn(Math, 'random').mockReturnValue(0);

      TestBed.configureTestingModule({});

      const auth = TestBed.inject(AuthService);
      (auth as any).userSource.set({ id: 'user-1', email: 'racer@example.com', displayName: 'Racer', createdAt: '2024-01-01' });

      service = TestBed.inject(RaceStateService);
      (service as any).raceDb = mockRaceDb();

      (service as any).carsSource.set([
        { id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' },
        { id: 2, name: 'Blaze', model: 'Kestrel', color: '#5fd2ff', progress: 0, finishTimeMs: null, status: 'ready' }
      ]);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should pause and resume the race without losing progress', async () => {
      let completed = false;
      const runPromise = service.startRace().then(() => {
        completed = true;
      });

      await vi.advanceTimersByTimeAsync(20);
      service.pauseRace();
      expect(service.racePaused()).toBe(true);

      await vi.advanceTimersByTimeAsync(200);
      const progressBeforeResume = service.cars()[0].progress;

      service.resumeRace();
      expect(service.racePaused()).toBe(false);

      await vi.advanceTimersByTimeAsync(3000);
      expect(completed).toBe(true);
      expect(service.cars()[0].progress).toBeGreaterThan(progressBeforeResume);

      await runPromise;
    });
  });

  describe('when not authenticated', () => {
    let service: RaceStateService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(RaceStateService);
      (service as any).raceDb = mockRaceDb();

      (service as any).carsSource.set([
        { id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' }
      ]);
    });

    it('does not start a race', async () => {
      await service.startRace();

      expect(service.raceInProgress()).toBe(false);
    });

    it('does not add a car', async () => {
      service.setNewCarName('Nova');
      await service.addCar();

      expect(service.cars()).toHaveLength(1);
    });
  });
});
