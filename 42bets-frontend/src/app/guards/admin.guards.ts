import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token';
import { AuthService } from '../services/auth';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const checkRole = (token: string, router: Router): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'ADMIN') return true;
    router.navigate(['/']);
    return false;
  } catch {
    router.navigate(['/login']);
    return false;
  }
};

export const adminGuard: CanActivateFn = (route, state): Observable<boolean> | boolean => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Token valid — check role immediately
  if (tokenService.isTokenValid()) {
    return checkRole(tokenService.getAccessToken()!, router);
  }

  // Token expired/missing — try refresh first before redirecting
  return authService.refreshToken().pipe(
    map((response: any) => {
      const newToken = response.accessToken;
      tokenService.setAccessToken(newToken);
      return checkRole(newToken, router);
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
