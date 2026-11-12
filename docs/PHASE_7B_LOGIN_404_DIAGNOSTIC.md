# PHASE 7B — LOGIN HTTP 404 DIAGNOSTIC (READ-ONLY)

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Date:** 2026-11-12  
**Symptom reported:** Dashboard opens at `http://127.0.0.1:5173`, but clicking **Sign in** displays `Request failed (404)`.  
**Scope:** Read-only investigation only. No source/config/API/auth/CORS/security/dependency/DB changes, no installs, no credential resets, no test-data create/delete/cleanup, no DEF-6F-001 fix. No credentials, passwords, PINs, JWTs, hashes, cookies, or secrets exposed.

---

## 1. Files inspected

**Dashboard**
- `dashboard/src/pages/LoginPage.tsx` (login UI/form submit)
- `dashboard/src/services/apiClient.ts` (base URL construction, request/404 handling)
- `dashboard/src/context/AuthContext.tsx` (session/sign-in flow)
- `dashboard/src/services/authApi.ts` (actual login API call) — traced as the service used by `AuthContext`/`LoginPage`
- `dashboard/vite.config.ts` (dev server/proxy)
- `dashboard/.env` (**missing** at investigation time)
- `dashboard/.env.example` (documented example)

**Backend**
- `backend/src/app.js` (route mounting/middleware order)
- `backend/src/routes/authRoutes.js` (auth endpoints)
- `backend/src/controllers/authController.js` (login handler)
- `backend/src/services/authService.js` (login logic/response data)
- `backend/src/validators/authValidators.js` (request body validation)
- `backend/src/middleware/errorHandler.js` (404/not-found and error response shape)

**Runtime check (read-only)**
- `GET http://localhost:4000/api/v1/health` (live response observed)

---

## 2. Exact login request trace

### 2.1 Dashboard trigger and method
- `dashboard/src/pages/LoginPage.tsx:30-46` — `onSubmit` prevents default, validates, sets submitting, calls `await signInCaregiver({ email: email.trim(), password })`, maps errors (401/403/validation/network) and shows `err.message` fallback (e.g. "Request failed (404)").
- `dashboard/src/context/AuthContext.tsx:81-91` — `signInCaregiver` calls `loginCaregiver(payload)` from auth API, checks caregiver role, stores token, sets authenticated session.
- `dashboard/src/services/authApi.ts:4-9` — **dashboard login call:**
  - **HTTP method:** `POST`
  - **Path passed to client:** `'/auth/caregiver/login'`
  - **Body:** `JSON.stringify(payload)` where payload is `{ email, password }` (from `LoginPage.tsx:37`)

### 2.2 Dashboard API base URL construction
- `dashboard/src/services/apiClient.ts:3-6`
  - `RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim()`
  - `API_BASE_URL = RAW_BASE.replace(/\/+$/, '')`
  - `API_PREFIX = '/api/v1'`
  - `API_URL = ${API_BASE_URL}${API_PREFIX}`
- `dashboard/src/services/apiClient.ts:45-59` (`apiRequest`)
  - Sets `Content-Type: application/json`
  - Builds `url = ${API_URL}${path.startsWith('/') ? path : `/${path}`}` and performs `fetch(url, { method, headers, body, ... })`
- `dashboard/src/services/apiClient.ts:70-73,76-84`
  - On non-OK: throws `ApiError(msg, { status: res.status, ... })` with `msg = body?.message || \`Request failed (${res.status})\`` (so a 404 with no parsed message becomes **`Request failed (404)`**)
  - Network/abort mapped to network/timeout `ApiError`

**Environment/config findings**
- `dashboard/.env`: **missing** (no file). `VITE_API_BASE_URL` is therefore **undefined/empty** at Vite build/runtime unless injected another way.
- `dashboard/.env.example:3` documents `VITE_API_BASE_URL=http://localhost:4000`.
- `dashboard/vite.config.ts:1-9`: Vite dev server on port 5173 only; **no `server.proxy` configuration**.

