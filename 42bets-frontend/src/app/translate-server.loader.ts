import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TranslateServerLoader implements TranslateLoader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTranslation(lang: string): Observable<any> {
    const candidates = [
      // Production Docker: dist is at /app/dist/42bets-frontend/browser/
      join(process.cwd(), 'dist/42bets-frontend/browser/i18n', `${lang}.json`),
      // Development ng serve: files are in public/
      join(process.cwd(), 'public/i18n', `${lang}.json`),
    ];

    for (const filePath of candidates) {
      try {
        return of(JSON.parse(readFileSync(filePath, 'utf8')));
      } catch {}
    }

    console.warn(`[i18n] Could not load server-side translations for "${lang}"`);
    return of({});
  }
}
