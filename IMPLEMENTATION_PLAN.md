# Implementation Plan — Lumina Platform Hardening

## PHASE A: Configuration Stabilization `[IN PROGRESS]`

### A1. Prisma Client Pool Configuration
- **Problem**: PrismaClient created without pooler mode. `pgbouncer=true` param in DATABASE_URL but Prisma not configured for it.
- **Fix**: Add `connectionLimit` and pool config to PrismaClient constructor; respect `?pgbouncer=true` connection string param.
- **Files**: `packages/database/src/index.ts`
- **Status**: PENDING

### A2. Environment Validation Guards
- **Problem**: No startup validation. Production could silently use fallback dev secrets.
- **Fix**: Add `validateEnvironment()` that throws on missing critical vars in production.
- **Files**: `apps/api/src/config/index.ts`, `packages/database/src/index.ts`
- **Status**: PENDING

### A3. Eliminate Production Fallback in next.config.ts
- **Problem**: `next.config.ts` rewrites fallback to `https://lumina-api-2573.onrender.com` when `API_URL` env not set. Local dev requests go to production.
- **Fix**: Remove production fallback; require `API_URL` to be explicitly set.
- **Files**: `apps/web/next.config.ts`
- **Status**: PENDING

### A4. Workspace Env Precedence
- **Problem**: Root `.env` shadows workspace `.env` files under npm workspaces with Node 20 + concurrently.
- **Fix**: Explicitly load workspace-specific `.env` files; remove redundant vars from workspace envs to reduce confusion.
- **Files**: `apps/api/.env`, `packages/database/.env`
- **Status**: PENDING

---

## PHASE B: Observability `[PENDING]`

### B1. Prisma Query Timing Instrumentation
- **Problem**: No visibility into query performance or pool saturation.
- **Fix**: Add Prisma middleware for query timing, log slow queries (>100ms).
- **Files**: `packages/database/src/index.ts`

### B2. Request Timing Middleware
- **Problem**: No per-request timing data.
- **Fix**: Add express middleware that logs request duration.
- **Files**: `apps/api/src/index.ts`

### B3. Unhandled Rejection / Exception Handlers
- **Problem**: No process-level error handlers.
- **Fix**: Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers.
- **Files**: `apps/api/src/index.ts`

### B4. Auth Retry Storm Detection
- **Problem**: No metrics on auth refresh loops.
- **Fix**: Add counter/logging when refresh attempts exceed threshold.
- **Files**: `apps/web/src/lib/api.ts`

---

## PHASE C: Regression Suites `[PENDING]`

### C1. Auth Flow Tests
- **Status**: Partially done (existing `auth.spec.ts`)
- **Need**: Token expiry, refresh race, multi-tab, concurrent login

### C2. Error Recovery Tests
- **Status**: Missing
- **Need**: Network failure, server error, rate limit, ban scenarios

### C3. Mobile Responsiveness Tests
- **Status**: Partially done
- **Need**: Navigation target validation, touch interactions, viewport adaptation

### C4. Concurrent Request Tests
- **Status**: Missing
- **Need**: Simultaneous mutations, duplicate submissions

---

## PHASE D: Concurrency Hardening `[PENDING]`

### D1. Playwright Worker Configuration
- **Problem**: `workers: undefined` locally means auto-detection (often 8-12). With pooler `connection_limit=1`, massive deadlocks.
- **Fix**: Default to `workers: 2` locally, `1` on CI. Document why.
- **Files**: `apps/web/playwright.config.ts`

### D2. Auth Refresh Race Conditions
- **Problem**: Multiple concurrent 401 responses trigger simultaneous refresh calls.
- **Fix**: Implement refresh queue/lock pattern in axios interceptor.
- **Files**: `apps/web/src/lib/api.ts`

### D3. Background Interval Pool Exhaustion
- **Problem**: Story cleanup interval ran on the shared Prisma client, exhausting pooled connections.
- **Fix**: Use dedicated low-priority connection or remove interval (stories expire naturally).
- **Files**: `apps/api/src/websocket/index.ts`

---

## PHASE E: Security Review `[PENDING]`

### E1. Mixed Module Pattern in Password Reset
- **Problem**: `require('jsonwebtoken')` used in ESM context.
- **Fix**: Use proper ESM import.
- **Files**: `apps/api/src/routes/auth.ts`

### E2. Auth Interceptor Error Propagation
- **Problem**: `catch` block always returns original `error` instead of the caught error or a meaningful message.
- **Files**: `apps/web/src/lib/api.ts`

### E3. Stale Closure in AuthProvider
- **Problem**: `useEffect` captures `isAuthenticated` from initial render but never re-runs.
- **Files**: `apps/web/src/components/auth-provider.tsx`

### E4. Admin Route Protection
- **Problem**: Frontend middleware checks `token` cookie but doesn't verify admin role.
- **Files**: `apps/web/src/middleware.ts`

---

## SUCCESS CRITERIA TRACKING

- [ ] No critical/high severity issues remain
- [ ] Auth lifecycle survives concurrency testing
- [ ] Retries are bounded
- [ ] No infinite loaders exist
- [ ] No silent failures exist
- [ ] No env bleed exists
- [ ] No stale auth state exists
- [ ] No pool starvation occurs
- [ ] Local/prod parity verified
- [ ] Regression suites repeatedly pass
- [ ] Observability is sufficient to diagnose failures
