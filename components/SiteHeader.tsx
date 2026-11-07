"use client";

import { useState } from "react";
import { BrandLogo, Arrow } from "./BrandLogo";
import { CONTACT_URL } from "@/lib/brand-content";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <>
    <a className="m-skip-link" href="#main">Перейти к содержанию</a>
    <header className="m-header">
      <div className="container m-header__inner">
        <a href="/" className="m-header__brand" aria-label="Киомей — главная"><BrandLogo /><span>Для партнёров</span></a>
        <button className="m-header__toggle" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}><span>{open ? "Закрыть" : "Меню"}</span><span className={open ? "m-menu-lines is-open" : "m-menu-lines"} aria-hidden="true"><i /><i /></span></button>
        <nav id="main-navigation" aria-label="Основная навигация" className={`m-header__nav ${open ? "is-open" : ""}`}>
          <a href="/#formats" onClick={() => setOpen(false)}>Форматы</a>
          <a href="/#participation" onClick={() => setOpen(false)}>Участие</a>
          <a href="/model" onClick={() => setOpen(false)}>Экономика</a>
          <a className="m-header__contact" href={CONTACT_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Обсудить проект <Arrow diagonal /></a>
        </nav>
      </div>
    </header>
  </>;
}

export default SiteHeader;
