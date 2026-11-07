import { env } from 'cloudflare:workers';
import defaults from '../data/default-config.json';
import baselineMetadata from '../data/baseline-metadata.json';
import currentSettingsBootstrap from '../data/current-settings-bootstrap.json';
import type { BaselineSnapshot,ConfigEnvelope,SiteConfig } from './types';
import { migrateConfig } from './config-migration';
import { readOrBootstrapSettings } from './settings-bootstrap';
// The approved baseline is a versioned file, independent of subsequent D1 saves.
function readBaseline():BaselineSnapshot {
 return {config:migrateConfig(defaults),sourceVersion:baselineMetadata.sourceVersion,savedAt:baselineMetadata.savedAt};
}
export function database():D1Database {
 if(!env.DB)throw new Error('Хранилище временно недоступно.');
 return env.DB;
}
export async function readConfig():Promise<ConfigEnvelope>{
 const row=await readOrBootstrapSettings(database(),currentSettingsBootstrap);
 return {config:migrateConfig(JSON.parse(row.value)),version:row.version,updatedAt:row.updated_at,baseline:readBaseline()};
}
export async function saveConfig(config:SiteConfig,version:number):Promise<ConfigEnvelope|null>{
 const updatedAt=new Date().toISOString();const updated={...config,updatedAt};
 const result=version===0
  ?await database().prepare('INSERT OR IGNORE INTO site_settings (id,value,version,updated_at) VALUES (?,?,?,?)').bind('main',JSON.stringify(updated),1,updatedAt).run()
  :await database().prepare('UPDATE site_settings SET value=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(updated),updatedAt,'main',version).run();
 if(!result.meta.changes)return null;
 return {config:updated,version:version+1,updatedAt,baseline:readBaseline()};
}
