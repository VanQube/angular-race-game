import { describe, expect, it } from 'vitest';
import { carModels, isKnownCarModelId, toggleFavorite } from './car-model.model.js';

describe('car-model.model', () => {
  describe('isKnownCarModelId', () => {
    it('accepts every id present in the seed data', () => {
      for (const model of carModels) {
        expect(isKnownCarModelId(model.id)).toBe(true);
      }
    });

    it('rejects an id that is not in the seed data', () => {
      expect(isKnownCarModelId('Not-A-Real-Model')).toBe(false);
    });

    it('rejects non-string and empty input without throwing', () => {
      expect(isKnownCarModelId('')).toBe(false);
      expect(isKnownCarModelId(undefined)).toBe(false);
      expect(isKnownCarModelId(null)).toBe(false);
      expect(isKnownCarModelId(42)).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('adds a car model that is not yet favorited', () => {
      const result = toggleFavorite([], 'Vanta');

      expect(result.favorited).toBe(true);
      expect(result.favoriteCarModelIds).toEqual(['Vanta']);
    });

    it('removes a car model that is already favorited', () => {
      const result = toggleFavorite(['Vanta', 'Rift'], 'Vanta');

      expect(result.favorited).toBe(false);
      expect(result.favoriteCarModelIds).toEqual(['Rift']);
    });

    it('treats a missing favorites list as empty instead of throwing', () => {
      const result = toggleFavorite(undefined, 'Vanta');

      expect(result.favorited).toBe(true);
      expect(result.favoriteCarModelIds).toEqual(['Vanta']);
    });

    it('is idempotent across two toggles: favoriting then un-favoriting returns to the start', () => {
      const first = toggleFavorite([], 'Vanta');
      const second = toggleFavorite(first.favoriteCarModelIds, 'Vanta');

      expect(second.favorited).toBe(false);
      expect(second.favoriteCarModelIds).toEqual([]);
    });

    it('does not mutate the input array', () => {
      const original = ['Vanta'];
      toggleFavorite(original, 'Rift');

      expect(original).toEqual(['Vanta']);
    });

    it('only affects the targeted id, leaving other favorites untouched', () => {
      const result = toggleFavorite(['Vanta', 'Nox'], 'Rift');

      expect(result.favoriteCarModelIds).toEqual(['Vanta', 'Nox', 'Rift']);
    });
  });
});
