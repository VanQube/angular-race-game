import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { AuthService } from './auth.service';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('redirects unauthenticated visitors to sign in and hides gated nav links', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.ready();

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(router.url).toBe('/auth');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Race controls');
    expect(compiled.querySelector('a[href="/garage"]')).toBeNull();
  });

  it('shows the primary navigation and race route once authenticated', async () => {
    const auth = TestBed.inject(AuthService);
    (auth as any).userSource.set({ id: 'user-1', email: 'racer@example.com', displayName: 'Racer', createdAt: '2024-01-01' });
    await auth.ready();

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(router.url).toBe('/');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Race');
    expect(compiled.textContent).toContain('Garage');
    expect(compiled.textContent).toContain('Leaderboard');
    expect(compiled.textContent).toContain('Showroom');
    expect(compiled.textContent).toContain('Race controls');
    expect(compiled.querySelector('button.primary-btn')?.textContent).toContain('Start race');
  });
});
