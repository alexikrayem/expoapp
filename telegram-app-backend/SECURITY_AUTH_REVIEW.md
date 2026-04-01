# Security & Authentication Code Review - Comprehensive Analysis v2.0

## Executive Summary

This document provides an exhaustive security and authentication analysis of the `telegram-app-backend` service, conducted using industry-standard frameworks (OWASP Top 10, CWE, NIST), modern SAST patterns, and best practices from authentication implementation playbooks. The review identifies critical vulnerabilities, security gaps, and provides prioritized remediation recommendations with code-level guidance.

**Overall Risk Assessment: MEDIUM-HIGH**

The codebase demonstrates several commendable security practices including:
- Timing-attack prevention via dummy bcrypt comparisons
- Role-specific JWT secrets reducing blast radius
- Refresh token rotation with reuse detection
- Comprehensive audit logging infrastructure
- Account status enforcement for suppliers/delivery agents

However, critical issues remain that must be addressed before production deployment.

---

## Table of Contents

1. [Critical Issues (P0 - Must Fix Before Production)](#1-critical-issues-p0---must-fix-before-production)
2. [High Priority Issues (P1 - Fix Within 1 Week)](#2-high-priority-issues-p1---fix-within-1-week)
3. [Medium Priority Issues (P2 - Fix Within 2 Weeks)](#3-medium-priority-issues-p2---fix-within-2-weeks)
4. [Low Priority Issues (P3 - Ongoing Improvements)](#4-low-priority-issues-p3---ongoing-improvements)
5. [Security Strengths Analysis](#5-security-strengths-analysis)
6. [OWASP Top 10 Compliance Matrix](#6-owasp-top-10-compliance-matrix)
7. [GDPR & Data Protection Considerations](#7-gdpr--data-protection-considerations)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Testing Requirements](#9-testing-requirements)
10. [Appendix: File Reference](#10-appendix-file-reference)

---

## 1. Critical Issues (P0 - Must Fix Before Production)

### 1.1 OTP Bypass Code Vulnerability (CWE-798, CWE-287)

**Severity:** CRITICAL  
**CVSS Score:** 9.8 (Critical)  
**OWASP Category:** A07:2021 - Identification and Authentication Failures  
**Location:** `routes/auth.js` (lines 489-493, 577-579)

**Current Vulnerable Code:**
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
| Scenario | Impact |
|----------|--------|
| `NODE_ENV` unset in production | Full account takeover capability |
| `NODE_ENV` set to 'staging' | Bypass active in staging environment |
| Two endpoints with same vulnerability | Doubled attack surface |
| Hardcoded bypass code | Predictable attack vector |

**Attack Scenario:**
1. Attacker identifies OTP bypass exists
2. Sets target phone number to any victim
3. Submits OTP verification with code `123456`
4. Gains full access to victim account
5. Can access orders, personal data, and financial information

**Remediation (REQUIRED):**
```javascript
// Option 1: Defense-in-depth approach (RECOMMENDED)
const isProduction = process.env.NODE_ENV === 'production';
const devBypassExplicitlyEnabled = process.env.DEV_OTP_BYPASS === 'true';
const otpBypassAllowed = !isProduction && devBypassExplicitlyEnabled;

// Add startup warning
if (otpBypassAllowed) {
    console.warn('[SECURITY WARNING] OTP bypass is enabled. This MUST be disabled in production.');
}

// In verify-otp and register-phone:
let isDevBypass = false;
if (otpBypassAllowed && code === '123456') {
    console.warn(`[DEV BYPASS] Allowing bypass for ${phone_number} - REMOVE BEFORE PRODUCTION`);
    isDevBypass = true;
}

// Option 2: Remove entirely (SAFEST)
// Delete all references to '123456' bypass code and use test fixtures instead
```

**Files to Modify:**
- `routes/auth.js` - Lines 489-493, 577-579
- `config/env.js` - Add validation to fail if `DEV_OTP_BYPASS=true` in production

---

### 1.2 JWT Secret Length/Entropy Validation Missing (CWE-326)

**Severity:** CRITICAL  
**CVSS Score:** 8.1 (High)  
**OWASP Category:** A02:2021 - Cryptographic Failures  
**Location:** `config/env.js`, `services/tokenService.js`

**Current Code Analysis:**
```javascript
// env.js - Only checks existence, not strength
ensureAny(
  ['JWT_SECRET', 'JWT_CUSTOMER_SECRET', ...],
  'JWT access secret',
  { requiredInProd: true }
);
// NO LENGTH OR ENTROPY VALIDATION
```

**Risk Analysis:**
- Weak secrets (e.g., `"secret123"`, `"password"`) pass current validation
- Short secrets vulnerable to brute-force attacks
- HS256 requires minimum 256 bits (32 bytes) for security per RFC 7518
- No protection against common weak patterns

**Remediation (REQUIRED):**
```javascript
// Add to config/env.js
const WEAK_SECRET_PATTERNS = [
    'secret', 'password', 'jwt', 'token', 'key', '123456',
    'admin', 'test', 'dev', 'default'
];
const MIN_SECRET_LENGTH = 32; // 256 bits minimum for HS256

const validateSecretStrength = (name, minLength = MIN_SECRET_LENGTH) => {
    const secret = process.env[name];
    if (!secret) return; // Existence checked elsewhere

    // Length check
    if (secret.length < minLength) {
        const message = `[SECURITY] ${name} must be at least ${minLength} characters (currently ${secret.length})`;
        if (isProd) throw new Error(message);
        console.error(message);
    }

    // Weak pattern check
    const lowerSecret = secret.toLowerCase();
    const foundWeakPattern = WEAK_SECRET_PATTERNS.find(p => lowerSecret.includes(p));
    if (foundWeakPattern) {
        const message = `[SECURITY] ${name} contains weak pattern "${foundWeakPattern}". Use cryptographically random string.`;
        if (isProd) throw new Error(message);
        console.warn(message);
    }

    // Entropy check (basic - check for repeated characters)
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < minLength / 2) {
        const message = `[SECURITY] ${name} has low entropy. Use a more random string.`;
        console.warn(message);
    }
};

// Validate all JWT secrets
const JWT_SECRET_NAMES = [
    'JWT_SECRET', 'JWT_CUSTOMER_SECRET', 'JWT_ADMIN_SECRET',
    'JWT_SUPPLIER_SECRET', 'JWT_DELIVERY_SECRET',
    'JWT_REFRESH_SECRET', 'JWT_CUSTOMER_REFRESH_SECRET',
    'JWT_ADMIN_REFRESH_SECRET', 'JWT_SUPPLIER_REFRESH_SECRET',
    'JWT_DELIVERY_REFRESH_SECRET'
];
JWT_SECRET_NAMES.forEach(name => {
    if (isSet(process.env[name])) {
        validateSecretStrength(name);
    }
});
```

**Files to Modify:**
- `config/env.js`
- `.env.example` - Document minimum requirements

---

### 1.3 Admin Account Status Enforcement Missing (CWE-613, CWE-285)

**Severity:** CRITICAL  
**CVSS Score:** 8.8 (High)  
**OWASP Category:** A01:2021 - Broken Access Control  
**Location:** `middleware/authAdmin.js`

**Current Code:**
```javascript
// authAdmin.js - NO account status check
const decoded = verifyJwt(token, secret);
req.admin = decoded;
if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Access denied.' });
}
next(); // Proceeds WITHOUT checking if admin is active/exists
```

**Comparison - authSupplier.js HAS status enforcement:**
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
| Scenario | Impact |
|----------|--------|
| Fired admin | Retains full API access until token expires (15 min) |
| Compromised admin account | Cannot immediately revoke access |
| Admin deleted from database | Token still valid |
| Inconsistent security model | Admins less protected than suppliers |

**Remediation (REQUIRED):**
```javascript
// middleware/authAdmin.js - Make async and add status check
const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const authAdmin = async (req, res, next) => {  // Changed to async
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    try {
        const secret = process.env.JWT_ADMIN_SECRET;
        if (!secret) {
            console.error('[SECURITY] JWT_ADMIN_SECRET not configured');
            return res.status(500).json({ message: 'Internal server error.' }); // Don't leak config details
        }

        const decoded = verifyJwt(token, secret);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Access denied.' });
        }

        // ADD: Account status enforcement (consistent with authSupplier)
        const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
        if (enforceStatus) {
            const result = await db.query(
                'SELECT id, is_active FROM admins WHERE id = $1',
                [decoded.adminId]
            );
            
            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Admin account not found.' });
            }
            
            // Check is_active if column exists (add migration if needed)
            if (result.rows[0].is_active === false) {
                return res.status(403).json({ message: 'Admin account is inactive.' });
            }
        }

        req.admin = decoded;
        next();
    } catch (error) {
        console.error("Admin JWT Verification Error:", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        return res.status(500).json({ message: 'Internal server error.' }); // Don't leak details
    }
};

module.exports = authAdmin;
```

**Database Migration Required:**
```sql
-- migrations/005_admin_is_active.sql
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE admins SET is_active = true WHERE is_active IS NULL;
ALTER TABLE admins ALTER COLUMN is_active SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
```

**Files to Modify:**
- `middleware/authAdmin.js`
- Create migration for `is_active` column

---

### 1.4 OTP Codes Stored in Plain Text (CWE-312, CWE-256)

**Severity:** CRITICAL  
**CVSS Score:** 7.5 (High)  
**OWASP Category:** A02:2021 - Cryptographic Failures  
**Location:** `routes/auth.js` (lines 449-454)

**Current Code:**
```javascript
// OTP stored in plain text
const query = `
    INSERT INTO otp_verifications (phone_number, code, expires_at, attempts)
    VALUES ($1, $2, $3, 0)
    ON CONFLICT (phone_number) 
    DO UPDATE SET code = $2, expires_at = $3, attempts = 0, created_at = NOW();
`;
await db.query(query, [phone_number, code, expiresAt]); // code is plain text!
```

**Risk Analysis:**
- Database breach exposes all active OTP codes
- Attacker with DB read access can impersonate any user
- Violates principle of defense-in-depth
- OTPs are sensitive credentials requiring protection

**Remediation (REQUIRED):**
```javascript
// Hash OTP before storage
const hashOtp = (code) => 
    crypto.createHash('sha256').update(code).digest('hex');

// In send-otp:
const hashedCode = hashOtp(code);
const query = `
    INSERT INTO otp_verifications (phone_number, code_hash, expires_at, attempts)
    VALUES ($1, $2, $3, 0)
    ON CONFLICT (phone_number) 
    DO UPDATE SET code_hash = $2, expires_at = $3, attempts = 0, created_at = NOW();
`;
await db.query(query, [phone_number, hashedCode, expiresAt]);

// In verify-otp:
const hashedInputCode = hashOtp(code);
const otpQuery = 'SELECT code_hash, expires_at, attempts FROM otp_verifications WHERE phone_number = $1';
// Compare hashedInputCode with stored code_hash
if (otpRecord.code_hash !== hashedInputCode) {
    // Invalid code
}
```

**Database Migration Required:**
```sql
-- migrations/006_hash_otp_codes.sql
ALTER TABLE otp_verifications RENAME COLUMN code TO code_hash;
-- Note: Existing plain-text codes will be invalidated, which is acceptable
```

---

## 2. High Priority Issues (P1 - Fix Within 1 Week)

### 2.1 Refresh Token Rotation Race Condition (CWE-362)

**Severity:** HIGH  
**CVSS Score:** 6.8 (Medium)  
**OWASP Category:** A04:2021 - Insecure Design  
**Location:** `services/tokenService.js` (lines 89-171)

**Current Code:**
```javascript
const existing = await db.query(
    'SELECT token_hash, revoked_at, expires_at, ip, user_agent FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
);

if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.revoked_at) {
        await revokeAllForSubject(subjectId, decoded.role);
        throw new Error('Refresh token reuse detected');
    }
    // ... validation continues
}
// NO TRANSACTION - Gap between read and write
```

**Risk Analysis:**
- Race condition if two concurrent refresh requests use same token
- Both might pass validation before either marks token as used
- Results in token replication, weakening reuse detection
- No row-level locking during check-and-rotate

**Remediation (REQUIRED):**
```javascript
const rotateRefreshToken = async ({ token, ip, userAgent }) => {
    if (!token) {
        throw new Error('Refresh token required');
    }

    // ... initial validation ...

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const tokenHash = hashToken(token);
        
        // Lock row to prevent concurrent rotation
        const existing = await client.query(
            `SELECT token_hash, revoked_at, expires_at, ip, user_agent 
             FROM refresh_tokens 
             WHERE token_hash = $1 
             FOR UPDATE NOWAIT`,  // NOWAIT fails fast on contention
            [tokenHash]
        );

        if (existing.rows.length > 0) {
            const row = existing.rows[0];

            if (row.revoked_at) {
                await client.query('ROLLBACK');
                await revokeAllForSubject(subjectId, decoded.role);
                throw new Error('Refresh token reuse detected');
            }

            if (row.expires_at && new Date(row.expires_at) < new Date()) {
                await client.query('ROLLBACK');
                await revokeRefreshToken(token);
                throw new Error('Refresh token expired');
            }

            // IP/UA binding checks...
        }

        // Issue new tokens
        const accessPayload = buildAccessPayload(decoded);
        const { accessToken, refreshToken: newRefreshToken, refreshJti } = await issueTokensInTransaction({
            client, // Pass client for transaction continuity
            payload: accessPayload,
            role: decoded.role,
            ip,
            userAgent,
        });

        // Mark old token as replaced
        await client.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW(), replaced_by = $2, last_used_at = NOW()
             WHERE token_hash = $1`,
            [tokenHash, refreshJti]
        );

        await client.query('COMMIT');
        return { accessToken, refreshToken: newRefreshToken };

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '55P03') { // Lock not available
            throw new Error('Concurrent refresh detected, please retry');
        }
        throw error;
    } finally {
        client.release();
    }
};
```

---

### 2.2 Missing CSRF Protection for State-Changing Operations (CWE-352)

**Severity:** HIGH  
**CVSS Score:** 6.5 (Medium)  
**OWASP Category:** A01:2021 - Broken Access Control  
**Location:** `routes/auth.js`, `server.js`

**Current State:**
```javascript
// Cookie options rely on SameSite for CSRF protection
const buildCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',  // Lax in dev!
    // ...
});
```

**Risk Analysis:**
- `SameSite: Lax` in development allows GET-based CSRF attacks
- No explicit CSRF token mechanism for sensitive operations
- Could mask CSRF vulnerabilities that appear in production
- State-changing operations (logout, refresh) lack CSRF protection

**Remediation:**
```javascript
// Option 1: Enforce Strict SameSite always (RECOMMENDED for APIs)
sameSite: 'Strict',  // Use Strict even in development

// Option 2: Add CSRF token for sensitive operations
const csrf = require('csurf');
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    }
});

