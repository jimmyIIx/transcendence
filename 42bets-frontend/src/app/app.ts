import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, Subscription, EMPTY, of, filter, debounceTime, distinctUntilChanged, switchMap, finalize, catchError } from 'rxjs';
import { AuthService } from './services/auth';
import { TokenService } from './services/token';
import { ThemeService } from './services/theme.service';
import { appConfig } from './config/app-config';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { buildAvatarGradient } from './profile/avatar-gradient';
import { SearchService, SearchResults } from './services/search.service';
import { NotificationService, AppNotification } from './services/notification.service';
import { MarketsService } from './services/markets';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { MarketQuestionPipe } from './shared/market-question.pipe';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Login, Register, TranslatePipe, MarketQuestionPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private static readonly LANGUAGE_STORAGE_KEY = 'language-preference';
  protected readonly title = signal('42bets');
  protected readonly isAuthenticated = signal(false);
  protected readonly userRole = signal<string | null>(null);
  protected readonly balance = signal<number | null>(null);
  protected readonly username = signal<string | null>(null);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly avatarError = signal(false);
  protected readonly loading = signal(true);
  protected readonly viewportWidth = signal(1024);
  protected readonly mobileMenuOpen = signal(false);
  private readonly themeService = inject(ThemeService);
  protected readonly darkMode = computed(() => this.themeService.isDarkMode());
  protected readonly language = signal<'FR' | 'EN' | 'RU'>('FR');
  protected readonly languageMenuOpen = signal(false);
  protected readonly footerLanguageMenuOpen = signal(false);
  protected readonly activeAuthModal = signal<'login' | 'register' | null>(null);
  protected readonly howItWorksModalOpen = signal(false);
  protected readonly howItWorksStep = signal(0);
  protected readonly modalSheetPointerId = signal<number | null>(null);
  protected readonly modalSheetStartY = signal(0);
  protected readonly modalSheetHeight = signal(0);
  protected readonly modalSheetOffset = signal(0);
  protected readonly modalSheetDragging = signal(false);
  protected readonly modalBackdropClickArmed = signal(false);

  // Search
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchResults | null>(null);
  protected readonly searchOpen = signal(false);
  protected readonly searchLoading = signal(false);
  protected readonly navCategories = signal<string[]>([]);
  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Notifications
  protected readonly notifOpen = signal(false);

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly searchService = inject(SearchService);
  private readonly notificationService = inject(NotificationService);
  private readonly marketsService = inject(MarketsService);
  private readonly translate = inject(TranslateService);

  protected get notifications() { return this.notificationService.notifications; }
  protected get unreadCount()   { return this.notificationService.unreadCount; }
  private readonly howItWorksSlides = [
    { titleKey: 'APP.HOW_SLIDE1_TITLE', descKey: 'APP.HOW_SLIDE1_DESC' },
    { titleKey: 'APP.HOW_SLIDE2_TITLE', descKey: 'APP.HOW_SLIDE2_DESC' },
    { titleKey: 'APP.HOW_SLIDE3_TITLE', descKey: 'APP.HOW_SLIDE3_DESC' },
  ] as const;
  // Per-language tutorial screenshots (filenames aren't uniform across folders).
  private readonly howItWorksImages: Record<'FR' | 'EN' | 'RU', readonly string[]> = {
    FR: ['/tuto_fr/howitworkpart1.png', '/tuto_fr/howitworkpart2fr.png', '/tuto_fr/howitworkpart3fr.png'],
    EN: ['/tuto_en/howitworkpart1en.png', '/tuto_en/howitworkspart2en.png', '/tuto_en/howitworkpart3en.png'],
    RU: ['/tuto_ru/howitworkpart1ru.png', '/tuto_ru/howitworkpart2ru.png', '/tuto_ru/howitworkpart3ru.png'],
  };
  private mobileMenuCloseTimeout: ReturnType<typeof setTimeout> | null = null;
  private balanceRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly balanceRefreshMs = 10000;

  constructor() {
    this.restoreLanguagePreference();
    this.viewportWidth.set(this.getViewportWidth());
    this.syncAuthState(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.mobileMenuOpen.set(false);
        this.closeAuthModal();
        this.closeHowItWorksModal();
        this.closeSearch();
        this.syncAuthState(event.urlAfterRedirects);
      });

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query || query.trim().length < 2) {
          this.searchResults.set(null);
          this.searchLoading.set(false);
          return EMPTY;
        }
        this.searchLoading.set(true);
        return this.searchService.search(query).pipe(
          finalize(() => this.searchLoading.set(false)),
          catchError(() => of(null)),
        );
      }),
    ).subscribe((results) => {
      if (results !== null) {
        this.searchResults.set(results);
        this.searchOpen.set(true);
      } else {
        this.searchResults.set(null);
      }
    });

    this.marketsService.getCategories().pipe(catchError(() => of([]))).subscribe(cats => this.navCategories.set(cats));
  }

  ngOnDestroy(): void {
    this.stopBalanceAutoRefresh();
    this.clearMobileMenuCloseTimeout();
    this.unlockBodyScroll();
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  protected getBrandLink(): string {
    return '/';
  }

  protected isAdmin(): boolean {
    return this.isAuthenticated() && this.userRole() === 'ADMIN';
  }

  protected userInitials(): string {
    const name = this.username();
    if (!name) {
      return '';
    }
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }

  protected readonly avatarBackground = computed(() => buildAvatarGradient(this.username() ?? ''));

  protected onAvatarError(): void {
    this.avatarError.set(true);
  }

  protected categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      PROGRESSION: this.translate.instant('APP.CAT_PROGRESSION'),
      EXAM: this.translate.instant('APP.CAT_EXAM'),
      PROJECT: this.translate.instant('APP.CAT_PROJECT'),
      EXP: this.translate.instant('APP.CAT_EXP'),
      PROGRESS: this.translate.instant('APP.CAT_PROGRESS'),
      GENERAL: this.translate.instant('APP.CAT_GENERAL'),
      CAREER: this.translate.instant('APP.CAT_CAREER'),
      COMMUNITY: this.translate.instant('APP.CAT_COMMUNITY'),
    };
    const up = (cat ?? '').toUpperCase();
    return map[up] ?? (cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
  }

  protected onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    if (!query.trim()) {
      this.searchResults.set(null);
      this.searchOpen.set(false);
      this.searchLoading.set(false);
      return;
    }
    this.searchSubject.next(query.trim());
  }

  protected onSearchBlur(): void {
    setTimeout(() => this.searchOpen.set(false), 180);
  }

  protected onSearchFocus(): void {
    if (this.searchResults() !== null) {
      this.searchOpen.set(true);
    }
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set(null);
    this.searchLoading.set(false);
  }

  protected toggleNotifDropdown(): void {
    this.notifOpen.update(v => !v);
    if (this.notifOpen()) this.notificationService.markAllRead();
  }

  protected closeNotifDropdown(): void {
    this.notifOpen.set(false);
  }

  protected timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return this.translate.instant('APP.TIME_NOW');
    const m = Math.floor(s / 60);
    if (m < 60) return this.translate.instant('APP.TIME_MINUTES_AGO', { m });
    const h = Math.floor(m / 60);
    if (h < 24) return this.translate.instant('APP.TIME_HOURS_AGO', { h });
    return this.translate.instant('APP.TIME_DAYS_AGO', { d: Math.floor(h / 24) });
  }

  protected navigateToMarket(marketId: number): void {
    this.closeSearch();
    this.router.navigate(['/markets']);
  }

  protected goToProfile(): void {
    this.closeMobileMenu();
    this.router.navigate(['/profile']);
  }

  protected goToRanking(): void {
    this.closeMobileMenu();
    this.router.navigate(['/classement']);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  protected openMobileMenu(): void {
    this.clearMobileMenuCloseTimeout();
    this.mobileMenuOpen.set(true);
  }

  protected closeMobileMenu(): void {
    this.clearMobileMenuCloseTimeout();
    this.mobileMenuOpen.set(false);
    this.languageMenuOpen.set(false);
  }

  protected onMobileMenuHoverLeave(): void {
    if (!this.isHoverMenuEnabled()) {
      return;
    }
    this.clearMobileMenuCloseTimeout();
    this.mobileMenuCloseTimeout = setTimeout(() => {
      this.mobileMenuOpen.set(false);
      this.languageMenuOpen.set(false);
      this.mobileMenuCloseTimeout = null;
    }, 180);
  }

  protected onMobileMenuHoverEnter(): void {
    if (!this.isHoverMenuEnabled()) {
      return;
    }
    this.openMobileMenu();
  }

  private isHoverMenuEnabled(): boolean {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  }

  protected toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  protected toggleLanguageMenu(): void {
    this.languageMenuOpen.update((isOpen) => !isOpen);
  }

  protected setLanguage(language: 'FR' | 'EN' | 'RU'): void {
    this.applyLanguage(language);
    this.languageMenuOpen.set(false);
    this.footerLanguageMenuOpen.set(false);

    const win = this.document.defaultView;
    if (win?.localStorage) {
      win.localStorage.setItem(App.LANGUAGE_STORAGE_KEY, language);
    }
  }

  private restoreLanguagePreference(): void {
    const win = this.document.defaultView;
    const saved = win?.localStorage?.getItem(App.LANGUAGE_STORAGE_KEY)?.toUpperCase();

    if (saved === 'EN' || saved === 'RU' || saved === 'FR') {
      this.applyLanguage(saved);
      return;
    }

    this.applyLanguage('FR');
  }

  private applyLanguage(language: 'FR' | 'EN' | 'RU'): void {
    this.language.set(language);
    this.translate.use(language.toLowerCase());
  }

  protected navigateToLegalPage(path: '/privacy' | '/terms', event?: Event): void {
    event?.preventDefault();
    this.closeMobileMenu();
    this.footerLanguageMenuOpen.set(false);

    if (this.currentPath() === path) {
      this.resetLegalDocumentScroll();
      return;
    }

    this.router.navigateByUrl(path).then(() => {
      this.resetLegalDocumentScroll();
    });
  }

  protected navigateToPage(path: string, event?: Event): void {
    event?.preventDefault();
    this.closeMobileMenu();
    this.footerLanguageMenuOpen.set(false);
    this.router.navigateByUrl(path);
  }

  protected toggleFooterLanguageMenu(): void {
    this.footerLanguageMenuOpen.update((isOpen) => !isOpen);
  }

  protected currentLanguageLabel(): string {
    switch (this.language()) {
      case 'EN':
        return 'English';
      case 'RU':
        return 'Русский';
      default:
        return 'Français';
    }
  }

  protected currentLanguageFlag(): string {
    switch (this.language()) {
      case 'EN':
        return '/flags/gb.svg';
      case 'RU':
        return '/flags/ru.svg';
      default:
        return '/flags/fr.svg';
    }
  }

  private clearMobileMenuCloseTimeout(): void {
    if (this.mobileMenuCloseTimeout !== null) {
      clearTimeout(this.mobileMenuCloseTimeout);
      this.mobileMenuCloseTimeout = null;
    }
  }

  private currentPath(): string {
    return this.router.url.split('?')[0]?.split('#')[0] ?? this.router.url;
  }

  private resetLegalDocumentScroll(): void {
    this.document.defaultView?.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    setTimeout(() => {
      const legalDocument = this.document.querySelector<HTMLElement>('.legal-document');
      if (legalDocument) {
        legalDocument.scrollTop = 0;
      }
    }, 0);
  }

  protected loginModalOpen(): boolean {
    return this.activeAuthModal() === 'login';
  }

  protected registerModalOpen(): boolean {
    return this.activeAuthModal() === 'register';
  }

  protected currentHowItWorksTitle(): string {
    const slide = this.howItWorksSlides[this.howItWorksStep()] ?? this.howItWorksSlides[0];
    return this.translate.instant(slide.titleKey);
  }

  protected currentHowItWorksDescription(): string {
    const slide = this.howItWorksSlides[this.howItWorksStep()] ?? this.howItWorksSlides[0];
    return this.translate.instant(slide.descKey);
  }

  protected currentHowItWorksImage(): string {
    const images = this.howItWorksImages[this.language()] ?? this.howItWorksImages.FR;
    return images[this.howItWorksStep()] ?? images[0];
  }

  protected isLastHowItWorksStep(): boolean {
    return this.howItWorksStep() >= this.howItWorksSlides.length - 1;
  }

  protected currentHowItWorksActionLabel(): string {
    if (!this.isLastHowItWorksStep()) {
      return this.translate.instant('APP.HOW_MODAL_NEXT');
    }
    return this.isAuthenticated()
      ? this.translate.instant('APP.HOW_MODAL_FINISH')
      : this.translate.instant('APP.HOW_MODAL_REGISTER');
  }

  private authModalOpen(): boolean {
    return this.activeAuthModal() !== null;
  }

  private resetModalSheet(): void {
    this.modalSheetOffset.set(0);
    this.modalSheetDragging.set(false);
    this.modalSheetStartY.set(0);
    this.modalSheetHeight.set(0);
    this.modalBackdropClickArmed.set(false);
  }

  protected openLoginModal(): void {
    if (this.howItWorksModalOpen()) {
      this.closeHowItWorksModal();
    }
    this.resetModalSheet();
    this.activeAuthModal.set('login');
    this.lockBodyScroll();
  }

  protected openRegisterModal(): void {
    if (this.howItWorksModalOpen()) {
      this.closeHowItWorksModal();
    }
    this.resetModalSheet();
    this.activeAuthModal.set('register');
    this.lockBodyScroll();
  }

  protected openHowItWorksModal(): void {
    this.resetModalSheet();
    this.howItWorksStep.set(0);
    this.howItWorksModalOpen.set(true);
    this.lockBodyScroll();
  }

  protected closeHowItWorksModal(): void {
    this.modalSheetPointerId.set(null);
    this.resetModalSheet();
    this.howItWorksModalOpen.set(false);
    if (!this.authModalOpen()) {
      this.unlockBodyScroll();
    }
  }

  protected nextHowItWorksStep(): void {
    if (this.isLastHowItWorksStep()) {
      if (this.isAuthenticated()) {
        this.closeHowItWorksModal();
      } else {
        this.openRegisterModal();
      }
      return;
    }

    this.howItWorksStep.update((step) => Math.min(step + 1, this.howItWorksSlides.length - 1));
  }

  protected switchToLogin(): void {
    this.openLoginModal();
  }

  protected switchToRegister(): void {
    this.openRegisterModal();
  }

  protected closeAuthModal(): void {
    this.modalSheetPointerId.set(null);
    this.resetModalSheet();
    this.activeAuthModal.set(null);
    if (!this.howItWorksModalOpen()) {
      this.unlockBodyScroll();
    }
  }

  protected onModalOverlayClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (this.modalBackdropClickArmed()) {
      this.modalBackdropClickArmed.set(false);
      return;
    }

    if (this.authModalOpen()) {
      this.closeAuthModal();
      return;
    }

    if (this.howItWorksModalOpen()) {
      this.closeHowItWorksModal();
    }
  }

  protected onModalSheetTouchStart(event: TouchEvent): void {
    if (!this.sheetModalOpen() || !this.isMobileViewport()) {
      return;
    }

    const sheet = event.currentTarget as HTMLElement | null;
    this.modalSheetHeight.set(sheet?.getBoundingClientRect().height ?? 0);
    this.modalSheetDragging.set(true);
    this.modalSheetStartY.set(event.touches[0]?.clientY ?? 0);
    this.modalSheetOffset.set(0);
  }

  protected onModalSheetTouchMove(event: TouchEvent): void {
    if (!this.modalSheetDragging() || !this.isMobileViewport()) {
      return;
    }

    const startY = this.modalSheetStartY();
    const currentY = event.touches[0]?.clientY ?? startY;
    const delta = Math.max(0, currentY - startY);
    this.modalSheetOffset.set(delta);
  }

  protected onModalSheetTouchEnd(): void {
    if (!this.modalSheetDragging()) {
      return;
    }
    this.finishModalSheetGesture();
  }

  protected onModalSheetTouchCancel(): void {
    this.modalSheetPointerId.set(null);
    this.modalSheetDragging.set(false);
    this.modalSheetStartY.set(0);
    this.modalSheetOffset.set(0);
  }

  protected onModalSheetPointerDown(event: PointerEvent): void {
    if (!this.sheetModalOpen() || !this.isMobileViewport()) {
      if (event.pointerType === 'mouse') {
        this.modalBackdropClickArmed.set(true);
      }
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (event.pointerType === 'mouse') {
      this.modalBackdropClickArmed.set(true);
    }

    const sheet = event.currentTarget as HTMLElement | null;
    sheet?.setPointerCapture(event.pointerId);
    this.modalSheetPointerId.set(event.pointerId);
    this.modalSheetHeight.set(sheet?.getBoundingClientRect().height ?? 0);
    this.modalSheetDragging.set(true);
    this.modalSheetStartY.set(event.clientY);
    this.modalSheetOffset.set(0);
  }

  protected onModalSheetPointerMove(event: PointerEvent): void {
    if (
      !this.modalSheetDragging() ||
      this.modalSheetPointerId() !== event.pointerId ||
      !this.isMobileViewport()
    ) {
      return;
    }

    const startY = this.modalSheetStartY();
    const delta = Math.max(0, event.clientY - startY);
    this.modalSheetOffset.set(delta);
  }

  protected onModalSheetPointerUp(event: PointerEvent): void {
    if (!this.modalSheetDragging() || this.modalSheetPointerId() !== event.pointerId) {
      return;
    }

    this.modalSheetPointerId.set(null);
    this.finishModalSheetGesture();
  }

  protected onModalSheetPointerCancel(event: PointerEvent): void {
    if (this.modalSheetPointerId() !== event.pointerId) {
      return;
    }

    this.modalSheetPointerId.set(null);
    this.modalSheetDragging.set(false);
    this.modalSheetStartY.set(0);
    this.modalSheetOffset.set(0);
  }

  protected onModalContentPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button === 0) {
      this.modalBackdropClickArmed.set(true);
    }
  }

  protected getModalSheetTransform(): string {
    const offset = this.isMobileViewport() ? this.modalSheetOffset() : 0;
    return `translateY(${offset}px)`;
  }

  private isMobileHeaderViewport(): boolean {
    const width = this.viewportWidth();
    return width <= 617;
  }

  private isMobileViewport(): boolean {
    return this.isMobileHeaderViewport();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.viewportWidth.set(this.getViewportWidth());
  }

  private getModalDismissThreshold(): number {
    const height = this.modalSheetHeight();
    if (!height) {
      return 100;
    }

    const ratioThreshold = height * 0.28;
    return Math.max(72, Math.min(180, ratioThreshold));
  }

  private scheduleModalCloseAfterSnap(): void {
    const closeDelayMs = 170;
    const view = this.document.defaultView;
    if (!view) {
      if (this.authModalOpen()) {
        this.closeAuthModal();
      } else if (this.howItWorksModalOpen()) {
        this.closeHowItWorksModal();
      }
      return;
    }

    view.setTimeout(() => {
      if (this.authModalOpen()) {
        this.closeAuthModal();
      } else if (this.howItWorksModalOpen()) {
        this.closeHowItWorksModal();
      }
    }, closeDelayMs);
  }

  private sheetModalOpen(): boolean {
    return this.authModalOpen() || this.howItWorksModalOpen();
  }

  private finishModalSheetGesture(): void {
    const dynamicThreshold = this.getModalDismissThreshold();
    const shouldDismiss = this.modalSheetOffset() > dynamicThreshold;

    this.modalSheetDragging.set(false);
    this.modalSheetStartY.set(0);

    if (shouldDismiss) {
      const dismissDistance = this.modalSheetHeight() || 220;
      this.modalSheetOffset.set(dismissDistance);
      this.scheduleModalCloseAfterSnap();
      return;
    }

    this.modalSheetOffset.set(0);
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.notifOpen()) { this.notifOpen.set(false); return; }
    if (this.footerLanguageMenuOpen()) {
      this.footerLanguageMenuOpen.set(false);
    }

    if (this.authModalOpen()) {
      this.closeAuthModal();
      return;
    }

    if (this.howItWorksModalOpen()) {
      this.closeHowItWorksModal();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.notifOpen() && !target.closest('.nav-notif-wrap')) {
      this.notifOpen.set(false);
    }
  }

  private lockBodyScroll(): void {
    this.document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    this.document.body.style.overflow = '';
  }

  private finishLogout(): void {
    this.stopBalanceAutoRefresh();
    this.tokenService.clear();
    this.userRole.set(null);
    this.isAuthenticated.set(false);
    this.balance.set(null);
    this.username.set(null);
    this.avatarUrl.set(null);
    this.avatarError.set(false);
    this.notificationService.disconnect();
    this.router.navigate(['/']);
  }

  private syncAuthState(url: string): void {
    const accessToken = this.tokenService.getAccessToken();
    const authenticated = this.tokenService.isAccessTokenValid();
    this.isAuthenticated.set(authenticated);
    this.userRole.set(authenticated ? this.extractRole(accessToken) : null);
    this.username.set(authenticated ? this.extractUsername(accessToken) : null);

    if (authenticated) {
      this.loadBalance();
      this.startBalanceAutoRefresh();
      this.notificationService.connect();
    } else {
      this.stopBalanceAutoRefresh();
      this.balance.set(null);
      this.username.set(null);
    }

    if (
      url.startsWith('/login') ||
      url.startsWith('/register') ||
      url.startsWith('/forgot-password') ||
      url.startsWith('/reset-password') ||
      url.startsWith('/confirm-email')
    ) {
      return;
    }
  }

  private loadBalance(): void {
    if (!this.tokenService.isAccessTokenValid()) {
      this.balance.set(null);
      return;
    }

    this.http
      .get<{ username: string; balance: number; walletAddress: string | null; avatarUrl: string | null }>(
        `${appConfig.apiUrl}/api/users/me`,
        {
          withCredentials: true,
        },
      )
      .subscribe({
        next: (data) => {
          this.balance.set(data.balance);
          if (data.username) {
            this.username.set(data.username);
          }
          if (data.avatarUrl) {
            this.avatarUrl.set(data.avatarUrl);
            this.avatarError.set(false);
          }
        },
        error: () => this.balance.set(null),
      });
  }

  private startBalanceAutoRefresh(): void {
    if (this.balanceRefreshInterval || !this.document.defaultView) {
      return;
    }

    this.balanceRefreshInterval = setInterval(() => {
      if (!this.tokenService.isAccessTokenValid()) {
        this.stopBalanceAutoRefresh();
        return;
      }
      this.loadBalance();
    }, this.balanceRefreshMs);
  }

  private stopBalanceAutoRefresh(): void {
    if (!this.balanceRefreshInterval) {
      return;
    }
    clearInterval(this.balanceRefreshInterval);
    this.balanceRefreshInterval = null;
  }

  private extractRole(token: string | null): string | null {
    if (!token) {
      return null;
    }

    try {
      const payloadPart = token.split('.')[1];
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));
      return payload.role ?? null;
    } catch {
      return null;
    }
  }

  private extractUsername(token: string | null): string | null {
    if (!token) {
      return null;
    }

    try {
      const payloadPart = token.split('.')[1];
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));
      return payload.sub ?? payload.username ?? null;
    } catch {
      return null;
    }
  }

  private getViewportWidth(): number {
    return this.document.defaultView?.innerWidth ?? 1024;
  }
}
