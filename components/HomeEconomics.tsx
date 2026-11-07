'use client';

import { useEffect, useMemo, useState } from 'react';
import { Arrow } from './BrandLogo';
import { concepts } from '../lib/brand-content';
import { calculateModel } from '../lib/model';
import type { ConfigEnvelope, FormatId } from '../lib/types';

const rub = (value: number | null) => value === null ? 'Не определена' :
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽';
const count = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);

/** The home preview and investor page use the same saved config and calculation. */
export function HomeEconomics() {
  const [format, setFormat] = useState<FormatId>('ramen');
  const [data, setData] = useState<ConfigEnvelope | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setError(false);
    fetch('/api/config', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Config request failed');
        const payload = await response.json() as ConfigEnvelope;
        if (!payload.config || !Array.isArray(payload.config.formats) ||
            !concepts.every(concept => payload.config.formats.some(entry => entry.id === concept.id))) {
          throw new Error('Incomplete config');
        }
        if (active) setData(payload);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const result = useMemo(() => data ? calculateModel(data.config, format) : null, [data, format]);
  const cfg = data?.config.formats.find(entry => entry.id === format);
  const concept = concepts.find(entry => entry.id === format)!;
  const href = `/model?format=${format}`;
  const date = data ? new Date(data.updatedAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) : '';

  return <div className="m-economy-preview" aria-label="Финансовые показатели формата">
    <div className="m-economy-preview__heading"><span>Текущие настройки команды</span><small>За месяц</small></div>
    <div className="m-economy-preview__formats" aria-label="Формат для расчёта">
      {concepts.map(entry => <button key={entry.id} type="button" aria-pressed={format === entry.id}
        onClick={() => setFormat(entry.id)}>{entry.shortName}</button>)}
    </div>
    {error ? <div className="m-economy-preview__state" role="alert">
      <strong>Не удалось загрузить показатели</strong>
      <p>Обновите данные или откройте модель выбранного формата.</p>
      <button className="button button--outline" type="button" onClick={() => setAttempt(value => value + 1)}>Загрузить ещё раз</button>
      <a href={href} className="m-text-link">Открыть модель <Arrow /></a>
    </div> : !result || !cfg ? <div className="m-economy-preview__state" role="status">
      <strong>Загружаем актуальные показатели…</strong>
      <p>Выручка, расходы и прибыль из сохранённых настроек команды.</p>
      <a href={href} className="m-text-link">Перейти в модель <Arrow /></a>
    </div> : <div aria-live="polite" aria-atomic="true">
      <p className="m-economy-preview__context">Киомей · {concept.descriptor.toLowerCase()}</p>
      <div className="m-economy-preview__numbers">
        <a href={href} className="m-economy-preview__metric m-economy-preview__metric--revenue">
          <span>Выручка / месяц <Arrow diagonal /></span><strong>{rub(result.monthly.revenue)}</strong>
          <small>{count(result.monthly.servedUnits)} выполненных чеков</small>
        </a>
        <a href={href} className="m-economy-preview__metric">
          <span>Все расходы / месяц <Arrow diagonal /></span><strong>{rub(result.monthly.fixedCosts + result.monthly.variableCosts)}</strong>
          <small>Включая налог бизнеса</small>
        </a>
        <a href={href} className={`m-economy-preview__metric m-economy-preview__metric--profit ${result.monthly.profit < 0 ? 'is-negative' : ''}`}>
          <span>Прибыль после расходов и налогов <Arrow diagonal /></span><strong>{rub(result.monthly.profit)}</strong>
          <small>До распределения между партнёрами</small>
        </a>
      </div>
      <div className="m-economy-preview__facts">
        <a href={href}><span>Взнос партнёра</span><strong>{rub(cfg.investment.capital)}</strong><Arrow diagonal /></a>
        <a href={href}><span>Точка нуля / месяц</span><strong>{rub(result.breakEven.revenue)}</strong><Arrow diagonal /></a>
        <a href={href}><span>Средний чек</span><strong>{rub(result.check.averageCheck)}</strong><Arrow diagonal /></a>
      </div>
      <a href={href} className="button button--primary m-economy-preview__action">Изменить этот сценарий <Arrow /></a>
      <p className="m-economy-preview__source">Настройки от {date}. Расчётная модель нового проекта, не фактическая отчётность.</p>
    </div>}
    <p className="m-economy-preview__disclaimer">Информация не является офертой. Результат зависит от параметров конкретного проекта.</p>
  </div>;
}
