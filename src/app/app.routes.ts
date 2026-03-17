import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { Sites } from './features/sites/sites/sites';
import { SiteForm } from './features/sites/site-form/site-form';
import { SiteDetail } from './features/sites/site-detail/site-detail';
import { Compare } from './features/compare/compare';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';
import { History } from './features/history/history';
import { Heatmap } from './features/heatmap/heatmap';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    canActivate: [authGuard],
    component: Dashboard
  },
  {
    path: 'sites',
    canActivate: [authGuard],
    component: Sites
  },
  {
    path: 'sites/new',
    canActivate: [authGuard],
    component: SiteForm
  },
  {
    path: 'sites/:id',
    canActivate: [authGuard],
    component: SiteDetail
  },
  {
    path: 'compare',
    canActivate: [authGuard],
    component: Compare
  },
  {
    path: 'history',
    component: History
  },
  {
    path: 'heatmap',
    component: Heatmap
  },
  {
    path: '**',
    redirectTo: ''
  }
];