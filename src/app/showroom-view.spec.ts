import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShowroomView } from './showroom-view';
import { AuthService } from './auth.service';

function mockRaceDb() {
  return {
    getCarModels: vi.fn().mockResolvedValue([
      { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
      { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' }
    ]),
    toggleFavoriteCarModel: vi.fn().mockResolvedValue({ favorited: true, favoriteCarModelIds: ['Vanta'] })
  };
}

describe('ShowroomView', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ShowroomView>>;
  let component: ShowroomView;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    const auth = TestBed.inject(AuthService);
    (auth as any).userSource.set({
      id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01',
      favoriteCarModelIds: []
    });

    fixture = TestBed.createComponent(ShowroomView);
    component = fixture.componentInstance;
    (component as any).raceDb = mockRaceDb();
  });

  it('loads car models and renders them as cards', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vanta');
    expect(compiled.textContent).toContain('Rift');
  });

  it('toggles a favorite and reflects it in the UI', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const favoriteButton = compiled.querySelector('button[aria-label="Favorite Vanta"]') as HTMLButtonElement;
    favoriteButton.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('button[aria-label="Unfavorite Vanta"]')).not.toBeNull();
  });

  it('shows an error banner when loading car models fails', async () => {
    (component as any).raceDb.getCarModels.mockRejectedValueOnce(new Error('network down'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Unable to load car models');
  });
});
