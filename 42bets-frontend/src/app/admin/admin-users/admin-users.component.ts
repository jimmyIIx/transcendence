import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdminService, CreateMarketRequest, FortyTwoUser } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MarketSummary } from '../../services/markets';
import { UiStatTileComponent } from '../../shared/ui/ui-stat-tile/ui-stat-tile.component';
import { UiBadgeComponent } from '../../shared/ui/ui-badge/ui-badge.component';
import { LoggerService } from '../../services/logger.service';
import { MarketQuestionPipe } from '../../shared/market-question.pipe';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
  imports: [CommonModule, FormsModule, TranslatePipe, UiStatTileComponent, UiBadgeComponent, MarketQuestionPipe],
})
export class AdminUsersComponent implements OnInit {
    private readonly isBrowser: boolean;
    activeTab: 'users' | 'markets' = 'users';
    users: any[] = [];
    markets: MarketSummary[] = [];
    loading = false;
    marketsLoading = false;
    error: string | null = null;
    marketsError: string | null = null;
    generationResult: string | null = null;
    showEditModal = false;
    showCreateModal = false;
    showDetailsModal = false;
    detailsLoading = false;
    modalMode: 'create' | 'edit' = 'create';
    selectedUser: any = null;
    userDetails: any = null;
    formData: any = {
      username: '',
      email: '',
      role: '',
      emailVerified: false,
      password: '',
    };

    showBalanceModal = false;
    balanceTargetUser: any = null;
    balanceDelta = 0;

    // ── Market creation ──────────────────────────────────────────────
    showCreateMarketModal = false;
    createMarketSubmitting = false;
    projectOptionsLoading = false;
    fortyTwoUsers: FortyTwoUser[] = [];
    activeProjects: string[] = [];
    marketForm: CreateMarketRequest = {
      question: '',
      category: '',
      description: '',
      endDate: '',
      subjectProviderId: '',
      subjectContext: '',
      metricType: '',
      targetValue: null,
    };

    constructor(
      private adminService: AdminService,
      private translate: TranslateService,
      private logger: LoggerService,
      @Inject(PLATFORM_ID) platformId: Object,
    ) {
      this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit() {
      if (!this.isBrowser) {
        return;
      }

      this.loadUsers();
      this.loadMarkets();
    }

    setTab(tab: 'users' | 'markets') {
      this.activeTab = tab;
    }

    loadUsers() {
      this.loading = true;
      this.adminService.getAllUsers().subscribe(
        (data: any) => {
          this.users = data;
          this.loading = false;
        },
        (err: any) => {
          this.error = this.translate.instant('ADMIN.ERROR_LOAD_USERS');
          this.loading = false;
          this.logger.error('Admin users load failed', err);
        },
      );
    }

    loadMarkets() {
      this.marketsLoading = true;
      this.marketsError = null;
      this.adminService.getMarkets().subscribe(
        (data: MarketSummary[]) => {
          this.markets = data;
          this.marketsLoading = false;
        },
        (err: any) => {
          this.marketsError = this.translate.instant('ADMIN.ERROR_LOAD_MARKETS');
          this.marketsLoading = false;
          this.logger.error('Admin markets load failed', err);
        },
      );
    }

    generateMarkets() {
      this.marketsLoading = true;
      this.generationResult = null;
      this.adminService.generateMarkets().subscribe(
        (result) => {
          const message = this.translateGenerationMessage(result.message);
          this.generationResult = this.translate.instant('ADMIN.GEN_RESULT', {
            message,
            created: result.createdCount,
            total: result.totalMarkets,
          });
          this.loadMarkets();
        },
        (err: any) => {
          this.marketsError = this.translate.instant('ADMIN.ERROR_GENERATE_MARKETS');
          this.marketsLoading = false;
          this.logger.error('Admin markets generation failed', err);
        },
      );
    }

    deleteUser(id: number) {
      if (confirm(this.translate.instant('ADMIN.CONFIRM_DELETE_USER'))) {
        this.adminService.deleteUser(id).subscribe(
          () => {
            this.users = this.users.filter((u) => u.id !== id);
            alert(this.translate.instant('ADMIN.ALERT_USER_DELETED'));
          },
          (err: any) => this.logger.error('Admin user delete failed', err),
        );
      }
    }

    openEditModal(user: any) {
      this.modalMode = 'edit';
      this.selectedUser = user;
      this.formData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: !!user.emailVerified,
        password: '',
      };
      this.showEditModal = true;
    }

