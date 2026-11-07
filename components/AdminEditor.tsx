'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Coffee, CookingPot, Download, Fish, LockKeyhole, LogOut, Plus,
  RefreshCw, RotateCcw, Save, Search, Soup, Trash2, Utensils, X,
} from 'lucide-react';
import type { BaselineSnapshot, CatalogItem, ConfigEnvelope, FormatConfig, FormatId, MenuRow, SiteConfig } from '../lib/types';
import { PERIODS } from '../lib/types';
import { validateConfig } from '../lib/config-validation';
import { baselineDraft } from '../lib/scenario-baseline';

const FORMATS: { id: FormatId; label: string; icon: typeof Soup; color: string }[] = [
  { id: 'bistro', label: 'Японское бистро', icon: Utensils, color: '#B83E20' },
  { id: 'ramen', label: 'Точка рамена', icon: Soup, color: '#B52E26' },
  { id: 'sushi', label: 'Точка суши', icon: Fish, color: '#284D6B' },
  { id: 'matcha', label: 'Точка матча моти', icon: Coffee, color: '#485F35' },
];
const CATEGORIES: Record<string, string> = {
  ramen: 'Рамены', grill: 'Горячее и гриль', burger: 'Бургеры', roti: 'Роти', sushi: 'Суши',
  salad: 'Салаты', onigiri: 'Онигири', snacks: 'Закуски', dessert: 'Десерты', rolls: 'Роллы',
  sets: 'Сеты', matcha: 'Матча', lemonade: 'Лимонады', tea: 'Чай', alcohol: 'Алкоголь',
  coffee: 'Кофе', bottled: 'Бутылки и банки', breakfast: 'Завтраки', combo: 'Комбо',
};
const CATEGORY_ICONS: Record<string, typeof Soup> = { ramen: Soup, coffee: Coffee, tea: Coffee, matcha: Coffee, sushi: Fish, rolls: Fish, onigiri: Fish, grill: CookingPot };
const categoryName = (value: string) => CATEGORIES[value] ?? value;
const PAGE_SIZE = 18;

class RequestError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const raw = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
    throw new RequestError(raw.startsWith('[') ? 'Проверьте значения в настройках: часть данных не прошла проверку.' : raw, response.status);
  }
  return data as T;
}
const post = (data: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const friendlyError = (error: unknown) => error instanceof Error ? error.message : 'Что-то не получилось. Попробуйте ещё раз.';

function problemLabel(path: (string | number)[], config: SiteConfig): string {
  const names: Record<string, string> = {
    price: 'Цена', basePrice: 'Цена каталога', foodCostPct: 'Фудкост', packagingCost: 'Упаковка', weight: 'Вес',
    capacityPerHour: 'Мощность', weekdayDays: 'Будних дней', weekendDays: 'Выходных дней',
    acquiringPct: 'Эквайринг', taxPct: 'Налог бизнеса', otherPct: 'Прочие переменные',
    includedPerSaleCost: 'Включённые напитки', capital: 'Взнос', sharePct: 'Доля', fixedAnnualPct: 'Ставка',
    averageCheck: 'Средний чек', packagingPerCheck: 'Упаковка на чек', hostessShiftPay: 'Смена хостес', waitersMonthlyCost: 'Официанты за месяц', amount: 'Сумма расхода', label: 'Название расхода', name: 'Название', category: 'Категория',
  };
  const parts: string[] = [];
  if (path[0] === 'formats') {
    const format = config.formats[Number(path[1])];
    parts.push(FORMATS.find((item) => item.id === format?.id)?.label ?? 'Формат');
    if (path[2] === 'menu') {
      const itemId = format?.menu[Number(path[3])]?.itemId;
      parts.push(config.catalog.find((item) => item.id === itemId)?.name ?? 'Позиция меню');
    }
    if (path[2] === 'expenses') parts.push(format?.expenses[Number(path[3])]?.label ?? 'Расход');
    if (path[2] === 'salesPlan') parts.push(path[3] === 'weekday' ? 'Будни' : 'Выходные', String(path[4]));
  } else if (path[0] === 'catalog') parts.push('Каталог', config.catalog[Number(path[1])]?.name ?? 'Позиция');
  const last = path.at(-1);
  if (typeof last === 'string' && names[last]) parts.push(names[last]);
  return parts.join(' / ') || 'Настройки';
}
function problems(config: SiteConfig): string[] {
  try { validateConfig(config); return []; }
  catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return (error as { issues: { path: (string | number)[] }[] }).issues.map((issue) => `${problemLabel(issue.path, config)}: проверьте допустимое значение.`);
    }
    return [friendlyError(error)];
  }
}

