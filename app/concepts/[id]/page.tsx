import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo, Arrow } from "@/components/BrandLogo";
import { concepts, getConcept, CONTACT_URL } from "@/lib/brand-content";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return concepts.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const concept = getConcept(id);
  return { title: concept ? `${concept.descriptor} — Киомей для партнёров` : "Формат не найден — Киомей", description: concept?.summary };
}

export default async function ConceptPage({ params }: Props) {
  const { id } = await params;
  const c = getConcept(id);
  if (!c) notFound();
  const otherConcepts = concepts.filter(item => item.id !== c.id);

  return <>
    <SiteHeader />
    <main id="main" className={`marketing m-concept m-concept--${c.id}`} style={{ "--format-ink": c.ink, "--format-paper": c.paper } as CSSProperties}>
      <section className="m-concept-intro"><div className="container"><a className="m-back-link" href="/#formats">← Все форматы</a><div className="m-concept-intro__grid"><div><p className="eyebrow">{c.number} / {c.descriptor}</p><h1>{c.title}</h1></div><div className="m-concept-intro__summary"><span className="m-status">{c.status}</span><p className="m-lead">{c.summary}</p><div className="m-actions"><a href="/docs/investor.pdf" target="_blank" rel="noopener noreferrer" className="button button--primary">Инвесторбук <Arrow diagonal /></a><a href={`/model?format=${c.id}`} className="button button--outline">Рассчитать модель <Arrow /></a></div></div></div></div></section>

      <figure className="m-concept-visual"><img src={c.id === "bistro" ? "/assets/interiors/kyomei-interior-tables-1600.webp" : `/assets/interior-${c.id}.webp`} srcSet={c.id === "bistro" ? "/assets/interiors/kyomei-interior-tables-960.webp 960w, /assets/interiors/kyomei-interior-tables-1600.webp 1600w, /assets/interiors/kyomei-interior-tables-2400.webp 2400w" : undefined} sizes={c.id === "bistro" ? "100vw" : undefined} alt={c.id === "bistro" ? "Настоящий интерьер Киомей на Дизайн Заводе: деревянные столы и посадка" : `Визуальная концепция интерьера Киомей — ${c.descriptor.toLowerCase()}`} fetchPriority="high" /><figcaption>{c.id === "bistro" ? "Действующее бистро Киомей · Дизайн Завод, Москва" : "Визуальная концепция · не рабочий проект конкретного помещения"}</figcaption></figure>

      <section className="container m-concept-facts" aria-label="Основные параметры формата"><dl><div><dt>Площадь</dt><dd>{c.area}</dd></div><div><dt>Ориентир аренды</dt><dd>{c.rent}</dd></div><div><dt>Партнёрское участие</dt><dd>{c.capital}</dd></div><div><dt>Доля в проекте</dt><dd>50%</dd></div></dl><p className="m-footnote">Ориентиры для отбора локации и обсуждения партнёрства. Состав бюджета и условия участия уточняются после проверки помещения.</p></section>

      <section className="container m-concept-story m-section"><div><p className="eyebrow">Сценарий визита</p><h2>{c.occasion}</h2><BrandLogo format={c.id} className="m-concept-story__logo" /></div><div><p className="m-lead">{c.story}</p><ul className="m-service-list">{c.service.map((item, i) => <li key={item}><span>0{i + 1}</span>{item}</li>)}</ul></div></section>

      {c.id === "bistro" && <section className="container m-interior-gallery" aria-labelledby="interior-title"><div className="m-section-heading"><div><p className="eyebrow">Киомей на Дизайн Заводе</p><h2 id="interior-title">Внутри Киомей</h2></div><p>Столы для встреч, тёплое дерево и детали, к которым хочется возвращаться.</p></div><div className="m-interior-gallery__grid">{[
        {file:"kyomei-interior-brick",alt:"Столы и кирпичные стены в зале Киомей",caption:"Собраться за одним столом"},
        {file:"kyomei-interior-japan",alt:"Столик в камерной зоне Киомей с рисунком на стене",caption:"Найти своё место"},
        {file:"kyomei-exterior",alt:"Фасад действующего Киомей с вывеской на Дизайн Заводе",caption:"Договориться встретиться здесь"},
      ].map(photo=><figure key={photo.file}><img src={`/assets/interiors/${photo.file}-960.webp`} srcSet={`/assets/interiors/${photo.file}-960.webp 960w, /assets/interiors/${photo.file}-1600.webp 1600w`} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 50vw, 33vw" alt={photo.alt} loading="lazy" width="1600" height="1067" /><figcaption>{photo.caption}</figcaption></figure>)}</div><p className="m-footnote">Фотографии действующего бистро. Пространство каждой новой локации адаптируем к помещению и привычкам гостей рядом.</p></section>}

      <section className="m-concept-menu m-section" aria-labelledby="menu-title"><div className="container"><div className="m-section-heading"><div><p className="eyebrow">Еда для вашего дня</p><h2 id="menu-title">На обед. На двоих.<br />На ещё одну встречу.</h2></div><p>{c.id === "bistro" ? "Можно прийти с разными вкусами и планами." : "Легко выбрать под время и аппетит."}<br />Знакомимся с предложением Киомей.</p></div><div className={`m-food-grid m-food-grid--${c.food.length}`}>{c.food.map(item => <figure key={item.title}><div><img src={item.image} alt={item.alt} loading="lazy" /></div><figcaption><h3>{item.title}</h3><p>{item.text}</p></figcaption></figure>)}</div><div className="m-menu-detail"><p className="eyebrow">Основа ассортимента</p><dl>{c.menu.map(item => <div key={item.name}><dt>{item.name}</dt><dd>{item.detail}</dd></div>)}</dl></div><p className="m-footnote">{c.menuNote}</p><a className="m-text-link" href={`/model?format=${c.id}`}>Посмотреть информационное меню <Arrow /></a></div></section>

      <section className="container m-concept-economics m-section"><div><p className="eyebrow">Ваша точка. Ваш сценарий.</p><h2>Проверьте потенциал<br />на своих цифрах.</h2><p>Измените количество чеков, средний чек и основные расходы. Сравните результат точки и доходность в двух вариантах участия. Меню рядом помогает понять, за чем будут приходить гости.</p></div><div className="m-concept-economics__aside"><div className="m-concept-economics__amount"><span>Ориентир партнёрского участия</span><strong>{c.capital}</strong><span>за 50% проекта</span></div><a className="button button--primary" href={`/model?format=${c.id}`}>Открыть модель формата <Arrow /></a><a className="button button--outline" href="/docs/investor.pdf" target="_blank" rel="noopener noreferrer">Скачать инвесторбук <Arrow diagonal /></a><p className="m-footnote">Расчёты основаны на редактируемых допущениях. Они помогают сравнить сценарии и не являются обещанием дохода.</p></div></section>

      <section className="m-other-formats"><div className="container"><div className="m-section-heading"><h2>Другой масштаб?<br />Тот же Киомей.</h2><a className="m-text-link" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">Обсудить подходящий формат <Arrow diagonal /></a></div><nav aria-label="Другие форматы">{otherConcepts.map(item => <a key={item.id} href={`/concepts/${item.id}`}><span>{item.number}</span><div><h3>{item.descriptor}</h3><p>{item.area} · {item.capital} за 50%</p></div><Arrow /></a>)}</nav></div></section>
    </main>
    <SiteFooter />
  </>;
}
