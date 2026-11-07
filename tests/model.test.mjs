import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateModel, MODEL_PERIODS } from '../lib/model.ts';
import { PERIODS } from '../lib/types.ts';

const periods = ['10-12', '12-16', '16-20', '20-23'];
const rates = (value = 0) => Object.fromEntries(periods.map((id) => [id, value]));
const plan = (weekday = 0, weekend = 0) => ({ weekday: rates(weekday), weekend: rates(weekend) });
const close = (actual, expected, label = '') => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9 * Math.max(1, Math.abs(expected)),
  `${label}: expected ${expected}, got ${actual}`,
);
function fixture() {
  const salesPlan = plan(); salesPlan.weekday['10-12'] = 10;
  return {
    schemaVersion: 2, updatedAt: '2026-11-01T00:00:00Z',
    catalog: [{ id: 'dish', name: 'Рамен', category: 'ramen', icon: 'ramen', basePrice: 900, foodCostPct: 99, packagingCost: 80, source: 'fixture', status: 'menu' }],
    formats: [{
      id: 'ramen', menu: [{ itemId: 'dish', enabled: true, price: 900, foodCostPct: 99, packagingCost: 80, weight: 100, periods: [...periods] }],
      check: { averageCheck: 100, foodCostPct: 30, packagingPerCheck: 5 },
      salesPlan, capacityPerHour: 100,
      expenses: [{ id: 'rent', label: 'Аренда', amount: 400 }, { id: 'staff', label: 'Команда', amount: 200 }],
      variable: { acquiringPct: 2, taxPct: 6, otherPct: 2, includedPerSaleCost: 5 },
      calendar: { weekdayDays: 1, weekendDays: 0 },
      investment: { capital: 10000, sharePct: 50, fixedAnnualPct: 24 },
    }],
  };
}
function economy(result) { const { menu, ...rest } = result; return rest; }
function allFinite(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `Non-finite result: ${value}`);
  else if (Array.isArray(value)) value.forEach(allFinite);
  else if (value && typeof value === 'object') Object.values(value).forEach(allFinite);
}
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}

test('known check-based waterfall reconciles without deducting passive payments from the active scenario', () => {
  const result = calculateModel(fixture(), 'ramen');
  const expected = { demandUnits: 20, servedUnits: 20, lostUnits: 0, revenue: 2000, cogs: 600, packaging: 100, included: 100, acquiring: 40, businessTax: 120, otherVariable: 40, variableCosts: 1000, contribution: 1000, fixedCosts: 600, profit: 400 };
  for (const [key, value] of Object.entries(expected)) close(result.monthly[key], value, key);
  close(result.costRows.reduce((sum, row) => sum + row.amount, 0), 1600);
  close(result.flow.at(-1).remaining, 400);
  close(result.active.monthlyPayout, 200); close(result.active.annualPayout, 2400);
  close(result.active.annualReturnPct, 24);
  close(result.passive.monthlyPayout, 200); close(result.passive.annualPayout, 2400);
  close(result.passive.coverageRatio, 2); close(result.passive.remainingProfitAfterPayout, 200);
  close(result.breakEven.revenue, 1200); close(result.breakEven.units, 12);
  close(result.breakEven.unitsPerDay, 12); close(result.breakEven.unitsPerHour, 12 / 13);
  close(result.breakEven.marginPct, 50);
  assert.equal(result.breakEven.basis, 'check-settings');
  assert.equal(result.personalTaxesIncluded, false); assert.equal(result.unitLabel, 'чек');
  assert.deepEqual(result.check, { averageCheck: 100, foodCostPct: 30, packagingPerCheck: 5 });
  assert.equal(result.service, null);
});

test('editing, disabling, removing or orphaning the entire menu cannot change any economic output', () => {
  const baseline = economy(calculateModel(fixture(), 'ramen'));
  for (const change of [
    (c) => { Object.assign(c.formats[0].menu[0], { price: 50000, foodCostPct: 100, packagingCost: 9000, weight: 0, periods: [], enabled: false }); },
    (c) => { c.formats[0].menu = []; },
    (c) => { c.catalog = []; },
    (c) => { c.catalog = []; c.formats[0].menu = []; },
    (c) => { c.formats[0].menu.push({ ...c.formats[0].menu[0], itemId: 'unknown', price: 0, weight: 0 }); },
  ]) {
    const config = fixture(); change(config);
    assert.deepEqual(economy(calculateModel(config, 'ramen')), baseline);
  }
  const result = calculateModel(fixture(), 'ramen');
  assert.equal(result.menu[0].name, 'Рамен'); assert.equal(result.menu[0].price, 900);
  for (const metric of ['units', 'revenue', 'cogs', 'packaging', 'salesSharePct']) close(result.menu[0][metric], 0);
  assert.ok(result.periods.every((period) => period.mix.length === 0));
});

