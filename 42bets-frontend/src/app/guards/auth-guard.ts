import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TokenService } from '../services/token';
import { LoggerService } from '../services/logger.service';

export const authGuard: CanActivateFn = (route, state) => {
  const logger = inject(LoggerService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  logger.debug('AuthGuard: checking authentication for route', state.url);

  if (tokenService.isTokenValid()) {
    logger.debug('AuthGuard: token valid, allowing access');
    return true;
  }

  logger.log('AuthGuard: Token invalid, redirecting to login');
  router.navigate(['/login']);
  return false;
};
