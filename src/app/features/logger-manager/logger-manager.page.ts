import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthorizedSession, ConnectionSettings } from '../../core/logger-manager.models';
import { LoggerAuthenticationComponent } from './logger-authentication/logger-authentication.component';
import { LoggerManagementComponent } from './logger-management/logger-management.component';

@Component({
  selector: 'app-logger-manager-page',
  imports: [
    MatIconModule,
    MatToolbarModule,
    LoggerAuthenticationComponent,
    LoggerManagementComponent
  ],
  templateUrl: './logger-manager.page.html',
  styleUrl: './logger-manager.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoggerManagerPageComponent {
  protected readonly session = signal<AuthorizedSession | null>(null);
  protected readonly settings = signal<ConnectionSettings | null>(null);

  protected handleConnected(connection: { settings: ConnectionSettings; session: AuthorizedSession }): void {
    this.settings.set(connection.settings);
    this.session.set(connection.session);
  }

  protected handleConfigurationChanged(): void {
    this.session.set(null);
    this.settings.set(null);
  }
}
