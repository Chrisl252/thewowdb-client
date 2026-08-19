import { ExtLink } from "../chrome.jsx";
import { PACK_ITEMS } from "../data.js";
import { useStore } from "../store.jsx";

function List({ items, lang, checks, toggle, packDone, packOpen }) {
  return (
    <ul className="pack-list">
      {items.map((item) => (
        <li key={item.id} className={checks[item.id] ? "is-on" : ""}>
          <label>
            <input type="checkbox" checked={Boolean(checks[item.id])} onChange={() => toggle(item.id)} />
            <span>
              {lang === "es" ? item.es : item.en}
              {checks[item.id] ? <em> · {packDone}</em> : null}
            </span>
          </label>
          <ExtLink href={item.href}>{packOpen}</ExtLink>
        </li>
      ))}
    </ul>
  );
}

export default function Pack() {
  const { t, lang, packChecks, togglePack, resetPack } = useStore();

  return (
    <section className="page">
      <p className="kicker">2 / 4</p>
      <h1>{t.packTitle}</h1>
      <p className="lead">{t.packLead}</p>

      <h2>{t.packMaabd}</h2>
      <List
        items={PACK_ITEMS.maabd}
        lang={lang}
        checks={packChecks}
        toggle={togglePack}
        packDone={t.packDone}
        packOpen={t.packOpen}
      />

      <h2>{t.packPcs}</h2>
      <List
        items={PACK_ITEMS.pcs}
        lang={lang}
        checks={packChecks}
        toggle={togglePack}
        packDone={t.packDone}
        packOpen={t.packOpen}
      />

      <button type="button" className="btn btn-ghost" onClick={resetPack}>
        {t.resetChecks}
      </button>
    </section>
  );
}
