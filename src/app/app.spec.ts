import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the race UI', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Neon Speedway');
    expect(compiled.querySelector('button.primary-btn')?.textContent).toContain('Start race');
  });

  it('should allow creating a racer with a selected futuristic model', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('input[type="text"]') as HTMLInputElement;
    const modelSelect = compiled.querySelector('select[name="carModel"]') as HTMLSelectElement;
    const addButton = Array.from(compiled.querySelectorAll('button')).find((button) => button.textContent?.includes('Add racer')) as HTMLButtonElement;

    nameInput.value = 'Astra';
    nameInput.dispatchEvent(new Event('input'));
    modelSelect.value = 'Vanta';
    modelSelect.dispatchEvent(new Event('change'));
    addButton.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Astra');
    expect(compiled.textContent).toContain('Vanta');
  });
});
