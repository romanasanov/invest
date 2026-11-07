import type { SiteConfig,FormatConfig,FormatId,CheckSettings } from './types';

// Independent starting assumptions. Menu edits never derive these values.
export const CHECK_DEFAULTS:Record<FormatId,CheckSettings>={
 bistro:{averageCheck:1200,foodCostPct:35,packagingPerCheck:25},
 ramen:{averageCheck:650,foodCostPct:36,packagingPerCheck:40},
 sushi:{averageCheck:800,foodCostPct:38,packagingPerCheck:35},
 matcha:{averageCheck:450,foodCostPct:28,packagingPerCheck:20},
};

/** Upgrade saved v1 settings without overwriting menus, prices, rent or custom plans. */
export function migrateConfig(value:unknown):SiteConfig{
 const input=value as SiteConfig & {schemaVersion:number};
 if(input.schemaVersion===2)return structuredClone(input);
 if(Number(input.schemaVersion)!==1)throw new Error('Неизвестная версия настроек.');
 const config=structuredClone(input);
 config.schemaVersion=2;
 config.formats=config.formats.map(f=>{
  const next={...f,check:{...CHECK_DEFAULTS[f.id]}} as FormatConfig;
  if(f.id==='bistro'){
   const oldService=f.expenses.find(e=>e.id==='service-payroll');
   const days=f.calendar.weekdayDays+f.calendar.weekendDays;
   const hostessShiftPay=3500;
   next.service={enabled:true,hostessShiftPay,waitersMonthlyCost:oldService?Math.max(0,oldService.amount-2*hostessShiftPay*days):200000};
   next.expenses=f.expenses.filter(e=>e.id!=='service-payroll');
  }
  return next;
 });
 return config;
}