// Apply to state-changing auth endpoints
app.use('/api/auth/logout', csrfProtection);
app.use('/api/auth/refresh', csrfProtection);
// Add CSRF token endpoint for clients
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
```

---

### 2.3 Rate Limiter Degradation in Multi-Instance Deployments (CWE-770)

**Severity:** HIGH  
**CVSS Score:** 6.1 (Medium)  
**OWASP Category:** A05:2021 - Security Misconfiguration  
**Location:** `routes/auth.js` (lines 17-65)

**Current Code:**
```javascript
const buildRateLimitStore = () => {
    const redisClient = getRedisClient();
    if (!redisClient) return undefined;  // Falls back to memory store silently!
    return new RedisStore({...});
};
```

**Risk Analysis:**
- Multi-instance deployments: each instance has separate in-memory counters
- Attacker can distribute requests across instances to multiply allowed attempts
- Example: 3 instances = 3x the attack surface for OTP brute force
- No alerting when degraded mode is active

**Remediation:**
```javascript
const buildRateLimitStore = () => {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
        const isProd = process.env.NODE_ENV === 'production';
        if (isProd) {
            console.error('[SECURITY ALERT] Redis unavailable - rate limiting DEGRADED!');
            // Consider: Alert ops team, enable stricter limits
        }
        return undefined;
    }
    
    return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    });
};

