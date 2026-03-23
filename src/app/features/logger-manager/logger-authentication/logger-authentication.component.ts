import { HttpErrorResponse } from '@angular/common/http';
import { TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import {
  AuthMode,
  AuthorizedSession,
  ConnectionSettings,
  DEFAULT_ACTUATOR_PATH,
  DEFAULT_TOKEN_ENDPOINT,
  OAuthCredentialMode
} from '../../../core/logger-manager.models';
import { SpringAuthService } from '../../../core/spring-auth.service';

const STORAGE_KEY = 'spring-logger-manager.settings';

@Component({
  selector: 'app-logger-authentication',
  imports: [
    ReactiveFormsModule,
    TextFieldModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './logger-authentication.component.html',
  styleUrl: './logger-authentication.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoggerAuthenticationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly springAuthService = inject(SpringAuthService);

  readonly connected = output<{ settings: ConnectionSettings; session: AuthorizedSession }>();
  readonly configurationChanged = output<void>();

  protected readonly connectionForm = this.fb.nonNullable.group({
    baseUrl: ['', [Validators.required, httpUrlValidator]],
    actuatorPath: [DEFAULT_ACTUATOR_PATH, [Validators.required]],
    authMode: ['no-auth' as AuthMode, [Validators.required]],
    directToken: [''],
    username: [''],
    password: [''],
    tokenEndpoint: [DEFAULT_TOKEN_ENDPOINT],
    credentialMode: ['client-secret' as OAuthCredentialMode, [Validators.required]],
    clientId: [''],
    clientSecret: [''],
    clientBasicToken: [''],
    scope: ['']
  });

  private readonly authModeValue = toSignal(this.connectionForm.controls.authMode.valueChanges, {
    initialValue: this.connectionForm.controls.authMode.value
  });
  private readonly credentialModeValue = toSignal(this.connectionForm.controls.credentialMode.valueChanges, {
    initialValue: this.connectionForm.controls.credentialMode.value
  });

  protected readonly authMode = computed(() => this.authModeValue());
  protected readonly credentialMode = computed(() => this.credentialModeValue());
  protected readonly currentSession = signal<AuthorizedSession | null>(null);
  protected readonly authError = signal<string | null>(null);
  protected readonly isAuthenticating = signal(false);
  protected readonly sessionSummary = computed(() => {
    const session = this.currentSession();

    if (!session) {
      return 'Aucune connexion active.';
    }

    return `Connecté via ${session.label}.`;
  });

  constructor() {
    this.restoreConnectionSettings();
    this.syncConditionalValidators();

    this.connectionForm.controls.authMode.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.syncConditionalValidators();
    });

    this.connectionForm.controls.credentialMode.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.syncConditionalValidators();
    });

    this.connectionForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.persistConnectionSettings();
      this.currentSession.set(null);
      this.authError.set(null);
      this.configurationChanged.emit();
    });
  }

  protected async submitConnection(): Promise<void> {
    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();
      return;
    }

    this.isAuthenticating.set(true);
    this.authError.set(null);

    try {
      const settings = this.buildConnectionSettings();
      const session = await firstValueFrom(this.springAuthService.authorize(settings));

      this.currentSession.set(session);
      this.connected.emit({ settings, session });
      this.snackBar.open('Connexion établie.', 'Fermer', { duration: 3000 });
    } catch (error: unknown) {
      const message = describeHttpError(error, 'Connexion impossible.');

      this.currentSession.set(null);
      this.authError.set(message);
      this.snackBar.open(message, 'Fermer', { duration: 6000 });
    } finally {
      this.isAuthenticating.set(false);
    }
  }

  private buildConnectionSettings(): ConnectionSettings {
    const value = this.connectionForm.getRawValue();

    return {
      baseUrl: value.baseUrl.trim(),
      actuatorPath: normalizePath(value.actuatorPath),
      authMode: value.authMode,
      directToken: value.directToken.trim(),
      username: value.username.trim(),
      password: value.password,
      tokenEndpoint: value.tokenEndpoint.trim(),
      credentialMode: value.credentialMode,
      clientId: value.clientId.trim(),
      clientSecret: value.clientSecret,
      clientBasicToken: value.clientBasicToken.trim(),
      scope: value.scope.trim()
    };
  }

  private syncConditionalValidators(): void {
    const {
      directToken,
      username,
      password,
      tokenEndpoint,
      clientId,
      clientSecret,
      clientBasicToken
    } = this.connectionForm.controls;

    directToken.clearValidators();
    username.clearValidators();
    password.clearValidators();
    tokenEndpoint.clearValidators();
    clientId.clearValidators();
    clientSecret.clearValidators();
    clientBasicToken.clearValidators();

    switch (this.connectionForm.controls.authMode.value) {
      case 'no-auth':
        break;
      case 'direct-bearer':
        directToken.addValidators([Validators.required]);
        break;
      case 'basic-auth':
        username.addValidators([Validators.required]);
        password.addValidators([Validators.required]);
        break;
      case 'oauth-client-credentials':
        tokenEndpoint.addValidators([Validators.required]);

        if (this.connectionForm.controls.credentialMode.value === 'client-secret') {
          clientId.addValidators([Validators.required]);
          clientSecret.addValidators([Validators.required]);
        } else {
          clientBasicToken.addValidators([Validators.required]);
        }
        break;
    }

    directToken.updateValueAndValidity({ emitEvent: false });
    username.updateValueAndValidity({ emitEvent: false });
    password.updateValueAndValidity({ emitEvent: false });
    tokenEndpoint.updateValueAndValidity({ emitEvent: false });
    clientId.updateValueAndValidity({ emitEvent: false });
    clientSecret.updateValueAndValidity({ emitEvent: false });
    clientBasicToken.updateValueAndValidity({ emitEvent: false });
  }

  private persistConnectionSettings(): void {
    const safeSettings = {
      baseUrl: this.connectionForm.controls.baseUrl.value,
      actuatorPath: this.connectionForm.controls.actuatorPath.value,
      authMode: this.connectionForm.controls.authMode.value,
      tokenEndpoint: this.connectionForm.controls.tokenEndpoint.value,
      credentialMode: this.connectionForm.controls.credentialMode.value,
      clientId: this.connectionForm.controls.clientId.value,
      scope: this.connectionForm.controls.scope.value
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
  }

  private restoreConnectionSettings(): void {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as Partial<
        Pick<
          ConnectionSettings,
          'baseUrl' | 'actuatorPath' | 'authMode' | 'tokenEndpoint' | 'credentialMode' | 'clientId' | 'scope'
        >
      >;

      this.connectionForm.patchValue(
        {
          baseUrl: parsedValue.baseUrl ?? '',
          actuatorPath: parsedValue.actuatorPath ?? DEFAULT_ACTUATOR_PATH,
          authMode: parsedValue.authMode ?? 'direct-bearer',
          tokenEndpoint: parsedValue.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT,
          credentialMode: parsedValue.credentialMode ?? 'client-secret',
          clientId: parsedValue.clientId ?? '',
          scope: parsedValue.scope ?? ''
        },
        { emitEvent: false }
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

const httpUrlValidator: ValidatorFn = (control): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
};

function normalizePath(path: string): string {
  const normalizedPath = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');

  return normalizedPath ? `/${normalizedPath}` : DEFAULT_ACTUATOR_PATH;
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
    if ('error_description' in errorBody && typeof errorBody.error_description === 'string') {
      return errorBody.error_description;
    }

    if ('message' in errorBody && typeof errorBody.message === 'string') {
      return errorBody.message;
    }

    if ('error' in errorBody && typeof errorBody.error === 'string') {
      return errorBody.error;
    }
  }

  return '';
}