test('average-check and food-cost overrides affect only the local scenario, independently of menu prices', () => {
  const config = fixture(); const before = structuredClone(config);
  const scenario = freezeDeep({ averageCheck: 200, foodCostPct: 20 });
  const result = calculateModel(freezeDeep(config), 'ramen', undefined, scenario);
  close(result.monthly.servedUnits, 20); close(result.monthly.revenue, 4000);
  close(result.monthly.cogs, 800); close(result.monthly.packaging, 100);
  close(result.monthly.profit, 2000); close(result.active.monthlyPayout, 1000);
  assert.deepEqual(result.check, { averageCheck: 200, foodCostPct: 20, packagingPerCheck: 5 });
  assert.deepEqual(config, before); assert.deepEqual(scenario, { averageCheck: 200, foodCostPct: 20 });
  close(calculateModel(config, 'ramen').monthly.profit, 400);
  close(calculateModel(config, 'ramen', undefined, { foodCostPct: 0 }).monthly.cogs, 0);
});

test('bistro has two hostesses in both service modes, and waiters are an additional fixed expense', () => {
  const config = fixture(); const format = config.formats[0]; format.id = 'bistro';
  format.calendar = { weekdayDays: 22, weekendDays: 8 };
  format.service = { enabled: true, hostessShiftPay: 3500, waitersMonthlyCost: 199500 };
  const full = calculateModel(config, 'bistro');
  const counter = calculateModel(config, 'bistro', undefined, { serviceEnabled: false });
  assert.deepEqual(full.service, { enabled: true, hostessesPerShift: 2, hostessMonthlyCost: 210000, waitersMonthlyCost: 199500, totalMonthlyCost: 409500 });
  assert.deepEqual(counter.service, { enabled: false, hostessesPerShift: 2, hostessMonthlyCost: 210000, waitersMonthlyCost: 0, totalMonthlyCost: 210000 });
  close(full.monthly.fixedCosts, 410100); close(counter.monthly.fixedCosts, 210600);
  close(counter.monthly.profit - full.monthly.profit, 199500);
  close(full.monthly.revenue, counter.monthly.revenue); close(full.monthly.servedUnits, counter.monthly.servedUnits);
  for (const result of [full, counter]) {
    close(result.costRows.find((row) => row.id === 'service:hostesses').amount, 210000);
    close(result.monthly.revenue - result.costRows.reduce((sum, row) => sum + row.amount, 0), result.monthly.profit);
    assert.equal(result.costRows.filter((row) => row.id === 'service:hostesses').length, 1);
  }
  assert.equal(format.service.enabled, true);
  format.service.enabled = false;
  close(calculateModel(config, 'bistro', undefined, { serviceEnabled: true }).service.waitersMonthlyCost, 199500);
});

test('hostess pay scales with trading days while the monthly waiter budget does not; corners ignore the service override', () => {
  const config = fixture(); const format = config.formats[0]; format.id = 'bistro';
  format.calendar = { weekdayDays: 10, weekendDays: 5 };
  format.service = { enabled: true, hostessShiftPay: 3500, waitersMonthlyCost: 199500 };
  const result = calculateModel(config, 'bistro');
  close(result.service.hostessMonthlyCost, 105000); close(result.service.waitersMonthlyCost, 199500);
  const corner = fixture();
  assert.deepEqual(calculateModel(corner, 'ramen', undefined, { serviceEnabled: true }), calculateModel(corner, 'ramen'));
});

test('capacity caps executed checks and costs, with offered utilisation above 100%', () => {
  const config = fixture(); config.formats[0].capacityPerHour = 4;
  const result = calculateModel(config, 'ramen'); const morning = result.periods[0];
  close(morning.demandPerHour, 10); close(morning.servedPerHour, 4); close(morning.lostPerHour, 6);
  close(morning.utilizationPct, 250); close(morning.busyPct, 100);
  close(result.monthly.servedUnits, 8); close(result.monthly.lostUnits, 12);
  close(result.monthly.revenue, 800); close(result.monthly.cogs, 240);
  assert.equal(morning.overloaded, true);
});

test('zero demand retains a direct check-based break-even and fixed expenses, even with no menu', () => {
  const config = fixture(); config.formats[0].salesPlan = plan(); config.formats[0].menu = []; config.catalog = [];
  const result = calculateModel(config, 'ramen');
  close(result.monthly.revenue, 0); close(result.monthly.variableCosts, 0); close(result.monthly.profit, -600);
  close(result.breakEven.revenue, 1200); close(result.breakEven.units, 12);
  assert.equal(result.breakEven.basis, 'check-settings'); close(result.active.monthlyPayout, 0);
  close(result.passive.monthlyPayout, 200); close(result.passive.coverageRatio, -3);
  close(result.passive.fundingGap, 800); assert.equal(result.passive.covered, false); allFinite(result);
});