// Compensate with stricter limits when Redis unavailable
const getMaxRequests = (baseLimit) => {
    const redisAvailable = Boolean(getRedisClient());
    const isProd = process.env.NODE_ENV === 'production';
    
    if (!isProd) return baseLimit * 10; // Dev gets higher limits
    
    // In production with Redis unavailable, reduce limits significantly
    // Assumes typical 3-instance deployment
    return redisAvailable ? baseLimit : Math.max(Math.floor(baseLimit / 3), 1);
};

// Apply compensated limits
const otpSendLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: getMaxRequests(5),  // Base: 5, degraded: 1
    // ...
});
```

---

### 2.4 Token Validation Payload Inconsistency (CWE-20)

**Severity:** HIGH  
**CVSS Score:** 5.9 (Medium)  
**OWASP Category:** A07:2021 - Identification and Authentication Failures  
**Location:** `middleware/auth*.js` files

**Analysis:**
Each middleware validates differently:
| Middleware | Role Check | Required Fields Check | Status Check |
|------------|------------|----------------------|--------------|
| `authMiddleware.js` | Yes (`customer`) | No | No |
| `authAdmin.js` | Yes (`admin`) | No | **NO** |
| `authSupplier.js` | Yes (`supplier`) | No | Yes |
| `authDeliveryAgent.js` | Yes (`delivery_agent`) | No | Yes |

**Remediation - Create Shared Validation Utility:**
```javascript
// services/tokenValidation.js
const ROLE_REQUIRED_FIELDS = {
    customer: ['userId'],
    admin: ['adminId', 'email'],
    supplier: ['supplierId', 'email'],
    delivery_agent: ['deliveryAgentId', 'supplierId']
};

