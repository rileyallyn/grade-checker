import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { nanoid } from 'nanoid/non-secure';

import { getDb, users, brightspaceConnections, oauthStates } from './db/schema';
import {
  BrightspaceConfig,
  getBrightspaceAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  callBrightspaceApi,
} from './brightspace';

export type CloudflareBindings = {
  DB: D1Database;
  BRIGHTSPACE_CLIENT_ID: string;
  BRIGHTSPACE_CLIENT_SECRET: string;
  BRIGHTSPACE_REDIRECT_URI: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

const getBsConfig = (env: CloudflareBindings): BrightspaceConfig => ({
  clientId: env.BRIGHTSPACE_CLIENT_ID,
  clientSecret: env.BRIGHTSPACE_CLIENT_SECRET,
  redirectUri: env.BRIGHTSPACE_REDIRECT_URI,
});

app.get('/', (c) => c.text('OK'));

// Step 1: mobile app calls this to start OAuth
// Body: { userId: string, orgBaseUrl: string }
app.post('/auth/brightspace/start', async (c) => {
  const { userId, orgBaseUrl } = await c.req.json<{
    userId: string;
    orgBaseUrl: string;
  }>();

  if (!userId || !orgBaseUrl) {
    return c.json({ error: 'Missing userId or orgBaseUrl' }, 400);
  }

  const db = getDb(c.env);
  await db.insert(users).values({ id: userId }).onConflictDoNothing();

  const state = nanoid();
  await db.insert(oauthStates).values({
    state,
    userId,
    orgBaseUrl,
  });

  const authUrl = getBrightspaceAuthUrl({
    orgBaseUrl,
    config: getBsConfig(c.env),
    state,
  });

  return c.json({ authUrl, state });
});

// Step 2: Brightspace redirects here with ?code=...&state=...
// This endpoint should match BRIGHTSPACE_REDIRECT_URI.
app.get('/auth/brightspace/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  const db = getDb(c.env);
  const [stateRow] = await db
    .select()
    .from(oauthStates)
    .where(oauthStates.state.eq(state))
    .limit(1);

  if (!stateRow) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  const { userId, orgBaseUrl } = stateRow;

  const tokens = await exchangeCodeForTokens({
    orgBaseUrl,
    config: getBsConfig(c.env),
    code,
  });

  const expiresAt =
    tokens.expires_in != null
      ? Date.now() + tokens.expires_in * 1000
      : undefined;

  const connectionId = nanoid();

  await db.insert(brightspaceConnections).values({
    id: connectionId,
    userId,
    orgBaseUrl,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  });

  const jwtPayload = { sub: userId, connId: connectionId };
  const appJwt = await sign(jwtPayload, c.env.JWT_SECRET);

  // Redirect back to app with JWT; app should store this and send as Authorization header.
  const redirectTo = new URL('gradechecker://auth-complete');
  redirectTo.searchParams.set('token', appJwt);

  return c.redirect(redirectTo.toString(), 302);
});

app.use('/api/*', async (c, next) => {
  const auth = c.req.header('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = auth.slice('Bearer '.length);

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    (c as any).auth = payload;
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  await next();
});

async function getFreshConnection(c: any) {
  const { sub: userId, connId } = c.auth as { sub: string; connId?: string };
  const db = getDb(c.env);

  const query = db
    .select()
    .from(brightspaceConnections)
    .where(
      connId
        ? brightspaceConnections.id.eq(connId)
        : brightspaceConnections.userId.eq(userId),
    )
    .limit(1);

  const [conn] = await query;
  if (!conn) return null;

  const now = Date.now();
  if (conn.expiresAt && conn.expiresAt < now && conn.refreshToken) {
    const tokens = await refreshAccessToken({
      orgBaseUrl: conn.orgBaseUrl,
      config: getBsConfig(c.env),
      refreshToken: conn.refreshToken,
    });

    const newExpiresAt =
      tokens.expires_in != null
        ? Date.now() + tokens.expires_in * 1000
        : undefined;

    await db
      .update(brightspaceConnections)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? conn.refreshToken,
        expiresAt: newExpiresAt,
        updatedAt: Date.now(),
      })
      .where(brightspaceConnections.id.eq(conn.id));

    return {
      ...conn,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? conn.refreshToken,
      expiresAt: newExpiresAt,
    };
  }

  return conn;
}

// Courses for the authenticated user
app.get('/api/courses', async (c) => {
  const conn = await getFreshConnection((c as any));
  if (!conn) {
    return c.json({ error: 'No Brightspace connection' }, 400);
  }

  // Brightspace course offerings endpoint (org units)
  // See: https://docs.valence.desire2learn.com/res/orgunit.html
  const data = await callBrightspaceApi<any>({
    orgBaseUrl: conn.orgBaseUrl,
    accessToken: conn.accessToken,
    path: '/d2l/api/lp/1.0/enrollments/myenrollments/',
  });

  return c.json(data);
});

// Dashboard summary placeholder that proxies enrollments (you can aggregate to your mobile shape)
app.get('/api/dashboard', async (c) => {
  const conn = await getFreshConnection((c as any));
  if (!conn) {
    return c.json({ error: 'No Brightspace connection' }, 400);
  }

  const enrollments = await callBrightspaceApi<any>({
    orgBaseUrl: conn.orgBaseUrl,
    accessToken: conn.accessToken,
    path: '/d2l/api/lp/1.0/enrollments/myenrollments/',
  });

  return c.json({ enrollments });
});

// Course grades
app.get('/api/courses/:courseId/grades', async (c) => {
  const courseId = c.req.param('courseId');
  const conn = await getFreshConnection((c as any));
  if (!conn) {
    return c.json({ error: 'No Brightspace connection' }, 400);
  }

  const grades = await callBrightspaceApi<any>({
    orgBaseUrl: conn.orgBaseUrl,
    accessToken: conn.accessToken,
    // See Brightspace grades resource.
    path: `/d2l/api/le/1.0/${courseId}/grades/values/myGradeValues/`,
  });

  return c.json(grades);
});

// Course assignments (Dropbox folders)
app.get('/api/courses/:courseId/assignments', async (c) => {
  const courseId = c.req.param('courseId');
  const conn = await getFreshConnection((c as any));
  if (!conn) {
    return c.json({ error: 'No Brightspace connection' }, 400);
  }

  const folders = await callBrightspaceApi<any>({
    orgBaseUrl: conn.orgBaseUrl,
    accessToken: conn.accessToken,
    // See Brightspace dropbox resource.
    path: `/d2l/api/le/1.0/${courseId}/dropbox/folders/`,
  });

  return c.json(folders);
});

export default app;

