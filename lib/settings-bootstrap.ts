export interface SettingsRow {
  value: string;
  version: number;
  updated_at: string;
}

interface SettingsBootstrap {
  config: unknown;
  version: number;
  updatedAt: string;
}

// A fresh database starts with the last saved public settings, without replacing
// either later admin saves or the separate, approved reset baseline.
export async function readOrBootstrapSettings(db: D1Database, snapshot: SettingsBootstrap): Promise<SettingsRow> {
  const read = () => db.prepare('SELECT value, version, updated_at FROM site_settings WHERE id = ?')
    .bind('main').first<SettingsRow>();
  const existing = await read();
  if (existing) return existing;

  await db.prepare('INSERT OR IGNORE INTO site_settings (id,value,version,updated_at) VALUES (?,?,?,?)')
    .bind('main', JSON.stringify(snapshot.config), snapshot.version, snapshot.updatedAt).run();

  // Another request or an admin save can win the race. Always return the row
  // actually stored in D1, never an assumed copy of the bootstrap snapshot.
  const authoritative = await read();
  if (!authoritative) throw new Error('Не удалось загрузить настройки проекта. Повторите попытку.');
  return authoritative;
}
