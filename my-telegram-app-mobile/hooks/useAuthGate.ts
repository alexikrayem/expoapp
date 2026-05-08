import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

/**
 * useAuthGate — Reusable hook that gates actions behind authentication.
 *
 * Usage:
 *   const { requireAuth } = useAuthGate();
 *   requireAuth(() => { /* runs only if authenticated *​/ });
 *
 * If the user is a guest, they are redirected to /login.
 * After login, the user returns to the original screen.
 */
export const useAuthGate = () => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    /**
     * Executes `onAuthorized` if the user is authenticated.
     * Otherwise, navigates to the login screen.
     */
    const requireAuth = useCallback(
        (onAuthorized?: () => void) => {
            if (isAuthenticated) {
                onAuthorized?.();
                return true;
            }

            // Guest user → redirect to login
            router.push('/login');
            return false;
        },
        [isAuthenticated, router],
    );

    return {
        /** Whether the user can perform authenticated actions. */
        isAuthenticated,
        /** Whether the user is browsing as a guest (not logged in). */
        isGuest: !isAuthenticated,
        /** Gate an action behind authentication. Returns `true` if authorized. */
        requireAuth,
    };
};