const validateTokenPayload = (decoded, expectedRole) => {
    if (!decoded) {
        return { valid: false, error: 'Token payload is empty', code: 'EMPTY_PAYLOAD' };
    }

    if (decoded.role !== expectedRole) {
        return { 
            valid: false, 
            error: `Expected role "${expectedRole}", got "${decoded.role}"`,
            code: 'INVALID_ROLE'
        };
    }

    const requiredFields = ROLE_REQUIRED_FIELDS[expectedRole] || [];
    for (const field of requiredFields) {
        if (!decoded[field]) {
            return { 
                valid: false, 
                error: `Missing required field: ${field}`,
                code: 'MISSING_FIELD'
            };
        }
    }

    return { valid: true };
};

module.exports = { validateTokenPayload, ROLE_REQUIRED_FIELDS };
```

---

## 3. Medium Priority Issues (P2 - Fix Within 2 Weeks)

### 3.1 Password Policy Not Universally Enforced (CWE-521)

**Severity:** MEDIUM  
**Location:** `routes/admin.js`, `routes/suppliers.js`

**Analysis:**
Password policy exists in `services/passwordPolicy.js` but is not applied everywhere:

```javascript
// routes/admin.js - NO password policy validation
const passwordHash = await bcrypt.hash(password, saltRounds);

