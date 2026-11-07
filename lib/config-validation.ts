import { z } from 'zod';
import type { SiteConfig } from './types';
const money=z.number().finite().min(0).max(20000000);
const pct=z.number().finite().min(0).max(100);
const period=z.enum(['10-12','12-16','16-20','20-23']);
const plan=z.object({'10-12':z.number().min(0).max(1000),'12-16':z.number().min(0).max(1000),'16-20':z.number().min(0).max(1000),'20-23':z.number().min(0).max(1000)}).strict();
const id=z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
const text=z.string().trim().min(1).max(240);
const schema=z.object({
 schemaVersion:z.literal(2),updatedAt:z.string().max(50),
 catalog:z.array(z.object({id,name:text,category:z.string().min(1).max(80),icon:z.string().min(1).max(40),basePrice:money,foodCostPct:pct,packagingCost:money,source:z.string().max(700),status:z.enum(['menu','format'])}).strict()).min(1).max(300),
 formats:z.array(z.object({
  id:z.enum(['bistro','ramen','sushi','matcha']),
  check:z.object({averageCheck:money,foodCostPct:pct,packagingPerCheck:money}).strict(),
  service:z.object({enabled:z.boolean(),hostessShiftPay:money,waitersMonthlyCost:money}).strict().optional(),
  menu:z.array(z.object({itemId:id,enabled:z.boolean(),price:money,foodCostPct:pct,packagingCost:money,weight:pct,periods:z.array(period).max(4)}).strict()).max(300),
  salesPlan:z.object({weekday:plan,weekend:plan}).strict(),capacityPerHour:z.number().min(0).max(1000),
  expenses:z.array(z.object({id,label:text,amount:money}).strict()).max(30),
  variable:z.object({acquiringPct:pct,taxPct:pct,otherPct:pct,includedPerSaleCost:money}).strict(),
  calendar:z.object({weekdayDays:z.number().int().min(0).max(31),weekendDays:z.number().int().min(0).max(31)}).strict(),
  investment:z.object({capital:z.number().finite().min(1).max(500000000),sharePct:pct,fixedAnnualPct:pct}).strict(),
 }).strict()).length(4),
}).strict();
export function validateConfig(value:unknown):SiteConfig {
 const config=schema.parse(value);
 const ids=new Set(config.catalog.map(i=>i.id));
 if(ids.size!==config.catalog.length)throw new Error('В каталоге повторяются идентификаторы позиций.');
 if(new Set(config.formats.map(f=>f.id)).size!==4)throw new Error('Нужны четыре разных формата.');
 for(const f of config.formats){
  if(f.id==='bistro'&&!f.service)throw new Error('Для бистро нужны настройки обслуживания и двух хостес.');
  if(f.id!=='bistro'&&f.service)throw new Error('Переключатель обслуживания доступен только для бистро.');
  if(f.id==='bistro'&&f.expenses.some(e=>['service-payroll','hostess-payroll','waiters-payroll'].includes(e.id)))throw new Error('Зал бистро считается в настройках обслуживания, отдельно от общих расходов.');
  if(f.calendar.weekdayDays+f.calendar.weekendDays<1||f.calendar.weekdayDays+f.calendar.weekendDays>31)throw new Error('В месяце должно быть от 1 до 31 рабочего дня.');
  if(new Set(f.menu.map(r=>r.itemId)).size!==f.menu.length)throw new Error('В меню формата есть повторные позиции.');
  if(f.menu.length!==ids.size)throw new Error('Каждый формат должен содержать весь каталог; ненужные позиции можно выключить.');
  if(new Set(f.expenses.map(r=>r.id)).size!==f.expenses.length)throw new Error('Расходы должны иметь разные идентификаторы.');
  for(const row of f.menu){
   if(!ids.has(row.itemId))throw new Error('Позиция меню отсутствует в общем каталоге.');
   if(row.enabled&&row.price<=0)throw new Error('У включённой позиции должна быть указана цена больше нуля.');
   if(new Set(row.periods).size!==row.periods.length)throw new Error('Периоды не должны повторяться.');
  }
 }
 return config;
}
