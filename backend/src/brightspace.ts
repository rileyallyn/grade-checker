import { Context } from 'hono';

// Based on Brightspace Developer Platform docs:
// https://docs.valence.desire2learn.com/reference.html

export type BrightspaceConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getBrightspaceAuthUrl(opts: {
  orgBaseUrl: string;
  config: BrightspaceConfig;
  state: string;
}): string {
  const { orgBaseUrl, config, state } = opts;
  const url = new URL('/d2l/oauth2/authorize', orgBaseUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCodeForTokens(params: {
  orgBaseUrl: string;
  config: BrightspaceConfig;
  code: string;
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}> {
  const { orgBaseUrl, config, code } = params;
  const url = new URL('/d2l/oauth2/token', orgBaseUrl);

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', config.redirectUri);
  body.set('client_id', config.clientId);
  body.set('client_secret', config.clientSecret);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as any;
}

export async function refreshAccessToken(params: {
  orgBaseUrl: string;
  config: BrightspaceConfig;
  refreshToken: string;
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}> {
  const { orgBaseUrl, config, refreshToken } = params;
  const url = new URL('/d2l/oauth2/token', orgBaseUrl);

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('client_id', config.clientId);
  body.set('client_secret', config.clientSecret);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return (await res.json()) as any;
}

export async function callBrightspaceApi<T>(opts: {
  orgBaseUrl: string;
  accessToken: string;
  path: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
}): Promise<T> {
  const { orgBaseUrl, accessToken, path, searchParams } = opts;
  const url = new URL(path, orgBaseUrl);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brightspace API error: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

