import { ExtLink } from "../chrome.jsx";
import { OFFICIAL_DOORS, SCAM_FLAGS } from "../data.js";
import { useStore } from "../store.jsx";

export default function Directory() {
  const { t, lang } = useStore();

  return (
    <section className="page">
      <p className="kicker">3 / 4</p>
      <h1>{t.dirTitle}</h1>
      <p className="lead">{t.dirLead}</p>

      <h2>{t.dirOfficial}</h2>
      <ul className="door-list">
        {OFFICIAL_DOORS.map((door) => (
          <li key={door.id} className="door">
            <h3>{lang === "es" ? door.es : door.en}</h3>
            <p>{lang === "es" ? door.noteEs : door.noteEn}</p>
            <div className="path-actions">
              <ExtLink className="btn" href={door.href}>
                {t.packOpen}
              </ExtLink>
              {door.phone ? (
                <a className="btn btn-ghost" href={door.phone.href}>
                  {t.dirCall} · {door.phone.label}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <h2>{t.dirFlags}</h2>
      <ul className="flag-list">
        {SCAM_FLAGS.map((flag, i) => (
          <li key={i}>{lang === "es" ? flag.es : flag.en}</li>
        ))}
      </ul>
    </section>
  );
}