**Effective request URL (given missing `VITE_API_BASE_URL`)**
- `API_BASE_URL` = `''` → `API_URL` = `'/api/v1'` → login URL = **`/api/v1/auth/caregiver/login`** (relative, resolved against current origin **`http://127.0.0.1:5173`**).
- **Actual browser target (expected from config):** `http://127.0.0.1:5173/api/v1/auth/caregiver/login` (dashboard/Vite origin), **not** the backend origin.

### 2.3 Backend route registration and expected contract
- `backend/src/app.js:39-41` mounts:
  - `app.use('/api/v1', healthRoutes)` → health at `/api/v1/health`
  - `app.use('/api/v1/auth', authRoutes)` → auth endpoints under `/api/v1/auth/*`
- `backend/src/routes/authRoutes.js:11-20,25-26`
  - Rate limiter on auth routes
  - **Mounted endpoint:** `router.post('/caregiver/login', authLimiter, v.caregiverLogin, validate, authController.loginCaregiver)` → full path **`POST /api/v1/auth/caregiver/login`**
  - Also: `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, etc.
- `backend/src/validators/authValidators.js:12-15`
  - **Expected request body:** `{ email: <valid email>, password: <non-empty string> }`
- `backend/src/controllers/authController.js:12-18` / `backend/src/services/authService.js:39-62`
  - On success: logs caregiver login event (best-effort), returns `success(res, 200, 'Login successful', result)` with data `{ token, user }` (user: id/role/email/fullName/displayName/preferredLanguage).
  - On invalid credentials (generic): 401 `INVALID_CREDENTIALS` (`'Invalid email or password'`).
- `backend/src/middleware/errorHandler.js:3-9,12-33`
  - **404 for unmatched routes:** `notFoundHandler` returns **HTTP 404** JSON `{ success:false, message:'Route not found', code:'NOT_FOUND' }`.
  - Other errors centralized to JSON `{ success, message, code, errors? }`.

### 2.4 Comparison (dashboard vs backend)

| Aspect | Dashboard (actual implementation) | Backend (actual mounted) | Match? |
|---|---|---|---|
| Method | `POST` (`authApi.ts:6`) | `POST` (`authRoutes.js:20`) | **Yes** |
| Path | `/auth/caregiver/login` → `/api/v1/auth/caregiver/login` (`apiClient.ts:6,59`) | `/api/v1/auth/caregiver/login` (`app.js:40`, `authRoutes.js:20`) | **Yes (path string)** |
| Base/origin | `VITE_API_BASE_URL + /api/v1` → **empty base ⇒ `http://127.0.0.1:5173`** (current config) | Backend listens on **`http://localhost:4000`** (health confirmed) | **No (origin/target)** |
| Request body | `{ email, password }` JSON | `{ email, password }` validated | **Yes** |
| Success (expected) | `ApiSuccess<AuthResponseData>` with `data.token`, `data.user` (`authApi.ts:2,5`) | `200` `{ success:true, message:'Login successful', data:{ token, user } }` | **Yes** |
| Error shape handling | Parses `message/code/errors`, maps 401/403; fallback `Request failed (<status>)` | JSON `{ success:false, message, code, errors? }`, 404 via `notFoundHandler` | **Compatible** |

---

## 3. Cause analysis (404 origin)

**Exact root cause (established):** **Incorrect API target/base URL due to missing dashboard environment configuration (`VITE_API_BASE_URL`) combined with no Vite proxy.**

- `dashboard/.env` is absent and `VITE_API_BASE_URL` is not set, so `apiClient` resolves `API_URL` to `'/api/v1'` (`apiClient.ts:3-6`) and sends login to the **dashboard origin** (`http://127.0.0.1:5173/api/v1/auth/caregiver/login`).
- The Vite dev server (`vite.config.ts`, port 5173, no proxy) does not serve `/api/v1/...` backend routes, so the request does not reach the Express backend mounted at `http://localhost:4000/api/v1/auth/caregiver/login` (`app.js:40`, `authRoutes.js:20`).
- A 404 response in this context produces the observed UI message `Request failed (404)` via `apiClient.ts:72`/`LoginPage.tsx:46` (and/or aligns with a "route not found" style response depending on responder).

