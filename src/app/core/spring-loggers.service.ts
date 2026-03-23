import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  AuthorizedSession,
  ConnectionSettings,
  DEFAULT_LOGGER_LEVELS,
  LoggerCollection,
  LoggerViewModel,
  SpringLoggersResponse
} from './logger-manager.models';
import { buildSpringUrl } from './spring-api-url.utils';

@Injectable({ providedIn: 'root' })
export class SpringLoggersService {
  private readonly http = inject(HttpClient);

  fetchLoggers(settings: ConnectionSettings, session: AuthorizedSession): Observable<LoggerCollection> {
    const url = buildSpringUrl(settings.baseUrl, settings.actuatorPath, 'loggers');

    return this.http
      .get<SpringLoggersResponse>(url, {
        headers: createAuthorizedHeaders(session.authorizationHeader)
      })
      .pipe(
        map((response) => ({
          levels: normalizeLevels(response.levels),
          loggers: Object.entries(response.loggers ?? {})
            .map(([name, logger]) => toLoggerViewModel(name, logger))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
        }))
      );
  }

  updateLoggerLevel(
    settings: ConnectionSettings,
    session: AuthorizedSession,
    loggerName: string,
    configuredLevel: string | null
  ): Observable<void> {
    const url = buildSpringUrl(settings.baseUrl, settings.actuatorPath, 'loggers', encodeURIComponent(loggerName));

    return this.http.post<void>(
      url,
      {
        configuredLevel
      },
      {
        headers: createAuthorizedHeaders(session.authorizationHeader)
      }
    );
  }
}

function createAuthorizedHeaders(authorizationHeader: string | null): HttpHeaders {
  return new HttpHeaders({
    Accept: 'application/json',
    ...(authorizationHeader ? { Authorization: authorizationHeader } : {})
  });
}

function normalizeLevels(levels: string[]): string[] {
  const normalizedLevels = levels.map((level) => level.toUpperCase());

  return Array.from(new Set([...normalizedLevels, ...DEFAULT_LOGGER_LEVELS]));
}

function toLoggerViewModel(name: string, logger: SpringLoggersResponse['loggers'][string]): LoggerViewModel {
  return {
    name,
    configuredLevel: logger.configuredLevel,
    effectiveLevel: logger.effectiveLevel
  };
}
