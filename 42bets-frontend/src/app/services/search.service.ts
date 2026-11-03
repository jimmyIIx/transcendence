import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { appConfig } from '../config/app-config';
import { MarketSummary } from './markets';

export interface UserSearchResult {
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface SearchResults {
  markets: MarketSummary[];
  users: UserSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly apiUrl = `${appConfig.apiUrl}/api/search`;

  constructor(private readonly http: HttpClient) {}

  search(q: string): Observable<SearchResults> {
    return this.http.get<SearchResults>(this.apiUrl, { params: { q }, withCredentials: true });
  }
}
