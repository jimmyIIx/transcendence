# ft_transcendence - Evaluation Checklist

Use this file during defense. For each item: run the command, then validate the expected checkpoint.

## 1) Repo and Team Evidence

- [ ] Repo is the official one
  - Command: `git remote -v`
  - Verify: remote URL matches the official team repository.

- [ ] No suspicious git aliases
  - Command: `git config --get-regexp '^alias\.'`
  - Verify: no malicious alias redefining common git commands.

- [ ] All team members have commits
  - Command: `git shortlog -sne --all`
  - Verify: all expected members appear in commit history.

- [ ] Commit messages are meaningful
  - Command: `git log --oneline -n 30`
  - Verify: messages describe changes clearly.

## 2) Mandatory Architecture and Deployment

- [ ] Frontend/backend/database components exist
  - Command: `ls -1`
  - Verify: frontend, backend, database/deployment files are present.

- [ ] One-command container deployment works
  - Command: `docker compose up -d --build`
  - Verify: build and start complete without blocking failures.

- [ ] Services are healthy
  - Command: `docker compose ps`
  - Verify: backend, frontend, nginx, db are up/healthy.

- [ ] Frontend is reachable via HTTPS
  - Command: `curl -sk -o /dev/null -w '%{http_code}\n' https://localhost:8443`
  - Verify: HTTP code is `200` or `302`.

- [ ] Backend health endpoint responds
  - Command: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/health`
  - Verify: HTTP code is `200`.

- [ ] HTTP is redirected to HTTPS
  - Command: `curl -I http://localhost:8081`
  - Verify: response indicates `301/302` redirect to `https://`.

## 3) Security and Environment Hygiene

- [ ] `.env` is ignored and `.env.example` exists
  - Command: `sed -n '1,40p' .gitignore && ls -la .env.example`
  - Verify: `.env` is ignored and template file is present.

- [ ] No obvious leaked secrets in repository
  - Command: `grep -RIn --exclude-dir=.git --exclude-dir=node_modules "BEGIN PRIVATE KEY\|AKIA[0-9A-Z]\{16\}\|ghp_[A-Za-z0-9]\{36\}\|xoxb-\|-----BEGIN" .`
  - Verify: no real secret/key/token exposed.

## 4) README Compliance (Chapter VI)

- [ ] First line format is correct
  - Command: `sed -n '1p' README.md`
  - Verify: italicized sentence with all team logins appears exactly as required.

- [ ] Required sections are present
  - Command: `grep -n "Team Information\|Project Management\|Technical Stack\|Database Schema\|Features List\|Modules\|Individual Contributions\|Instructions\|Resources" README.md`
  - Verify: all mandatory sections exist.

- [ ] Claimed module score is at least 14
  - Command: `grep -n "Total claimed points" README.md`
  - Verify: total claimed points `>= 14`.

- [ ] AI usage disclosure exists
  - Command: `grep -n "AI Usage Disclosure" README.md`
  - Verify: README explains AI usage and human validation.

## 5) Privacy Policy and Terms of Service

- [ ] Legal routes exist
  - Command: `grep -n "path: 'privacy'\|path: 'terms'" 42bets-frontend/src/app/app.routes.ts`
  - Verify: both routes are registered.

- [ ] Legal links are accessible from UI shell/footer
  - Command: `grep -n "href=\"/privacy\"\|href=\"/terms\"" 42bets-frontend/src/app/app.html`
  - Verify: links appear in menu/footer.

- [ ] Privacy content is not placeholder/empty
  - Command: `sed -n '1,140p' 42bets-frontend/src/app/legal/privacy-policy.component.html`
  - Verify: multiple titled sections with real text keys/content structure.

- [ ] Terms content is not placeholder/empty
  - Command: `sed -n '1,170p' 42bets-frontend/src/app/legal/terms-of-service.component.html`
  - Verify: multiple titled sections with real text keys/content structure.

## 6) Technical Requirements

- [ ] Frontend and backend frameworks are used
  - Command: `grep -n "@angular/core\|spring-boot-starter-web" 42bets-frontend/package.json transcendence/pom.xml`
  - Verify: Angular + Spring Boot confirmed.

- [ ] Styling solution is used
  - Command: `grep -n "tailwindcss" 42bets-frontend/package.json`
  - Verify: Tailwind (or equivalent) is present.

