import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token';
import { Router } from '@angular/router';
import { appConfig } from '../config/app-config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
    private apiUrl = appConfig.apiUrl + '/auth';

    constructor(
      private http: HttpClient,
      private tokenService: TokenService,
      private router: Router,
    ) {}
    login(username: string, password: string) {
      // send login request with credentials
      const loginRequest = { username, password };
      return this.http.post<any>(`${this.apiUrl}/login`, loginRequest, {
        withCredentials: true, // Send cookies
      });
    }

    register(username: string, email: string, password: string) {
      // send registration request and require email confirmation
      const registerRequest = { username, email, password };
      return this.http.post<any>(`${this.apiUrl}/register`, registerRequest, {
        withCredentials: true,
      });
    }

    // refresh token using httpOnly cookie (no parameter needed)
    refreshToken() {
        return this.http.post<any>(
          `${this.apiUrl}/refresh`,
          {},
          {
            withCredentials: true, // Send cookies with request
          },
        );
    }

    logout() {
      return this.http.post<any>(
        `${this.apiUrl}/logout`,
        {},
        {
          withCredentials: true,
        },
      );
    }
    saveToken(token: string): void {
      this.tokenService.setAccessToken(token);
    }
    saveTokens(accessToken: string, refreshToken?: string): void {
      this.tokenService.setAccessToken(accessToken);

      // Refresh token is in httpOnly cookie from backend
    }
    removeTokens(): void {
      this.tokenService.clear();

      this.router.navigate(['/']);
    }
    isAuthenticated(): boolean {
      return this.tokenService.isAccessTokenValid();
    }
    getAccessToken(): string | null {
      return this.tokenService.getAccessToken();
    }

    forgotPassword(email: string) {
      // request password reset email
      const resetRequest = { email };
      return this.http.post<any>(`${this.apiUrl}/forgot-password`, resetRequest, {
        withCredentials: true,
      });
    }

    resetPassword(token: string, newPassword: string, confirmPassword: string) {
      // confirm password reset with new password
      const resetConfirmRequest = { token, newPassword, confirmPassword };
      return this.http.post<any>(`${this.apiUrl}/reset-password`, resetConfirmRequest, {
        withCredentials: true,
      });
    }
}
