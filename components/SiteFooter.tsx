import { BrandLogo, Arrow } from "./BrandLogo";
import { concepts, CONTACT_URL } from "@/lib/brand-content";

export function SiteFooter() {
  return <footer className="m-footer">
    <div className="container">
      <div className="m-footer__top"><div><p className="eyebrow">Следующий шаг</p><h2>Давайте познакомимся.<br />И выберем место.</h2></div><a className="button button--light" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">Написать в Telegram <Arrow diagonal /></a></div>
      <div className="m-footer__links"><a href="/" aria-label="Киомей — главная" className="m-footer__brand"><BrandLogo /></a><nav aria-label="Форматы в подвале">{concepts.map(c => <a key={c.id} href={`/concepts/${c.id}`}>{c.descriptor}</a>)}</nav><nav aria-label="Материалы"><a href="/model">Модель экономики</a><a href="/docs/investor.pdf" target="_blank" rel="noopener noreferrer">Инвесторбук ↗</a><a href="/docs/brandbook.pdf" target="_blank" rel="noopener noreferrer">Брендбук ↗</a></nav></div>
      <div className="m-footer__bottom"><span>© {new Date().getFullYear()} Киомей</span><p>Информация не является офертой. Новые точки представлены как концепции. Параметры участия и расчёты уточняются для конкретного проекта и фиксируются в договоре.</p><a href="/admin">Управление</a></div>
    </div>
  </footer>;
}

export default SiteFooter;
