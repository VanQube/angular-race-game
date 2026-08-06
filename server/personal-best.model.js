export const PERSONAL_BEST_COLLECTION_NAME = 'personalBests';

export function findRacerInRace(race, racerId) {
  return (race?.racers ?? []).find((racer) => racer.id === racerId) ?? null;
}

export function validateFinishPayload(body) {
  const errors = [];
  const finishTimeMs = body?.finishTimeMs;

  if (typeof finishTimeMs !== 'number' || !Number.isFinite(finishTimeMs) || finishTimeMs <= 0) {
    errors.push('finishTimeMs must be a positive number');
  }

  return { valid: errors.length === 0, errors, data: { finishTimeMs } };
}

// A racer can only cross the line once; re-finishing would silently overwrite an earlier
// time and double-count a result, so it's treated as a conflict rather than an update.
export function canRacerFinish(racer) {
  return racer.status !== 'finished';
}

export function markRacerFinished(racer, finishTimeMs) {
  return { ...racer, progress: 100, finishTimeMs, status: 'finished' };
}

export function nextRacePosition(existingResults) {
  return (existingResults?.length ?? 0) + 1;
}

/**
 * Compares a newly-set finish time against the caller's stored best for that car model
 * and only replaces it when the new time is strictly faster. Ties don't count as an
 * improvement, so replaying the same time twice isn't reported as a new personal best.
 */
export function resolvePersonalBest({ existingBest, ownerId, carModelId, finishTimeMs, now = new Date() }) {
  const isNewPersonalBest = !existingBest || finishTimeMs < existingBest.finishTimeMs;

  if (!isNewPersonalBest) {
    return { isNewPersonalBest: false, record: existingBest };
  }

  return {
    isNewPersonalBest: true,
    record: { ownerId, carModelId, finishTimeMs, achievedAt: now.toISOString() }
  };
}

export function formatPersonalBest(record) {
  return {
    carModelId: record.carModelId,
    finishTimeMs: record.finishTimeMs,
    achievedAt: record.achievedAt
  };
}
