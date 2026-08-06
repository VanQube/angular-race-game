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
  {
    path: 'showroom',
    loadComponent: () => import('./showroom-view').then((m) => m.ShowroomView),
    canActivate: [authGuard]
  },
  {
    path: 'records',
    loadComponent: () => import('./records-view').then((m) => m.RecordsView),
    canActivate: [authGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./history-view').then((m) => m.HistoryView),
    canActivate: [authGuard]
  },
  { path: 'auth', component: AuthView },
  { path: '**', redirectTo: '' }
];