    openDetailsModal(user: any) {
      this.detailsLoading = true;
      this.userDetails = null;
      this.showDetailsModal = true;

      this.adminService.getUserById(user.id).subscribe(
        (data: any) => {
          this.userDetails = data;
          this.detailsLoading = false;
        },
        (err: any) => {
          this.detailsLoading = false;
          this.logger.error('Admin user details load failed', err);
          alert(this.translate.instant('ADMIN.ERROR_LOAD_DETAILS', { detail: this.extractErrorMessage(err) }));
        },
      );
    }

    openCreateModal() {
      this.modalMode = 'create';
      this.formData = {
        username: '',
        email: '',
        role: '',
        emailVerified: false,
        password: '',
      };
      this.showCreateModal = true;
    }

    closeModal() {
      this.showEditModal = false;
      this.showCreateModal = false;
      this.showDetailsModal = false;
      this.detailsLoading = false;
      this.selectedUser = null;
      this.userDetails = null;
      this.formData = {
        username: '',
        email: '',
        role: '',
        emailVerified: false,
        password: '',
      };
    }

    saveUser() {
      if (!this.formData.username || !this.formData.email || !this.formData.role) {
        alert(this.translate.instant('ADMIN.VALIDATION_REQUIRED_FIELDS'));
        return;
      }

      if (this.modalMode === 'create' && !this.passwordIsValid(this.formData.password)) {
        alert(this.translate.instant('ADMIN.VALIDATION_PASSWORD'));
        return;
      }

      if (this.modalMode === 'edit') {
        this.adminService.updateUser(this.formData.id, this.formData).subscribe(
          (updatedUser: any) => {
            const index = this.users.findIndex((u) => u.id === this.formData.id);
            if (index !== -1) {
              this.users[index] = updatedUser;
            }
            alert(this.translate.instant('ADMIN.ALERT_USER_UPDATED'));
            this.closeModal();
          },
          (err: any) => {
            this.logger.error('Admin user update failed', err);
            alert(this.translate.instant('ADMIN.ALERT_USER_UPDATE_ERROR', { detail: this.extractErrorMessage(err) }));
          },
        );
      } else {
        this.adminService.createUser(this.formData).subscribe(
          (newUser: any) => {
            this.users.push(newUser);
            alert(this.translate.instant('ADMIN.ALERT_USER_CREATED'));
            this.closeModal();
          },
          (err: any) => {
            this.logger.error('Admin user creation failed', err);
            alert(this.translate.instant('ADMIN.ALERT_USER_CREATE_ERROR', { detail: this.extractErrorMessage(err) }));
          },
        );
      }
    }

    isMarketExpired(market: MarketSummary): boolean {
      return !market.resolved && !!market.endDate && new Date(market.endDate).getTime() <= Date.now();
    }

    resolveMarket(market: MarketSummary, outcome: 'YES' | 'NO') {
      const outcomeLabel = outcome === 'YES'
        ? this.translate.instant('MARKETS.YES')
        : this.translate.instant('MARKETS.NO');
      if (!confirm(this.translate.instant('ADMIN.CONFIRM_RESOLVE_MARKET', { question: market.question, outcome: outcomeLabel }))) return;
      this.adminService.resolveMarket(market.id, outcome).subscribe(
        () => this.loadMarkets(),
        (err: any) => alert(this.translate.instant('ADMIN.ERROR_RESOLVE_MARKET', { detail: this.extractErrorMessage(err) })),
      );
    }

