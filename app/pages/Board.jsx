import { Link } from "react-router-dom";
import { LINKS } from "../data.js";
import { ExtLink } from "../chrome.jsx";
import { useStore } from "../store.jsx";

export default function Board() {
  const { t } = useStore();

  return (
    <section className="board">
      <p className="kicker">{t.boardKicker}</p>
      <h1>{t.boardTitle}</h1>
      <p className="lead">{t.boardLead}</p>

      <div className="wall" aria-label={t.boardTitle}>
        <div className="course course-a">
          <Link className="brick brick-lg brick-clay" to="/wizard">
            <span className="brick-num">1</span>
            <span className="brick-title">{t.brick1}</span>
            <span className="brick-sub">{t.brick1sub}</span>
          </Link>
          <Link className="brick brick-lg brick-adobe" to="/pack">
            <span className="brick-num">2</span>
            <span className="brick-title">{t.brick2}</span>
            <span className="brick-sub">{t.brick2sub}</span>
          </Link>
        </div>
        <div className="course course-b">
          <Link className="brick brick-lg brick-sienna" to="/directory">
            <span className="brick-num">3</span>
            <span className="brick-title">{t.brick3}</span>
            <span className="brick-sub">{t.brick3sub}</span>
          </Link>
          <Link className="brick brick-lg brick-umber" to="/heat">
            <span className="brick-num">4</span>
            <span className="brick-title">{t.brick4}</span>
            <span className="brick-sub">{t.brick4sub}</span>
          </Link>
        </div>
        <div className="course course-c">
          <ExtLink className="brick brick-sm brick-dust" href={LINKS.nv211seniors}>
            <span className="brick-title">{t.mini211}</span>
          </ExtLink>
          <ExtLink className="brick brick-sm brick-blush" href={LINKS.access}>
            <span className="brick-title">{t.miniAccess}</span>
          </ExtLink>
          <ExtLink className="brick brick-sm brick-oxblood" href={LINKS.pcs}>
            <span className="brick-title">{t.miniDhcpf}</span>
          </ExtLink>
          <ExtLink className="brick brick-sm brick-sand" href={LINKS.stayCool}>
            <span className="brick-title">{t.miniCool}</span>
          </ExtLink>
        </div>
      </div>
    </section>
  );
}
