export type AuthMode = 'no-auth' | 'direct-bearer' | 'basic-auth' | 'oauth-client-credentials';

export type OAuthCredentialMode = 'client-secret' | 'basic-token';

export interface ConnectionSettings {
  baseUrl: string;
  actuatorPath: string;
  authMode: AuthMode;
  directToken: string;
  username: string;
  password: string;
  tokenEndpoint: string;
  credentialMode: OAuthCredentialMode;
  clientId: string;
  clientSecret: string;
  clientBasicToken: string;
  scope: string;
}

export interface AuthorizedSession {
  authorizationHeader: string | null;
  scheme: 'none' | 'basic' | 'bearer';
  label: string;
  tokenPreview?: string;
}

export interface SpringLoggerEntry {
  configuredLevel: string | null;
  effectiveLevel: string | null;
}

export interface SpringLoggersResponse {
  levels: string[];
  loggers: Record<string, SpringLoggerEntry>;
}

export interface LoggerViewModel {
  name: string;
  configuredLevel: string | null;
  effectiveLevel: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

export interface LoggerCollection {
  levels: string[];
  loggers: LoggerViewModel[];
}

export const DEFAULT_ACTUATOR_PATH = '/actuator';
export const DEFAULT_TOKEN_ENDPOINT = '/oauth/token';
export const DEFAULT_LOGGER_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
