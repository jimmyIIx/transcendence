import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { Dashboard } from './dashboard/dashboard';
import { MarketsComponent } from './markets/markets.component';
import { MarketDetailComponent } from './markets/market-detail/market-detail.component';
import { authGuard } from './guards/auth-guard';
import { EmailConfirmationComponent } from './email-confirmation/email-confirmation.component';
import { AdminUsersComponent } from './admin/admin-users/admin-users.component';
import { adminGuard } from './guards/admin.guards';
import { OAuth2CallbackComponent } from './auth/oauth2-callback/oauth2-callback.component';
import { PrivacyPolicyComponent } from './legal/privacy-policy.component';
import { TermsOfServiceComponent } from './legal/terms-of-service.component';
import { ProfileComponent } from './profile/profile.component';
import { FaqComponent } from './faq/faq.component';
import { ContactComponent } from './contact/contact.component'; //logan
import { LeaderboardComponent } from './leaderboard/leaderboard.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => inject(Router).parseUrl('/markets?sort=trending'),
  },
  {
    path: 'admin',
    component: AdminUsersComponent,
    canActivate: [adminGuard], // Protégé par le guard
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
  {
    path: 'reset-password/:token',
    component: ResetPasswordComponent,
  },
  {
    path: 'confirm-email/:token',
    component: EmailConfirmationComponent,
  },
  {
    path: 'auth/oauth2-callback',
    component: OAuth2CallbackComponent,
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'markets',
    component: MarketsComponent,
  },
  {
    path: 'markets/:id',
    component: MarketDetailComponent,
  },
  {
    path: 'privacy',
    component: PrivacyPolicyComponent,
  },
  {
    path: 'terms',
    component: TermsOfServiceComponent,
  },
  {
    path: 'faq',
    component: FaqComponent,
  },
  {
    path: 'contact',
    component: ContactComponent, //logan
  },
  {
    path: 'leaderboard',
    component: LeaderboardComponent,
  },
  {
    path: 'classement',
    component: LeaderboardComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
