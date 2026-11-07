import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
  version: integer('version').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
});
export const loginLimits = sqliteTable('login_limits', {
  bucket: text('bucket').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
