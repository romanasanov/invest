import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateModel } from '../lib/model.ts';
import { validateConfig } from '../lib/config-validation.ts';

const input = JSON.parse(fs.readFileSync(new URL('../data/default-config.json', import.meta.url), 'utf8'));
const config = validateConfig(input);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const hours = { '10-12': 2, '12-16': 4, '16-20': 4, '20-23': 3 };

for (const format of config.formats) {
  test(`${format.id}: check settings, calendar and monthly waterfall reconcile`, () => {
    assert.equal(format.menu.length, config.catalog.length);
    assert.ok(format.calendar.weekdayDays + format.calendar.weekendDays > 0);
    assert.equal(format.investment.capital, format.id === 'bistro' ? 13_000_000 : 7_000_000);
    assert.equal(format.investment.sharePct, 50); assert.equal(format.investment.fixedAnnualPct, 24);
    assert.ok(format.menu.filter((row) => row.enabled).every((row) => row.price > 0));
    const model = calculateModel(config, format.id);
    const expectedDemand = ['weekday', 'weekend'].reduce((sum, dayType) => sum + Object.entries(hours).reduce(
      (daySum, [periodId, length]) => daySum + format.salesPlan[dayType][periodId] * length,
      0,
    ) * format.calendar[dayType === 'weekday' ? 'weekdayDays' : 'weekendDays'], 0);
    close(model.monthly.demandUnits, expectedDemand);
    close(model.monthly.servedUnits + model.monthly.lostUnits, expectedDemand);
    close(model.monthly.revenue, model.monthly.servedUnits * format.check.averageCheck);
    close(model.monthly.cogs, model.monthly.revenue * format.check.foodCostPct / 100);
    close(model.monthly.packaging, model.monthly.servedUnits * format.check.packagingPerCheck);
    for (const key of ['revenue', 'cogs', 'packaging']) {
      close(model.periods.reduce((sum, period) => sum + period.totals[key], 0), model.monthly[key]);
    }
    close(model.monthly.revenue - model.costRows.reduce((sum, row) => sum + row.amount, 0), model.monthly.profit);
    close(model.flow.at(-1).remaining, model.monthly.profit);
    close(model.active.monthlyPayout, Math.max(0, model.monthly.profit) / 2);
    close(model.passive.annualPayout, format.id === 'bistro' ? 3_120_000 : 1_680_000);
    close(model.monthly.included, model.monthly.servedUnits * format.variable.includedPerSaleCost);
    assert.equal(model.personalTaxesIncluded, false);
    assert.equal(model.unitLabel, 'чек');
    const withoutMenu = structuredClone(config);
    withoutMenu.catalog = []; withoutMenu.formats.forEach((entry) => { entry.menu = []; });
    assert.deepEqual(calculateModel(withoutMenu, format.id).monthly, model.monthly);
    if (format.id === 'bistro') {
      const hostessCost = 2 * format.service.hostessShiftPay * (format.calendar.weekdayDays + format.calendar.weekendDays);
      const waiterCost = format.service.enabled ? format.service.waitersMonthlyCost : 0;
      close(model.service.hostessMonthlyCost, hostessCost);
      close(model.service.waitersMonthlyCost, waiterCost);
      close(model.service.totalMonthlyCost, hostessCost + waiterCost);
      assert.ok(!format.expenses.some((row) => row.id === 'service-payroll'));
    }
  });
}

test('documented unknown prices stay disabled; validation refuses an enabled free placeholder', () => {
  const unknown = config.catalog.filter((item) => item.basePrice === 0);
  assert.ok(unknown.length > 0, 'Expected documented positions without source prices');
  for (const item of unknown) {
    assert.ok(config.formats.every((format) => !format.menu.find((row) => row.itemId === item.id).enabled));
  }
  const modified = structuredClone(config);
  const row = modified.formats[0].menu.find((item) => item.itemId === unknown[0].id);
  row.enabled = true; row.price = 0;
  assert.throws(() => validateConfig(modified), /цена больше нуля/);
  row.price = 290;
  assert.doesNotThrow(() => validateConfig(modified));
});
