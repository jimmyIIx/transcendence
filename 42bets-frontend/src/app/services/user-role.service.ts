import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UserRoleService {
  private userRole$ = new BehaviorSubject<string | null>(null);

  constructor() {}
  setUserRole(role: string): void {
    this.userRole$.next(role);
  }
  isAdmin(): Observable<boolean> {
    return this.userRole$.pipe(map((role) => role === 'ADMIN'));
  }
  getRole(): string | null {
    return this.userRole$.value;
  }
  clearRole(): void {
    this.userRole$.next(null);
  }
}
