import { PDFDocument, PDFString, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { BrandConcept } from './brand-content';
import type { FormatConfig } from './types';
import type { ModelResult } from './model';

export interface ScenarioPdfInput {
  concept: BrandConcept;
  config: FormatConfig;
  result: ModelResult;
  investor: 'active' | 'passive';
  sourceLabel: string;
  version: number;
  updatedAt?: string;
  generatedAt?: Date;
}
export interface ScenarioPdfFonts { regular: Uint8Array; medium: Uint8Array; }

export const PROPOSAL_DISCLAIMER = 'Информация не является офертой или юридически обязывающим предложением.';
export const PROFIT_DISTRIBUTION_NOTE = 'В данном расчёте прибыль распределяется между партнёрами полностью; в реальном проекте будут согласованные правила распределения, которые включают дивиденды и запас, который тоже будет распределяться отдельно. Остальные условия обсуждаются и фиксируются в договоре';
const CONTACT = 'https://t.me/romanasanov';
const W = 595.28, H = 841.89, M = 36, INNER = W - M * 2, BOTTOM = 768;
const dark = rgb(.114, .114, .106), muted = rgb(.40, .40, .36), paper = rgb(.975, .958, .924), rule = rgb(.83, .82, .78), white = rgb(1, 1, 1);
const numeric = (n: number | null | undefined, decimals = 0) => n == null || !Number.isFinite(n) ? 'не определено' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: decimals }).format(n).replace(/\u00a0|\u202f/g, ' ');
const money = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? 'не определено' : `${numeric(n)} ₽`;
const clean = (s: string) => s.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u00a0\u202f]/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const categories: Record<string, string> = { ramen: 'Рамены', burger: 'Бургеры', roti: 'Роти', sushi: 'Суши', rolls: 'Роллы', onigiri: 'Онигири', dessert: 'Десерты', coffee: 'Кофе', tea: 'Чай', matcha: 'Матча', bottled: 'Бутылки и банки', breakfast: 'Завтраки', sets: 'Сеты', combo: 'Комбо', grill: 'Горячее и гриль', salad: 'Салаты', snacks: 'Закуски', lemonade: 'Лимонады', alcohol: 'Напитки' };

function dateLabel(value: string | Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) : 'не указана';
}
function accentFromHex(hex: string) {
  const normalized = /^#[a-f0-9]{6}$/i.test(hex) ? hex.slice(1) : 'CF4C26';
  return rgb(parseInt(normalized.slice(0, 2), 16) / 255, parseInt(normalized.slice(2, 4), 16) / 255, parseInt(normalized.slice(4, 6), 16) / 255);
}
function validateInput(input: ScenarioPdfInput) {
  if (input.concept.id !== input.config.id || input.config.id !== input.result.formatId) throw new Error('Формат предложения не совпадает с расчётом.');
  if (!['active', 'passive'].includes(input.investor)) throw new Error('Неизвестный вариант участия.');
}

