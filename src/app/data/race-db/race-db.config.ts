import type { CarModelRecord } from './race-db.models';

export const RACE_DB_CONFIG = {
  defaultRaceName: 'Night Sprint',
  defaultRaceStatus: 'scheduled' as const,
  defaultCarModels: [
    { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
    { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' },
    { id: 'Axiom', name: 'Axiom', tag: 'Neural chassis', accent: '#7b61ff' },
    { id: 'Spectra', name: 'Spectra', tag: 'Lightwave shell', accent: '#ffd166' },
    { id: 'Kestrel', name: 'Kestrel', tag: 'Skyline racer', accent: '#15f5b3' },
    { id: 'Nox', name: 'Nox', tag: 'Shadow sprint', accent: '#ff5f7d' }
  ] satisfies CarModelRecord[]
};
