import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordsView } from './records-view';

function mockRaceDb() {
  return {
    getPersonalBests: vi.fn().mockResolvedValue([
      { carModelId: 'Rift', finishTimeMs: 2100, achievedAt: '2024-02-01T00:00:00.000Z' },
      { carModelId: 'Vanta', finishTimeMs: 1840, achievedAt: '2024-01-01T00:00:00.000Z' }
    ]),
    getCarModels: vi.fn().mockResolvedValue([
      { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
      { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' }
    ])
  };
}

describe('RecordsView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RecordsView>>;
  let component: RecordsView;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(RecordsView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads personal bests and lists the fastest first', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const names = Array.from(compiled.querySelectorAll('.entry-name')).map((el) => el.textContent?.trim());
    expect(names).toEqual(['Vanta', 'Rift']);
  });

  it('shows an empty state when there are no personal bests yet', async () => {
    (component as any).raceDb.getPersonalBests.mockResolvedValueOnce([]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No records yet');
  });

  it('shows an error banner when loading fails', async () => {
    (component as any).raceDb.getPersonalBests.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load personal bests');
  });
});