function NumberField({ label, value, onChange, unit, min = 0, max = 20_000_000, step = 1, hint }: {
  label: string; value: number; onChange: (value: number) => void; unit?: string;
  min?: number; max?: number; step?: number; hint?: string;
}) {
  const id = useId(); const invalid = !Number.isFinite(value) || value < min || value > max || (step === 1 && !Number.isInteger(value));
  return <label className={`a-field ${invalid ? 'is-invalid' : ''}`} htmlFor={id}>
    <span>{label}</span><span className="a-number"><input id={id} type="number" inputMode="decimal" min={min} max={max} step={step}
      value={Number.isFinite(value) ? Number(value.toFixed(4)) : ''} onChange={(event) => onChange(event.target.valueAsNumber)}
      aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-hint` : undefined} />{unit && <span>{unit}</span>}</span>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </label>;
}

function ConfirmDiscard({ action, onCancel, onConfirm }: { action: 'reload' | 'logout'; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className="a-dialog" ref={ref} aria-labelledby="discard-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <AlertCircle size={28} /><h2 id="discard-title">В черновике есть изменения</h2>
    <p>Они ещё не сохранены на сайте. Сначала можно экспортировать черновик, чтобы не потерять работу.</p>
    <div className="a-actions"><button type="button" className="a-button a-button--dark" autoFocus onClick={onCancel}>Остаться в редакторе</button>
      <button type="button" className="a-button a-button--danger" onClick={onConfirm}>{action === 'reload' ? 'Загрузить без сохранения' : 'Выйти без сохранения'}</button></div>
  </dialog>;
}

function ConfirmBaselineRestore({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className="a-dialog" ref={ref} aria-labelledby="baseline-restore-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <RotateCcw size={28} /><h2 id="baseline-restore-title">Вернуть базовые настройки?</h2>
    <p>В черновике заменятся общий каталог, меню и все параметры четырёх форматов. Несохранённые правки будут заменены базовой версией.</p>
    <p>На работающем сайте пока ничего не изменится. Для публикации нужно будет отдельно нажать «Сохранить».</p>
    <div className="a-actions"><button type="button" className="a-button" autoFocus onClick={onCancel}>Отмена</button><button type="button" className="a-button a-button--dark" onClick={onConfirm}>Вернуть в черновик</button></div>
  </dialog>;
}

export function AdminEditor() {
  const [authenticated, setAuthenticated] = useState(false);
  const [booting, setBooting] = useState(true);
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [approvedBaseline, setApprovedBaseline] = useState<BaselineSnapshot | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [version, setVersion] = useState(0);
  const [savedAt, setSavedAt] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'login' | 'save' | 'load' | 'logout' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formatId, setFormatId] = useState<FormatId>('bistro');
  const [section, setSection] = useState<'menu' | 'operations'>('menu');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [enabledOnly, setEnabledOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<'reload' | 'logout' | null>(null);
  const serialized = useMemo(() => draft ? JSON.stringify(draft) : '', [draft]);
  const dirty = Boolean(draft && serialized !== savedJson);
  const validation = useMemo(() => draft ? problems(draft) : [], [draft]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await request<{ authenticated: boolean }>('/api/admin/session');
        if (!active) return; setAuthenticated(session.authenticated);
        if (session.authenticated) {
          const envelope = await request<ConfigEnvelope>('/api/admin/config');
          if (!active) return;
          setDraft(envelope.config); setSavedJson(JSON.stringify(envelope.config)); setVersion(envelope.version); setSavedAt(envelope.updatedAt); setApprovedBaseline(envelope.baseline);
        }
      } catch (failure) { if (active) setError(friendlyError(failure)); }
      finally { if (active) setBooting(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function applyEnvelope(envelope: ConfigEnvelope) {
    setDraft(envelope.config); setSavedJson(JSON.stringify(envelope.config)); setVersion(envelope.version); setSavedAt(envelope.updatedAt); setApprovedBaseline(envelope.baseline);
  }
  async function loadActual() {
    setBusy('load'); setError(''); setMessage('');
    try { applyEnvelope(await request<ConfigEnvelope>('/api/admin/config')); setMessage('Актуальные настройки загружены.'); }
    catch (failure) { setError(friendlyError(failure)); if (failure instanceof RequestError && failure.status === 401) setAuthenticated(false); }
    finally { setBusy(null); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('login'); setError(''); setMessage('');
    try {
      await request('/api/admin/login', post({ password })); setPassword(''); setAuthenticated(true);
      if (!draft) applyEnvelope(await request<ConfigEnvelope>('/api/admin/config'));
      else if (dirty) setMessage('Вход выполнен. Несохранённый черновик остался в редакторе.');
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(null); }
  }
  async function save() {
    if (!draft || validation.length) return;
    setBusy('save'); setError(''); setMessage('');
    try {
      const saved = await request<ConfigEnvelope>('/api/admin/config', { ...post({ config: draft, version }), method: 'PUT' });
      applyEnvelope(saved); setMessage('Настройки сохранены для всех посетителей сайта.');
    } catch (failure) {
      setError(friendlyError(failure));
      if (failure instanceof RequestError && failure.status === 401) setAuthenticated(false);
    } finally { setBusy(null); }
  }
  async function logout() {
    setBusy('logout'); setError('');
    try { await request('/api/admin/logout', { method: 'POST' }); setAuthenticated(false); setDraft(null); setSavedJson(''); setApprovedBaseline(null); setMessage(''); }
    catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(null); }
  }
  function chooseAction(action: 'reload' | 'logout') {
    if (dirty) setPendingAction(action); else if (action === 'reload') void loadActual(); else void logout();
  }
  function restoreApprovedBaseline() {
    if (!approvedBaseline) return;
    setDraft(baselineDraft(approvedBaseline)); setConfirmRestore(false); setError('');
    setQuery(''); setCategory('all'); setPage(0);
    setMessage('Базовые настройки всех четырёх форматов загружены в черновик. Проверьте их и нажмите «Сохранить», чтобы применить на сайте.');
  }
  function exportDraft() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify({ config: draft, version, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `kyomei-draft-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage('Черновик экспортирован. На сайте настройки не изменились.');
  }
  function updateFormat(update: (format: FormatConfig) => FormatConfig) {
    setDraft((current) => current ? { ...current, formats: current.formats.map((format) => format.id === formatId ? update(format) : format) } : current);
    setMessage('');
  }
  function updateRow(itemId: string, patch: Partial<MenuRow>) {
    updateFormat((format) => ({ ...format, menu: format.menu.map((row) => row.itemId === itemId ? { ...row, ...patch } : row) }));
  }
  function addItem(item: Omit<CatalogItem, 'id' | 'status'>) {
    const id = `item-${crypto.randomUUID().slice(0, 12)}`;
    setDraft((current) => current ? {
      ...current, catalog: [...current.catalog, { ...item, id, status: 'format' }],
      formats: current.formats.map((format) => ({ ...format, menu: [...format.menu, {
        itemId: id, enabled: false, price: item.basePrice, foodCostPct: item.foodCostPct,
        packagingCost: item.packagingCost, weight: 0, periods: PERIODS.map((period) => period.id),
      }] })),
    } : current);
    setAdding(false); setEnabledOnly(false); setCategory('all'); setQuery(item.name); setPage(0);
    setMessage('Позиция добавлена во все форматы и пока выключена. Включите её в нужном меню, затем сохраните настройки.');
  }

  const selected = draft?.formats.find((format) => format.id === formatId);
  const categories = useMemo(() => draft ? [...new Set(draft.catalog.map((item) => item.category))].sort((a, b) => categoryName(a).localeCompare(categoryName(b), 'ru')) : [], [draft]);
  const catalogMap = useMemo(() => new Map(draft?.catalog.map((item) => [item.id, item]) ?? []), [draft]);
  const filtered = selected?.menu.filter((row) => {
    const item = catalogMap.get(row.itemId); if (!item) return false;
    return (!enabledOnly || row.enabled) && (category === 'all' || item.category === category) &&
      (!query.trim() || `${item.name} ${categoryName(item.category)}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  }) ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const currentRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const enabled = selected?.menu.filter((row) => row.enabled) ?? [];
  const dateLabel = savedAt && Number.isFinite(Date.parse(savedAt)) ? new Date(savedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';

  if (booting) return <div className="container a-loading" role="status"><RefreshCw size={22} className="a-spin" /> Открываем редактор…</div>;
  if (!authenticated) return <div className="container a-login-wrap"><section className="a-login">
    <span className="a-icon-box"><LockKeyhole size={26} /></span><p className="eyebrow">Управление Киомей</p><h1>Настройки сети</h1>
    <p>Войдите, чтобы обновить меню и исходные параметры финансовой модели.</p>
    {dirty && <div className="a-notice">Несохранённый черновик остался в этом окне. Войдите снова, чтобы продолжить.</div>}
    <form onSubmit={login}><label className="a-field" htmlFor="admin-password"><span>Пароль</span><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} /></label>
      {error && <div role="alert" className="a-error"><AlertCircle size={18} /><span>{error}</span></div>}
      <button className="a-button a-button--dark a-login-submit" disabled={Boolean(busy)}>{busy === 'login' ? 'Входим…' : 'Войти в редактор'}</button></form>
    <Link className="a-back" href="/" onClick={(event) => { if (dirty && !window.confirm('В черновике есть несохранённые изменения. Покинуть редактор?')) event.preventDefault(); }}>Вернуться на сайт</Link>
  </section></div>;

  return <div className="container a-editor">
    <div className="a-heading"><div><p className="eyebrow">Киомей / Управление</p><h1>Меню и экономика</h1><p>Единый каталог. Четыре формата. Настройки для всей сети.</p></div>
      <button className="a-button a-button--plain" type="button" onClick={() => chooseAction('logout')} disabled={Boolean(busy)}><LogOut size={17} /> Выйти</button></div>
    <div className="a-global-note"><CookingPot size={22} /><div><strong>Сохранение общее для сайта</strong><p>Вы меняете исходное меню и параметры модели для всех посетителей. Пока вы не нажали «Сохранить», изменения видны только в этом окне.</p></div></div>
    {approvedBaseline && <section className="a-baseline-panel" aria-label="Сохранённая база"><div><strong>Базовые настройки сохранены</strong><p>Версия от {new Date(approvedBaseline.savedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' })} · Москва. Меню и параметры всех четырёх форматов. Последующие сохранения эту базу не изменяют.</p></div><button type="button" className="a-button" onClick={() => setConfirmRestore(true)} disabled={Boolean(busy)}><RotateCcw size={17} /> Вернуть базовые настройки</button></section>}
    {error && <div role="alert" className="a-error a-banner"><AlertCircle size={20} /><span>{error}</span><button type="button" aria-label="Закрыть сообщение об ошибке" onClick={() => setError('')}><X size={18} /></button></div>}
    {message && <div role="status" className="a-success a-banner"><CheckCircle2 size={20} /><span>{message}</span><button type="button" aria-label="Закрыть сообщение" onClick={() => setMessage('')}><X size={18} /></button></div>}
    {!draft || !selected ? <section className="a-empty"><p>Настройки ещё не загружены.</p><button className="a-button" onClick={() => void loadActual()} disabled={Boolean(busy)}><RefreshCw size={16} /> Загрузить настройки</button></section> : <>
      <div className="a-format-tabs" role="tablist" aria-label="Формат сети">{FORMATS.map((format) => <button key={format.id} type="button" role="tab" aria-selected={formatId === format.id} onClick={() => { setFormatId(format.id); setPage(0); }} className={formatId === format.id ? 'is-active' : ''} style={{ '--a-format': format.color } as React.CSSProperties}><format.icon size={21} /><span>{format.label}</span></button>)}</div>
      <div className="a-section-tabs" role="tablist" aria-label="Раздел настроек"><button type="button" role="tab" aria-selected={section === 'menu'} className={section === 'menu' ? 'is-active' : ''} onClick={() => setSection('menu')}>Меню <span>{enabled.length}</span></button><button type="button" role="tab" aria-selected={section === 'operations'} className={section === 'operations' ? 'is-active' : ''} onClick={() => setSection('operations')}>Продажи и расходы</button></div>
      <fieldset disabled={busy === 'save' || busy === 'load'} className="a-edit-fields">
        {section === 'menu' ? <>
          <div className="a-section-heading"><div><h2>Матрица меню</h2><p>Информационное меню выбранного формата. Названия, цены и доступность видны инвестору, но не влияют на финансовый расчёт.</p></div><button className="a-button" type="button" onClick={() => setAdding(true)}><Plus size={18} /> Добавить позицию</button></div>
          <div className="a-filters"><label className="a-search"><Search size={19} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Найти рамен, кофе, сет…" aria-label="Поиск по каталогу" />{query && <button type="button" aria-label="Очистить поиск" onClick={() => { setQuery(''); setPage(0); }}><X size={16} /></button>}</label>
            <label className="a-select"><span className="a-sr-only">Категория</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}><option value="all">Все категории</option>{categories.map((item) => <option key={item} value={item}>{categoryName(item)}</option>)}</select><ChevronDown size={15} /></label>
            <label className="a-check"><input type="checkbox" checked={enabledOnly} onChange={(event) => { setEnabledOnly(event.target.checked); setPage(0); }} /><span>Только включённые</span></label></div>
          <div className="a-menu-summary"><span>Найдено {filtered.length} из {draft.catalog.length} позиций</span><span>Справочник для инвестора</span></div>
          <p className="a-help">Экономика считается по чекам, среднему чеку и общему фудкосту из раздела «Продажи и расходы». Изменение меню не пересчитывает эти параметры.</p>
          <div className="a-menu-grid">{currentRows.map((row) => {
            const item = catalogMap.get(row.itemId)!; const Icon = CATEGORY_ICONS[item.icon] ?? Utensils;
            return <article key={row.itemId} className={`a-menu-card ${row.enabled ? '' : 'is-disabled'}`}>
              <div className="a-menu-top"><span className="a-menu-icon"><Icon size={22} /></span><div><span className="a-category">{categoryName(item.category)}</span><h3>{item.name}</h3></div><label className="a-switch"><input type="checkbox" checked={row.enabled} onChange={(event) => updateRow(row.itemId, { enabled: event.target.checked })} aria-label={`Включить: ${item.name}`} /><span aria-hidden="true" /></label></div>
              <div className="a-menu-numbers"><NumberField label="Цена в меню" value={row.price} onChange={(price) => updateRow(row.itemId, { price })} unit="₽" min={row.enabled ? 0.01 : 0} step={0.01} /></div>
              <fieldset className="a-periods"><legend>Когда доступно</legend>{PERIODS.map((period) => <label key={period.id}><input type="checkbox" checked={row.periods.includes(period.id)} onChange={(event) => updateRow(row.itemId, { periods: event.target.checked ? [...row.periods, period.id] : row.periods.filter((id) => id !== period.id) })} /><span>{period.id}</span></label>)}</fieldset>
              {row.enabled && row.price <= 0 && <p className="a-inline-error">Укажите цену больше нуля, чтобы включить позицию.</p>}
              {row.enabled && row.periods.length === 0 && <p className="a-inline-warning">Время доступности не указано. На расчёт чеков это не влияет.</p>}
              <details className="a-source"><summary>Источник и статус</summary><p>{item.source}</p><span>{item.status === 'format' ? 'Вариант или предложение для формата' : 'Позиция из исходного меню'}</span></details>
            </article>;
          })}</div>
          {filtered.length === 0 && <div className="a-empty"><Search size={26} /><h3>Позиции не найдены</h3><p>Измените запрос или покажите весь каталог.</p><button type="button" className="a-button" onClick={() => { setQuery(''); setCategory('all'); setEnabledOnly(false); setPage(0); }}>Сбросить фильтры</button></div>}
          {pageCount > 1 && <nav className="a-pagination" aria-label="Страницы каталога"><button type="button" className="a-button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={17} /> Назад</button><span>{safePage + 1} / {pageCount}</span><button type="button" className="a-button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Далее <ChevronRight size={17} /></button></nav>}
        </> : <OperationsEditor format={selected} onChange={updateFormat} />}
      </fieldset>
      {validation.length > 0 && <details className="a-validation" open><summary><AlertCircle size={18} /> Нужно исправить: {validation.length}</summary><ul>{validation.slice(0, 8).map((issue, index) => <li key={index}>{issue}</li>)}</ul>{validation.length > 8 && <p>И ещё {validation.length - 8}. Проверьте поля с красной рамкой.</p>}</details>}
      <div className="a-save-bar"><div className="a-save-status"><span className={`a-status-dot ${dirty ? 'is-dirty' : ''}`} /><div><strong>{dirty ? 'Есть несохранённые изменения' : 'Всё сохранено'}</strong><small>Версия {version}{dateLabel ? ` · ${dateLabel}` : ''}</small></div></div><div className="a-save-actions"><button type="button" className="a-button a-button--plain" onClick={exportDraft} disabled={Boolean(busy)} title="Скачать черновик"><Download size={17} /><span>Экспорт</span></button><button type="button" className="a-button a-button--plain" onClick={() => chooseAction('reload')} disabled={Boolean(busy)} aria-label="Загрузить актуальные настройки"><RefreshCw size={17} /><span>Загрузить актуальное</span></button><button type="button" className="a-button a-button--dark" onClick={() => void save()} disabled={!dirty || Boolean(busy) || validation.length > 0}><Save size={17} />{busy === 'save' ? 'Сохраняем…' : 'Сохранить'}</button></div></div>
    </>}
    {confirmRestore && approvedBaseline && <ConfirmBaselineRestore onCancel={() => setConfirmRestore(false)} onConfirm={restoreApprovedBaseline} />}
    {adding && <AddItem categories={categories} onAdd={addItem} onClose={() => setAdding(false)} />}
    {pendingAction && <ConfirmDiscard action={pendingAction} onCancel={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); if (action === 'reload') void loadActual(); else void logout(); }} />}
  </div>;
}

function OperationsEditor({ format, onChange }: { format: FormatConfig; onChange: (update: (format: FormatConfig) => FormatConfig) => void }) {
  return <div className="a-operations">
    <div className="a-section-heading"><div><h2>Продажи и расходы</h2><p>Параметры выбранного формата. Спрос и мощность — чеки в час. Меню не участвует в расчёте. Расходы — за месяц, кроме явно указанных ставок на чек или смену.</p></div></div>
    <section className="a-panel"><h3>Экономика одного чека</h3><p>Исходные значения для инвестора. В своей модели он сможет менять средний чек и фудкост, не меняя общие настройки сайта.</p><div className="a-three-fields"><NumberField label="Средний чек по умолчанию" unit="₽" value={format.check.averageCheck} step={0.01} onChange={(averageCheck) => onChange(current => ({...current,check:{...current.check,averageCheck}}))}/><NumberField label="Фудкост по умолчанию" unit="%" max={100} value={format.check.foodCostPct} step={0.1} onChange={(foodCostPct) => onChange(current => ({...current,check:{...current.check,foodCostPct}}))}/><NumberField label="Упаковка на чек" unit="₽" value={format.check.packagingPerCheck} step={0.01} onChange={(packagingPerCheck) => onChange(current => ({...current,check:{...current.check,packagingPerCheck}}))}/></div><p className="a-help">Фудкост — стоимость продуктов в процентах от выручки. Меню и цены отдельных блюд не изменяют эти значения автоматически.</p></section>
    {format.id==='bistro' && format.service && <section className="a-panel"><h3>Обслуживание в бистро</h3><label className="a-check"><input type="checkbox" checked={format.service.enabled} onChange={event=>onChange(current=>({...current,service:{...current.service!,enabled:event.target.checked}}))}/><span>По умолчанию — с обслуживанием официантами</span></label><p>Две хостес в смену остаются в обоих режимах. При выключенном обслуживании исключается только отдельная стоимость официантов.</p><div className="a-three-fields"><NumberField label="Одна хостес за смену" unit="₽" value={format.service.hostessShiftPay} step={0.01} onChange={hostessShiftPay=>onChange(current=>({...current,service:{...current.service!,hostessShiftPay}}))} hint="Полная стоимость рабочего дня с начислениями. Две позиции ежедневно."/><NumberField label="Официанты за месяц" unit="₽" value={format.service.waitersMonthlyCost} step={0.01} onChange={waitersMonthlyCost=>onChange(current=>({...current,service:{...current.service!,waitersMonthlyCost}}))} hint="Только доплата за обслуживание; без хостес и других сотрудников."/><div className="a-field"><span>Две хостес / месяц</span><strong>{(2*format.service.hostessShiftPay*(format.calendar.weekdayDays+format.calendar.weekendDays)).toLocaleString('ru-RU')} ₽</strong><small>2 × ставка за смену × рабочих дней</small></div></div><p className="a-help">Эти расходы добавляются к общим автоматически. Не дублируйте их в списке ниже. Режим можно переключать в модели; средний чек и мощность при переключении сами не меняются.</p></section>}
    <section className="a-panel"><h3>План продаж</h3><p>Это потенциальный спрос. Модель ограничит выполненные продажи заданной пропускной способностью.</p><div className="a-day-plans">{(['weekday', 'weekend'] as const).map((dayType) => <fieldset key={dayType}><legend>{dayType === 'weekday' ? 'Будний день' : 'Выходной день'}</legend><div className="a-plan-fields">{PERIODS.map((period) => <NumberField key={period.id} label={period.label} unit="/ ч" value={format.salesPlan[dayType][period.id]} max={1000} step={0.1} onChange={(value) => onChange((current) => ({ ...current, salesPlan: { ...current.salesPlan, [dayType]: { ...current.salesPlan[dayType], [period.id]: value } } }))} />)}</div></fieldset>)}</div></section>
    <section className="a-panel"><h3>Мощность и календарь</h3><div className="a-three-fields"><NumberField label="Пропускная способность" value={format.capacityPerHour} unit="/ ч" max={1000} step={0.1} onChange={(capacityPerHour) => onChange((current) => ({ ...current, capacityPerHour }))} hint="Число чеков, которое кухня и выдача могут выполнить за час." /><NumberField label="Будних дней в месяце" value={format.calendar.weekdayDays} max={31} onChange={(weekdayDays) => onChange((current) => ({ ...current, calendar: { ...current.calendar, weekdayDays } }))} /><NumberField label="Выходных дней в месяце" value={format.calendar.weekendDays} max={31} onChange={(weekendDays) => onChange((current) => ({ ...current, calendar: { ...current.calendar, weekendDays } }))} /></div><p className="a-help">Всего: {format.calendar.weekdayDays + format.calendar.weekendDays} дней. Сумма должна быть от 1 до 31. Каждый рабочий день — 13 часов.</p></section>
    <section className="a-panel"><div className="a-panel-title"><div><h3>Постоянные расходы</h3><p>Укажите полный месяц работы, включая покрытие всех смен.</p></div><button className="a-button" type="button" onClick={() => onChange((current) => ({ ...current, expenses: [...current.expenses, { id: `expense-${crypto.randomUUID().slice(0, 8)}`, label: 'Новый расход', amount: 0 }] }))} disabled={format.expenses.length >= 30}><Plus size={17} /> Расход</button></div><div className="a-expenses">{format.expenses.map((expense) => <div className="a-expense" key={expense.id}><label className="a-field"><span>Статья</span><input value={expense.label} maxLength={240} onChange={(event) => onChange((current) => ({ ...current, expenses: current.expenses.map((row) => row.id === expense.id ? { ...row, label: event.target.value } : row) }))} /></label><NumberField label="В месяц" value={expense.amount} step={0.01} unit="₽" onChange={(amount) => onChange((current) => ({ ...current, expenses: current.expenses.map((row) => row.id === expense.id ? { ...row, amount } : row) }))} /><button type="button" className="a-icon-button" aria-label={`Удалить расход: ${expense.label}`} onClick={() => onChange((current) => ({ ...current, expenses: current.expenses.filter((row) => row.id !== expense.id) }))}><Trash2 size={18} /></button></div>)}</div><div className="a-expense-total"><span>Базовые расходы / месяц{format.service ? ' · без хостес и официантов' : ''}</span><strong>{format.expenses.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0).toLocaleString('ru-RU')} ₽</strong></div></section>
    <section className="a-panel"><h3>Переменные расходы</h3><div className="a-four-fields"><NumberField label="Эквайринг" unit="%" value={format.variable.acquiringPct} max={100} step={0.1} onChange={(acquiringPct) => onChange((current) => ({ ...current, variable: { ...current.variable, acquiringPct } }))} /><NumberField label="Налог бизнеса" unit="%" value={format.variable.taxPct} max={100} step={0.1} onChange={(taxPct) => onChange((current) => ({ ...current, variable: { ...current.variable, taxPct } }))} /><NumberField label="Прочие переменные" unit="%" value={format.variable.otherPct} max={100} step={0.1} onChange={(otherPct) => onChange((current) => ({ ...current, variable: { ...current.variable, otherPct } }))} /><NumberField label="Напитки и подарки" unit="₽ / чек" value={format.variable.includedPerSaleCost} step={0.01} onChange={(includedPerSaleCost) => onChange((current) => ({ ...current, variable: { ...current.variable, includedPerSaleCost } }))} /></div><p className="a-help">Проценты считаются от выручки. Налог бизнеса — упрощённое допущение, отдельно от личных налогов инвестора. Если напитки уже включены в фудкост, оставьте дополнительные затраты на них равными нулю.</p></section>
    <section className="a-panel"><h3>Параметры участия</h3><div className="a-three-fields"><NumberField label="Взнос инвестора" unit="₽" value={format.investment.capital} min={1} max={500_000_000} step={0.01} onChange={(capital) => onChange((current) => ({ ...current, investment: { ...current.investment, capital } }))} /><NumberField label="Доля в прибыли" unit="%" value={format.investment.sharePct} max={100} step={0.1} onChange={(sharePct) => onChange((current) => ({ ...current, investment: { ...current.investment, sharePct } }))} /><NumberField label="Фиксированная годовая ставка" unit="%" value={format.investment.fixedAnnualPct} max={100} step={0.1} onChange={(fixedAnnualPct) => onChange((current) => ({ ...current, investment: { ...current.investment, fixedAnnualPct } }))} /></div><p className="a-help">Это два отдельных варианта участия. Все доходности и выплаты показываются до личных налогов, которые инвестор платит самостоятельно.</p></section>
  </div>;
}

function AddItem({ categories, onAdd, onClose }: { categories: string[]; onAdd: (item: Omit<CatalogItem, 'id' | 'status'>) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(''); const [category, setCategory] = useState(categories[0] ?? 'sets');
  const [price, setPrice] = useState(0);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!name.trim() || !category.trim()) return;
    onAdd({ name: name.trim(), category: category.trim(), icon: category.trim(), basePrice: price, foodCostPct:0, packagingCost:0, source: 'Добавлено администратором в информационное меню.' });
  }
  return <dialog className="a-dialog a-dialog--add" ref={ref} aria-labelledby="add-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><div className="a-dialog-heading"><h2 id="add-title">Новая позиция</h2><button className="a-icon-button" onClick={onClose} aria-label="Закрыть форму"><X size={21} /></button></div><p>Добавится в общий каталог и во все четыре меню в выключенном состоянии.</p><form onSubmit={submit}>
    <label className="a-field"><span>Название</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={240} placeholder="Например, сет с раменом" /></label>
    <label className="a-field"><span>Категория</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{categoryName(item)}</option>)}</select></label>
    <NumberField label="Начальная цена" value={price} onChange={setPrice} unit="₽" step={0.01} /><p className="a-help">Цену можно изменить отдельно в каждом формате. Для включения нужна цена больше нуля. Это информационная цена, на экономику чеков она не влияет.</p>
    <div className="a-actions"><button type="button" className="a-button" onClick={onClose}>Отмена</button><button className="a-button a-button--dark" disabled={!name.trim() || !Number.isFinite(price)}><Check size={17} /> Добавить в каталог</button></div>
  </form></dialog>;
}
