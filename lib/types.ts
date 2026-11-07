export type FormatId = 'bistro' | 'ramen' | 'sushi' | 'matcha';
export type PeriodId = '10-12' | '12-16' | '16-20' | '20-23';
export type DayType = 'weekday' | 'weekend';
export interface CatalogItem {
  id: string; name: string; category: string; icon: string;
  basePrice: number; foodCostPct: number; packagingCost: number;
  source: string; status: 'menu' | 'format';
}
export interface MenuRow {
  itemId: string; enabled: boolean; price: number; foodCostPct: number;
  packagingCost: number; weight: number; periods: PeriodId[];
}
export type SalesPlan = Record<DayType, Record<PeriodId, number>>;
export interface Expense { id: string; label: string; amount: number; }
export interface CheckSettings { averageCheck: number; foodCostPct: number; packagingPerCheck: number; }
export interface BistroService { enabled: boolean; hostessShiftPay: number; waitersMonthlyCost: number; }
export interface ModelScenario { averageCheck?: number; foodCostPct?: number; serviceEnabled?: boolean; }
export interface FormatConfig {
  id: FormatId; menu: MenuRow[]; salesPlan: SalesPlan; capacityPerHour: number;
  check: CheckSettings;
  service?: BistroService;
  expenses: Expense[];
  variable: { acquiringPct: number; taxPct: number; otherPct: number; includedPerSaleCost: number; };
  calendar: { weekdayDays: number; weekendDays: number; };
  investment: { capital: number; sharePct: number; fixedAnnualPct: number; };
}
export interface SiteConfig {
  schemaVersion: 2; updatedAt: string; catalog: CatalogItem[]; formats: FormatConfig[];
}
export interface BaselineSnapshot { config: SiteConfig; sourceVersion: number; savedAt: string; }
export interface ConfigEnvelope { config: SiteConfig; version: number; updatedAt: string; baseline: BaselineSnapshot; }
export const PERIODS: {id: PeriodId; hours: number; label: string}[] = [
  {id:'10-12',hours:2,label:'10:00–12:00'},
  {id:'12-16',hours:4,label:'12:00–16:00'},
  {id:'16-20',hours:4,label:'16:00–20:00'},
  {id:'20-23',hours:3,label:'20:00–23:00'},
];
