import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('should create a racer with the selected futuristic model', () => {
    const component = new App();

    (component as any).newCarName.set('Astra');
    (component as any).selectCarModel('Rift');
    (component as any).addCar();

    const cars = (component as any).cars();
    expect(cars).toHaveLength(4);
    expect(cars.at(-1).name).toBe('Astra');
    expect(cars.at(-1).model).toBe('Rift');
    expect(cars.at(-1).color).toBe('#ff74d8');
  });

  it('should reset the race state back to ready', () => {
    const component = new App();

    (component as any).cars.set([
      {
        id: 1,
        name: 'Nova',
        model: 'Vanta',
        color: '#ff5f7d',
        progress: 100,
        finishTimeMs: 1200,
        status: 'finished'
      }
    ]);
    (component as any).raceInProgress.set(true);
    (component as any).raceFinished.set(true);
    (component as any).leaderboard.set([{ id: 1, name: 'Nova', model: 'Vanta', color: '#ff5f7d', progress: 100, finishTimeMs: 1200, status: 'finished' }]);

    (component as any).resetRace();

    expect((component as any).raceInProgress()).toBe(false);
    expect((component as any).raceFinished()).toBe(false);
    expect((component as any).leaderboard()).toEqual([]);
    expect((component as any).cars()[0].progress).toBe(0);
    expect((component as any).cars()[0].status).toBe('ready');
  });
});