test('nonpositive check contribution and 100% food cost yield no finite break-even', () => {
  for (const foodCostPct of [80, 100, 120]) {
    const result = calculateModel(fixture(), 'ramen', undefined, { foodCostPct });
    assert.ok(result.breakEven.contributionPerSale <= 0);
    assert.equal(result.breakEven.revenue, null); assert.equal(result.breakEven.units, null);
    assert.equal(result.breakEven.unitsPerDay, null); assert.equal(result.breakEven.unitsPerHour, null);
    assert.ok(result.warnings.some((warning) => warning.includes('неположительная'))); allFinite(result);
  }
});

test('zero average-check override is respected, with zero revenue and real per-check expenses', () => {
  const result = calculateModel(fixture(), 'ramen', undefined, { averageCheck: 0 });
  close(result.check.averageCheck, 0); close(result.monthly.revenue, 0); close(result.monthly.cogs, 0);
  close(result.monthly.servedUnits, 20); close(result.monthly.packaging, 100); close(result.monthly.included, 100);
  close(result.monthly.profit, -800); assert.equal(result.breakEven.revenue, null);
  assert.ok(result.warnings.some((warning) => warning.includes('Средний чек равен нулю'))); allFinite(result);
});

test('zero and non-finite capacity serve no checks and never divide by zero', () => {
  for (const capacity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const config = fixture(); config.formats[0].capacityPerHour = capacity;
    const result = calculateModel(config, 'ramen');
    close(result.monthly.servedUnits, 0); close(result.monthly.lostUnits, 20);
    assert.equal(result.periods[0].utilizationPct, null); assert.equal(result.periods[0].busyPct, null);
    close(result.breakEven.revenue, 1200); assert.equal(result.breakEven.withinCapacity, false); allFinite(result);
  }
});

test('22 weekdays and 8 weekend days multiply 2/4/4/3 hours; day results reconcile to the month', () => {
  assert.deepEqual(MODEL_PERIODS, PERIODS.map(({ id, hours }) => ({ id, hours })));
  const config = fixture(); const format = config.formats[0];
  format.calendar = { weekdayDays: 22, weekendDays: 8 }; format.salesPlan = plan(1, 2);
  const result = calculateModel(config, 'ramen');
  close(result.calendar.operatingHours, 390);
  close(result.days.weekday.daily.servedUnits, 13); close(result.days.weekend.daily.servedUnits, 26);
  close(result.days.weekday.monthly.servedUnits, 286); close(result.days.weekend.monthly.servedUnits, 208);
  close(result.monthly.servedUnits, 494); close(result.monthly.revenue, 49400);
  for (const key of ['revenue', 'cogs', 'packaging', 'included', 'contribution', 'servedUnits', 'lostUnits']) close(result.days.weekday.monthly[key] + result.days.weekend.monthly[key], result.monthly[key], key);
  const override = { weekday: { '10-12': 1, '12-16': 2, '16-20': 3, '20-23': 4 }, weekend: rates(0) };
  close(calculateModel(config, 'ramen', override).monthly.servedUnits, (2 + 8 + 12 + 12) * 22);
});

test('zero calendar and capital return null ratios, but preserve check-based margin and monthly fixed costs', () => {
  const config = fixture(); const format = config.formats[0];
  format.calendar = { weekdayDays: 0, weekendDays: 0 }; format.investment.capital = 0;
  const result = calculateModel(config, 'ramen');
  close(result.monthly.revenue, 0); close(result.monthly.profit, -600);
  assert.equal(result.active.annualReturnPct, null); assert.equal(result.passive.coverageRatio, null);
  assert.equal(result.breakEven.unitsPerDay, null); assert.equal(result.breakEven.unitsPerHour, null);
  close(result.breakEven.revenue, 1200); allFinite(result);
});

test('input, overrides and result objects are not shared mutable financial state', () => {
  const config = fixture(); const snapshot = structuredClone(config); const override = plan(2, 3);
  const overrideSnapshot = structuredClone(override); freezeDeep(config); freezeDeep(override);
  const scenario = freezeDeep({ averageCheck: 100, foodCostPct: 30 });
  const result = calculateModel(config, 'ramen', override, scenario);
  assert.deepEqual(config, snapshot); assert.deepEqual(override, overrideSnapshot);
  result.menu[0].periods.splice(0); result.monthly.revenue = -100; result.periods[0].daily.revenue = -200;
  result.check.averageCheck = 9000; result.periods[0].unit.price = 8000;
  const again = calculateModel(config, 'ramen', override, scenario);
  assert.deepEqual(config, snapshot); assert.equal(again.menu[0].periods.length, 4);
  close(again.monthly.revenue, 2600); close(again.periods[0].daily.revenue, 400);
  close(again.check.averageCheck, 100); close(again.periods[0].unit.price, 100);
  close(result.periods[1].unit.price, 100);
  assert.notEqual(result.periods[0].daily, result.periods[0].totals);
  assert.notEqual(result.days.weekday.daily, result.days.weekend.daily);
});

test('unknown format fails explicitly instead of calculating another format', () => {
  assert.throws(() => calculateModel(fixture(), 'sushi'), /не найден/);
});
