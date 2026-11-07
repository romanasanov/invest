import type { CheckSettings, DayType, FormatId, ModelScenario, PeriodId, SalesPlan, SiteConfig } from './types';

/** Demand, capacity and units are CHECKS. The menu is informational only. */
export const MODEL_PERIODS: ReadonlyArray<{ id: PeriodId; hours: number }> = [
  { id: '10-12', hours: 2 }, { id: '12-16', hours: 4 },
  { id: '16-20', hours: 4 }, { id: '20-23', hours: 3 },
];
const DAY_TYPES: readonly DayType[] = ['weekday', 'weekend'];

export interface OperatingTotals {
  demandUnits: number; servedUnits: number; lostUnits: number; capacityUnits: number;
  revenue: number; cogs: number; packaging: number; included: number;
  acquiring: number; businessTax: number; otherVariable: number;
  variableCosts: number; contribution: number;
}
export interface MonthlyTotals extends OperatingTotals {
  fixedCosts: number; profit: number;
  averageSalePrice: number | null; foodCostPct: number | null;
  contributionMarginPct: number | null;
}
export interface UnitEconomics {
  price: number; cogs: number; packaging: number; included: number;
  acquiring: number; businessTax: number; otherVariable: number;
  variableCosts: number; contribution: number;
}
export interface PeriodMixItem {
  itemId: string; sharePct: number; price: number; cogsPerUnit: number;
  packagingPerUnit: number;
}
export interface PeriodResult {
  dayType: DayType; periodId: PeriodId; hours: number; days: number;
  demandPerHour: number; servedPerHour: number; lostPerHour: number;
  capacityPerHour: number; nominalCapacityPerHour: number;
  /** Offered demand / available capacity. May exceed 100; null when capacity is zero. */
  utilizationPct: number | null;
  busyPct: number | null; overloaded: boolean; available: boolean;
  mix: PeriodMixItem[]; unit: UnitEconomics;
  daily: OperatingTotals; totals: OperatingTotals;
}
export interface DayResult {
  dayType: DayType; days: number; hours: number;
  /** One representative day, excluding monthly fixed expenses. */
  daily: OperatingTotals;
  /** All days of this type in the configured month. */
  monthly: OperatingTotals;
}
export interface MenuResult {
  itemId: string; name: string; category: string; icon: string;
  enabled: boolean; periods: PeriodId[]; price: number; foodCostPct: number;
  packagingCost: number; weight: number;
  /** Legacy display fields only: all economic metrics below remain zero. */
  salesSharePct: number;
  units: number; revenue: number; cogs: number; packaging: number;
}
export interface CostRow {
  id: string; label: string; kind: 'variable' | 'fixed'; amount: number;
  /** For revenue-based rates only. */
  ratePct?: number;
}
export interface MoneyFlowStep {
  id: string; label: string; kind: 'income' | 'cost' | 'subtotal';
  amount: number; remaining: number;
}
export interface BreakEvenResult {
  revenue: number | null; units: number | null;
  unitsPerDay: number | null; unitsPerHour: number | null;
  marginPct: number | null; contributionPerSale: number | null;
  averageSalePrice: number | null;
  basis: 'check-settings';
  /** Compares fixed expenses with contribution at full check capacity in all trading hours. */
  withinCapacity: boolean | null;
  capacityContribution: number; capacityProfit: number;
}
export interface ActiveInvestmentResult {
  capital: number; sharePct: number; monthlyPayout: number;
  annualPayout: number; annualReturnPct: number | null;
}
export interface PassiveInvestmentResult {
  capital: number; annualRatePct: number; monthlyPayout: number; annualPayout: number;
  /** Operating profit / proposed monthly payment; negative profit gives a negative ratio. */
  coverageRatio: number | null; covered: boolean;
  fundingGap: number; remainingProfitAfterPayout: number;
}
export interface ServiceResult {
  enabled: boolean; hostessesPerShift: 2; hostessMonthlyCost: number;
  /** Applied cost, zero when table service is disabled. */
  waitersMonthlyCost: number; totalMonthlyCost: number;
}
export interface ModelResult {
  formatId: FormatId; unitLabel: 'чек';
  check: CheckSettings; service: ServiceResult | null;
  calendar: { weekdayDays: number; weekendDays: number; totalDays: number; operatingHours: number };
  capacityPerHour: number; periods: PeriodResult[]; days: Record<DayType, DayResult>;
  monthly: MonthlyTotals; menu: MenuResult[];
  costRows: CostRow[]; flow: MoneyFlowStep[]; breakEven: BreakEvenResult;
  active: ActiveInvestmentResult; passive: PassiveInvestmentResult;
  personalTaxesIncluded: false; warnings: string[];
}

