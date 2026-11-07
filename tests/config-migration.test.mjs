import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migrateConfig,CHECK_DEFAULTS } from '../lib/config-migration.ts';
import { validateConfig } from '../lib/config-validation.ts';
const defaults=JSON.parse(fs.readFileSync(new URL('../data/default-config.json',import.meta.url),'utf8'));
test('v1 saved menus, rent and custom plans survive a v2 upgrade without linking menu to check settings',()=>{
 const legacy=structuredClone(defaults);legacy.schemaVersion=1;
 for(const f of legacy.formats){delete f.check;delete f.service;}
 const bistro=legacy.formats[0];bistro.expenses.push({id:'service-payroll',label:'Зал и касса',amount:409500});bistro.expenses[0].amount=777777;bistro.salesPlan.weekday['10-12']=17;bistro.menu[0].price=1234;
 const before=structuredClone(legacy);const upgraded=migrateConfig(legacy);
 assert.deepEqual(legacy,before);assert.equal(upgraded.schemaVersion,2);
 assert.deepEqual(upgraded.formats[0].menu,bistro.menu);assert.deepEqual(upgraded.formats[0].salesPlan,bistro.salesPlan);assert.equal(upgraded.formats[0].expenses[0].amount,777777);
 assert.deepEqual(upgraded.formats[0].check,CHECK_DEFAULTS.bistro);assert.equal(upgraded.formats[0].service.waitersMonthlyCost,199500);assert.equal(upgraded.formats[0].service.hostessShiftPay,3500);
 assert.equal(upgraded.formats[0].expenses.some(e=>e.id==='service-payroll'),false);assert.doesNotThrow(()=>validateConfig(upgraded));
});
test('v2 settings are idempotent and returned without shared references',()=>{
 const data=structuredClone(defaults);data.formats[0].check.averageCheck=1570;data.formats[0].service.enabled=false;
 const again=migrateConfig(data);assert.deepEqual(again,data);again.formats[0].check.averageCheck=999;assert.equal(data.formats[0].check.averageCheck,1570);
});
test('validation rejects duplicated bistro service costs and service options on other formats',()=>{
 const data=structuredClone(defaults);data.formats[0].expenses.push({id:'service-payroll',label:'Дублирующий зал',amount:1});assert.throws(()=>validateConfig(data));
 const other=structuredClone(defaults);other.formats[1].service=other.formats[0].service;assert.throws(()=>validateConfig(other));
});
