import { Routes } from '@angular/router';
import { GarageView } from './garage-view';
import { LeaderboardView } from './leaderboard-view';
import { RaceView } from './race-view';
import { AuthView } from './auth-view';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: RaceView, canActivate: [authGuard] },
  { path: 'garage', component: GarageView, canActivate: [authGuard] },
  { path: 'leaderboard', component: LeaderboardView, canActivate: [authGuard] },
  { path: 'auth', component: AuthView },
  { path: '**', redirectTo: '' }
];
