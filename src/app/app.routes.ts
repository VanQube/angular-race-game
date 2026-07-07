import { Routes } from '@angular/router';
import { GarageView } from './garage-view';
import { LeaderboardView } from './leaderboard-view';
import { RaceView } from './race-view';

export const routes: Routes = [
  { path: '', component: RaceView },
  { path: 'garage', component: GarageView },
  { path: 'leaderboard', component: LeaderboardView },
  { path: '**', redirectTo: '' }
];
