import { Routes } from '@angular/router';
import { AuthView } from './auth-view';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./race-view').then((m) => m.RaceView),
    canActivate: [authGuard]
  },
  {
    path: 'garage',
    loadComponent: () => import('./garage-view').then((m) => m.GarageView),
    canActivate: [authGuard]
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./leaderboard-view').then((m) => m.LeaderboardView),
    canActivate: [authGuard]
  },
  { path: 'auth', component: AuthView },
  { path: '**', redirectTo: '' }
];