    deleteMarket(market: MarketSummary) {
      if (!confirm(this.translate.instant('ADMIN.CONFIRM_DELETE_MARKET', { question: market.question }))) return;
      this.adminService.deleteMarket(market.id).subscribe(
        () => { this.markets = this.markets.filter((m) => m.id !== market.id); },
        (err: any) => alert(this.translate.instant('ADMIN.ERROR_DELETE_MARKET', { detail: this.extractErrorMessage(err) })),
      );
    }

    send_email(userId: number, userEmail: string) {
      if (userId && userEmail) {
        this.adminService.sendConfirmationEmail(userId).subscribe(
          () => {
            alert(this.translate.instant('ADMIN.ALERT_EMAIL_SENT', { email: userEmail }));
          },
          (err: any) => {
            this.logger.error('Admin confirmation email send failed', err);
            alert(this.translate.instant('ADMIN.ERROR_SEND_EMAIL', { detail: this.extractErrorMessage(err) }));
          },
        );
      }
    }

    // ── Market creation methods ──────────────────────────────────────────────

    openCreateMarketModal() {
      this.marketForm = {
        question: '',
        category: '',
        description: '',
        endDate: this.getCreateMarketMinDateTime(),
        subjectProviderId: '',
        subjectContext: '',
        metricType: '',
        targetValue: null,
      };
      this.activeProjects = [];
      this.projectOptionsLoading = false;
      this.createMarketSubmitting = false;
      if (this.fortyTwoUsers.length === 0) {
        this.adminService.get42Users().subscribe({
          next: (users) => { this.fortyTwoUsers = users; },
          error: () => { /* non-fatal — dropdown will be empty */ },
        });
      }
      this.showCreateMarketModal = true;
    }

    closeCreateMarketModal() {
      this.showCreateMarketModal = false;
    }

    protected getCreateMarketMinDateTime(): string {
      const date = new Date();
      date.setSeconds(0, 0);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
    }

    protected getCreateMarketMaxDateTime(): string {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      date.setSeconds(0, 0);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
    }

    submitCreateMarket() {
      if (!this.isCreateMarketFormValid()) {
        alert(this.translate.instant('ADMIN.VALIDATION_REQUIRED_FIELDS'));
        return;
      }

      this.createMarketSubmitting = true;
      const category = this.marketForm.category.trim().toUpperCase();
      const isProjectCategory = category === 'PROJECT';

      const payload: CreateMarketRequest = {
        question: this.marketForm.question.trim(),
        category,
        description: (this.marketForm.description ?? '').trim(),
        endDate: this.marketForm.endDate,
        subjectProviderId: this.marketForm.subjectProviderId,
        subjectContext: isProjectCategory ? (this.marketForm.subjectContext ?? '').trim() : undefined,
        metricType: isProjectCategory
          ? 'PROJECT_VALIDATED'
          : this.marketForm.metricType,
        targetValue:
          isProjectCategory
            ? 1
            : this.marketForm.metricType && this.marketForm.targetValue != null
              ? this.marketForm.targetValue
              : undefined,
      };

      if (!isProjectCategory && (!payload.metricType || payload.metricType.trim().length === 0)) {
        payload.metricType = undefined;
      }

      this.adminService.createMarket(payload).subscribe({
        next: (created: any) => {
          this.markets.unshift(created as any);
          this.createMarketSubmitting = false;
          alert(this.translate.instant('ADMIN.ALERT_MARKET_CREATED', { question: created.question }));
          this.closeCreateMarketModal();
        },
        error: (err: HttpErrorResponse) => {
          this.createMarketSubmitting = false;
          alert(this.translate.instant('ADMIN.ERROR_CREATE_MARKET', { detail: this.extractErrorMessage(err) }));
        },
      });
    }

    protected onCategoryChanged(value: string): void {
      const normalized = (value ?? '').trim().toUpperCase();
      this.marketForm.category = value ?? '';

      if (normalized === 'PROJECT') {
        this.marketForm.metricType = 'PROJECT_VALIDATED';
        this.marketForm.targetValue = 1;
        if ((this.marketForm.subjectProviderId ?? '').trim()) {
          this.loadActiveProjects(this.marketForm.subjectProviderId!.trim());
        }
        return;
      }

      this.marketForm.subjectContext = '';
      this.activeProjects = [];
      if (this.marketForm.metricType === 'PROJECT_VALIDATED') {
        this.marketForm.metricType = '';
      }
      if (this.marketForm.targetValue === 1) {
        this.marketForm.targetValue = null;
      }
    }

