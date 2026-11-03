import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { appConfig } from '../config/app-config';

@Injectable({
  providedIn: 'root',
})
export class EmailConfirmationService {
  private apiUrl = appConfig.apiUrl + '/auth';

  constructor(private http: HttpClient) {}

  confirmEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/confirm-email/${token}`);
  }

  resendConfirmationEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend/confirmation-email`, null, {
      params: { email },
      withCredentials: true,
    });
  }
}
