import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { createScenarioPdf } from '../lib/scenario-pdf.ts';
import { calculateModel } from '../lib/model.ts';
import { concepts } from '../lib/brand-content.ts';

const config = JSON.parse(await readFile(new URL('../data/default-config.json', import.meta.url), 'utf8'));
const fonts = {
  regular: new Uint8Array(await readFile(new URL('../public/fonts/Jost-Regular.ttf', import.meta.url))),
  medium: new Uint8Array(await readFile(new URL('../public/fonts/Jost-Medium.ttf', import.meta.url))),
};
function proposal(format = 'ramen', override = {}) {
  const cfg = config.formats.find(f => f.id === format);
  return { concept: concepts.find(c => c.id === format), config: cfg, result: calculateModel(config, format, undefined, override), investor: 'active', sourceLabel: 'Тестовый выбранный сценарий', version: 32, updatedAt: config.updatedAt, generatedAt: new Date('2026-11-02T12:00:00Z') };
}

test('proposal is a real PDF for the selected format and scenario, with embedded fonts and contact links on every page', async () => {
  const input = proposal('ramen', { averageCheck: 1234, foodCostPct: 21.5 });
  const before = JSON.stringify(input);
  const bytes = await createScenarioPdf(input, fonts);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.equal(JSON.stringify(input), before, 'export must not mutate the selected scenario');
  const doc = await PDFDocument.load(bytes);
  assert.match(doc.getTitle(), /Точка рамена/);
  assert.ok(doc.getPageCount() >= 3);
  for (const page of doc.getPages()) {
    assert.equal(page.getSize().width, 595.28);
    assert.ok(page.node.Annots()?.size() > 0, 'contact link must be present');
  }
  if (process.env.KYOMEI_PDF_QA_DIR) {
    await mkdir(process.env.KYOMEI_PDF_QA_DIR, { recursive: true });
    await writeFile(`${process.env.KYOMEI_PDF_QA_DIR}/ramen-selected-scenario.pdf`, bytes);
    await writeFile(`${process.env.KYOMEI_PDF_QA_DIR}/expected-result.json`, JSON.stringify(input.result, null, 2));
  }
});

test('proposal handles loss, zero sales, undefined break-even and the fixed-rate scenario', async () => {
  const input = proposal('bistro', { averageCheck: 0, foodCostPct: 100, serviceEnabled: false });
  input.investor = 'passive';
  assert.equal(input.result.breakEven.revenue, null);
  assert.ok(input.result.monthly.profit < 0);
  const bytes = await createScenarioPdf(input, fonts);
  const doc = await PDFDocument.load(bytes);
  assert.match(doc.getTitle(), /Японское бистро/);
  assert.ok(doc.getPageCount() >= 3);
  if (process.env.KYOMEI_PDF_QA_DIR) await writeFile(`${process.env.KYOMEI_PDF_QA_DIR}/bistro-loss-scenario.pdf`, bytes);
});

test('large cost tables paginate and mismatched format is rejected', async () => {
  const input = proposal('matcha');
  input.result.costRows = Array.from({ length: 55 }, (_, i) => ({ id: `test-${i}`, label: `Расход ${i + 1} с подробным описанием, который должен переноситься без обрезки текста`, kind: 'fixed', amount: i * 1234 }));
  const bytes = await createScenarioPdf(input, fonts);
  assert.ok((await PDFDocument.load(bytes)).getPageCount() >= 5);
  await assert.rejects(createScenarioPdf({ ...input, concept: concepts[0] }, fonts), /не совпадает/);
});
