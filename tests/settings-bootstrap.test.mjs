import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readOrBootstrapSettings } from '../lib/settings-bootstrap.ts';
import { validateConfig } from '../lib/config-validation.ts';

const snapshotText = fs.readFileSync(new URL('../data/current-settings-bootstrap.json', import.meta.url), 'utf8');
const snapshot = JSON.parse(snapshotText);
const schema = fs.readFileSync(new URL('../drizzle/0000_faithful_wendell_rand.sql', import.meta.url), 'utf8');

// Execute the production SQL against SQLite, with the asynchronous D1 call shape.
function database(hooks = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  let insertAttempts = 0;
  let insertedRows = 0;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql);
          return {
            async first() {
              const row = statement.get(...values) ?? null;
              await hooks.afterRead?.(row);
              return row;
            },
            async run() {
              insertAttempts++;
              const { changes } = statement.run(...values);
              insertedRows += Number(changes);
              await hooks.afterInsert?.(sqlite, Number(changes));
              return { meta: { changes: Number(changes) } };
            },
          };
        },
      };
    },
  };
  return { sqlite, db, counts: () => ({ insertAttempts, insertedRows }) };
}

test('a fresh database receives the exact public v34 snapshot while baseline v32 remains separate', async () => {
  assert.equal(createHash('sha256').update(snapshotText).digest('hex'), 'cdf06128800d8283bdfae2406cd85c46dede1ee72bcd0574163dc765d1b9227b');
  assert.equal(snapshot.version, 34);
  assert.equal(snapshot.updatedAt, '2026-11-01T17:26:45.980Z');
  assert.equal(snapshot.config.catalog.length, 183);
  assert.doesNotThrow(() => validateConfig(snapshot.config));
  const baseline = JSON.parse(fs.readFileSync(new URL('../data/baseline-metadata.json', import.meta.url), 'utf8'));
  assert.equal(baseline.sourceVersion, 32);
  const { sqlite, db, counts } = database();
  try {
    const row = await readOrBootstrapSettings(db, snapshot);
    assert.deepEqual(JSON.parse(row.value), snapshot.config);
    assert.equal(row.version, snapshot.version);
    assert.equal(row.updated_at, snapshot.updatedAt);
    assert.deepEqual(counts(), { insertAttempts: 1, insertedRows: 1 });
  } finally { sqlite.close(); }
});

test('an existing main row is returned unchanged without any bootstrap write', async () => {
  const { sqlite, db, counts } = database();
  try {
    const custom = structuredClone(snapshot.config);
    custom.formats[0].check.averageCheck = 7654;
    sqlite.prepare('INSERT INTO site_settings (id,value,version,updated_at) VALUES (?,?,?,?)')
      .run('main', JSON.stringify(custom), 80, '2026-11-07T10:00:00Z');
    const row = await readOrBootstrapSettings(db, snapshot);
    assert.deepEqual(JSON.parse(row.value), custom);
    assert.equal(row.version, 80);
    assert.equal(row.updated_at, '2026-11-07T10:00:00Z');
    assert.deepEqual(counts(), { insertAttempts: 0, insertedRows: 0 });
  } finally { sqlite.close(); }
});

test('two initial requests preserve a concurrent admin save and both reread the authoritative row', async () => {
  let releaseBothMisses;
  const bothMissed = new Promise(resolve => { releaseBothMisses = resolve; });
  let misses = 0;
  const saved = structuredClone(snapshot.config);
  saved.formats[1].check.averageCheck = 4321;
  const { sqlite, db, counts } = database({
    async afterRead(row) {
      if (row) return;
      if (++misses === 2) releaseBothMisses();
      await bothMissed;
    },
    afterInsert(connection, changes) {
      if (changes) {
        // An admin saves after the first bootstrap insert, before the second.
        connection.prepare('UPDATE site_settings SET value=?, version=?, updated_at=? WHERE id=?')
          .run(JSON.stringify(saved), 35, '2026-11-07T10:01:00Z', 'main');
      }
    },
  });
  try {
    const rows = await Promise.all([readOrBootstrapSettings(db, snapshot), readOrBootstrapSettings(db, snapshot)]);
    assert.equal(misses, 2);
    assert.deepEqual(counts(), { insertAttempts: 2, insertedRows: 1 });
    for (const row of rows) {
      assert.deepEqual(JSON.parse(row.value), saved);
      assert.equal(row.version, 35);
      assert.equal(row.updated_at, '2026-11-07T10:01:00Z');
    }
    assert.deepEqual(JSON.parse(sqlite.prepare('SELECT value FROM site_settings WHERE id=?').get('main').value), saved);
  } finally { sqlite.close(); }
});
