export const CAR_MODEL_COLLECTION_NAME = 'carModels';

// Single source of truth for the seed data: also used to validate favorite requests,
// so an unknown carModelId can be rejected without a database round-trip.
export const carModels = [
  { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
  { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' },
  { id: 'Axiom', name: 'Axiom', tag: 'Neural chassis', accent: '#7b61ff' },
  { id: 'Spectra', name: 'Spectra', tag: 'Lightwave shell', accent: '#ffd166' },
  { id: 'Kestrel', name: 'Kestrel', tag: 'Skyline racer', accent: '#15f5b3' },
  { id: 'Nox', name: 'Nox', tag: 'Shadow sprint', accent: '#ff5f7d' }
];

export function isKnownCarModelId(carModelId) {
  return typeof carModelId === 'string' && carModels.some((model) => model.id === carModelId);
}

/**
 * Adds or removes a car model from a user's favorites. Toggling is idempotent per call
 * (favoriting an already-favorited id un-favorites it), which keeps a single POST route
 * sufficient for both directions instead of needing a separate unfavorite endpoint.
 */
export function toggleFavorite(currentFavoriteIds, carModelId) {
  const favorites = Array.isArray(currentFavoriteIds) ? currentFavoriteIds : [];
  const alreadyFavorited = favorites.includes(carModelId);
  const favoriteCarModelIds = alreadyFavorited
    ? favorites.filter((id) => id !== carModelId)
    : [...favorites, carModelId];

  return { favorited: !alreadyFavorited, favoriteCarModelIds };
}
