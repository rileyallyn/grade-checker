import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // app-level user id (e.g. UUID from mobile)
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
});

export const oauthStates = sqliteTable('oauth_states', {
  state: text('state').primaryKey(),
  userId: text('user_id').notNull(),
  orgBaseUrl: text('org_base_url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
});

export const brightspaceConnections = sqliteTable('brightspace_connections', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  orgBaseUrl: text('org_base_url').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }), // when Brightspace access token expires
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export type DbUser = typeof users.$inferSelect;

export function getDb(env: { DB: D1Database }) {
  if (!(env as any).DB) {
    throw new Error(
      'D1 database binding "DB" is not configured. Check wrangler.toml and ensure a D1 database is bound.',
    );
  }
  return drizzle((env as any).DB as D1Database);
}

