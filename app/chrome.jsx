import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useStore } from "./store.jsx";

export function Banner() {
  const { t } = useStore();
  return (
    <p className="fc-banner" role="note">
      {t.banner}
    </p>
  );
}

export function LangToggle() {
  const { lang, setLang } = useStore();
  return (
    <div className="fc-lang" role="group" aria-label="Language">
      <button type="button" className={lang === "en" ? "is-on" : ""} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "es" ? "is-on" : ""} onClick={() => setLang("es")}>
        ES
      </button>
    </div>
  );
}

export function BrickNav() {
  const { t } = useStore();
  const item = (to, label) => (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => (isActive ? "is-on" : "")}>
      {label}
    </NavLink>
  );
  return (
    <nav className="fc-nav" aria-label="Free Care">
      {item("/", t.navBoard)}
      {item("/wizard", t.navWizard)}
      {item("/pack", t.navPack)}
      {item("/directory", t.navDirectory)}
      {item("/heat", t.navHeat)}
      {item("/legal", t.navLegal)}
    </nav>
  );
}

export function Shell({ children }) {
  const { t, lang } = useStore();
  useEffect(() => {
    document.documentElement.lang = lang === "es" ? "es" : "en";
  }, [lang]);
  return (
    <div className="fc-shell">
      <Banner />
      <header className="fc-top">
        <div>
          <p className="fc-brand">
            <Link to="/">{t.product}</Link>
          </p>
          <p className="fc-tag">{t.tagline}</p>
        </div>
        <LangToggle />
      </header>
      <BrickNav />
      <main className="fc-main">{children}</main>
      <footer className="fc-foot">
        <NavLink to="/legal">{t.footerLegal}</NavLink>
      </footer>
    </div>
  );
}

export function ExtLink({ href, children, className }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}
