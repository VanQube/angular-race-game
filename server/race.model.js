const REMATCH_SUFFIX = ' (Rematch)';

/** Resets a racer's run state so it starts from the line again, keeping identity/appearance. */
function resetRacerForRematch(racer) {
  return {
    ...racer,
    progress: 0,
    finishTimeMs: null,
    status: 'ready'
  };
}

export function buildRematchName(sourceName) {
  const name = typeof sourceName === 'string' ? sourceName.trim() : '';
  return name ? `${name}${REMATCH_SUFFIX}` : 'Rematch';
}

export function validateRematchSource(sourceRace) {
  const errors = [];
  const racers = sourceRace?.racers ?? [];

  if (racers.length === 0) {
    errors.push('race has no racers to rematch');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Builds a new race document from a finished/existing one: same racers reset to the
 * starting line, no results (those belonged to the run being repeated), and a link
 * back to the race it was rematched from.
 */
export function buildRematchRace(sourceRace, ownerId, now = new Date()) {
  return {
    name: buildRematchName(sourceRace.name),
    status: 'pending',
    ownerId,
    sourceRaceId: sourceRace._id?.toString?.() ?? sourceRace.id,
    createdAt: now.toISOString(),
    racers: (sourceRace.racers ?? []).map(resetRacerForRematch),
    results: []
  };
}