// routes/suppliers.js - NO password policy validation
const passwordHash = await bcrypt.hash(password, saltRounds);
```

**Remediation:**
```javascript
const { validatePassword } = require('../services/passwordPolicy');

// Before hashing ANY password:
const passwordErrors = validatePassword(password);
if (passwordErrors.length > 0) {
    return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordErrors,
        requirements: {
            minLength: MIN_LENGTH,
            requireUppercase: REQUIRE_COMPLEXITY,
            requireLowercase: REQUIRE_COMPLEXITY,
            requireNumber: REQUIRE_COMPLEXITY,
            requireSymbol: REQUIRE_COMPLEXITY
        }
    });
}

const passwordHash = await bcrypt.hash(password, saltRounds);
```

**Files to Update:**
- `routes/admin.js` - All password creation/change endpoints
- `routes/suppliers.js` - All password creation/change endpoints
- `routes/delivery.js` - If password changes exist

---

### 3.2 Bcrypt Salt Rounds Inconsistency (CWE-328)

**Severity:** MEDIUM  
**Location:** Multiple files

**Current State:**
| File | Salt Rounds | Source |
|------|-------------|--------|
| `createAdminHash.js` | 10 | Hardcoded |
| `createSupplierHash.js` | 10 | Hardcoded |
| `hashPassword.js` | 10 | Hardcoded |
| `routes/auth.js` | ? | Unknown |
| `routes/admin.js` | ? | Unknown |

**OWASP Recommendation:** Minimum 12 rounds (2024 standards)

**Remediation:**
```javascript
// config/security.js (NEW FILE)
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

if (BCRYPT_SALT_ROUNDS < 10) {
    console.error('[SECURITY] BCRYPT_SALT_ROUNDS below 10 is insecure');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('BCRYPT_SALT_ROUNDS must be at least 10 in production');
    }
}

if (BCRYPT_SALT_ROUNDS < 12) {
    console.warn('[SECURITY] OWASP recommends minimum 12 rounds for bcrypt');
}

module.exports = { BCRYPT_SALT_ROUNDS };

// Usage in all files:
const { BCRYPT_SALT_ROUNDS } = require('../config/security');
const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
```

---

### 3.3 Token Expiration Configuration Not Flexible (CWE-613)

**Severity:** MEDIUM  
**Location:** `services/tokenService.js`

**Current Code:**
```javascript
const ACCESS_TOKEN_TTL = '15m';   // Hardcoded
const REFRESH_TOKEN_TTL = '7d';   // Hardcoded
```

**Issues:**
- No environment-based configuration
- 7-day refresh token may be too long for high-security contexts
- No absolute session timeout (user can refresh indefinitely)

**Remediation:**
```javascript
const ms = require('ms');

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const MAX_SESSION_AGE = process.env.MAX_SESSION_AGE || '30d'; // Absolute timeout

// Validate at startup
const accessTtlMs = ms(ACCESS_TOKEN_TTL);
const refreshTtlMs = ms(REFRESH_TOKEN_TTL);
const maxSessionMs = ms(MAX_SESSION_AGE);

if (accessTtlMs > ms('1h')) {
    console.warn('[SECURITY] ACCESS_TOKEN_TTL > 1 hour is not recommended');
}
if (refreshTtlMs > ms('14d')) {
    console.warn('[SECURITY] REFRESH_TOKEN_TTL > 14 days increases risk');
}

// In rotateRefreshToken - add absolute session check:
const sessionStart = decoded.sessionStart || decoded.iat;
const sessionAge = Date.now() / 1000 - sessionStart;
if (sessionAge > maxSessionMs / 1000) {
    throw new Error('Session expired. Please log in again.');
}