**Ruled out / not supported as primary cause by evidence:**
- **Incorrect endpoint path/method in dashboard code:** dashboard calls `POST /api/v1/auth/caregiver/login` (`authApi.ts:4-8`) which matches backend (`app.js:40`, `authRoutes.js:20`).
- **Incorrect route prefix in backend:** backend mounts API under `/api/v1` and auth under `/auth` (`app.js:39-40`).
- **Missing backend route mounting:** caregiver login route is present and mounted (`authRoutes.js:20`, `app.js:40`).
- **Request body field mismatch:** both expect `{ email, password }` (`LoginPage.tsx:37`, `authValidators.js:12-15`).
- **Vite proxy misconfiguration:** no proxy exists at all (`vite.config.ts`); absence is relevant because base URL is unset, but it is not a "wrong proxy" value.
- **Backend unavailable:** backend health is reachable and healthy (see §4).

**Contributing factor (configuration):** `.env.example` specifies `VITE_API_BASE_URL=http://localhost:4000`, but without a corresponding `.env` (or equivalent injected env), Vite will not provide that value.

---

## 4. Backend health endpoint status (read-only, unchanged)

- **Request:** `GET http://localhost:4000/api/v1/health`
- **Observed:** **HTTP 200 OK**, `Content-Type: application/json`
- **Body (observed):** success/service-healthy payload indicating `database.connected: true` (backend and MySQL reachable at time of check).
- **Conclusion:** Backend and DB were operational; the reported login 404 is **not** explained by backend/DB being down.

---

## 5. Evidence summary

- `dashboard/src/services/authApi.ts:4-9` — POST `/auth/caregiver/login` with `{email,password}`.
- `dashboard/src/services/apiClient.ts:3-6,45,59,70-73` — `VITE_API_BASE_URL`-based URL build (`/api/v1` prefix) and 404 surfaced as `Request failed (404)`.
- `dashboard/.env` missing; `dashboard/.env.example:3` shows intended `http://localhost:4000`; `dashboard/vite.config.ts:4-8` shows no proxy.
- `backend/src/app.js:39-40`, `backend/src/routes/authRoutes.js:20` — backend expects `POST /api/v1/auth/caregiver/login`.
- `backend/src/validators/authValidators.js:12-15`, `backend/src/controllers/authController.js:12-18`, `backend/src/services/authService.js:39-62` — body/response contract.
- `backend/src/middleware/errorHandler.js:3-9` — 404 JSON `{ message:'Route not found', code:'NOT_FOUND' }` for unmatched backend routes (consistent with 404 semantics).
- Live `GET /api/v1/health` → **200, DB connected**.

---

## 6. Is a fix necessary?

**Yes (configuration/alignment fix necessary) for dashboard→backend login to succeed in this environment.** The dashboard login endpoint/path and request body align with the backend, but the **request is not directed to the backend** when `VITE_API_BASE_URL` is unset and no proxy is configured. This prevents the login request from reaching `POST http://localhost:4000/api/v1/auth/caregiver/login`.

No evidence indicates a backend route/mount/method/body-contract defect for caregiver login.

---

## 7. Safest recommended next step (no implementation performed)

1. **Configuration alignment (safest, minimal):** Create/configure `dashboard/.env` (local, not committed) with `VITE_API_BASE_URL=http://localhost:4000` consistent with `dashboard/.env.example` and the running backend, then **restart the Vite dev server** so `import.meta.env` picks up the value. Re-test login in Edge and confirm Network shows `POST http://localhost:4000/api/v1/auth/caregiver/login` with expected status (e.g. 401 for invalid creds, 200 for valid). *(Not performed in this investigation.)*
2. **Alternative (if preferred):** Add a Vite dev proxy for `/api/v1` to `http://localhost:4000` and keep relative API calls—requires code/config change and review. *(Not performed.)*
3. **Verify:** After fix, confirm backend still healthy (`/api/v1/health` 200) and that CORS/origin settings permit the dashboard origin as needed (read-only note: backend CORS configured in `backend/src/app.js:26-30`; no changes made).

**Preservation noted:** No files modified, no DB changes, no credentials handled/reset, activity logs preserved (487, incl. 669–676), no cleanup, DEF-6F-001 untouched.

**Stop:** Read-only investigation complete; no fix implemented.
