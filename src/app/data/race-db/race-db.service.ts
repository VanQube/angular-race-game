import { MONGO_CONFIG } from './mongo.config';
import type { CarModelRecord, RaceRecord, RaceResultRecord, RaceSummary, RacerRecord } from './race-db.models';

export class RaceDbService {
  private readonly baseUrl = MONGO_CONFIG.baseUrl;

  async getCarModels(): Promise<CarModelRecord[]> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.carModels}`);

    if (!response.ok) {
      throw new Error('Unable to load car models from MongoDB API.');
    }

    return response.json() as Promise<CarModelRecord[]>;
  }

  async getRaceSummaries(): Promise<RaceSummary[]> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}`);

    if (!response.ok) {
      throw new Error('Unable to load race summaries from MongoDB API.');
    }

    return response.json() as Promise<RaceSummary[]>;
  }

  async createRace(input: Pick<RaceRecord, 'name' | 'status'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Unable to create a race in MongoDB.');
    }

    const payload = await response.json() as { id: string };
    return payload.id;
  }

  async addRacer(raceId: string, input: Omit<RacerRecord, 'id'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}/${raceId}/racers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Unable to add a racer to MongoDB.');
    }

    const payload = await response.json() as { id: string };
    return payload.id;
  }

  async addResult(raceId: string, racerId: string, input: Omit<RaceResultRecord, 'id' | 'racerId'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}/${raceId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, racerId })
    });

    if (!response.ok) {
      throw new Error('Unable to persist a race result in MongoDB.');
    }

    const payload = await response.json() as { id: string };
    return payload.id;
  }

  async getRace(raceId: string): Promise<RaceRecord | undefined> {
    const response = await fetch(`${this.baseUrl}${MONGO_CONFIG.endpoints.races}/${raceId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw new Error('Unable to load race details from MongoDB.');
    }

    return response.json() as Promise<RaceRecord>;
  }

  async getRacers(raceId: string): Promise<RacerRecord[]> {
    const race = await this.getRace(raceId);
    return race?.racers ?? [];
  }
}
