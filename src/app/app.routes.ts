import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { Sites } from './features/sites/sites/sites';
import { SiteForm } from './features/sites/site-form/site-form';
import { SiteDetail } from './features/sites/site-detail/site-detail';
import { Compare } from './features/compare/compare';
import { History } from './features/history/history';
import { Heatmap } from './features/heatmap/heatmap';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard
  },
  {
    path: 'sites',
    component: Sites
  },
  {
    path: 'sites/new',
    component: SiteForm
  },
  {
    path: 'sites/:id/edit',
    component: SiteForm
  },
  {
    path: 'sites/:id',
    component: SiteDetail
  },
  {
    path: 'compare',
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