- [ ] DB schema and relations are implemented
  - Command: `grep -RIn "@Entity\|@OneToOne\|@OneToMany\|@ManyToOne" transcendence/src/main/java/com/ft/transcendence/model`
  - Verify: entities and explicit relationships exist.

- [ ] Password security is implemented
  - Command: `grep -RIn "BCryptPasswordEncoder\|passwordEncoder.encode\|passwordEncoder.matches" transcendence/src/main/java/com/ft/transcendence`
  - Verify: salted hash and verification paths are present.

- [ ] Backend validation is implemented
  - Command: `grep -RIn "@Valid\|@NotBlank\|@Email\|@Size\|@Pattern" transcendence/src/main/java/com/ft/transcendence`
  - Verify: DTO/controller validation annotations are present.

- [ ] HTTPS entrypoint is enforced
  - Command: `grep -n "listen 443 ssl\|return 301 https://" nginx/nginx.conf`
  - Verify: HTTPS listener and HTTP->HTTPS redirect exist.

## 7) Modules Verification (from README)

- [ ] Real-time module evidence
  - Command: `grep -RIn "EventSource\|SseEmitter\|/api/notifications/stream\|ticket" 42bets-frontend/src transcendence/src/main/java`
  - Verify: full client+server SSE chain exists.

- [ ] ORM module evidence
  - Command: `grep -RIn "JpaRepository\|@Entity" transcendence/src/main/java/com/ft/transcendence`
  - Verify: JPA repositories and entities are used.

- [ ] SSR module evidence
  - Command: `grep -n "\"server\": \"src/main.server.ts\"\|\"ssr\"" 42bets-frontend/angular.json`
  - Verify: Angular SSR is configured.

- [ ] Design system module evidence (10+ components)
  - Command: `find 42bets-frontend/src/app/shared/ui -maxdepth 1 -type d | wc -l`
  - Verify: count indicates at least 10 reusable UI components.

- [ ] i18n module evidence (>=3 languages)
  - Command: `ls 42bets-frontend/public/i18n/*.json`
  - Verify: `fr.json`, `en.json`, `ru.json` exist.

- [ ] OAuth2 module evidence
  - Command: `grep -RIn "oauth2\|OAuth2" transcendence/src/main/java/com/ft/transcendence/security 42bets-frontend/src/app/auth`
  - Verify: backend OAuth2 config + frontend callback/login paths exist.

- [ ] Advanced permissions module evidence
  - Command: `grep -RIn "hasRole('ADMIN')\|/api/admin/\|adminGuard" transcendence/src/main/java 42bets-frontend/src/app`
  - Verify: role restrictions are enforced frontend and backend.

- [ ] Advanced analytics dashboard evidence
  - Command: `grep -RIn "exportCsv\|exportPdf\|chart\|bar\|pie" 42bets-frontend/src/app/dashboard`
  - Verify: visualizations + CSV/PDF exports exist.

## 8) Runtime Stability and UX Manual Checks

- [ ] Recent service logs have no critical startup failures
  - Command: `docker compose logs --no-color --tail=200 backend frontend nginx`
  - Verify: no recurring fatal exceptions preventing normal usage.

- [ ] Chrome console check (manual)
  - Command: `xdg-open https://localhost:8443`
  - Verify: in Chrome DevTools Console, no blocking errors during key flows.

- [ ] Responsiveness check (manual)
  - Command: `xdg-open https://localhost:8443`
  - Verify: usable UI on desktop + mobile viewport in DevTools.

- [ ] Multi-user behavior check (manual)
  - Command: `xdg-open https://localhost:8443`
  - Verify: 2 simultaneous sessions behave consistently.

- [ ] Additional browsers check (manual)
  - Command: `xdg-open https://localhost:8443`
  - Verify: smoke test repeated on Chrome + Firefox (+ Safari if available).

## 9) Human/Defense-Only Checks (No command)

- [ ] All team members are present during evaluation.
- [ ] Each member can explain role, contributions, and one implemented module.
- [ ] At least two members can explain architecture and project choices coherently.
- [ ] Team can explain trade-offs and technical decisions clearly.

## 10) Final Go/No-Go

- [ ] Validated modules count reaches at least 14 points.
- [ ] Mandatory part is complete and functional.
- [ ] No critical blocker remains.

If all boxes above are checked, project is ready for submission/defense.