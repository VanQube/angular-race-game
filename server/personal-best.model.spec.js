import { describe, expect, it } from 'vitest';
import {
  canRacerFinish,
  findRacerInRace,
  formatPersonalBest,
  markRacerFinished,
  nextRacePosition,
  resolvePersonalBest,
  validateFinishPayload
} from './personal-best.model.js';

describe('personal-best.model', () => {
  describe('findRacerInRace', () => {
    const race = { racers: [{ id: 'racer-1', driverName: 'Blaze' }, { id: 'racer-2', driverName: 'Nova' }] };

    it('finds a racer by id', () => {
      expect(findRacerInRace(race, 'racer-2')?.driverName).toBe('Nova');
    });

    it('returns null when no racer matches', () => {
      expect(findRacerInRace(race, 'racer-missing')).toBeNull();
    });

    it('returns null when the race has no racers array', () => {
      expect(findRacerInRace({}, 'racer-1')).toBeNull();
    });
  });

  describe('validateFinishPayload', () => {
    it('accepts a positive finite finishTimeMs', () => {
      const result = validateFinishPayload({ finishTimeMs: 12430 });

      expect(result.valid).toBe(true);
      expect(result.data.finishTimeMs).toBe(12430);
    });

    it.each([
      ['missing', {}],
      ['zero', { finishTimeMs: 0 }],
      ['negative', { finishTimeMs: -5 }],
      ['a string', { finishTimeMs: '12430' }],
      ['NaN', { finishTimeMs: NaN }],
      ['Infinity', { finishTimeMs: Infinity }]
    ])('rejects finishTimeMs that is %s', (_label, body) => {
      const result = validateFinishPayload(body);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('finishTimeMs must be a positive number');
    });
  });

  describe('canRacerFinish', () => {
    it('allows a ready or racing racer to finish', () => {
      expect(canRacerFinish({ status: 'ready' })).toBe(true);
      expect(canRacerFinish({ status: 'racing' })).toBe(true);
    });

    it('rejects a racer that has already finished', () => {
      expect(canRacerFinish({ status: 'finished' })).toBe(false);
    });
  });

  describe('markRacerFinished', () => {
    it('sets progress, finishTimeMs, and status without touching other fields', () => {
      const racer = { id: 'racer-1', driverName: 'Blaze', carModelId: 'Vanta', progress: 40, status: 'racing' };
      const finished = markRacerFinished(racer, 12430);

      expect(finished).toEqual({
        id: 'racer-1',
        driverName: 'Blaze',
        carModelId: 'Vanta',
        progress: 100,
        finishTimeMs: 12430,
        status: 'finished'
      });
      expect(racer.status).toBe('racing');
    });
  });

  describe('nextRacePosition', () => {
    it('starts at 1 when there are no existing results', () => {
      expect(nextRacePosition(undefined)).toBe(1);
      expect(nextRacePosition([])).toBe(1);
    });

    it('is one past the current result count', () => {
      expect(nextRacePosition([{}, {}])).toBe(3);
    });
  });

  describe('resolvePersonalBest', () => {
    const now = new Date('2026-08-05T12:00:00.000Z');

    it('sets a new personal best when none exists yet', () => {
      const result = resolvePersonalBest({
        existingBest: null,
        ownerId: 'owner-1',
        carModelId: 'Vanta',
        finishTimeMs: 12430,
        now
      });

      expect(result.isNewPersonalBest).toBe(true);
      expect(result.record).toEqual({
        ownerId: 'owner-1',
        carModelId: 'Vanta',
        finishTimeMs: 12430,
        achievedAt: now.toISOString()
      });
    });

    it('replaces the best when the new time is strictly faster', () => {
      const existingBest = { ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 15000, achievedAt: '2026-01-01T00:00:00.000Z' };
      const result = resolvePersonalBest({ existingBest, ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 12430, now });

      expect(result.isNewPersonalBest).toBe(true);
      expect(result.record.finishTimeMs).toBe(12430);
    });

    it('keeps the existing best untouched when the new time is slower', () => {
      const existingBest = { ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 10000, achievedAt: '2026-01-01T00:00:00.000Z' };
      const result = resolvePersonalBest({ existingBest, ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 12430, now });

      expect(result.isNewPersonalBest).toBe(false);
      expect(result.record).toBe(existingBest);
    });

    it('does not count an equal time as a new personal best', () => {
      const existingBest = { ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 12430, achievedAt: '2026-01-01T00:00:00.000Z' };
      const result = resolvePersonalBest({ existingBest, ownerId: 'owner-1', carModelId: 'Vanta', finishTimeMs: 12430, now });

      expect(result.isNewPersonalBest).toBe(false);
      expect(result.record).toBe(existingBest);
    });
  });

  describe('formatPersonalBest', () => {
    it('keeps only the public shape, stripping internal fields', () => {
      const record = {
        _id: 'mongo-id',
        ownerId: 'user-1',
        carModelId: 'Vanta',
        finishTimeMs: 1840,
        achievedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(formatPersonalBest(record)).toEqual({
        carModelId: 'Vanta',
        finishTimeMs: 1840,
        achievedAt: '2024-01-01T00:00:00.000Z'
      });
    });
  });
});
