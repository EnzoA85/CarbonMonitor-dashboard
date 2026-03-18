import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { Sites } from './features/sites/sites/sites';
import { SiteForm } from './features/sites/site-form/site-form';
import { SiteDetail } from './features/sites/site-detail/site-detail';
import { Compare } from './features/compare/compare';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { authGuard } from './core/guards/auth.guard';
import { History } from './features/history/history';
import { Heatmap } from './features/heatmap/heatmap';
import { Profile } from './features/profile/profile/profile';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
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
    path: 'sites/:id/edit',
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
    canActivate: [authGuard],
    component: History
  },
  {
    path: 'heatmap',
    canActivate: [authGuard],
    component: Heatmap
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    component: Profile
  },
  {
    path: '**',
    redirectTo: ''
  }
];