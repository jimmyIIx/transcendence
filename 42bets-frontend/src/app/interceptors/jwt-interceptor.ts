import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Router } from '@angular/router';
import { TokenService } from '../services/token';
import { AuthService } from '../services/auth';
import { catchError, switchMap, throwError, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

// Single-flight refresh state shared across interceptor calls
let refreshInProgress = false;
let refreshSubject: Subject<string | null> = new Subject<string | null>();

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/confirm-email')
  );
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Add access token to request headers
  const token = tokenService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true, // Send cookies with requests
    });
  } else {
    // Ensure cookies are sent even without access token
    req = req.clone({
      withCredentials: true,
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Never try to refresh auth endpoints themselves.
      // Login/register/refresh failures must be returned to the caller as-is.
      if (isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // If 401 (unauthorized), try to refresh token
      if (error.status === 401) {
        // On SSR, do not run refresh flow to avoid long-lived pending tasks.
        // Client-side hydration will handle auth refresh if needed.
        if (isPlatformServer(platformId)) {
          return throwError(() => error);
        }

        // Single-flight refresh: if a refresh is already in progress, wait for it
        if (!refreshInProgress) {
          refreshInProgress = true;
          refreshSubject = new Subject<string | null>();

          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              const newToken = response.accessToken;
              // Store new access token
              tokenService.setAccessToken(newToken);

              // notify waiting requests
              refreshInProgress = false;
              refreshSubject.next(newToken);
              refreshSubject.complete();

              // Retry original request with new token
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });

              return next(req);
            }),
            catchError((refreshError) => {
              // Refresh failed, notify waiters and logout
              refreshInProgress = false;
              refreshSubject.next(null);
              refreshSubject.complete();

              tokenService.clear();
              if (!isPlatformServer(platformId)) {
                router.navigate(['/login']);
              }
              return throwError(() => refreshError);
            }),
          );
        } else {
          // Wait for the refresh to finish and then retry
          return refreshSubject.pipe(
            take(1),
            switchMap((t) => {
              if (!t) {
                tokenService.clear();
                if (!isPlatformServer(platformId)) {
                  router.navigate(['/login']);
                }
                return throwError(() => error);
              }

              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${t}`,
                },
              });
              return next(req);
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};