// In issueTokens - add sessionStart to payload:
const refreshPayload = { 
    ...payload, 
    type: 'refresh', 
    jti: refreshJti,
    sessionStart: Math.floor(Date.now() / 1000) // Track session origin
};
```

---

### 3.4 Audit Logging Gaps (CWE-778)

**Severity:** MEDIUM  
**Location:** Various route files

**Current Coverage Analysis:**
| Event Type | Logged | Location |
|------------|--------|----------|
| Login success | Yes | `routes/auth.js` |
| Login failure | Yes | `routes/auth.js` |
| Logout | Yes | `routes/auth.js` |
| Refresh token | Partial (failures only) | `routes/auth.js` |
| Password change | **NO** | Various |
| Account deactivation | **NO** | `routes/admin.js` |
| Permission change | **NO** | `routes/admin.js` |
| Data export/access | **NO** | Various |
| Sensitive data view | **NO** | Various |

**GDPR Requirement:** Article 30 requires maintaining records of processing activities.

**Remediation - Add to Missing Locations:**
```javascript
// For password changes:
void recordAuditEvent({
    req,
    action: 'password_changed',
    actorRole: role,
    actorId: id,
    targetType: role,
    targetId: id,
    metadata: { method: 'self_service' }
});

// For account status changes:
void recordAuditEvent({
    req,
    action: 'account_status_changed',
    actorRole: 'admin',
    actorId: adminId,
    targetType: 'supplier',
    targetId: supplierId,
    metadata: { newStatus: 'inactive', reason: reason }
});

// For data exports (GDPR DSAR):
void recordAuditEvent({
    req,
    action: 'data_export_requested',
    actorRole: 'customer',
    actorId: userId,
    targetType: 'customer',
    targetId: userId,
    metadata: { exportType: 'full_profile' }
});
```

---

### 3.5 Error Message Information Leakage (CWE-209)

**Severity:** MEDIUM  
**Location:** Multiple middleware files

**Current Vulnerable Code:**
```javascript
// authAdmin.js
if (!secret) {
    return res.status(500).json({ message: 'JWT admin secret not configured.' }); // Leaks config!
}

// Various places
return res.status(500).json({ message: 'Internal server error during token verification.' });
```

**Risk:**
- Reveals internal configuration state to attackers
- Helps attackers understand system architecture
- May assist in targeted attacks

**Remediation:**
```javascript
// Production-safe error handling
if (!secret) {
    console.error('[SECURITY] JWT_ADMIN_SECRET not configured');
    return res.status(500).json({ message: 'Internal server error.' });
}

// Generic error response utility
const sendSecureError = (res, statusCode, internalMessage, publicMessage = 'An error occurred.') => {
    console.error(`[ERROR] ${internalMessage}`);
    const message = process.env.NODE_ENV === 'production' 
        ? publicMessage 
        : internalMessage;
    return res.status(statusCode).json({ message });
};
```

---

## 4. Low Priority Issues (P3 - Ongoing Improvements)

### 4.1 Console.log Statements in Production Code

**Location:** Multiple files  
**Recommendation:** Replace with structured logger

```javascript
// Current
console.log(`[DEV BYPASS] Allowing 123456 for ${phone_number}`);

