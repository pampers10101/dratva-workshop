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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Окно входа закрыто до завершения.');
      } else if (code === 'auth/popup-blocked') {
        // Popup blocked by browser — fall back to redirect flow
        try {
          await signInWithRedirect(auth, googleAuthProvider);
        } catch (redirectError: unknown) {
          const redirectCode = (redirectError as { code?: string })?.code;
          setAuthError(
            redirectCode === 'auth/popup-closed-by-user'
              ? 'Окно входа закрыто до завершения.'
              : 'Не удалось войти через Google. Проверьте всплывающие окна.'
          );
        }
      } else {
        setAuthError('Не удалось войти через Google. Проверьте всплывающие окна.');
      }
    }
  }, []);

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
      value={{ user, loading, authError, signInWithGoogle, logout, getIdToken }}
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
