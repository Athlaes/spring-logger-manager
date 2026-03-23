import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import {
  AuthorizedSession,
  ConnectionSettings,
  DEFAULT_LOGGER_LEVELS,
  LoggerViewModel,
} from '../../../core/logger-manager.models';
import { SpringLoggersService } from '../../../core/spring-loggers.service';

@Component({
  selector: 'app-logger-management',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './logger-management.component.html',
  styleUrl: './logger-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoggerManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly springLoggersService = inject(SpringLoggersService);

  readonly settings = input<ConnectionSettings | null>(null);
  readonly session = input<AuthorizedSession | null>(null);

  protected readonly filterForm = this.fb.nonNullable.group({
    search: [''],
  });

  private readonly searchValue = toSignal(this.filterForm.controls.search.valueChanges, {
    initialValue: this.filterForm.controls.search.value,
  });
  private readonly loadedSessionKey = signal<string | null>(null);

  protected readonly loggers = signal<LoggerViewModel[]>([]);
  protected readonly availableLevels = signal<string[]>(DEFAULT_LOGGER_LEVELS);
  protected readonly requestError = signal<string | null>(null);
  protected readonly isLoadingLoggers = signal(false);
  protected readonly activeLoggerUpdate = signal<string | null>(null);
  protected readonly filteredLoggers = computed(() => {
    const filter = this.searchValue().trim().toLowerCase();

    const sorted = [...this.loggers()].sort((a, b) => {
      if (a.name === 'ROOT') return -1;
      if (b.name === 'ROOT') return 1;
      return 0;
    });

    if (!filter) {
      return sorted;
    }

    return sorted.filter((logger) => {
      const configuredLevel = logger.configuredLevel?.toLowerCase() ?? '';
      const effectiveLevel = logger.effectiveLevel?.toLowerCase() ?? '';

      return (
        logger.name.toLowerCase().includes(filter) ||
        configuredLevel.includes(filter) ||
        effectiveLevel.includes(filter)
      );
    });
  });
  protected readonly actionLevels = computed(() => ['INHERIT', ...this.availableLevels()]);
  protected readonly isBusy = computed(
    () => this.isLoadingLoggers() || this.activeLoggerUpdate() !== null,
  );
  protected readonly loggerCountLabel = computed(() => {
    const filteredCount = this.filteredLoggers().length;
    const totalCount = this.loggers().length;

    return `${filteredCount} / ${totalCount} logger${totalCount > 1 ? 's' : ''}`;
  });

  constructor() {
    effect(() => {
      const settings = this.settings();
      const session = this.session();
      const sessionKey = session
        ? `${settings?.baseUrl ?? ''}|${session.authorizationHeader}`
        : null;

      if (!settings || !session) {
        this.loadedSessionKey.set(null);
        this.loggers.set([]);
        this.availableLevels.set(DEFAULT_LOGGER_LEVELS);
        this.requestError.set(null);
        return;
      }

      if (sessionKey === this.loadedSessionKey()) {
        return;
      }

      this.loadedSessionKey.set(sessionKey);
      void this.refreshLoggers(false);
    });
  }

  protected async refreshLoggers(showToast = true): Promise<void> {
    const settings = this.settings();
    const session = this.session();

    if (!settings || !session) {
      this.requestError.set('Commencez par établir une connexion à l’application Spring.');
      return;
    }

    this.isLoadingLoggers.set(true);
    this.requestError.set(null);

    try {
      const collection = await firstValueFrom(
        this.springLoggersService.fetchLoggers(settings, session),
      );

      this.loggers.set(collection.loggers);
      this.availableLevels.set(collection.levels);

      if (showToast) {
        this.snackBar.open('Loggers rechargés.', 'Fermer', { duration: 2500 });
      }
    } catch (error: unknown) {
      const message = describeHttpError(error, 'Chargement des loggers impossible.');

      this.requestError.set(message);
      this.snackBar.open(message, 'Fermer', { duration: 6000 });
    } finally {
      this.isLoadingLoggers.set(false);
    }
  }

  protected async updateLoggerLevel(logger: LoggerViewModel, targetLevel: string): Promise<void> {
    const settings = this.settings();
    const session = this.session();

    if (!settings || !session) {
      this.requestError.set('Reconnectez-vous avant de modifier un logger.');
      return;
    }

    this.activeLoggerUpdate.set(logger.name);
    this.requestError.set(null);

    try {
      await firstValueFrom(
        this.springLoggersService.updateLoggerLevel(
          settings,
          session,
          logger.name,
          targetLevel === 'INHERIT' ? null : targetLevel,
        ),
      );

      this.snackBar.open(`Logger ${logger.name} mis à jour.`, 'Fermer', { duration: 2500 });
      await this.refreshLoggers(false);
    } catch (error: unknown) {
      const message = describeHttpError(error, `Mise à jour du logger ${logger.name} impossible.`);

      this.requestError.set(message);
      this.snackBar.open(message, 'Fermer', { duration: 6000 });
    } finally {
      this.activeLoggerUpdate.set(null);
    }
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected isLevelSelected(logger: LoggerViewModel, level: string): boolean {
    return level === 'INHERIT' ? logger.configuredLevel === null : logger.configuredLevel === level;
  }

  protected isEffectiveLevel(logger: LoggerViewModel, level: string): boolean {
    return logger.effectiveLevel === level;
  }

  protected formatConfiguredLevel(level: string | null): string {
    return level ?? 'INHERIT';
  }

  protected levelClass(level: string | null | undefined): string {
    switch ((level ?? 'INHERIT').toUpperCase()) {
      case 'TRACE': return 'level--trace';
      case 'DEBUG': return 'level--debug';
      case 'INFO': return 'level--info';
      case 'WARN': return 'level--warn';
      case 'ERROR': return 'level--error';
      case 'FATAL': return 'level--fatal';
      case 'OFF': return 'level--off';
      default: return 'level--inherit';
    }
  }
}

function describeHttpError(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallbackMessage;
  }

  if (error.status === 0) {
    return 'Impossible de joindre l’application Spring. Vérifiez l’URL cible, le réseau et la configuration CORS.';
  }

  const errorDescription = extractErrorDescription(error.error);

  return `${fallbackMessage} (${error.status}${errorDescription ? ` - ${errorDescription}` : ''})`;
}

function extractErrorDescription(errorBody: unknown): string {
  if (typeof errorBody === 'string') {
    return errorBody;
  }

  if (typeof errorBody === 'object' && errorBody !== null) {
    if ('message' in errorBody && typeof errorBody.message === 'string') {
      return errorBody.message;
    }

    if ('error' in errorBody && typeof errorBody.error === 'string') {
      return errorBody.error;
    }
  }

  return '';
}
