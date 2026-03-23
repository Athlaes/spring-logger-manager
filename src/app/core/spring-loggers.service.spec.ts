import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ConnectionSettings } from './logger-manager.models';
import { SpringLoggersService } from './spring-loggers.service';

describe('SpringLoggersService', () => {
  let service: SpringLoggersService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SpringLoggersService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should omit the authorization header when no authentication is used', async () => {
    const fetchPromise = firstValueFrom(
      service.fetchLoggers(buildBaseSettings(), {
        authorizationHeader: null,
        scheme: 'none',
        label: 'Sans authentification',
      }),
    );

    const request = httpTestingController.expectOne(
      'https://spring.example.com/management/loggers',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBeFalsy();

    request.flush({
      levels: ['info'],
      loggers: {},
    });

    await fetchPromise;
  });

  it('should fetch and map Spring loggers', async () => {
    const fetchPromise = firstValueFrom(
      service.fetchLoggers(buildBaseSettings(), {
        authorizationHeader: 'Bearer my-direct-token',
        scheme: 'bearer',
        label: 'Bearer direct',
      }),
    );

    const request = httpTestingController.expectOne(
      'https://spring.example.com/management/loggers',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer my-direct-token');

    request.flush({
      levels: ['trace', 'debug', 'info', 'warn'],
      loggers: {
        ROOT: {
          configuredLevel: 'INFO',
          effectiveLevel: 'INFO',
        },
        'com.example.orders': {
          configuredLevel: null,
          effectiveLevel: 'WARN',
        },
      },
    });

    const collection = await fetchPromise;

    expect(collection.loggers).toHaveLength(2);
    expect(collection.loggers[0].name).toBe('com.example.orders');
    expect(collection.levels).toContain('TRACE');
    expect(collection.levels).toContain('OFF');
  });

  it('should update a logger level', async () => {
    const updatePromise = firstValueFrom(
      service.updateLoggerLevel(
        buildBaseSettings(),
        {
          authorizationHeader: 'Basic YWRtaW46c2VjcmV0',
          scheme: 'basic',
          label: 'Basic user/password',
        },
        'ROOT',
        null,
      ),
    );

    const request = httpTestingController.expectOne(
      'https://spring.example.com/management/loggers/ROOT',
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Basic YWRtaW46c2VjcmV0');
    expect(request.request.body).toEqual({ configuredLevel: null });

    request.flush({});

    await updatePromise;
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
    scope: '',
  };
}
