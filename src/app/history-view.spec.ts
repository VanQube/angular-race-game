import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryView } from './history-view';

function mockRaceDb() {
  return {
    getRaceSummaries: vi.fn().mockResolvedValue([
      { id: 'race-1', name: 'Night Sprint', status: 'finished', createdAt: '2024-01-01T00:00:00.000Z', racerCount: 2, resultCount: 2 }
    ]),
    getRace: vi.fn().mockResolvedValue({
      id: 'race-1',
      name: 'Night Sprint',
      status: 'finished',
      createdAt: '2024-01-01T00:00:00.000Z',
      racers: [],
      results: [{ id: 'result-1', racerId: 'racer-1', position: 1, finishTimeMs: 1840 }]
    }),
    rematchRace: vi.fn().mockResolvedValue({
      id: 'race-2',
      name: 'Night Sprint (Rematch)',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00.000Z',
      racers: [],
      results: []
    })
  };
}

describe('HistoryView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HistoryView>>;
  let component: HistoryView;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(HistoryView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads and renders the race list', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Night Sprint');
  });

  it('loads and shows race detail when a race is selected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.history-row__select') as HTMLButtonElement).click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('1840ms');
  });

  it('creates a rematch and shows a success message', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.rematch-btn') as HTMLButtonElement).click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect((component as any).raceDb.rematchRace).toHaveBeenCalledWith('race-1');
    expect(compiled.querySelector('[role="status"].status-banner--success')?.textContent).toContain(
      'Night Sprint (Rematch) is saved. Reload the app to race it in the Garage.'
    );
  });

  it('shows an error banner when loading the list fails', async () => {
    (component as any).raceDb.getRaceSummaries.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load race history');
    expect(compiled.textContent).not.toContain('No races yet');
  });
});
