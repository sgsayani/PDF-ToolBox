import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authApi } from '../services/authApi';
import { ApiError } from '../services/apiClient';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True until the initial session check (against the cookie, if any) has resolved. */
  isLoading: boolean;
  register: (input: { email: string; password: string; name: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user, if any, for the whole app.
 *
 * On mount it asks the server who the session cookie belongs to — this is
 * what makes a login persist across a page refresh or a new tab without the
 * client ever handling the token itself. A 401 here just means "signed out",
 * not an error worth surfacing.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((response) => {
        if (!cancelled) setUser(response.user);
      })
      .catch(() => {
        // Anonymous, or accounts are unavailable — either way, no session.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (input: { email: string; password: string; name: string }) => {
    const response = await authApi.register(input);
    setUser(response.user);
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const response = await authApi.login(input);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // The cookie is httpOnly — if the server call fails there's no way to
      // clear it from here either, but treating the user as signed out
      // client-side is still the right call: the failure mode of "logout
      // didn't fully work" is far safer than "still shown as logged in."
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: { name: string }) => {
    const response = await authApi.updateProfile(input);
    setUser(response.user);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, register, login, logout, updateProfile }),
    [user, isLoading, register, login, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
