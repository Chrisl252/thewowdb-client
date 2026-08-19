import { ExtLink } from "../chrome.jsx";
import { COOLING_PLACES, LINKS, PHONES } from "../data.js";
import { useStore } from "../store.jsx";

export default function Heat() {
  const { t, lang } = useStore();

  return (
    <section className="page">
      <p className="kicker">4 / 4</p>
      <h1>{t.heatTitle}</h1>
      <p className="lead">{t.heatLead}</p>

      <article className="path">
        <h2>{t.heatStayCool}</h2>
        <div className="path-actions">
          <ExtLink className="btn" href={LINKS.stayCool}>
            {t.heatStayCool}
          </ExtLink>
          <a className="btn btn-ghost" href={PHONES.nv211.href}>
            {t.dirCall} 211
          </a>
          <a className="btn btn-ghost" href={PHONES.clark311.href}>
            {t.dirCall} 311
          </a>
          <a className="btn btn-ghost" href={PHONES.emergency.href}>
            {t.dirCall} 911
          </a>
        </div>
      </article>

      <article className="path path-warn">
        <h2>{t.heatIfMissed}</h2>
        <p>{t.heatIfMissedBody}</p>
      </article>

      <h2>{t.heatCenters}</h2>
      <ul className="cool-list">
        {COOLING_PLACES.map((place) => (
          <li key={place.id}>
            <strong>{lang === "es" ? place.es : place.en}</strong>
            <span>{place.area}</span>
            <em>{t.confirmHours}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}
