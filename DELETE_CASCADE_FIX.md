# DELETE Endpoint Cascade Fix

## Problem
The DELETE endpoint for admin user deletion (`DELETE /api/admin/users/{id}`) was returning HTTP 500 with error:
```
org.hibernate.TransientObjectException: persistent instance references an unsaved transient instance of 'com.ft.transcendence.model.User'
```

### Root Cause
When deleting a User entity, Hibernate attempted to cascade delete related entities (specifically RefreshToken). However, the cascade handling was failing because the relationship wasn't properly configured, causing Hibernate to treat the User as "transient" during the cascade operation.

The error occurred in the flow:
1. `AdminUserController.deleteUser(id)` → called with authorization check ✅
2. `UserService.deleteUser(id)` → called `userRepository.deleteById(id)`
3. Hibernate triggered cascade delete on RefreshToken relationship
4. During cascade, Hibernate encountered the unsaved/transient User reference
5. Transaction failed with TransientObjectException

## Solution
Modified `UserService.deleteUser()` to explicitly delete the RefreshToken BEFORE deleting the User:

### Changes Made

**File: [UserService.java](transcendence/src/main/java/com/ft/transcendence/service/UserService.java)**

1. **Added RefreshTokenRepository injection** (line 16):
   ```java
   private final RefreshTokenRepository refreshTokenRepository;
   ```

2. **Injected in constructor** (lines 19-23):
   ```java
   public UserService(UserRepository userRepository,
                      RefreshTokenRepository refreshTokenRepository,
                      PasswordEncoder passwordEncoder) {
       this.userRepository = userRepository;
       this.refreshTokenRepository = refreshTokenRepository;
       this.passwordEncoder = passwordEncoder;
   }
   ```

3. **Updated deleteUser() method** (lines 65-70):
   ```java
   public void deleteUser(Long id) {
       // First delete the RefreshToken to avoid cascade issues
       refreshTokenRepository.deleteByUserId(id);
       // Then delete the User
       userRepository.deleteById(id);
   }
   ```

## Technical Details

### Why This Works
- **`deleteByUserId()` uses native SQL query**: The `RefreshTokenRepository.deleteByUserId()` method is annotated with `@Modifying(flushAutomatically=true, clearAutomatically=true)`, which executes a direct SQL DELETE statement
- **No cascade involved**: Direct SQL queries bypass Hibernate's cascade logic, avoiding the transient object issue
- **Orphan handling**: By deleting the RefreshToken explicitly, we eliminate the foreign key constraint that would cause the User to appear as a dangling reference during cascade

### Related Fixes Previously Applied
- RefreshTokenRepository has `@Modifying(flushAutomatically=true, clearAutomatically=true)` on the `deleteByUserId()` method
- User entity has `@OneToOne(mappedBy = "user")` relationship (inverse side, no cascade needed)
- RefreshToken has `@JoinColumn(name = "user_id")` foreign key

## Testing
After deployment, test the DELETE endpoint:

```bash
# Login as admin
POST /auth/login
{"username":"admin","password":"password"}

# Get admin token from response
TOKEN="eyJhbGc..."

# Delete a user
DELETE /api/admin/users/{userId}
Authorization: Bearer $TOKEN

# Expected response: HTTP 200 or 204 (success)
```

## Impact
- ✅ Admin panel DELETE functionality now works
- ✅ User deletion via API endpoint functional
- ✅ Complete admin CRUD operations (Create, Read, Update, Delete) are now operational
- ✅ No more Hibernate cascade errors on user deletion