// Recommended
const logger = require('../services/logger');
logger.warn('OTP bypass used', { 
    phone: hashIdentifier(phone_number),
    environment: process.env.NODE_ENV 
});
```

### 4.2 IP Address Handling for Proxy Environments

**Location:** `server.js`

**Current:**
```javascript
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
```

**Recommendation:** Make proxy trust configurable:
```javascript
const trustProxy = process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? 1 : false);
app.set('trust proxy', trustProxy);
```

### 4.3 Missing Request ID in Some Error Responses

**Recommendation:** Ensure all error responses include `requestId` for traceability.

### 4.4 Deprecated `xss-clean` Package

**Location:** `server.js`  
**Note:** `xss-clean` is deprecated. Consider using `express-validator` sanitization or manual `xss` package.

---

## 5. Security Strengths Analysis

### Excellent Implementations

| Feature | Location | Assessment | Notes |
|---------|----------|------------|-------|
| Timing Attack Prevention | `routes/auth.js` | Excellent | Dummy bcrypt comparison on user not found |
| Role-Specific JWT Secrets | `services/tokenService.js` | Excellent | Separate secrets reduce blast radius |
| Refresh Token Rotation | `services/tokenService.js` | Good | Tokens rotated on each refresh |
| Refresh Token Reuse Detection | `services/tokenService.js` | Good | Detects and revokes all tokens on reuse |
| Cookie Security | `routes/auth.js` | Good | httpOnly, secure, sameSite properly set |
| Rate Limiting | `routes/auth.js` | Good | Multiple limiters for OTP, login, refresh |
| Account Status Enforcement | Supplier/Delivery middleware | Good | Checks is_active before access |
| OTP Attempt Limiting | `routes/auth.js` | Good | Max 5 attempts before lockout |
| Secure User ID Generation | `routes/auth.js` | Good | Cryptographically random 48-bit IDs |
| Environment Validation | `config/env.js` | Good | Checks required secrets at startup |
| Helmet Security Headers | `server.js` | Good | CSP, HSTS, X-Frame-Options configured |
| Input Sanitization | `server.js` | Good | XSS protection, HPP prevention |
| Audit Logging | `services/auditService.js` | Good | Login events tracked |
| Request ID Tracing | `middleware/requestId.js` | Good | Enables log correlation |
| Body Size Limits | `server.js` | Good | Different limits for admin vs public |

### Security Design Patterns Followed

1. **Defense in Depth** - Multiple security layers (rate limiting + OTP + JWT)
2. **Least Privilege** - Role-specific secrets and permissions
3. **Fail Secure** - Token expiration, automatic revocation
4. **Separation of Concerns** - Auth middleware per role
5. **Audit Trail** - Security events logged

---

## 6. OWASP Top 10 Compliance Matrix

| OWASP Category | Status | Issues Found | Remediation Priority |
|----------------|--------|--------------|---------------------|
| A01:2021 Broken Access Control | Partial | Admin status not enforced | P0 |
| A02:2021 Cryptographic Failures | Partial | OTP plain text, weak secret validation | P0 |
| A03:2021 Injection | Good | Parameterized queries used | - |
| A04:2021 Insecure Design | Partial | Race conditions, missing CSRF | P1 |
| A05:2021 Security Misconfiguration | Partial | Rate limit degradation | P1 |
| A06:2021 Vulnerable Components | Unknown | Needs dependency audit | P2 |
| A07:2021 Auth Failures | Critical | OTP bypass, password policy gaps | P0 |
| A08:2021 Data Integrity Failures | Good | JWT signatures verified | - |
| A09:2021 Security Logging Failures | Partial | Audit gaps | P2 |
| A10:2021 SSRF | Unknown | Needs review of external calls | P3 |

---

## 7. GDPR & Data Protection Considerations

### Current Compliance Gaps

| GDPR Requirement | Status | Notes |
|------------------|--------|-------|
| Art. 25 - Data Protection by Design | Partial | Good security, needs data minimization review |
| Art. 30 - Records of Processing | Partial | Audit logging exists but gaps |
| Art. 32 - Security of Processing | Partial | Critical issues need fixing |
| Art. 33 - Breach Notification | Unknown | No breach detection/notification system |
| Art. 17 - Right to Erasure | Unknown | No data deletion endpoints found |
| Art. 20 - Data Portability | Unknown | No export functionality found |

### Recommendations for GDPR Compliance

1. **Implement Data Subject Request Handling**
   - Add `/api/user/export` endpoint for data portability
   - Add `/api/user/delete` endpoint for erasure requests
   - Log all DSAR requests in audit trail

2. **Add Consent Management**
   - Track user consent for processing activities
   - Allow consent withdrawal

3. **Data Retention Policies**
   - Define retention periods for each data category
   - Implement automated data cleanup jobs

---

## 8. Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1 - DO FIRST)

| Task | Owner | Status | Estimated Effort |
|------|-------|--------|-----------------|
| 1.1 Fix OTP bypass vulnerability | Backend | [ ] | 2 hours |
| 1.2 Add JWT secret validation | Backend | [ ] | 2 hours |
| 1.3 Add admin account status check | Backend | [ ] | 3 hours |
| 1.4 Hash OTP codes before storage | Backend | [ ] | 2 hours |
| Database migration for admin is_active | DBA | [ ] | 1 hour |
| Database migration for OTP hash | DBA | [ ] | 1 hour |

### Phase 2: High Priority Hardening (Week 2)

| Task | Owner | Status | Estimated Effort |
|------|-------|--------|-----------------|
| 2.1 Add transaction to token rotation | Backend | [ ] | 4 hours |
| 2.2 Evaluate/implement CSRF protection | Backend | [ ] | 3 hours |
| 2.3 Add Redis unavailability handling | Backend | [ ] | 2 hours |
| 2.4 Create shared token validation | Backend | [ ] | 3 hours |

### Phase 3: Medium Priority (Week 3-4)

| Task | Owner | Status | Estimated Effort |
|------|-------|--------|-----------------|
| 3.1 Enforce password policy everywhere | Backend | [ ] | 2 hours |
| 3.2 Centralize bcrypt configuration | Backend | [ ] | 1 hour |
| 3.3 Make token TTLs configurable | Backend | [ ] | 2 hours |
| 3.4 Expand audit logging | Backend | [ ] | 4 hours |
| 3.5 Sanitize error messages | Backend | [ ] | 2 hours |

### Phase 4: Ongoing Improvements

| Task | Owner | Status | Estimated Effort |
|------|-------|--------|-----------------|
| 4.1 Replace console.log with logger | Backend | [ ] | 3 hours |
| 4.2 Add GDPR compliance features | Backend | [ ] | 8 hours |
| 4.3 Security testing automation | QA | [ ] | 8 hours |
| 4.4 Dependency security audit | DevOps | [ ] | 4 hours |

---

## 9. Testing Requirements

### 9.1 Unit Tests Required

```javascript
// test/security/otpBypass.test.js
describe('OTP Bypass Security', () => {
    it('should NOT allow 123456 in production', async () => {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
            .post('/api/auth/verify-otp')
            .send({ phone_number: '+123456789', code: '123456' });
        expect(res.status).not.toBe(200);
    });

    it('should NOT allow 123456 when NODE_ENV is unset', async () => {
        delete process.env.NODE_ENV;
        const res = await request(app)
            .post('/api/auth/verify-otp')
            .send({ phone_number: '+123456789', code: '123456' });
        expect(res.status).not.toBe(200);
    });

    it('should require DEV_OTP_BYPASS=true for bypass', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.DEV_OTP_BYPASS;
        const res = await request(app)
            .post('/api/auth/verify-otp')
            .send({ phone_number: '+123456789', code: '123456' });
        expect(res.status).not.toBe(200);
    });
});

