import type { ConnectBrightspaceOptions } from './types';

/**
 * Pluggable Brightspace OAuth / session start. Subclass to swap backend-driven OAuth,
 * native PKCE, or another flow while keeping the same React context API.
 */
export abstract class AuthClient {
  abstract connectBrightspace(opts: ConnectBrightspaceOptions): Promise<void>;

  /**
   * When OAuth completes via app deep link, return the bearer token; otherwise null.
   * Override if your flow uses a different callback URL shape than the default backend.
   */
  parseAuthCallback(_url: string): string | null {
    return null;
  }
}
