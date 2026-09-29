import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './features/registrations/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    title: 'Painel | A SOARES ADMIN',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'registrations',
    title: 'Cadastro | A SOARES ADMIN',
    loadComponent: () => import('./features/registrations/registrations').then((m) => m.Registrations),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'registrations/:id',
    title: 'Cadastro | A SOARES ADMIN',
    loadComponent: () => import('./features/registrations/registrations').then((m) => m.Registrations),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
