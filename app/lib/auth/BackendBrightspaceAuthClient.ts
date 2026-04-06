import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { APP_SCHEME, BACKEND_BASE_URL } from '../config';
import { AuthClient } from './AuthClient';
import type { ConnectBrightspaceOptions } from './types';

/**
 * Starts OAuth via the app backend (`POST /auth/brightspace/start`) and opens the returned URL.
 * Completes when the backend redirects to `{APP_SCHEME}://auth-complete?token=...`.
 */
export class BackendBrightspaceAuthClient extends AuthClient {
  async connectBrightspace({ userId, orgBaseUrl }: ConnectBrightspaceOptions): Promise<void> {
    const res = await fetch(`${BACKEND_BASE_URL}/auth/brightspace/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, orgBaseUrl }),
    });

    if (!res.ok) {
      throw new Error('Failed to start Brightspace auth');
    }

    const data = (await res.json()) as { authUrl: string; state: string };
    await WebBrowser.openBrowserAsync(data.authUrl);
  }

  parseAuthCallback(url: string): string | null {
    const parsed = Linking.parse(url);
    if (
      parsed.scheme === APP_SCHEME &&
      parsed.hostname === 'auth-complete' &&
      parsed.queryParams?.token
    ) {
      return String(parsed.queryParams.token);
    }
    return null;
  }
}
