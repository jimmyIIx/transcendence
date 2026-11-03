import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { appConfig } from '../config/app-config';
import { Observable } from 'rxjs';

export type MarketSide = 'YES' | 'NO';

export interface MarketSummary {
  id: number;
  question: string;
  category: string;
  description: string | null;
  sourceSystem: string;
  sourceKey: string;
  createdAt: string;
  endDate: string | null;
  resolved: boolean;
  resolvedOutcome: string | null;
  yesLiquidity: number;
  noLiquidity: number;
  yesProbability: number;
  openOrderCount: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  orderCount: number;
}

export interface MarketOrderBook {
  market: MarketSummary;
  yesLevels: OrderBookLevel[];
  noLevels: OrderBookLevel[];
}

export interface MarketOrderRequest {
  side: MarketSide;
  price: number;
  amount: number;
}

export interface MarketOrderResponse {
  id: number;
  marketId: number;
  username: string;
  side: MarketSide;
  price: number;
  amount: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: string;
}

export interface UserOrder {
  id: number;
  marketId: number;
  marketQuestion: string;
  marketCategory: string;
  side: MarketSide;
  price: number;
  amount: number;
  filledAmount: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: string;
  marketResolved: boolean;
  marketResolvedOutcome: string | null;
  marketEndDate: string | null;
}

export interface MarketConsentResponse {
  message: string;
  username: string;
  consent: boolean;
}

export interface LeaderboardEntry {
  username: string;
  avatarUrl: string | null;
  pnl: number;
  settledBets: number;
  wonBets: number;
}

export interface CurrentUserContext {
  username: string;
  email: string;
  balance: number;
  role: string;
  walletAddress: string | null;
  avatarUrl: string | null;
  oauthProvider: string | null;
  marketGenerationConsent: boolean;
  canManageMarketConsent: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MarketsService {
  private readonly apiUrl = `${appConfig.apiUrl}/api/markets`;

  constructor(private readonly http: HttpClient) {}

  getMarkets(): Observable<MarketSummary[]> {
    return this.http.get<MarketSummary[]>(this.apiUrl, { withCredentials: true });
  }

  getMarket(marketId: number): Observable<MarketSummary> {
    return this.http.get<MarketSummary>(`${this.apiUrl}/${marketId}`, { withCredentials: true });
  }

  getOrderBook(marketId: number): Observable<MarketOrderBook> {
    return this.http.get<MarketOrderBook>(`${this.apiUrl}/${marketId}/order-book`, {
      withCredentials: true,
    });
  }

  placeOrder(marketId: number, request: MarketOrderRequest): Observable<MarketOrderResponse> {
    return this.http.post<MarketOrderResponse>(`${this.apiUrl}/${marketId}/orders`, request, {
      withCredentials: true,
    });
  }

  enableMarketGenerationConsent(): Observable<MarketConsentResponse> {
    return this.http.post<MarketConsentResponse>(
      `${appConfig.apiUrl}/api/users/me/market-consent`,
      {},
      { withCredentials: true },
    );
  }

  revokeMarketGenerationConsent(): Observable<MarketConsentResponse> {
    return this.http.delete<MarketConsentResponse>(`${appConfig.apiUrl}/api/users/me/market-consent`, {
      withCredentials: true,
    });
  }

  getMyOrders(): Observable<UserOrder[]> {
    return this.http.get<UserOrder[]>(`${this.apiUrl}/my-orders`, { withCredentials: true });
  }

  getLeaderboard(): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/leaderboard`, { withCredentials: true });
  }

  getCurrentUserContext(): Observable<CurrentUserContext> {
    return this.http.get<CurrentUserContext>(`${appConfig.apiUrl}/api/users/me`, { withCredentials: true });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }
}
