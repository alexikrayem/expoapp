# Authentication and Authorization Security Review

Date: 2026-04-04  
Reviewer: Codex (security-focused code review)  
Scope: Backend authentication and authorization only (credentials, OTP, JWT/cookies, role checks, request user-context decoration, DB defense-in-depth)

## Executive Summary

The backend has strong foundations (role-specific middleware, refresh token rotation, account-status checks for supplier and delivery roles, and good use of parameterized SQL), but there are several high-impact gaps:

1. Refresh/access token type confusion can let long-lived refresh tokens act as access tokens in common configurations.
2. OTP development bypass (`123456`) is fail-open when `NODE_ENV` is not strictly `production`.
3. Phone-number identity is not protected by a DB uniqueness constraint, enabling account collisions.
4. The code assumes app-layer authorization, but DB-layer RLS/policies are not present in this repo.

These should be fixed in phased order: Critical first (token type and OTP bypass), then DB identity hardening and defense-in-depth.

## Findings

### AUTH-001 [CRITICAL] Refresh token can be accepted as access token

Impact: If refresh/access secrets are the same (or configured to overlap), refresh tokens (7d) can be used directly against protected APIs, bypassing intended short-lived access-token limits (15m).

Evidence:
- `services/tokenService.js` issues refresh token with `type: 'refresh'` but allows refresh secret fallback to access secret.
- Role middlewares validate role but do not enforce token `type === 'access'`.

Code references:
- `services/tokenService.js:24-27`
- `services/tokenService.js:52-53`
- `middleware/authMiddleware.js:21-26`
- `middleware/authAdmin.js:23-31`
- `middleware/authSupplier.js:18-21`
- `middleware/authDeliveryAgent.js:18-21`
- `middleware/authUploader.js:30-38`

Recommended fix:
- Enforce `decoded.type !== 'refresh'` rejection in all access middlewares.
- Use separate, mandatory access and refresh secrets per role in production.
- Add tests asserting refresh tokens are rejected on protected resource endpoints.

Phase: Phase 1

---

### AUTH-002 [CRITICAL] OTP bypass code `123456` is enabled whenever environment is not production

Impact: If deployment does not set `NODE_ENV=production` exactly, authentication can be bypassed with a known OTP (`123456`).

Evidence:
- OTP bypass branch in verify and registration checks.

Code references:
- `routes/auth.js:494-497`
- `routes/auth.js:581-584`
- `.env.example:17`

Recommended fix:
- Remove hardcoded bypass entirely, or gate it behind explicit signed debug flag unavailable in production builds.
- Fail startup when `NODE_ENV` is missing/invalid in non-local deployments.

Phase: Phase 1

---

### AUTH-003 [HIGH] Phone identity is not uniquely enforced at DB layer

Impact: Concurrent registration or data inconsistency can create multiple `user_profiles` rows for one phone number, causing account ambiguity and possible cross-account access confusion during OTP login.

Evidence:
- Phone duplicate check is app-level and non-atomic.
- OTP login fetches by phone and consumes first row.
- No unique index on `user_profiles.phone_number`.

Code references:
- `routes/auth.js:527-533`
- `routes/auth.js:596-600`
- `routes/auth.js:605-617`
- `migrations/001_initial_schema.sql:254-282`

Recommended fix:
- Add unique index/constraint on normalized phone.
- Normalize phone format before storage and lookup.
- Wrap registration in transaction with conflict-safe insert.

Phase: Phase 2

---

### AUTH-004 [HIGH] DB-layer authorization (RLS/policies) is not present in repository migrations

Impact: Authorization currently relies almost entirely on route middleware and query discipline. A missed middleware or future route mistake can become a full data exposure because no DB-side policy boundary is visible here.

Evidence:
- Application uses direct `pg` connection for all business queries.
- No `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` statements found in migrations.
- Supabase client is initialized with service-role key for storage operations.

Code references:
- `config/db.js:25-27`
- `config/supabase.js:16-21`
- `migrations/001_initial_schema.sql`
- `migrations/002_security_audit.sql`
- `migrations/003_integrity_and_idempotency.sql`

Recommended fix:
- Document and enforce DB authorization strategy explicitly.
- If RLS is required by architecture, add policies and least-privilege DB role usage.
- Add integration tests that fail when cross-tenant reads/writes are attempted.

Phase: Phase 2

---

### AUTH-005 [MEDIUM] OTP codes are stored and compared in plaintext

Impact: Any DB read exposure reveals active OTPs in real time until expiry.

Evidence:
- OTP `code` stored directly and compared directly.

Code references:
- `migrations/001_initial_schema.sql:166-173`
- `routes/auth.js:455-461`
- `routes/auth.js:519-523`

