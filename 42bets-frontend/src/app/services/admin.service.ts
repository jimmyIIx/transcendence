import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketSummary } from './markets';
import { appConfig } from '../config/app-config';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = `${appConfig.apiUrl}/api/admin`;

  constructor(private readonly http: HttpClient) {}

  // - getAllUsers()
  getAllUsers(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }
  // - getUserById(id)
  getUserById(id: number): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${id}`);
  }
  // - createUser(userData)
  createUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, userData);
  }

  // - updateUser(id, userData)
  updateUser(id: number, userData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}`, userData);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }

  sendConfirmationEmail(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${userId}/send-confirmation-email`, {});
  }
  // - deleteUser(id)

  getMarkets(): Observable<MarketSummary[]> {
    return this.http.get<MarketSummary[]>(`${this.apiUrl}/markets`);
  }

  generateMarkets(): Observable<{ message: string; createdCount: number; totalMarkets: number }> {
    return this.http.post<{ message: string; createdCount: number; totalMarkets: number }>(
      `${this.apiUrl}/markets/generate`,
      {},
    );
  }

  resolveMarket(id: number, outcome: 'YES' | 'NO'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/markets/${id}/resolve`, { outcome });
  }

  deleteMarket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/markets/${id}`);
  }

  adjustBalance(id: number, delta: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${id}/balance`, { delta });
  }

  createMarket(data: CreateMarketRequest): Observable<MarketSummary> {
    return this.http.post<MarketSummary>(`${this.apiUrl}/markets`, data);
  }

  get42Users(): Observable<FortyTwoUser[]> {
    return this.http.get<FortyTwoUser[]>(`${this.apiUrl}/markets/42-users`);
  }

  get42UserActiveProjects(providerId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/markets/42-users/${providerId}/active-projects`);
  }
}

export interface CreateMarketRequest {
  question: string;
  category: string;
  description?: string;
  endDate?: string;
  subjectProviderId?: string;
  subjectContext?: string;
  metricType?: string;
  targetValue?: number | null;
}

export interface FortyTwoUser {
  id: number;
  username: string;
  oauthProviderId: string;
  avatarUrl: string | null;
}
