import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

interface QuestionMarket {
  question?: string;
  category?: string | null;
  marketQuestion?: string;
  marketCategory?: string | null;
}

// Auto-generated markets (MarketGenerationService) build questions from fixed
// French templates. These regexes reverse-engineer the template + variables so
// they can be re-rendered in the active UI language. Manually created markets
// (free-text category/question from the admin panel) never match and fall
// back to the raw stored text.
const TEMPLATES: Record<string, RegExp> = {
  PROJECT: /^(\S+) validera-t-il (.+) avant la fin de la semaine \?$/,
  EXAM: /^(\S+) passera-t-il son prochain exam 42 du premier coup \?$/,
  PROGRESSION: /^(\S+) atteindra-t-il le niveau (.+) avant la fin du mois \?$/,
  EXP: /^(\S+) gagnera-t-il au moins (.+) points de correction cette semaine \?$/,
  PROGRESS: /^(\S+) depassera-t-il (.+) points de wallet avant le prochain checkpoint \?$/,
};

const PROJECT_FALLBACK_FR = 'son prochain projet';

@Pipe({ name: 'marketQuestion', standalone: true, pure: false })
export class MarketQuestionPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(market: QuestionMarket | null | undefined): string {
    const question = market?.question ?? market?.marketQuestion;
    if (!question) return '';
    const category = (market?.category ?? market?.marketCategory ?? '').toUpperCase();
    const regex = TEMPLATES[category];
    if (!regex) return question;

    const match = regex.exec(question);
    if (!match) return question;

    switch (category) {
      case 'PROJECT': {
        const project =
          match[2] === PROJECT_FALLBACK_FR
            ? this.translate.instant('MARKETS.Q_PROJECT_FALLBACK')
            : match[2];
        return this.translate.instant('MARKETS.Q_PROJECT', { login: match[1], project });
      }
      case 'EXAM':
        return this.translate.instant('MARKETS.Q_EXAM', { login: match[1] });
      case 'PROGRESSION':
        return this.translate.instant('MARKETS.Q_PROGRESSION', { login: match[1], level: match[2] });
      case 'EXP':
        return this.translate.instant('MARKETS.Q_EXP', { login: match[1], points: match[2] });
      case 'PROGRESS':
        return this.translate.instant('MARKETS.Q_PROGRESS', { login: match[1], wallet: match[2] });
      default:
        return question;
    }
  }
}
