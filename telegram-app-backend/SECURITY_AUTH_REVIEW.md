# Security & Authentication Code Review - Detailed Analysis

## Executive Summary

This document provides an in-depth analysis of the security and authentication mechanisms in the telegram-app-backend. It identifies critical vulnerabilities, areas of concern, and provides specific remediation recommendations with code-level references.

**Overall Risk Assessment: MEDIUM-HIGH**

The codebase demonstrates good security practices in many areas (timing-attack prevention, role-based JWT secrets, refresh token rotation) but contains several critical issues that must be addressed before production deployment.

---

## Table of Contents

1. [Critical Issues (P0 - Must Fix)](#1-critical-issues-p0---must-fix)
2. [High Priority Issues (P1)](#2-high-priority-issues-p1)
3. [Medium Priority Issues (P2)](#3-medium-priority-issues-p2)
4. [Low Priority Issues (P3)](#4-low-priority-issues-p3)
5. [Security Strengths (What's Done Well)](#5-security-strengths-whats-done-well)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Testing Requirements](#7-testing-requirements)

---

## 1. Critical Issues (P0 - Must Fix)

### 1.1 OTP Bypass Code in Production Risk

**Severity:** CRITICAL  
**Location:** `routes/auth.js` (lines 489-493, 577-579)

**Current Code:**
```javascript
// Line 489-493 in verify-otp endpoint
if (process.env.NODE_ENV !== 'production' && code === '123456') {
    console.log(`[DEV BYPASS] Allowing 123456 for ${phone_number}`);
    isDevBypass = true;
}

// Line 577-579 in register-phone endpoint
if (process.env.NODE_ENV !== 'production' && code === '123456') {
    isDevBypass = true;
}
```

**Risk Analysis:**
- If `NODE_ENV` is accidentally unset or misconfigured in production, this bypass becomes active
- An attacker could exploit this to hijack any user account
- The bypass exists in TWO separate endpoints, doubling the attack surface

**Remediation:**
```javascript
// Option 1: Explicit production block (RECOMMENDED)
const isProduction = process.env.NODE_ENV === 'production';
const devBypassEnabled = !isProduction && process.env.DEV_OTP_BYPASS === 'true';

if (devBypassEnabled && code === '123456') {
    console.log(`[DEV BYPASS] Allowing 123456 for ${phone_number}`);
    isDevBypass = true;
}

// Option 2: Remove entirely and use proper test fixtures
// Delete all references to '123456' bypass code
```

**Files to Modify:**
- `routes/auth.js` - Lines 489-493, 577-579

---

### 1.2 Missing JWT Secret Length/Entropy Validation

**Severity:** CRITICAL  
**Location:** `config/env.js`, `services/tokenService.js`

**Current Code:**
```javascript
// env.js only checks if secrets exist, not their strength
ensureAny(
  ['JWT_SECRET', 'JWT_CUSTOMER_SECRET', ...],
  'JWT access secret',
  { requiredInProd: true }
);
```

**Risk Analysis:**
- Weak secrets (e.g., "secret123") would pass validation
- Short secrets are vulnerable to brute-force attacks
- No minimum entropy requirement

**Remediation:**
Add to `config/env.js`:
```javascript
const validateSecretStrength = (name) => {
  const secret = process.env[name];
  if (!secret) return;
  
  if (secret.length < 32) {
    const message = `[ENV] ${name} must be at least 32 characters for production security`;
    if (isProd) throw new Error(message);
    console.warn(message);
  }
  
  // Check for common weak patterns
  const weakPatterns = ['secret', 'password', '123456', 'jwt', 'token'];
  if (weakPatterns.some(p => secret.toLowerCase().includes(p))) {
    console.warn(`[ENV] ${name} appears to contain a weak pattern. Use a random string.`);
  }
};

// Validate all JWT secrets
[
  'JWT_SECRET', 'JWT_CUSTOMER_SECRET', 'JWT_ADMIN_SECRET',
  'JWT_SUPPLIER_SECRET', 'JWT_DELIVERY_SECRET', 'JWT_REFRESH_SECRET'
].forEach(validateSecretStrength);
```

**Files to Modify:**
- `config/env.js`

---

### 1.3 Missing Admin Account Status Enforcement

**Severity:** CRITICAL  
**Location:** `middleware/authAdmin.js`

**Current Code:**
```javascript
// authAdmin.js - NO account status check
const decoded = verifyJwt(token, secret);
req.admin = decoded;
if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Access denied.' });
}
next(); // Proceeds without checking if admin is still active
```

**Comparison - authSupplier.js HAS this check:**
```javascript
const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
if (enforceStatus) {
    const result = await db.query(
        'SELECT is_active FROM suppliers WHERE id = $1',
        [decoded.supplierId]
    );
    if (result.rows.length === 0 || result.rows[0].is_active !== true) {
        return res.status(403).json({ error: 'Supplier account is inactive.' });
    }
}
```

**Risk Analysis:**
- Disabled/removed admin accounts retain full API access until token expires
- No way to immediately revoke admin access in case of compromise
- Inconsistent security model across roles

**Remediation:**
```javascript
// middleware/authAdmin.js - Add account status check
const authAdmin = async (req, res, next) => {  // Note: make async
    // ... existing token verification ...
    
    const decoded = verifyJwt(token, secret);
    
    // Add account status enforcement
    const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
    if (enforceStatus) {
        const result = await db.query(
            'SELECT id FROM admins WHERE id = $1',  // Add is_active column if missing
            [decoded.adminId]
        );
        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Admin account not found or inactive.' });
        }
    }
    
    req.admin = decoded;
    next();
};
```

**Files to Modify:**
- `middleware/authAdmin.js`
- May require database migration to add `is_active` column to `admins` table

---

## 2. High Priority Issues (P1)

### 2.1 Inconsistent Role Checking in authMiddleware

**Severity:** HIGH  
**Location:** `middleware/authMiddleware.js`

**Current Code:**
```javascript
// authMiddleware.js (customer auth)
if (decoded.role !== 'customer') {
    return res.status(403).json({ message: 'Forbidden: invalid token role.' });
}
```

**Issue:**
The customer middleware properly enforces role, but there's no central validation that token payloads contain required fields.

**Remediation:**
Create a shared token validation utility:
```javascript
// services/tokenValidation.js
const validateTokenPayload = (decoded, expectedRole, requiredFields) => {
  if (!decoded) {
    return { valid: false, error: 'Token payload is empty' };
  }
  
  if (decoded.role !== expectedRole) {
    return { valid: false, error: 'Invalid token role' };
  }
  
  for (const field of requiredFields) {
    if (!decoded[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  return { valid: true };
};

module.exports = { validateTokenPayload };
```

**Files to Modify:**
- Create `services/tokenValidation.js`
- Update all auth middleware to use shared validation

---

### 2.2 Refresh Token Reuse Detection Gap

**Severity:** HIGH  
**Location:** `services/tokenService.js` (lines 121-158)

**Current Code:**
```javascript
// tokenService.js - rotateRefreshToken
if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.revoked_at) {
        await revokeAllForSubject(subjectId, decoded.role);
        throw new Error('Refresh token reuse detected');
    }
    // ...
}
```

**Issue:**
If a token is not in the database (first rotation after legacy migration), it's still processed, but the legacy insertion could fail silently.

**Current behavior on unknown token:**
```javascript
} else {
    // Insert legacy record and mark it as replaced
    await db.query(
        `INSERT INTO refresh_tokens ...`,
        [subjectId, ...legacyJti, refreshJti, ...]
    );
}
```

**Risk:**
- Race condition if multiple refresh attempts happen simultaneously
- No transaction wrapping for the check-and-rotate operation

**Remediation:**
```javascript
// Wrap in transaction
const client = await db.pool.connect();
try {
    await client.query('BEGIN');
    
    // Lock row for update
    const existing = await client.query(
        `SELECT token_hash, revoked_at, expires_at, ip, user_agent 
         FROM refresh_tokens 
         WHERE token_hash = $1 
         FOR UPDATE`,
        [tokenHash]
    );
    
    // ... rest of validation and rotation logic ...
    
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

**Files to Modify:**
- `services/tokenService.js`

---

### 2.3 Missing CSRF Protection for Cookie-Based Auth

**Severity:** HIGH  
**Location:** `routes/auth.js`, `server.js`

**Current Code:**
```javascript
// Cookie options
const buildCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    // ...
});
```

**Analysis:**
- `SameSite: Strict` provides good CSRF protection
- However, `SameSite: Lax` in development could mask CSRF vulnerabilities
- No explicit CSRF token mechanism for state-changing operations

**Remediation:**
For enhanced security, consider adding CSRF tokens for sensitive operations:
```javascript
// Add to server.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing auth endpoints
app.use('/api/auth/logout', csrfProtection);
app.use('/api/auth/refresh', csrfProtection);
```

**Files to Modify:**
- `server.js`
- Update `.env.example` to document CSRF configuration

---

### 2.4 Rate Limiter Redis Dependency

**Severity:** HIGH  
**Location:** `routes/auth.js` (lines 17-23, 27-65)

**Current Code:**
```javascript
const buildRateLimitStore = () => {
    const redisClient = getRedisClient();
    if (!redisClient) return undefined;  // Falls back to memory store
    return new RedisStore({...});
};
```

**Risk Analysis:**
- If Redis is unavailable, rate limiting falls back to in-memory
- In multi-instance deployments, each instance has separate counters
- Attackers could distribute requests across instances to bypass limits

**Remediation:**
```javascript
const buildRateLimitStore = () => {
    const redisClient = getRedisClient();
    if (!redisClient) {
        if (process.env.NODE_ENV === 'production') {
            console.error('[SECURITY] Redis unavailable - rate limiting degraded!');
            // Consider: throw error, or use stricter in-memory limits
        }
        return undefined;
    }
    return new RedisStore({...});
};

// Make limits stricter when using memory store
const getMaxRequests = (redisAvailable, devLimit, prodLimit) => {
    if (isDev) return devLimit;
    // Reduce limits if Redis unavailable to compensate for per-instance counting
    return redisAvailable ? prodLimit : Math.floor(prodLimit / 3);
};
```

**Files to Modify:**
- `routes/auth.js`
- Consider adding health check alert for Redis unavailability

---

## 3. Medium Priority Issues (P2)

### 3.1 Password Policy Not Applied to All Password Changes

**Severity:** MEDIUM  
**Location:** `services/passwordPolicy.js`, `routes/admin.js`, `routes/suppliers.js`

**Current Implementation:**
```javascript
// passwordPolicy.js exists but...
// Check if it's used in password creation endpoints

// routes/admin.js line 92
const passwordHash = await bcrypt.hash(password, saltRounds);
// No password policy validation before hashing!

// routes/suppliers.js line 726
const passwordHash = await bcrypt.hash(password, saltRounds);
// Same issue!
```

**Risk:**
- Admins/suppliers could set weak passwords
- Password policy exists but may not be enforced everywhere

**Remediation:**
```javascript
// Before hashing in admin.js and suppliers.js
const { validatePassword } = require('../services/passwordPolicy');

// Add validation
const passwordErrors = validatePassword(password);
if (passwordErrors.length > 0) {
    return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordErrors 
    });
}

const passwordHash = await bcrypt.hash(password, saltRounds);
```

**Files to Modify:**
- `routes/admin.js`
- `routes/suppliers.js`
- Any other endpoints that set/change passwords

---

### 3.2 Bcrypt Salt Rounds Inconsistency

**Severity:** MEDIUM  
**Location:** Multiple files

**Current Code:**
```javascript
// routes/admin.js - uses saltRounds (likely from env or default)
const passwordHash = await bcrypt.hash(password, saltRounds);

// createAdminHash.js
const saltRounds = 10;

// createSupplierHash.js  
const saltRounds = 10;

// hashPassword.js
const saltRounds = 10;
```

**Issue:**
- Salt rounds are hardcoded in utility scripts
- No centralized configuration
- 10 rounds may be insufficient for high-security environments (OWASP recommends 12+)

**Remediation:**
```javascript
// config/security.js
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

if (BCRYPT_SALT_ROUNDS < 10) {
    console.warn('[SECURITY] BCRYPT_SALT_ROUNDS below 10 is not recommended');
}

module.exports = { BCRYPT_SALT_ROUNDS };
```

**Files to Modify:**
- Create `config/security.js`
- Update all bcrypt.hash calls to use centralized config
- Update `.env.example`

---

### 3.3 Token Expiration Times Review

**Severity:** MEDIUM  
**Location:** `services/tokenService.js`

**Current Configuration:**
```javascript
const ACCESS_TOKEN_TTL = '15m';   // 15 minutes
const REFRESH_TOKEN_TTL = '7d';   // 7 days
```

**Analysis:**
- 15 minutes for access token is good
- 7 days for refresh token may be too long for high-security contexts
- No sliding expiration or absolute session timeout

**Recommendation:**
```javascript
// Consider environment-based configuration
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const MAX_SESSION_AGE = process.env.MAX_SESSION_AGE || '30d';  // Absolute timeout

// Add absolute session timeout check in rotateRefreshToken
const sessionStart = decoded.sessionStart || decoded.iat;
const maxAge = ms(MAX_SESSION_AGE) / 1000;
if (Date.now() / 1000 - sessionStart > maxAge) {
    throw new Error('Session expired. Please log in again.');
}
```

**Files to Modify:**
- `services/tokenService.js`
- `.env.example`

---

### 3.4 Audit Logging Gaps

**Severity:** MEDIUM  
**Location:** `routes/auth.js`, `middleware/auth*.js`

**Current Coverage:**
- Login success/failure: YES
- Logout: YES
- Refresh token: Partial (failures only)
- Password changes: NOT CHECKED
- Account status changes: NOT CHECKED

**Remediation:**
Ensure all security-relevant events are logged:
```javascript
// Add to password change endpoints
void recordAuditEvent({
    req,
    action: 'password_changed',
    actorRole: role,
    actorId: id,
    targetType: role,
    targetId: id,
    metadata: { method: 'self_service' }
});

// Add to account deactivation
void recordAuditEvent({
    req,
    action: 'account_deactivated',
    actorRole: 'admin',
    actorId: adminId,
    targetType: 'supplier',
    targetId: supplierId
});
```

**Files to Modify:**
- `routes/admin.js`
- `routes/suppliers.js`
- Any endpoint that modifies user/account state

---

## 4. Low Priority Issues (P3)

### 4.1 Console.log in Production Code

**Severity:** LOW  
**Location:** Multiple files

**Examples:**
```javascript
// routes/auth.js
console.log(`[DEV BYPASS] Allowing 123456 for ${phone_number}`);
console.log(`[DEV OTP] OTP for ${phone_number}: ${code}`);

// server.js
console.log('✅ Applying SPECIALIZED routes...');
console.log('[Middleware] Path:', req.path, ...);
```

**Remediation:**
Replace with structured logger:
```javascript
const logger = require('../services/logger');

// Instead of console.log
logger.debug('Applying specialized routes', { routes: ['auth', 'admin'] });
logger.warn('Dev OTP bypass used', { phone: hashIdentifier(phone_number) });
```

**Files to Modify:**
- `routes/auth.js`
- `server.js`
- Global search for `console.log` and replace with logger

---

### 4.2 Error Message Information Leakage

**Severity:** LOW  
**Location:** Various middleware files

**Current Code:**
```javascript
// authAdmin.js
return res.status(500).json({ message: 'JWT admin secret not configured.' });
```

**Risk:**
- Reveals internal configuration details to potential attackers

**Remediation:**
```javascript
// Production-safe error messages
if (!secret) {
    logger.error('JWT admin secret not configured');
    return res.status(500).json({ message: 'Internal server error.' });
}
```

**Files to Modify:**
- `middleware/authAdmin.js`
- `middleware/authSupplier.js`
- `middleware/authDeliveryAgent.js`
- `middleware/authMiddleware.js`

---

### 4.3 Timing Attack on User Enumeration (Minor)

**Severity:** LOW  
**Location:** `routes/auth.js`

**Current Code (Good Practice):**
```javascript
// Already implements timing attack prevention
if (supplierResult.rows.length === 0) {
    await bcrypt.compare(password, '$2b$10$NQ4q9...'); // dummy hash
    return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Note:** This is actually well-implemented! The dummy hash comparison prevents timing attacks.

---

## 5. Security Strengths (What's Done Well)

### 5.1 Proper Implementations

| Feature | Location | Assessment |
|---------|----------|------------|
| Timing Attack Prevention | `routes/auth.js` | Dummy bcrypt comparison on user not found |
| Role-Specific JWT Secrets | `services/tokenService.js` | Separate secrets per role reduces blast radius |
| Refresh Token Rotation | `services/tokenService.js` | Tokens are rotated on each refresh |
| Refresh Token Reuse Detection | `services/tokenService.js` | Detects and revokes all tokens on reuse |
| Cookie Security | `routes/auth.js` | httpOnly, secure, sameSite properly set |
| Rate Limiting | `routes/auth.js` | Multiple limiters for OTP, login, refresh |
| Account Status Enforcement | `middleware/authSupplier.js`, `authDeliveryAgent.js` | Checks is_active before allowing access |
| OTP Attempt Limiting | `routes/auth.js` | Max 5 attempts before lockout |
| Secure User ID Generation | `routes/auth.js` | Cryptographically random IDs |
| Environment Validation | `config/env.js` | Checks for required secrets at startup |
| Helmet Security Headers | `server.js` | CSP, HSTS, X-Frame-Options configured |
| Input Sanitization | `server.js` | XSS protection, HPP prevention |
| Audit Logging | `services/auditService.js` | Login events are tracked |

### 5.2 Good Security Patterns

1. **Separate secrets per role** - Compromise of one secret doesn't affect other roles
2. **Refresh token database storage** - Enables immediate revocation
3. **IP/UA binding option** - Can detect token theft
4. **Production-aware configuration** - Different settings for dev/prod

---

## 6. Implementation Checklist

### Phase 1: Critical Fixes (Week 1)

- [ ] **1.1** Remove or secure OTP bypass code
  - [ ] Add explicit `DEV_OTP_BYPASS` env var requirement
  - [ ] Block bypass when `NODE_ENV=production` OR not set
  - [ ] Add startup warning if bypass is enabled
  
- [ ] **1.2** Add JWT secret strength validation
  - [ ] Minimum 32 characters in production
  - [ ] Warn on weak patterns
  - [ ] Fail startup if secrets are weak in production

- [ ] **1.3** Add admin account status enforcement
  - [ ] Make authAdmin async
  - [ ] Add is_active check (or existence check)
  - [ ] Add database migration if needed

### Phase 2: High Priority (Week 2)

- [ ] **2.1** Create shared token validation utility
- [ ] **2.2** Wrap refresh token rotation in transaction
- [ ] **2.3** Evaluate CSRF token implementation
- [ ] **2.4** Add alerting for Redis unavailability

### Phase 3: Medium Priority (Week 3-4)

- [ ] **3.1** Apply password policy to all password operations
- [ ] **3.2** Centralize bcrypt configuration
- [ ] **3.3** Make token TTLs configurable
- [ ] **3.4** Expand audit logging coverage

### Phase 4: Low Priority (Ongoing)

- [ ] **4.1** Replace console.log with structured logger
- [ ] **4.2** Sanitize error messages for production
- [ ] Review and update security documentation

---

## 7. Testing Requirements

### 7.1 Unit Tests Needed

```javascript
// test/security/otpBypass.test.js
describe('OTP Bypass Security', () => {
  it('should NOT allow 123456 in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: '+123456789', code: '123456' });
    expect(res.status).toBe(400);
  });
  
  it('should NOT allow 123456 when NODE_ENV is unset', async () => {
    delete process.env.NODE_ENV;
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: '+123456789', code: '123456' });
    expect(res.status).toBe(400);
  });
});

// test/security/jwtSecrets.test.js
describe('JWT Secret Validation', () => {
  it('should reject short secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    expect(() => require('../config/env')).toThrow();
  });
});

// test/security/adminStatus.test.js
describe('Admin Account Status', () => {
  it('should reject tokens for deleted admins', async () => {
    // Create admin, get token, delete admin, try to use token
  });
});
```

### 7.2 Integration Tests Needed

- [ ] Refresh token rotation under concurrent requests
- [ ] Rate limiter effectiveness with Redis down
- [ ] Token revocation propagation
- [ ] Password policy enforcement on all endpoints

### 7.3 Penetration Testing Checklist

- [ ] OTP bypass attempts in various NODE_ENV states
- [ ] JWT secret brute force (verify complexity)
- [ ] Token reuse attack simulation
- [ ] Session fixation attempts
- [ ] CSRF on state-changing endpoints
- [ ] Rate limit bypass via distributed requests

---

## Appendix: File Reference

| File | Critical Issues | Lines to Review |
|------|-----------------|-----------------|
| `routes/auth.js` | 1.1 | 489-493, 577-579 |
| `config/env.js` | 1.2 | 36-53 |
| `middleware/authAdmin.js` | 1.3 | Entire file |
| `middleware/authMiddleware.js` | 2.1 | 17-31 |
| `services/tokenService.js` | 2.2 | 121-158 |
| `routes/admin.js` | 3.1 | 92 |
| `routes/suppliers.js` | 3.1 | 726 |
| `services/passwordPolicy.js` | 3.1 | Verify usage |

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Review Status:** Initial Analysis Complete  
**Next Review:** After Phase 1 Implementation
