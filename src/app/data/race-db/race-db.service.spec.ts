import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RaceDbService } from './race-db.service';

describe('RaceDbService', () => {
  let service: RaceDbService;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    TestBed.configureTestingModule({});
    service = TestBed.inject(RaceDbService);
  });

  it('loads race summaries from the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'race-1', name: 'Night Sprint', status: 'scheduled', createdAt: '2024-01-01', racerCount: 1, resultCount: 0 }]
    } as Response);

    const summaries = await service.getRaceSummaries();

    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe('Night Sprint');
  });

  it('creates a race entry and stores a result via the API', async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'race-1', name: 'Morning Loop', status: 'scheduled', createdAt: '2024-01-01', racers: [], results: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'racer-1', driverName: 'Nova', carModelId: 'Vanta', color: '#ff5f7d', progress: 0, finishTimeMs: null, status: 'ready' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'result-1', racerId: 'racer-1', position: 1, finishTimeMs: 1840, notes: 'Perfect run' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'race-1', name: 'Morning Loop', status: 'finished', createdAt: '2024-01-01', racers: [{ id: 'racer-1', driverName: 'Nova', carModelId: 'Vanta', color: '#ff5f7d', progress: 100, finishTimeMs: 1840, status: 'finished' }], results: [{ id: 'result-1', racerId: 'racer-1', position: 1, finishTimeMs: 1840, notes: 'Perfect run' }] }) } as Response);

    const raceId = await service.createRace({ name: 'Morning Loop', status: 'scheduled' });
    const racerId = await service.addRacer(raceId, {
      driverName: 'Nova',
      carModelId: 'Vanta',
      color: '#ff5f7d',
      progress: 0,
      finishTimeMs: null,
      status: 'ready'
    });

    await service.addResult(raceId, racerId, {
      position: 1,
      finishTimeMs: 1840,
      notes: 'Perfect run'
    });

    const race = await service.getRace(raceId);

    expect(race?.name).toBe('Morning Loop');
    expect(race?.results).toHaveLength(1);
    expect(race?.results[0].position).toBe(1);
  });

  it('loads personal bests from the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ carModelId: 'Vanta', finishTimeMs: 1840, achievedAt: '2024-01-01T00:00:00.000Z' }]
    } as Response);

    const bests = await service.getPersonalBests();

    expect(bests).toHaveLength(1);
    expect(bests[0].carModelId).toBe('Vanta');
  });

  it('toggles a favorite car model via the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ favorited: true, favoriteCarModelIds: ['Vanta'] })
    } as Response);

    const result = await service.toggleFavoriteCarModel('Vanta');

    expect(result.favorited).toBe(true);
    expect(result.favoriteCarModelIds).toEqual(['Vanta']);
  });

  it('creates a rematch race via the API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'race-2',
        name: 'Night Sprint (Rematch)',
        status: 'pending',
        createdAt: '2024-01-02T00:00:00.000Z',
        racers: [],
        results: []
      })
    } as Response);

    const rematch = await service.rematchRace('race-1');

    expect(rematch.id).toBe('race-2');
    expect(rematch.name).toBe('Night Sprint (Rematch)');
  });
});