Recommended fix:
- Store only hashed OTP values (HMAC or salted hash).
- Compare via hash on verification.
- Keep short expiry and attempt limits.

Phase: Phase 2

---

### AUTH-006 [MEDIUM] Cookie-backed refresh/logout flows lack explicit CSRF token/origin guard

Impact: SameSite cookie settings reduce risk, but there is no explicit anti-CSRF token or origin/custom-header check for state-changing auth endpoints that accept cookie authentication.

Evidence:
- Refresh token is set in cookie and read from cookie.
- `POST /refresh` and `POST /logout` have no CSRF token/origin/header validation.

Code references:
- `routes/auth.js:74-85`
- `routes/auth.js:97-103`
- `routes/auth.js:372-410`
- `routes/auth.js:413-433`

Recommended fix:
- Add CSRF defense for cookie-authenticated auth endpoints (token or strict Origin/custom header validation).
- Keep SameSite and HttpOnly flags as defense in depth.

Phase: Phase 3

---

### AUTH-007 [MEDIUM] Auth regression coverage is weak for core protected route behavior

Impact: Several major route tests use mocked auth middleware/routers instead of real middleware, so auth regressions can pass tests unnoticed.

Evidence:
- Tests construct local mock middleware rather than exercising production auth stack.

Code references:
- `test/routes/user.test.js:5-20`
- `test/routes/orders.test.js:4-8`
- `test/routes/cart.test.js:5-10`

Recommended fix:
- Add integration tests using real middleware + signed tokens for each role.
- Add negative tests for token type confusion, role mismatch, and revoked/inactive account paths.

Phase: Phase 3

---

### AUTH-008 [LOW] Helper script includes insecure default supplier password

Impact: Operational risk if script is used without editing default value.

Evidence:
- Default plain password literal in helper script.

Code references:
- `createSupplierHash.js:6`

Recommended fix:
- Require password input from CLI/env and fail if default placeholder is detected.

Phase: Phase 4

## Suggested Remediation Phases

1. Phase 1 (Immediate): Fix AUTH-001 and AUTH-002.
2. Phase 2: Fix AUTH-003, AUTH-004, AUTH-005.
3. Phase 3: Fix AUTH-006 and AUTH-007.
4. Phase 4: Cleanup hardening and tooling issues (AUTH-008 and related hygiene).

## Implementation Status (Updated 2026-04-11)

- Completed:
  - AUTH-001: Access middlewares now enforce `type === 'access'`; access tokens are explicitly issued with `type: 'access'`.
  - AUTH-002: Removed hardcoded OTP bypass (`123456`) from verify and register flows.
  - AUTH-003: Added phone normalization in OTP auth flow and DB-level normalized unique index migration for `user_profiles`.
  - AUTH-005: OTP codes are now hashed before storage and verified via timing-safe compare (legacy plaintext rows supported during transition).
  - AUTH-004 (baseline): Added Supabase-aware RLS baseline migration and row ownership policies for customer tables, guarded to apply only when Supabase roles exist.
  - AUTH-006: Added CSRF protections for cookie-authenticated `POST /api/auth/refresh` and `POST /api/auth/logout` (trusted-origin check + double-submit cookie/header token validation).
  - AUTH-007: Added real middleware-stack regression coverage (`validateTelegramAuth` + `requireCustomer` + protected cart route) including missing token, role mismatch, token-type confusion, and valid access path.
  - AUTH-008: Hardened supplier hash helper to require explicit secure password input (`--password` or `SUPPLIER_PLAIN_PASSWORD`), reject placeholders, enforce password policy, and fail safely on invalid input.
  - Optional defense-in-depth: aligned `createAdminHash.js` and `hashPassword.js` with the same secure input + validation pattern to remove manual inline password handling.
  - Deployment config hardening: production startup now fails fast on insecure/missing auth settings (`EXPOSE_OTP=true`, `EXPOSE_REFRESH_TOKEN_IN_BODY=true`, missing `OTP_HASH_SECRET`, missing/wildcard `CORS_ORIGINS`, and missing dedicated refresh secret).
  - Scanner hygiene: local security scanner now skips `.codex` and test directories to reduce false positives and focus on deployable backend code.
- Remaining:
  - None for the scoped AuthN/AuthZ review phases (1-4). Future hardening can continue as incremental defense-in-depth.

## Notes on Validation Performed

- Reviewed backend auth and role middleware, auth routes, token service, and route mounts.
- Reviewed security-relevant migrations and auth-focused tests.
- Ran auth-related Jest suites.
- Ran local project skill scanners; findings were manually triaged against auth/authz scope.
