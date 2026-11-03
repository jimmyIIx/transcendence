import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Valeur par défaut à true (mode sombre) d'abord, pour correspondre au design par défaut du serveur (SSR)
  readonly isDarkMode = signal<boolean>(true);

  constructor() {
    if (this.isBrowser) {
      // 1. Charger la préférence sauvegardée
      const savedTheme = localStorage.getItem('theme-preference');
      let isDark = true;
      if (savedTheme) {
        isDark = savedTheme === 'dark';
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      this.isDarkMode.set(isDark);
      this.applyTheme(isDark);
    }
  }

  toggleTheme(): void {
    const targetDark = !this.isDarkMode();
    this.isDarkMode.set(targetDark);
    if (this.isBrowser) {
      this.applyTheme(targetDark);
    }
  }

  private applyTheme(isDark: boolean): void {
    try {
      const html = document.documentElement;
      const body = document.body;

      if (isDark) {
        html.classList.remove('light-mode');
        html.classList.add('dark-mode');
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
      } else {
        html.classList.remove('dark-mode');
        html.classList.add('light-mode');
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
      }

      localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
    } catch {
      // Ignore DOM theme application failures to avoid breaking navigation flow.
    }
  }
}