    protected onSubjectChanged(providerId: string): void {
      this.marketForm.subjectProviderId = providerId ?? '';
      this.marketForm.subjectContext = '';
      this.activeProjects = [];
      if (this.isProjectCategory() && (providerId ?? '').trim().length > 0) {
        this.loadActiveProjects(providerId.trim());
      }
    }

    protected isProjectCategory(): boolean {
      return (this.marketForm.category ?? '').trim().toUpperCase() === 'PROJECT';
    }

    private loadActiveProjects(providerId: string): void {
      this.projectOptionsLoading = true;
      this.adminService.get42UserActiveProjects(providerId).subscribe({
        next: (projects) => {
          this.activeProjects = projects ?? [];
          this.projectOptionsLoading = false;
        },
        error: () => {
          this.activeProjects = [];
          this.projectOptionsLoading = false;
        },
      });
    }

    protected isCreateMarketFormValid(): boolean {
      const question = this.marketForm.question.trim();
      const category = this.marketForm.category.trim();
      const endDate = (this.marketForm.endDate ?? '').trim();
      const subjectProviderId = (this.marketForm.subjectProviderId ?? '').trim();
      const metricType = (this.marketForm.metricType ?? '').trim();
      const targetValueFilled = this.marketForm.targetValue != null && Number.isFinite(this.marketForm.targetValue);
      const isProjectCategory = category.toUpperCase() === 'PROJECT';

      const hasCoreFields = Boolean(question && category && endDate);
      if (!hasCoreFields) return false;

      if (isProjectCategory) {
        const subjectContext = (this.marketForm.subjectContext ?? '').trim();
        return Boolean(subjectProviderId && subjectContext);
      }

      const isAutoResolved = metricType.length > 0;
      if (isAutoResolved) {
        return Boolean(subjectProviderId && targetValueFilled);
      }

      // For manually resolved markets, subject and target are optional.
      return true;
    }
    // ── Balance modal ────────────────────────────────────────────────────────

    openBalanceModal(user: any) {
      this.balanceTargetUser = user;
      this.balanceDelta = 0;
      this.showBalanceModal = true;
    }

    closeBalanceModal() {
      this.showBalanceModal = false;
      this.balanceTargetUser = null;
      this.balanceDelta = 0;
    }

    submitBalance() {
      if (!this.balanceTargetUser || this.balanceDelta === 0) return;
      this.adminService.adjustBalance(this.balanceTargetUser.id, this.balanceDelta).subscribe(
        (response: any) => {
          const updated = response?.user ?? response;
          const index = this.users.findIndex((u) => u.id === updated.id);
          if (index !== -1) this.users[index] = updated;
          this.notifyMintResult(response?.mint);
          this.closeBalanceModal();
        },
        (err: any) => {
          alert(this.translate.instant('ADMIN.ERROR_BALANCE', { detail: this.extractErrorMessage(err) }));
        },
      );
    }

    private notifyMintResult(mint: any) {
      if (!mint) return;
      switch (mint.status) {
        case 'sent':
          alert(this.translate.instant('ADMIN.MINT_SENT', { txHash: mint.txHash }));
          break;
        case 'no-wallet':
          alert(this.translate.instant('ADMIN.MINT_NO_WALLET'));
          break;
        case 'disabled':
          alert(this.translate.instant('ADMIN.MINT_DISABLED'));
          break;
        case 'failed':
          alert(this.translate.instant('ADMIN.MINT_FAILED', { reason: mint.reason }));
          break;
        default:
          break;
      }
    }

