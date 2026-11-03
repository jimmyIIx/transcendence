import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
    private readonly ACCESS_TOKEN_KEY = 'access_token';
    private platformId = inject(PLATFORM_ID);

    private isBrowser(): boolean {
      return isPlatformBrowser(this.platformId);
    }

    //access Token methods
    setAccessToken(token: string): void {
      if (this.isBrowser()) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      }
    }

    getAccessToken(): string | null {
      if (this.isBrowser()) {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
      }
      return null;
    }

    hasAccessToken(): boolean {
      return !!this.getAccessToken();
    }

    clear(): void {
      if (this.isBrowser()) {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        // refresh token in httpOnly cookie is cleared by backend
      }
    }

    isAccessTokenValid(): boolean {
      const token = this.getAccessToken();
      if (!token) return false;
      
      try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiryTime = payload.exp * 1000; // exp en millisecondes
          return Date.now() < expiryTime;
      } catch (e) {
          return false;
      }
  }

    //backward compatibility methods
    setToken(token: string): void {
      this.setAccessToken(token);
    }

    getToken(): string | null {
      return this.getAccessToken();
    }

    hasToken(): boolean {
      return this.isAccessTokenValid();
    }

    removeToken(): void {
      this.clear();
    }

    isTokenValid(): boolean {
      return this.isAccessTokenValid();
    }

    // Note: Refresh token is now managed by httpOnly cookies
    // No need to manually store/retrieve it
    setRefreshToken(token: string): void {
      // Deprecated - refresh token is in httpOnly cookie from backend
      console.warn('setRefreshToken is deprecated - refresh token is in httpOnly cookie');
    }

    getRefreshToken(): string | null {
      // Deprecated - refresh token is in httpOnly cookie
      return null;
    }

    setTokens(accessToken: string, refreshToken?: string): void {
      this.setAccessToken(accessToken);
      // Refresh token is handled by backend as httpOnly cookie
    }

    hasTokens(): boolean {
      return this.hasAccessToken();
    }
}
