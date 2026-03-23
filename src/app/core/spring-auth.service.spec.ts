import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ConnectionSettings } from './logger-manager.models';
import { SpringAuthService } from './spring-auth.service';

describe('SpringAuthService', () => {
  let service: SpringAuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SpringAuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create a session without authorization header when no authentication is selected', async () => {
    const session = await firstValueFrom(
      service.authorize({
        ...buildBaseSettings(),
        authMode: 'no-auth'
      })
    );

    expect(session.authorizationHeader).toBeNull();
    expect(session.scheme).toBe('none');
    expect(session.label).toBe('Sans authentification');
  });

  it('should create a bearer authorization session from a direct token', async () => {
    const session = await firstValueFrom(
      service.authorize({
        ...buildBaseSettings(),
        authMode: 'direct-bearer',
        directToken: 'my-direct-token'
      })
    );

    expect(session.authorizationHeader).toBe('Bearer my-direct-token');
    expect(session.scheme).toBe('bearer');
  });

  it('should exchange client credentials for a bearer token', async () => {
    const authorizationPromise = firstValueFrom(
      service.authorize({
        ...buildBaseSettings(),
        authMode: 'oauth-client-credentials',
        tokenEndpoint: '/oauth/token',
        credentialMode: 'client-secret',
        clientId: 'client-app',
        clientSecret: 'very-secret',
        scope: 'logging.read'
      })
    );

    const request = httpTestingController.expectOne('https://spring.example.com/oauth/token');

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Basic Y2xpZW50LWFwcDp2ZXJ5LXNlY3JldA==');
    expect(request.request.body).toBe('grant_type=client_credentials&scope=logging.read');

    request.flush({
      access_token: 'bearer-token',
      token_type: 'Bearer'
    });

    const session = await authorizationPromise;

    expect(session.authorizationHeader).toBe('Bearer bearer-token');
    expect(session.label).toContain('service-account');
  });
});

function buildBaseSettings(): ConnectionSettings {
  return {
    baseUrl: 'https://spring.example.com',
    actuatorPath: '/management',
    authMode: 'no-auth',
    directToken: '',
    username: '',
    password: '',
    tokenEndpoint: '/oauth/token',
    credentialMode: 'client-secret',
    clientId: '',
    clientSecret: '',
    clientBasicToken: '',
    scope: ''
  };
}