const nn = (value: number | undefined, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;
const emptyTotals = (): OperatingTotals => ({
  demandUnits: 0, servedUnits: 0, lostUnits: 0, capacityUnits: 0,
  revenue: 0, cogs: 0, packaging: 0, included: 0,
  acquiring: 0, businessTax: 0, otherVariable: 0, variableCosts: 0, contribution: 0,
});
const emptyUnit = (): UnitEconomics => ({
  price: 0, cogs: 0, packaging: 0, included: 0, acquiring: 0,
  businessTax: 0, otherVariable: 0, variableCosts: 0, contribution: 0,
});
function addTotals(target: OperatingTotals, source: OperatingTotals): void {
  for (const key of Object.keys(target) as (keyof OperatingTotals)[]) target[key] += source[key];
}
function scaleTotals(source: OperatingTotals, scale: number): OperatingTotals {
  const result = emptyTotals();
  for (const key of Object.keys(result) as (keyof OperatingTotals)[]) result[key] = source[key] * scale;
  return result;
}

/** Pure calculation; does not mutate config, catalog, menu, expenses or salesPlan. */
export function calculateModel(config: SiteConfig, formatId: FormatId, salesPlan?: SalesPlan, scenario?: ModelScenario): ModelResult {
  const format = config.formats.find((entry) => entry.id === formatId);
  if (!format) throw new Error(`Формат «${formatId}» не найден`);
  const warnings = new Set<string>();
  const plan = salesPlan ?? format.salesPlan;
  const weekdayDays = nn(format.calendar.weekdayDays);
  const weekendDays = nn(format.calendar.weekendDays);
  const totalDays = weekdayDays + weekendDays;
  const hoursPerDay = MODEL_PERIODS.reduce((sum, period) => sum + period.hours, 0);
  const operatingHours = totalDays * hoursPerDay;
  const capacityPerHour = nn(format.capacityPerHour);
  const acquiringPct = nn(format.variable.acquiringPct);
  const taxPct = nn(format.variable.taxPct);
  const otherPct = nn(format.variable.otherPct);
  const includedPerSaleCost = nn(format.variable.includedPerSaleCost);
  const check: CheckSettings = {
    averageCheck: nn(scenario?.averageCheck ?? format.check?.averageCheck),
    foodCostPct: nn(scenario?.foodCostPct ?? format.check?.foodCostPct),
    packagingPerCheck: nn(format.check?.packagingPerCheck),
  };
  const unit = emptyUnit();
  unit.price = check.averageCheck;
  unit.cogs = check.averageCheck * check.foodCostPct / 100;
  unit.packaging = check.packagingPerCheck;
  unit.included = includedPerSaleCost;
  unit.acquiring = check.averageCheck * acquiringPct / 100;
  unit.businessTax = check.averageCheck * taxPct / 100;
  unit.otherVariable = check.averageCheck * otherPct / 100;
  unit.variableCosts = unit.cogs + unit.packaging + unit.included + unit.acquiring + unit.businessTax + unit.otherVariable;
  unit.contribution = check.averageCheck - unit.variableCosts;

  // The catalog only supplies the informational menu. None of these fields enter the economy.
  const catalog = new Map(config.catalog.map((item) => [item.id, item]));
  const menu: MenuResult[] = format.menu.map((row) => {
    const item = catalog.get(row.itemId);
    return {
      itemId: row.itemId, name: item?.name ?? row.itemId, category: item?.category ?? '', icon: item?.icon ?? '',
      enabled: row.enabled, periods: [...row.periods], price: nn(row.price),
      foodCostPct: nn(row.foodCostPct), packagingCost: nn(row.packagingCost), weight: nn(row.weight),
      salesSharePct: 0, units: 0, revenue: 0, cogs: 0, packaging: 0,
    };
  });
  const periods: PeriodResult[] = [];
  const days = Object.fromEntries(DAY_TYPES.map((dayType) => [dayType, {
    dayType, days: dayType === 'weekday' ? weekdayDays : weekendDays,
    hours: hoursPerDay, daily: emptyTotals(), monthly: emptyTotals(),
  }])) as Record<DayType, DayResult>;
  const totals = emptyTotals();
  const capacityContribution = capacityPerHour * operatingHours * unit.contribution;

  for (const dayType of DAY_TYPES) {
    for (const period of MODEL_PERIODS) {
      const daysCount = days[dayType].days;
      const demandPerHour = nn(plan?.[dayType]?.[period.id]);
      const servedPerHour = Math.min(demandPerHour, capacityPerHour);
      const lostPerHour = Math.max(0, demandPerHour - servedPerHour);
      const daily = emptyTotals();
      daily.demandUnits = demandPerHour * period.hours;
      daily.servedUnits = servedPerHour * period.hours;
      daily.lostUnits = lostPerHour * period.hours;
      daily.capacityUnits = capacityPerHour * period.hours;
      daily.revenue = daily.servedUnits * unit.price;
      daily.cogs = daily.servedUnits * unit.cogs;
      daily.packaging = daily.servedUnits * unit.packaging;
      daily.included = daily.servedUnits * unit.included;
      daily.acquiring = daily.servedUnits * unit.acquiring;
      daily.businessTax = daily.servedUnits * unit.businessTax;
      daily.otherVariable = daily.servedUnits * unit.otherVariable;
      daily.variableCosts = daily.cogs + daily.packaging + daily.included + daily.acquiring + daily.businessTax + daily.otherVariable;
      daily.contribution = daily.revenue - daily.variableCosts;
      const monthlyPeriod = scaleTotals(daily, daysCount);
      addTotals(days[dayType].daily, daily);
      addTotals(days[dayType].monthly, monthlyPeriod);
      addTotals(totals, monthlyPeriod);
      periods.push({
        dayType, periodId: period.id, hours: period.hours, days: daysCount,
        demandPerHour, servedPerHour, lostPerHour, capacityPerHour,
        nominalCapacityPerHour: capacityPerHour,
        utilizationPct: ratio(demandPerHour * 100, capacityPerHour),
        busyPct: ratio(servedPerHour * 100, capacityPerHour),
        overloaded: lostPerHour > 0, available: capacityPerHour > 0, mix: [], unit: { ...unit }, daily, totals: monthlyPeriod,
      });
    }
  }

  const serviceEnabled = scenario?.serviceEnabled ?? format.service?.enabled ?? false;
  const service: ServiceResult | null = formatId === 'bistro' ? {
    enabled: serviceEnabled,
    hostessesPerShift: 2,
    hostessMonthlyCost: 2 * nn(format.service?.hostessShiftPay) * totalDays,
    waitersMonthlyCost: serviceEnabled ? nn(format.service?.waitersMonthlyCost) : 0,
    totalMonthlyCost: 0,
  } : null;
  if (service) service.totalMonthlyCost = service.hostessMonthlyCost + service.waitersMonthlyCost;

  const fixedRows: CostRow[] = format.expenses.map((expense) => ({
    id: `fixed:${expense.id}`, label: expense.label, kind: 'fixed', amount: nn(expense.amount),
  }));
  if (service) {
    fixedRows.push({ id: 'service:hostesses', label: 'Хостес: 2 человека в каждой смене', kind: 'fixed', amount: service.hostessMonthlyCost });
    fixedRows.push({ id: 'service:waiters', label: service.enabled ? 'Официанты: обслуживание за столом' : 'Официанты: обслуживание выключено', kind: 'fixed', amount: service.waitersMonthlyCost });
  }
  const fixedCosts = fixedRows.reduce((sum, row) => sum + row.amount, 0);
  const monthly: MonthlyTotals = {
    ...totals, fixedCosts, profit: totals.contribution - fixedCosts,
    averageSalePrice: ratio(totals.revenue, totals.servedUnits),
    foodCostPct: ratio(totals.cogs * 100, totals.revenue),
    contributionMarginPct: ratio(totals.contribution * 100, totals.revenue),
  };
  const positiveMargin = unit.price > 0 && unit.contribution > 0;
  const beUnits = positiveMargin ? fixedCosts / unit.contribution : null;
  const breakEven: BreakEvenResult = {
    revenue: beUnits !== null ? beUnits * unit.price : null,
    units: beUnits, unitsPerDay: beUnits !== null ? ratio(beUnits, totalDays) : null,
    unitsPerHour: beUnits !== null ? ratio(beUnits, operatingHours) : null,
    marginPct: ratio(unit.contribution * 100, unit.price),
    contributionPerSale: unit.contribution, averageSalePrice: unit.price,
    basis: 'check-settings',
    withinCapacity: positiveMargin && totalDays > 0 ? capacityContribution >= fixedCosts : null,
    capacityContribution, capacityProfit: capacityContribution - fixedCosts,
  };
  if (unit.price === 0) warnings.add('Средний чек равен нулю: маржа и точка безубыточности не определены.');
  else if (!positiveMargin) warnings.add('Маржа чека после переменных расходов неположительная: точки безубыточности при текущих настройках нет.');
  if (capacityPerHour === 0) warnings.add('Пропускная способность равна нулю: выполнить заказы невозможно.');
  if (totalDays === 0) warnings.add('В календаре нет рабочих дней: показатели за месяц равны нулю до постоянных расходов.');
  if (breakEven.withinCapacity === false) warnings.add('Полная загрузка при заданной мощности не покрывает постоянные расходы.');

  const capital = nn(format.investment.capital);
  const sharePct = Math.min(100, nn(format.investment.sharePct));
  const annualRatePct = nn(format.investment.fixedAnnualPct);
  const activeMonthly = Math.max(0, monthly.profit) * sharePct / 100;
  const passiveAnnual = capital * annualRatePct / 100;
  const passiveMonthly = passiveAnnual / 12;
  const active: ActiveInvestmentResult = {
    capital, sharePct, monthlyPayout: activeMonthly, annualPayout: activeMonthly * 12,
    annualReturnPct: ratio(activeMonthly * 12 * 100, capital),
  };
  const passive: PassiveInvestmentResult = {
    capital, annualRatePct, annualPayout: passiveAnnual, monthlyPayout: passiveMonthly,
    coverageRatio: ratio(monthly.profit, passiveMonthly), covered: monthly.profit >= passiveMonthly,
    fundingGap: Math.max(0, passiveMonthly - monthly.profit),
    remainingProfitAfterPayout: monthly.profit - passiveMonthly,
  };
  if (capital === 0) warnings.add('Взнос инвестора равен нулю: процент доходности долевого участия не определён.');

  const variableRows: CostRow[] = [
    { id: 'cogs', label: 'Продукты', kind: 'variable', amount: totals.cogs, ratePct: check.foodCostPct },
    { id: 'packaging', label: 'Упаковка', kind: 'variable', amount: totals.packaging },
    { id: 'included', label: 'Включённые напитки и подарки', kind: 'variable', amount: totals.included },
    { id: 'acquiring', label: 'Эквайринг', kind: 'variable', amount: totals.acquiring, ratePct: acquiringPct },
    { id: 'businessTax', label: 'Налог бизнеса (% выручки, допущение)', kind: 'variable', amount: totals.businessTax, ratePct: taxPct },
    { id: 'otherVariable', label: 'Прочие переменные расходы', kind: 'variable', amount: totals.otherVariable, ratePct: otherPct },
  ];
  const costRows = [...variableRows, ...fixedRows];
  let remaining = totals.revenue;
  const flow: MoneyFlowStep[] = [{ id: 'revenue', label: 'Выручка', kind: 'income', amount: remaining, remaining }];
  for (const row of variableRows) {
    remaining -= row.amount;
    flow.push({ id: row.id, label: row.label, kind: 'cost', amount: row.amount, remaining });
  }
  flow.push({ id: 'contribution', label: 'На покрытие постоянных расходов', kind: 'subtotal', amount: totals.contribution, remaining: totals.contribution });
  flow.push({ id: 'fixedCosts', label: 'Постоянные расходы', kind: 'cost', amount: fixedCosts, remaining: monthly.profit });
  flow.push({ id: 'profit', label: 'Прибыль точки', kind: 'subtotal', amount: monthly.profit, remaining: monthly.profit });
  return {
    formatId, unitLabel: 'чек', check, service,
    calendar: { weekdayDays, weekendDays, totalDays, operatingHours }, capacityPerHour,
    periods, days, monthly, menu, costRows, flow, breakEven, active, passive,
    personalTaxesIncluded: false, warnings: [...warnings],
  };
}
