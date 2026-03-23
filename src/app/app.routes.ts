import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/logger-manager/logger-manager.page').then(
        ({ LoggerManagerPageComponent }) => LoggerManagerPageComponent
      )
  }
];
