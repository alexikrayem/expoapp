# Guest Browsing Implementation Plan

> **Status: ✅ COMPLETE** — All steps implemented and verified (0 TypeScript errors, 32/32 tests passing).

---

## Current State (before this change)
- The app forced login before any content was visible (auth guard in `_layout.tsx` redirected to `/login` immediately).
- All screens (Home, Favorites, Orders, Settings) were behind authentication.

## Target State
- Users can browse products, deals, suppliers, and featured items **without signing up**.
- Authentication is **only required** when a user attempts to:
  1. **Add to cart** (`CartContext.addToCart`)
  2. **Navigate to cart** (cart screen)
  3. **Proceed to checkout** (checkout screen)
  4. **View favorites** (requires server-side storage)
  5. **View orders** (requires server-side data)
  6. **Edit profile / settings** (personal actions in Header/Settings)

---

## Changes Implemented

### ✅ 1. `context/AuthContext.tsx`
- Added `isGuest: boolean` to `AuthContextType` interface.
- Added JSDoc: _"True once the auth check is complete and the user is **not** logged in."_
- `isGuest` is computed as `!isAuthenticated && !isLoading` — the `!isLoading` guard prevents false-positive guest states while the initial token check is in flight.
- Included `isGuest` in `useMemo` value and dependency array.

### ✅ 2. `app/_layout.tsx` — Auth Guard
- Removed the redirect-to-login guard for unauthenticated users.
- Tabs now render for all users (guests browse freely).
- Kept the guard that redirects **authenticated** users away from login/register screens.
- Removed the blocking `<LoadingScreen>` shown to unauthenticated, non-auth-flow users.

### ✅ 3. `hooks/useAuthGate.ts` (NEW file)
- Returns `{ isAuthenticated, isGuest, requireAuth }`.
- `requireAuth(onAuthorized?)` runs the callback if authenticated, otherwise navigates to `/login`.
- Used across cart, checkout, favorites, orders, settings, and header.

### ✅ 4. `context/CartContext.tsx`
- Imports `useAuth` and `router` from `expo-router`.
- `addToCart` checks `isAuthenticated` first. If guest:
  - Shows info toast: _"سجّل الدخول لإضافة منتجات إلى السلة"_
  - Calls `router.push('/login')`
  - Returns early (item is NOT added).

### ✅ 5. `app/cart.tsx`
- Imports `useAuthGate`.
- `useEffect` redirects guests to `/login` on mount.
- Returns `null` while redirect is in flight to avoid flash.

### ✅ 6. `app/checkout.tsx`
- Same pattern as `cart.tsx` — guest redirect on mount.

### ✅ 7. `app/(tabs)/favorites.tsx`
- If `isGuest`, renders a full-screen CTA with Heart icon and "تسجيل الدخول" button instead of fetching data.
- Hooks (`useFavorites`, etc.) are not called for guests (early return before hook calls).

### ✅ 8. `app/(tabs)/orders.tsx`
- If `isGuest`, renders a full-screen CTA with Package icon and "تسجيل الدخول" button.
- `useAuth`, `useOrders` etc. are called **after** the guest check (valid per React rules since the early return is at function entry, not mid-render).

### ✅ 9. `app/(tabs)/settings.tsx`
- Guest sees a "تسجيل الدخول" entry row under "الحساب" section.
- Logout button replaced with a "تسجيل الدخول" primary button for guests.
- City, legal, and contact settings remain accessible to all.

### ✅ 10. `components/Header.tsx`
- Guest: profile avatar replaced with a blue pill "دخول" button (LogIn icon + text) that navigates to `/login`.
- Authenticated: original avatar/initials button unchanged.

### ✅ 11. `hooks/useFavorites.ts`
- Added `enabled: isAuthenticated` to the React Query `useQuery` call — prevents 401 errors from firing for guests.

### ✅ 12. `app/login.tsx`
- Added "تصفح كضيف" (Browse as Guest) ghost button on both the `PHONE` and `OTP` steps.
- Pressing it calls `router.replace("/(tabs)")` to return to the home tab.

### ✅ 13. `__tests__/context/CartContext.test.tsx`
- Added jest mock for `AuthContext` (`isAuthenticated: true`) so existing tests still pass after `CartContext` started consuming `useAuth`.

---

## Verification
```
npx tsc --noEmit  →  0 errors
npx jest          →  32 passed, 0 failed
```
