import { onAuthStateChanged, signInWithRedirect, signInWithPopup, signOut, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Duplicate-click prevention: if a sign-in is already in progress, don't trigger another
    if (signInLoading) {
      return;
    }
    setAuthError(null);
    setSignInLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;

      // Popup was closed by the user — no error shown, just silently ignore
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled') {
        return;
      }

      // Popup already open — don't trigger another, show user-friendly message
      if (code === 'auth/popup-already-open') {
        setAuthError('Окно входа уже открыто. Проверьте открытые окна браузера.');
        return;
      }

      // Popup blocked by browser — fall back to redirect flow
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        } catch (redirectError: unknown) {
          const redirectCode = (redirectError as { code?: string })?.code;
          setAuthError(
            redirectCode === 'auth/popup-closed-by-user' || redirectCode === 'auth/cancelled'
              ? 'Окно входа закрыто до завершения.'
              : 'Не удалось войти через Google. Проверьте всплывающие окна.'
          );
          return;
        }
      }

      // Any other Firebase auth error — fall back to redirect as a reliable path
      if (code && code.startsWith('auth/')) {
        try {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        } catch (redirectError: unknown) {
          const redirectCode = (redirectError as { code?: string })?.code;
          setAuthError(
            redirectCode === 'auth/popup-closed-by-user' || redirectCode === 'auth/cancelled'
              ? 'Окно входа закрыто до завершения.'
              : 'Не удалось войти через Google. Проверьте всплывающие окна.'
          );
          return;
        }
      }

      // Non-Firebase error (e.g. network) — try redirect as a last resort
      try {
        await signInWithRedirect(auth, googleAuthProvider);
        return;
      } catch (redirectError: unknown) {
        const redirectCode = (redirectError as { code?: string })?.code;
        setAuthError(
          redirectCode === 'auth/popup-closed-by-user' || redirectCode === 'auth/cancelled'
            ? 'Окно входа закрыто до завершения.'
            : 'Не удалось войти через Google. Проверьте всплывающие окна.'
        );
      }
    } finally {
      // Guarantee loading state is always reset regardless of success, failure, or early return
      setSignInLoading(false);
    }
  }, [signInLoading]);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInLoading,
        authError,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
