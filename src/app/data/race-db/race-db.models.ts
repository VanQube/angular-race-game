export type RaceStatus = 'scheduled' | 'running' | 'finished' | 'cancelled' | 'pending';
export type RacerStatus = 'ready' | 'racing' | 'finished';

export interface CarModelRecord {
  id: string;
  name: string;
  tag: string;
  accent: string;
}

export interface RacerRecord {
  id: string;
  driverName: string;
  carModelId: string;
  color: string;
  progress: number;
  finishTimeMs: number | null;
  status: RacerStatus;
}

export interface RaceResultRecord {
  id: string;
  racerId: string;
  position: number;
  finishTimeMs: number;
  notes?: string;
}

export interface RaceRecord {
  id: string;
  name: string;
  status: RaceStatus;
  createdAt: string;
  racers: RacerRecord[];
  results: RaceResultRecord[];
}

export interface RaceSummary {
  id: string;
  name: string;
  status: RaceStatus;
  createdAt: string;
  racerCount: number;
  resultCount: number;
}

export interface PersonalBestRecord {
  carModelId: string;
  finishTimeMs: number;
  achievedAt: string;
}
