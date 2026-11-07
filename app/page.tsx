import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeEconomics } from "@/components/HomeEconomics";
import { BrandLogo, Arrow } from "@/components/BrandLogo";
import { concepts, CONTACT_URL } from "@/lib/brand-content";

export default function Home() {
  return <>
    <SiteHeader />
    <main id="main" className="marketing">
      <section className="m-hero m-hero--katana" aria-labelledby="hero-title">
        <img className="m-hero__image" src="/assets/interiors/kyomei-interior-katana-1600.webp" srcSet="/assets/interiors/kyomei-interior-katana-960.webp 960w, /assets/interiors/kyomei-interior-katana-1600.webp 1600w, /assets/interiors/kyomei-interior-katana-2400.webp 2400w" sizes="(max-width: 900px) 100vw, 55vw" alt="Катана на стойке и надпись MASSE OMAKASE на стене действующего Киомей" fetchPriority="high" />
        <div className="m-hero__shade" />
        <div className="container m-hero__content"><p className="eyebrow">Доступная гастрономия на каждый день.</p><h1 id="hero-title">Киомей строит сеть и приглашает партнеров</h1><div className="m-hero__bottom"><p>Приглашаем партнеров для создания сети доступного питания - Киомей</p><a href="#formats" className="button button--light">Выбрать свой формат <Arrow /></a></div></div>
        <p className="m-hero__caption">Действующее бистро Киомей · Дизайн Завод, Москва</p>
      </section>

      <section className="container m-intro m-section" aria-labelledby="intro-title"><div><p className="eyebrow">Из настоящего места — в повседневную жизнь</p><h2 id="intro-title" className="m-intro__statement">Есть ясность для гостей, есть вкус, есть модель, подтвержденная результатом сегодня.</h2></div><div className="m-intro__body"><p className="m-lead">Так мы, команда Киомей, оцениваем опыт действующего бистро на Дизайн Заводе. В основе — знакомые людям ситуации: где пообедать, с кем встретиться и что взять домой к ужину.</p><p>Развиваем места, куда понятно зачем идти. Поесть между делами, встретиться после работы, купить ужин на двоих или ненадолго отвлечься с чашкой матча. Объединяем эти поводы под именем Киомей.</p><a href="/docs/brandbook.pdf" className="m-text-link" target="_blank" rel="noopener noreferrer">Посмотреть брендбук <Arrow diagonal /></a></div></section>

      <section id="formats" className="m-formats" aria-labelledby="formats-title"><div className="container m-section-heading"><div><p className="eyebrow">01 / Выберите свой повод</p><h2 id="formats-title">Один Киомей.<br />Четыре повода зайти.</h2></div><p>Для рабочего обеда, встречи с друзьями,<br />ужина дома и маленькой паузы.</p></div>
        {concepts.map(c => <article key={c.id} className={`m-format m-format--${c.id}`} style={{ "--format-ink": c.ink, "--format-paper": c.paper } as CSSProperties}>
          <a href={`/concepts/${c.id}`} className="m-format__image-link" aria-label={`Подробнее: ${c.descriptor}`}><img src={c.id === "bistro" ? "/assets/interiors/kyomei-interior-tables-1600.webp" : `/assets/interior-${c.id}.webp`} srcSet={c.id === "bistro" ? "/assets/interiors/kyomei-interior-tables-960.webp 960w, /assets/interiors/kyomei-interior-tables-1600.webp 1600w" : undefined} sizes={c.id === "bistro" ? "(max-width: 850px) 100vw, 54vw" : undefined} alt={c.id === "bistro" ? "Посадка и деревянная решётка в действующем бистро Киомей" : `Концепция интерьера: Киомей, ${c.descriptor.toLowerCase()}`} loading="lazy" /><span className="m-image-note">{c.id === "bistro" ? "Действующее бистро · Дизайн Завод" : "Визуальная концепция"}</span></a>
          <div className="m-format__content"><div className="m-format__meta"><span>{c.number}</span><span>{c.status}</span></div><BrandLogo format={c.id} className="m-format__logo" /><h3>{c.title}</h3><p>{c.summary}</p><dl className="m-format__facts"><div><dt>Площадь</dt><dd>{c.area}</dd></div><div><dt>Участие за 50%</dt><dd>{c.capital}</dd></div></dl><a className="m-text-link" href={`/concepts/${c.id}`}>Изучить формат <Arrow /></a></div>
        </article>)}
      </section>

      <section id="participation" className="m-participation m-section" aria-labelledby="participation-title"><div className="container"><div className="m-section-heading"><div><p className="eyebrow">02 / Выберите свою роль</p><h2 id="participation-title">Общее дело.<br />Своя роль в нём.</h2></div><p>Можно стать партнёром точки<br />или участвовать в её финансировании.</p></div><div className="m-participation__options">
        <article><div className="m-participation__label"><span>01</span><h3>Ресторатор</h3></div><p>Партнёрство в проекте: разделяете предпринимательский риск и участвуете в результате бизнеса.</p><div className="m-rate">36–54<span>%</span></div><p className="m-rate-caption">целевой диапазон годовой доходности</p><ul><li>Доля и условия участия фиксируются в договоре</li><li>Доход зависит от работы конкретной точки</li><li>Личные налоги — самостоятельно</li></ul><a href="/model?mode=active" className="m-text-link">Посмотреть сценарий партнёра <Arrow /></a></article>
        <article><div className="m-participation__label"><span>02</span><h3>Инвестор</h3></div><p>Финансирование с предлагаемой фиксированной ставкой. Обязательства и порядок выплат определяет договор.</p><div className="m-rate">24<span>%</span></div><p className="m-rate-caption">предлагаемая ставка годовых до личного налога</p><ul><li>Ставка не привязана к прибыли точки</li><li>Без участия в ежедневном управлении</li><li>Сумма, срок и обеспечение обсуждаются отдельно</li></ul><a href="/model?mode=passive" className="m-text-link">Посмотреть сценарий инвестора <Arrow /></a></article>
      </div><p className="m-footnote">Показатели описывают предложение и цели проекта, а не гарантированный результат. Прогноз и условия участия проверяются на конкретной локации.</p></div></section>

      <section className="m-economics m-section" aria-labelledby="economics-title"><div className="container m-economics__grid"><div><p className="eyebrow">03 / Проверьте цифры</p><h2 id="economics-title">Место для гостей.<br />Понятная модель для вас.</h2><p>Задайте количество чеков и средний чек. Посмотрите, какую выручку может дать точка и что останется после продуктов, команды, аренды и других расходов.</p><a href="/model" className="button button--primary">Открыть модель <Arrow /></a></div><HomeEconomics /></div></section>

      <section className="container m-process m-section" aria-labelledby="process-title"><div className="m-section-heading"><div><p className="eyebrow">04 / От адреса до открытия</p><h2 id="process-title">Поймём, кому нужны.<br />И где нас будут ждать.</h2></div><p>От привычек людей рядом<br />к формату, помещению и плану запуска.</p></div><ol className="m-process__steps"><li><span>01</span><h3>Знакомимся</h3><p>Обсуждаем, для кого открываем точку: кто живёт, работает и проходит рядом.</p></li><li><span>02</span><h3>Проверяем</h3><p>Проверяем, подходит ли место для выбранных поводов зайти, кухни и бюджета.</p></li><li><span>03</span><h3>Фиксируем</h3><p>Выбираем формат, согласуем бюджет, роли партнёров и договорные условия.</p></li><li><span>04</span><h3>Готовим запуск</h3><p>Готовим пространство, еду и сервис, чтобы гостю было легко сделать первый заказ.</p></li></ol></section>

      <section className="m-materials" aria-labelledby="materials-title"><div className="container m-materials__inner"><div><p className="eyebrow">Материалы для разговора</p><h2 id="materials-title">Всё предложение<br />можно взять с собой.</h2></div><div><a href="/docs/investor.pdf" target="_blank" rel="noopener noreferrer">Инвесторбук <span>Форматы и варианты участия</span><Arrow diagonal /></a><a href="/docs/brandbook.pdf" target="_blank" rel="noopener noreferrer">Брендбук <span>Айдентика, пространства, продукт</span><Arrow diagonal /></a><a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">Обсудить лично <span>Telegram · Роман</span><Arrow diagonal /></a></div></div></section>
    </main>
    <SiteFooter />
  </>;
}
