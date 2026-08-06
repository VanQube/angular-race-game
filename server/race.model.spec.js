import { describe, expect, it } from 'vitest';
import { buildRematchName, buildRematchRace, validateRematchSource } from './race.model.js';

describe('race.model', () => {
  describe('buildRematchName', () => {
    it('appends a rematch suffix to an existing name', () => {
      expect(buildRematchName('Sunset Sprint')).toBe('Sunset Sprint (Rematch)');
    });

    it('trims surrounding whitespace before appending the suffix', () => {
      expect(buildRematchName('  Sunset Sprint  ')).toBe('Sunset Sprint (Rematch)');
    });

    it('falls back to a generic name when the source name is missing or blank', () => {
      expect(buildRematchName('')).toBe('Rematch');
      expect(buildRematchName('   ')).toBe('Rematch');
      expect(buildRematchName(undefined)).toBe('Rematch');
    });
  });

  describe('validateRematchSource', () => {
    it('is valid when the source race has at least one racer', () => {
      const result = validateRematchSource({ racers: [{ id: 'racer-1' }] });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects a race with no racers', () => {
      const result = validateRematchSource({ racers: [] });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('race has no racers to rematch');
    });

    it('rejects a race with a missing racers array', () => {
      const result = validateRematchSource({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('race has no racers to rematch');
    });
  });

  describe('buildRematchRace', () => {
    const now = new Date('2026-08-05T12:00:00.000Z');
    const sourceRace = {
      _id: { toString: () => 'race-123' },
      name: 'Sunset Sprint',
      ownerId: 'owner-1',
      status: 'finished',
      racers: [
        { id: 'racer-1', driverName: 'Blaze', progress: 100, finishTimeMs: 12430, status: 'finished' },
        { id: 'racer-2', driverName: 'Nova', progress: 0, finishTimeMs: null, status: 'ready' }
      ],
      results: [{ id: 'result-1', racerId: 'racer-1', position: 1, finishTimeMs: 12430 }]
    };

    it('resets every racer to the starting line', () => {
      const rematch = buildRematchRace(sourceRace, 'owner-1', now);

      expect(rematch.racers).toHaveLength(2);
      for (const racer of rematch.racers) {
        expect(racer.progress).toBe(0);
        expect(racer.finishTimeMs).toBeNull();
        expect(racer.status).toBe('ready');
      }
      expect(rematch.racers[0].driverName).toBe('Blaze');
      expect(rematch.racers[1].driverName).toBe('Nova');
    });

    it('drops results from the source race', () => {
      const rematch = buildRematchRace(sourceRace, 'owner-1', now);

      expect(rematch.results).toEqual([]);
    });

    it('sets a pending status, the requesting owner, and a link back to the source race', () => {
      const rematch = buildRematchRace(sourceRace, 'requesting-owner', now);

      expect(rematch.status).toBe('pending');
      expect(rematch.ownerId).toBe('requesting-owner');
      expect(rematch.sourceRaceId).toBe('race-123');
      expect(rematch.createdAt).toBe(now.toISOString());
      expect(rematch.name).toBe('Sunset Sprint (Rematch)');
    });

    it('falls back to a plain id when the source race has no _id', () => {
      const rematch = buildRematchRace({ ...sourceRace, _id: undefined, id: 'local-race-1' }, 'owner-1', now);

      expect(rematch.sourceRaceId).toBe('local-race-1');
    });
  });
});
