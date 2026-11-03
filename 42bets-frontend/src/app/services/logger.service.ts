import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private isDev: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isDev = this.getEnvironment();
  }

  private getEnvironment(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }

  log(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.error(message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.debug(message, ...args);
    }
  }
  //other way to implement this shit cause im a flexer and i want u dumbass to understand how it works;
  /* private getEnvironementDummy(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }*/
}
