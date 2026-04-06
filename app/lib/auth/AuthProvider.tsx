import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthClient } from './AuthClient';
import { BackendBrightspaceAuthClient } from './BackendBrightspaceAuthClient';
import type { ConnectBrightspaceOptions } from './types';

const STORAGE_KEY = 'gradechecker_token';

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  connectBrightspace: (opts: ConnectBrightspaceOptions) => Promise<void>;
  /** Current auth implementation (for advanced use). */
  authClient: AuthClient;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type AuthProviderProps = {
  children: React.ReactNode;
  /** Defaults to {@link BackendBrightspaceAuthClient}. Pass your own {@link AuthClient} to swap OAuth. */
  client?: AuthClient;
};

export function AuthProvider({ children, client: clientProp }: AuthProviderProps) {
  const client = useMemo(() => clientProp ?? new BackendBrightspaceAuthClient(), [clientProp]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setToken(stored);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      const next = client.parseAuthCallback(event.url);
      if (next) {
        setToken(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      }
    });

    return () => {
      sub.remove();
    };
  }, [client]);

  const connectBrightspace = useCallback(
    async (opts: ConnectBrightspaceOptions) => {
      await client.connectBrightspace(opts);
    },
    [client],
  );

  const value = useMemo(
    () => ({
      token,
      loading,
      connectBrightspace,
      authClient: client,
    }),
    [token, loading, connectBrightspace, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
