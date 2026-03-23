import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { AuthorizedSession, ConnectionSettings, OAuthTokenResponse } from './logger-manager.models';
import { buildSpringUrl } from './spring-api-url.utils';

@Injectable({ providedIn: 'root' })
export class SpringAuthService {
  private readonly http = inject(HttpClient);

  authorize(settings: ConnectionSettings): Observable<AuthorizedSession> {
    switch (settings.authMode) {
      case 'no-auth':
        return of({
          authorizationHeader: null,
          scheme: 'none',
          label: 'Sans authentification'
        });
      case 'direct-bearer':
        return of({
          authorizationHeader: `Bearer ${settings.directToken.trim()}`,
          scheme: 'bearer',
          label: 'Bearer direct',
          tokenPreview: maskSecret(settings.directToken.trim())
        });
      case 'basic-auth':
        return of({
          authorizationHeader: `Basic ${toBase64(`${settings.username}:${settings.password}`)}`,
          scheme: 'basic',
          label: 'Basic user/password'
        });
      case 'oauth-client-credentials':
        return this.requestClientCredentialsToken(settings).pipe(
          map((response) => {
            const tokenType = response.token_type?.trim() || 'Bearer';
            const accessToken = response.access_token.trim();

            return {
              authorizationHeader: `${tokenType} ${accessToken}`,
              scheme: 'bearer',
              label: 'Bearer service-account',
              tokenPreview: maskSecret(accessToken)
            };
          })
        );
      default:
        return of({
          authorizationHeader: null,
          scheme: 'none',
          label: 'Sans authentification'
        });
    }
  }

  private requestClientCredentialsToken(settings: ConnectionSettings): Observable<OAuthTokenResponse> {
    const tokenEndpoint = resolveTokenEndpoint(settings);
    const authorizationHeader =
      settings.credentialMode === 'basic-token'
        ? normalizeBasicToken(settings.clientBasicToken)
        : `Basic ${toBase64(`${settings.clientId}:${settings.clientSecret}`)}`;

    const body = new HttpParams({
      fromObject: {
        grant_type: 'client_credentials',
        ...(settings.scope ? { scope: settings.scope } : {})
      }
    });

    return this.http.post<OAuthTokenResponse>(tokenEndpoint, body.toString(), {
      headers: new HttpHeaders({
        Authorization: authorizationHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    });
  }
}

function resolveTokenEndpoint(settings: ConnectionSettings): string {
  const tokenEndpoint = settings.tokenEndpoint.trim();

  if (/^https?:\/\//i.test(tokenEndpoint)) {
    return tokenEndpoint;
  }

  return buildSpringUrl(settings.baseUrl, tokenEndpoint);
}

function normalizeBasicToken(clientBasicToken: string): string {
  const trimmedToken = clientBasicToken.trim();

  return /^Basic\s+/i.test(trimmedToken) ? trimmedToken : `Basic ${trimmedToken}`;
}

function maskSecret(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 10) {
    return '••••••';
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