    private extractErrorMessage(err: HttpErrorResponse): string {
      if (!err) {
        return this.translate.instant('ADMIN.ERROR_UNKNOWN');
      }

      if (typeof err.error === 'string' && err.error.trim().length > 0) {
        return err.error;
      }

      if (err.error?.message) {
        return err.error.message;
      }

      if (err.message) {
        return err.message;
      }

      return `HTTP ${err.status}`;
    }

    private passwordIsValid(password: string): boolean {
      if (!password) {
        return false;
      }

      const passwordRegex = /^(?=\S)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}(?<=\S)$/;
      return passwordRegex.test(password);
    }

    getCategoryLabel(category: string | null | undefined): string {
      if (!category) {
        return this.translate.instant('ADMIN.CAT_MAP_UNCLASSIFIED');
      }

      const normalized = category.trim().toUpperCase();
      const categoryKeyMap: Record<string, string> = {
        SPORTS: 'ADMIN.CAT_MAP_SPORT',
        SPORT: 'ADMIN.CAT_MAP_SPORT',
        ESPORTS: 'ADMIN.CAT_MAP_ESPORT',
        ESPORT: 'ADMIN.CAT_MAP_ESPORT',
        PROGRESS: 'ADMIN.CAT_MAP_PROGRESSION',
        PROGRESSION: 'ADMIN.CAT_MAP_PROGRESSION',
        OTHER: 'ADMIN.CAT_MAP_OTHER',
        OTHERS: 'ADMIN.CAT_MAP_OTHERS',
        MISC: 'ADMIN.CAT_MAP_MISC',
        MISCELLANEOUS: 'ADMIN.CAT_MAP_MISC',
        EDUCATION: 'ADMIN.CAT_MAP_EDUCATION',
        ACADEMIC: 'ADMIN.CAT_MAP_ACADEMIC',
        BUSINESS: 'ADMIN.CAT_MAP_BUSINESS',
        FINANCE: 'ADMIN.CAT_MAP_FINANCE',
        CRYPTO: 'ADMIN.CAT_MAP_CRYPTO',
        BLOCKCHAIN: 'ADMIN.CAT_MAP_BLOCKCHAIN',
        TECHNOLOGY: 'ADMIN.CAT_MAP_TECHNOLOGY',
        TECH: 'ADMIN.CAT_MAP_TECHNOLOGY',
        SCIENCE: 'ADMIN.CAT_MAP_SCIENCE',
        POLITICS: 'ADMIN.CAT_MAP_POLITICS',
        CAREER: 'ADMIN.CAT_MAP_CAREER',
        COMMUNITY: 'ADMIN.CAT_MAP_COMMUNITY',
        SOCIAL: 'ADMIN.CAT_MAP_SOCIAL',
        CULTURE: 'ADMIN.CAT_MAP_CULTURE',
        ENTERTAINMENT: 'ADMIN.CAT_MAP_ENTERTAINMENT',
        GAMING: 'ADMIN.CAT_MAP_GAMING',
        GENERAL: 'ADMIN.CAT_MAP_GENERAL',
        EXAM: 'ADMIN.CAT_MAP_EXAMINATION',
        PROJECT: 'ADMIN.CAT_MAP_PROJECT',
        EXP: 'ADMIN.CAT_MAP_EXPERIENCE',
      };

      if (categoryKeyMap[normalized]) {
        return this.translate.instant(categoryKeyMap[normalized]);
      }

      return category
        .toLowerCase()
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    private translateGenerationMessage(message: string | null | undefined): string {
      if (!message) {
        return this.translate.instant('ADMIN.GEN_COMPLETE');
      }

      const normalized = message.trim().toLowerCase();

      if (normalized.includes('no new markets were needed')) {
        return this.translate.instant('ADMIN.GEN_NO_NEW');
      }

      if (normalized.includes('new markets were generated') || normalized.includes('markets generated')) {
        return this.translate.instant('ADMIN.GEN_NEW');
      }

      if (normalized.includes('generation completed') || normalized.includes('generation complete')) {
        return this.translate.instant('ADMIN.GEN_COMPLETE');
      }

      if (normalized.includes('market generation started')) {
        return this.translate.instant('ADMIN.GEN_STARTED');
      }

      return message;
    }
}
