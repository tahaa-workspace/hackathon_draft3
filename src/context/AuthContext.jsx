import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearSession,
  loadStoredSession,
  loginUser,
  persistSession,
} from '../services/authService';

const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [token, setToken] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [hydrated, setHydrated] =
    useState(false);

  /*
  =========================================
  RESTORE SESSION
  =========================================
  */

  useEffect(() => {

    const stored =
      loadStoredSession();

    if (stored) {
      setToken(
        stored.token
      );

      setUser(
        stored.user
      );
    }

    setHydrated(true);

  }, []);


  /*
  =========================================
  LOGIN
  =========================================
  */

  const login =
    useCallback(
      async ({
        identifier,
        password,
      }) => {

        const data =
          await loginUser({
            identifier,
            password,
          });

        persistSession(
          data.token,
          data.user
        );

        setToken(
          data.token
        );

        setUser(
          data.user
        );

        return data.user;

      },
      []
    );


  /*
  =========================================
  UPDATE CURRENT USER
  =========================================

  Used after password change so
  mustChangePassword becomes false
  without requiring another login.
  */

  const updateCurrentUser =
    useCallback(
      (
        updatedUser
      ) => {

        if (
          !updatedUser
        ) {
          return;
        }

        setUser(
          updatedUser
        );

        if (token) {

          persistSession(
            token,
            updatedUser
          );

        }

      },
      [token]
    );


  /*
  =========================================
  LOGOUT
  =========================================
  */

  const logout =
    useCallback(
      () => {

        clearSession();

        setToken(null);

        setUser(null);

      },
      []
    );


  const value =
    useMemo(
      () => ({
        token,

        user,

        hydrated,

        isAuthenticated:
          Boolean(token),

        login,

        logout,

        updateCurrentUser,
      }),
      [
        token,
        user,
        hydrated,
        login,
        logout,
        updateCurrentUser,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {

  const ctx =
    useContext(
      AuthContext
    );

  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return ctx;
}