// test/security/jwtSecrets.test.js
describe('JWT Secret Validation', () => {
    it('should reject short secrets in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'short';
        expect(() => require('../config/env')).toThrow();
    });

    it('should warn on weak patterns', () => {
        const consoleSpy = jest.spyOn(console, 'warn');
        process.env.JWT_SECRET = 'mysecretpassword123456789012345678901234';
        require('../config/env');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('weak pattern')
        );
    });
});

// test/security/adminStatus.test.js
describe('Admin Account Status', () => {
    it('should reject tokens for inactive admins', async () => {
        const admin = await createTestAdmin({ is_active: false });
        const token = generateTestToken(admin);
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('should reject tokens for deleted admins', async () => {
        const admin = await createTestAdmin();
        const token = generateTestToken(admin);
        await deleteAdmin(admin.id);
        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });
});
```

### 9.2 Integration Tests Required

- [ ] Refresh token rotation under concurrent requests (race condition)
- [ ] Rate limiter effectiveness with Redis unavailable
- [ ] Token revocation propagation across services
- [ ] Password policy enforcement on all password endpoints
- [ ] OTP hash verification flow
- [ ] Admin account deactivation and immediate token invalidation

### 9.3 Security/Penetration Testing Checklist

- [ ] OTP bypass attempts in various NODE_ENV states
- [ ] JWT secret brute force attempt (verify complexity prevents)
- [ ] Token reuse attack simulation
- [ ] Session fixation attempts
- [ ] CSRF on all state-changing endpoints
- [ ] Rate limit bypass via distributed requests
- [ ] SQL injection on all user inputs
- [ ] XSS payload injection attempts
- [ ] Authorization boundary testing (customer accessing admin routes)
- [ ] Token expiration boundary testing

---

## 10. Appendix: File Reference

| File | Critical Issues | Priority | Lines to Review |
|------|-----------------|----------|-----------------|
| `routes/auth.js` | 1.1, 1.4 | P0 | 489-493, 577-579, 449-456 |
| `config/env.js` | 1.2 | P0 | Add secret validation |
| `middleware/authAdmin.js` | 1.3 | P0 | Entire file - add async + status check |
| `services/tokenService.js` | 2.1 | P1 | 89-171 (add transaction) |
| `server.js` | 2.2 | P1 | Cookie options, CSRF |
| `routes/admin.js` | 3.1 | P2 | Password endpoints |
| `routes/suppliers.js` | 3.1 | P2 | Password endpoints |
| `services/passwordPolicy.js` | - | - | Verify usage everywhere |
| `middleware/authSupplier.js` | - | Reference | Good pattern to follow |
| `middleware/authDeliveryAgent.js` | - | Reference | Good pattern to follow |
| `services/auditService.js` | 3.4 | P2 | Expand coverage |

---

## Document Information

| Field | Value |
|-------|-------|
| **Document Version** | 2.0 |
| **Review Date** | March 31, 2026 |
| **Review Framework** | OWASP Top 10 2021, CWE, NIST CSF |
| **Skills Applied** | code-reviewer, backend-security-coder, auth-implementation-patterns, sast-configuration |
| **Review Status** | Comprehensive Analysis Complete |
| **Next Review** | After Phase 1 Implementation |
| **Reviewer** | v0 Security Analysis |

---

## Quick Reference: Most Critical Actions

1. **IMMEDIATELY** fix OTP bypass (Issue 1.1) - Account takeover risk
2. **IMMEDIATELY** add JWT secret validation (Issue 1.2) - Token forgery risk
3. **IMMEDIATELY** add admin status check (Issue 1.3) - Privilege persistence risk
4. **IMMEDIATELY** hash OTP codes (Issue 1.4) - Data breach amplification risk
5. **WITHIN 1 WEEK** add transaction to token rotation (Issue 2.1) - Race condition risk

---

*End of Security & Authentication Code Review Document*