/** The proposal uses the exact rendered result; it never recalculates from site defaults. */
export async function createScenarioPdf(input: ScenarioPdfInput, suppliedFonts?: ScenarioPdfFonts): Promise<Uint8Array> {
  validateInput(input);
  const fonts = suppliedFonts ?? await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const medium = await doc.embedFont(fonts.medium, { subset: true });
  const { concept, config: cfg, result: r } = input;
  const createdAt = input.generatedAt ?? new Date();
  doc.setTitle(`Киомей - ${concept.descriptor} - коммерческое предложение`);
  doc.setAuthor('Киомей'); doc.setSubject('Предложение по выбранному сценарию. Не является офертой.');
  doc.setLanguage('ru-RU'); doc.setCreationDate(createdAt); doc.setModificationDate(createdAt);
  const accent = accentFromHex(concept.ink);
  let page: PDFPage, y = 0;
  const text = (value: string, x: number, top: number, size = 11, font: PDFFont = regular, color = dark) => {
    page.drawText(clean(value), { x, y: H - top - size, size, font, color });
  };
  const wrap = (value: string, width: number, size = 11, font: PDFFont = regular): string[] => {
    const result: string[] = [];
    for (const paragraph of clean(value).split('\n')) {
      if (!paragraph) { result.push(''); continue; }
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize(word, size) > width) {
          if (line) { result.push(line); line = ''; }
          let part = '';
          for (const char of word) {
            if (font.widthOfTextAtSize(part + char, size) > width && part) { result.push(part); part = ''; }
            part += char;
          }
          line = part;
        } else if (line && font.widthOfTextAtSize(line + ' ' + word, size) > width) {
          result.push(line); line = word;
        } else line = line ? line + ' ' + word : word;
      }
      if (line) result.push(line);
    }
    return result;
  };
  const paragraph = (value: string, x = M, top = y, width = INNER, size = 11, font: PDFFont = regular, color = dark, leading = size * 1.36) => {
    const rows = wrap(value, width, size, font);
    rows.forEach((row, i) => text(row, x, top + i * leading, size, font, color));
    return top + rows.length * leading;
  };
  const rect = (x: number, top: number, width: number, height: number, color = paper) => page.drawRectangle({ x, y: H - top - height, width, height, color });
  const line = (top: number, x = M, width = INNER) => page.drawLine({ start: { x, y: H - top }, end: { x: x + width, y: H - top }, thickness: .6, color: rule });
  const newPage = (title: string, eyebrow: string) => {
    page = doc.addPage([W, H]);
    rect(0, 0, W, 8, accent);
    text('КИОМЕЙ', M, 26, 19, medium, accent);
    text(concept.descriptor, W - M - medium.widthOfTextAtSize(clean(concept.descriptor), 10), 32, 10, medium);
    text(eyebrow.toLocaleUpperCase('ru-RU'), M, 79, 9, medium, accent);
    y = paragraph(title, M, 96, INNER, 29, medium, dark, 33) + 18;
  };
  const ensure = (height: number, title = 'Экономика сценария', eyebrow = 'Продолжение') => {
    if (y + height > BOTTOM) newPage(title, eyebrow);
  };
  const row = (label: string, value: string, options: { size?: number; highlight?: boolean; detail?: string } = {}) => {
    const size = options.size ?? 10.5;
    const valueWidth = Math.min(190, Math.max(130, medium.widthOfTextAtSize(clean(value), size) + 14));
    const labels = wrap(label, INNER - valueWidth - 14, size);
    const details = options.detail ? wrap(options.detail, INNER - valueWidth - 14, 8.5) : [];
    const height = Math.max(30, labels.length * 14 + details.length * 11 + 11);
    ensure(height + 2);
    if (options.highlight) rect(M, y, INNER, height, paper);
    const left = M + (options.highlight ? 9 : 0);
    labels.forEach((v, i) => text(v, left, y + 7 + i * 14, size, options.highlight ? medium : regular));
    details.forEach((v, i) => text(v, left, y + 7 + labels.length * 14 + i * 11, 8.5, regular, muted));
    const fitted = Math.min(size + (options.highlight ? 1 : 0), 190 / Math.max(1, medium.widthOfTextAtSize(clean(value), 1)));
    text(value, W - M - 9 - medium.widthOfTextAtSize(clean(value), fitted), y + 7, fitted, medium, options.highlight ? accent : dark);
    y += height; line(y);
  };
  const heading = (value: string) => { ensure(46); y += 12; text(value, M, y, 16, medium); y += 30; };
  const note = (value: string, size = 9) => {
    const h = wrap(value, INNER, size).length * size * 1.4 + 12;
    ensure(h); y = paragraph(value, M, y + 8, INNER, size, regular, muted, size * 1.4) + 5;
  };

  // 1. A concise commercial offer and the selected participation scenario.
  newPage('Коммерческое предложение', 'Партнёрство / индивидуальный сценарий');
  y = paragraph(concept.summary, M, y, INNER, 12, regular, dark, 16) + 18;
  const offerTop = y;
  rect(M, offerTop, INNER, 85, dark);
  text(input.investor === 'active' ? 'ВЗНОС ПАРТНЁРА' : 'СУММА ФИНАНСИРОВАНИЯ', M + 16, offerTop + 13, 9, medium, white);
  const capitalText = money(cfg.investment.capital);
  const capitalSize = Math.min(32, (INNER - 32) / medium.widthOfTextAtSize(capitalText, 1));
  text(capitalText, M + 16, offerTop + 32, capitalSize, medium, white);
  y += 99;
  row('Формат / площадь', `${concept.shortName} / ${concept.area}`);
  row('Вариант участия', input.investor === 'active' ? 'Доля в прибыли' : 'Фиксированная ставка');
  const chosen = input.investor === 'active' ? r.active : r.passive;
  row('Выплата инвестору / месяц', money(chosen.monthlyPayout), { highlight: true, size: 12 });
  row('Выплата за 12 одинаковых месяцев', money(chosen.annualPayout));
  row(input.investor === 'active' ? 'Расчётная годовая доходность' : 'Предлагаемая ставка годовых', input.investor === 'active' ? `${numeric(r.active.annualReturnPct, 1)}${r.active.annualReturnPct == null ? '' : '%'}` : `${numeric(r.passive.annualRatePct, 1)}%`);
  if (input.investor === 'active') {
    row('Доля прибыли в этом расчёте / после окупаемости', `${numeric(r.active.sharePct, 1)}%`);
    note('Базовое предложение: 80% прибыли партнёру до окупаемости, 50% после. Взнос партнёра - сумма за приобретение доли 50%. Полный бюджет открытия и состав вклада оператора определяются для каждого проекта и фиксируются в документах проекта.');
    note('Ориентир проекта по окупаемости - до 12 месяцев; это цель, а не подтверждённый срок данного сценария. Ориентир доходности 36-54% годовых не является гарантией. При убытке долевая выплата равна нулю.');
  } else {
    row('Покрытие выплаты прибылью точки', r.passive.coverageRatio == null ? 'не определено' : `${numeric(r.passive.coverageRatio, 2)} раза`);
    note(r.passive.covered ? 'Расчётная прибыль покрывает предлагаемую фиксированную выплату. Сумма, срок, обеспечение и порядок выплат согласуются отдельно в договоре.' : `В данном сценарии дефицит для выплаты из прибыли составляет ${money(r.passive.fundingGap)} в месяц. Фиксированная ставка не устраняет риск неисполнения обязательств; сумма, срок и обеспечение обсуждаются отдельно.`);
  }
  note(PROFIT_DISTRIBUTION_NOTE, 9);
  note('Личные налоги инвестор платит самостоятельно. Все выплаты и доходность показаны до личных налогов.');

  // 2. Exact scenario assumptions, both day types and actual menu categories.
  newPage('Продажи и предложение гостю', 'Сценарий / настройки и ассортимент');
  row('Средний чек', money(r.check.averageCheck));
  row('Фудкост / доля выручки', `${numeric(r.check.foodCostPct, 1)}%`);
  row('Календарь расчётного месяца', `${cfg.calendar.weekdayDays} будних + ${cfg.calendar.weekendDays} выходных`);
  row('Пропускная способность', `${numeric(r.capacityPerHour)} чеков / час`);
  if (r.service) row('Режим обслуживания', r.service.enabled ? 'Официанты + 2 хостес' : 'Без официантов; 2 хостес');
  heading('Чеки по периодам');
  const widths = [95, 102, 112, 106, 108];
  const cells = (values: string[], top: number, bold = false) => {
    let x = M;
    values.forEach((value, i) => {
      const font = bold ? medium : regular;
      const size = Math.min(bold ? 8 : 9.5, (widths[i] - 14) / Math.max(1, font.widthOfTextAtSize(clean(value), 1)));
      text(value, x + 7, top, size, font); x += widths[i];
    });
  };
  const drawTableHead = () => { rect(M, y, INNER, 26); cells(['День', 'Период', 'Спрос / час', 'Отдача / час', 'Выручка периода'], y + 8, true); y += 26; };
  drawTableHead();
  for (const p of r.periods) {
    if (y + 26 > BOTTOM) { newPage('Продажи по периодам', 'Сценарий / продолжение'); drawTableHead(); }
    cells([p.dayType === 'weekday' ? 'Будни' : 'Выходные', p.periodId.replace('-', ':00-') + ':00', numeric(p.demandPerHour, 1), numeric(p.servedPerHour, 1), money(p.daily.revenue)], y + 7);
    y += 25; line(y);
  }
  note(`Выполнено ${numeric(r.monthly.servedUnits)} чеков за месяц; спрос - ${numeric(r.monthly.demandUnits)}. Не обслужено из-за ограничения мощности: ${numeric(r.monthly.lostUnits)}. Продажи сверх мощности не включены в выручку.`);
  heading('Меню формата');
  const enabled = r.menu.filter(item => item.enabled);
  if (!enabled.length) note('В текущих настройках нет включённых позиций меню. Меню носит информационный характер и не влияет на расчёт среднего чека.');
  else {
    const grouped = new Map<string, typeof enabled>();
    for (const item of enabled) { const list = grouped.get(item.category) ?? []; list.push(item); grouped.set(item.category, list); }
    const overview: string[] = [];
    for (const [category, items] of grouped) {
      const prices = items.map(item => item.price);
      const price = Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${numeric(Math.min(...prices))}-${money(Math.max(...prices))}`;
      overview.push(`${categories[category] ?? (category || 'Позиции меню')}: ${items.length} поз., ${price}`);
    }
    const menuLines = wrap(overview.join(' / '), INNER, 10);
    for (const menuLine of menuLines) { ensure(15, 'Меню формата', 'Продолжение'); text(menuLine, M, y, 10); y += 15; }
    note('Ассортимент и цены взяты из выбранных настроек. Это обзор меню для знакомства с форматом; расчёт выручки использует средний чек, а продуктов - фудкост. Цены меню не заменяют эти допущения.');
  }

  // 3. Reconciled profit and the complete cost breakdown, with automatic continuation.
  newPage('Экономика точки за месяц', 'Расчёт / от выручки к прибыли');
  row('Выручка', money(r.monthly.revenue), { highlight: true, size: 13 });
  row('Все расходы', money(r.monthly.fixedCosts + r.monthly.variableCosts));
  row('Прибыль после расходов и налогов', money(r.monthly.profit), { highlight: true, size: 12 });
  row('Точка безубыточности / выручка в месяц', money(r.breakEven.revenue));
  row('Для выхода в ноль / чеков в день', numeric(r.breakEven.unitsPerDay, 1));
  if (r.breakEven.withinCapacity === false) note('При текущей мощности выйти в ноль невозможно. Измените спрос, средний чек, фудкост или расходы и проверьте сценарий снова.');
  heading('Расходы по статьям');
  for (const cost of r.costRows) row(cost.label, money(cost.amount), { size: 9.5, detail: cost.kind === 'fixed' ? 'Постоянные / месяц' : cost.ratePct == null ? 'Зависят от количества чеков' : `${numeric(cost.ratePct, 2)}% выручки` });
  note('Налог бизнеса включён в расходы согласно настройкам модели. Личные налоги инвестора не включены. Расчёт предполагает 12 одинаковых месяцев; сезонность, период запуска, кредит, амортизация и дополнительные капитальные затраты отдельно не моделируются.');
  if (r.warnings.length) { heading('На что обратить внимание'); for (const warning of r.warnings) note(warning); }
  heading('Следующий шаг');
  note('Обсудим локацию, бюджет открытия и распределение прибыли. Все условия согласуются индивидуально и закрепляются в договоре.');
  row('Связаться с Романом', 't.me/romanasanov');
  const basis = `${input.sourceLabel}. Версия настроек: ${input.version}${input.updatedAt ? ` от ${dateLabel(input.updatedAt)}` : ''}. Сценарий сформирован ${dateLabel(createdAt)} (Москва).`;
  note(basis, 8.5);

  const pages = doc.getPages();
  pages.forEach((p, index) => {
    page = p;
    line(786);
    text(PROPOSAL_DISCLAIMER, M, 795, 7.2, regular, muted);
    text('Роман / t.me/romanasanov', M, 811, 8, medium, accent);
    text(`${dateLabel(createdAt)} / ${index + 1} из ${pages.length}`, W - M - 102, 811, 8, regular, muted);
    const annotation = doc.context.register(doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [M, H - 824, M + 150, H - 808], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(CONTACT) } }));
    p.node.addAnnot(annotation);
  });
  return doc.save();
}

async function loadFonts(): Promise<ScenarioPdfFonts> {
  const load = async (path: string) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Не удалось загрузить шрифт для PDF. Проверьте соединение и попробуйте ещё раз.');
    return new Uint8Array(await response.arrayBuffer());
  };
  const [regular, medium] = await Promise.all([load('/fonts/Jost-Regular.ttf'), load('/fonts/Jost-Medium.ttf')]);
  return { regular, medium };
}

export async function downloadScenarioPdf(input: ScenarioPdfInput): Promise<void> {
  const bytes = await createScenarioPdf(input);
  const copy = new Uint8Array(bytes.length); copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `KYOMEI-${input.concept.id}-proposal-${(input.generatedAt ?? new Date()).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  // Keep the object URL alive while Safari and mobile browsers start the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
