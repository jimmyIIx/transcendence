import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { jwtInterceptor } from './jwt-interceptor';
import { TokenService } from '../services/token';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  let refreshTokenCalls = 0;

  beforeEach(() => {
    refreshTokenCalls = 0;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TokenService,
          useValue: {
            getAccessToken: () => null,
            setAccessToken: () => undefined,
            clear: () => undefined,
          },
        },
        {
          provide: AuthService,
          useValue: {
            refreshToken: () => {
              refreshTokenCalls += 1;
              return of({ accessToken: 'new-token' });
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
          },
        },
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
      ],
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('does not refresh auth endpoints on 401', () => {
    const request = new HttpRequest('POST', 'http://localhost:8080/auth/login', {});

    interceptor(request, () => throwError(() => new HttpErrorResponse({ status: 401 }))).subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(refreshTokenCalls).toBe(0);
      },
    });
  });
});
