import { intel } from "../data.js";

const maxPaid = Math.max(...intel.money.yearly.map((y) => y.paid));

export default function Intel() {
  const { serp, people, employees, apps, model, money, timeline, sources, snapshot } = intel;

  return (
    <article className="intel">
      <header className="intel-hero">
        <p className="eyebrow">Competitive desk · {intel.asOf}</p>
        <h1>{intel.subject}</h1>
        <p className="lede">{intel.oneLiner}</p>
      </header>

      <section className="kpi-grid">
        {snapshot.map((k) => (
          <div key={k.label} className="kpi">
            <span>{k.label}</span>
            <b>{k.value}</b>
            <small>{k.note}</small>
          </div>
        ))}
      </section>

      <section className="intel-block">
        <h2>How the existing business works</h2>
        <p>
          FreedomCare is not a hospital and not a government agency. It sits between a Medicaid
          member who needs hands in the house and a caregiver who is often already family. The
          company enrolls both sides, runs compliance and payroll, clocks visits (EVV), bills
          personal-care units, and — the Grubhub move — can pay the aide the same day the shift
          ends.
        </p>
        <ol className="flow">
          {model.flow.map((step, i) => (
            <li key={step}>
              <em>{String(i + 1).padStart(2, "0")}</em>
              {step}
            </li>
          ))}
        </ol>
        <h3>Where “Grubhub for healthcare” holds — and snaps</h3>
        <p>{model.analog}</p>
        <ul className="breaks">
          {model.breaks.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="callout">{model.nyPivot}</p>
      </section>

      <section className="intel-block">
        <h2>15 claimed states — not one product</h2>
        <p>
          Each state is a different Medicaid vehicle. New York is LHCSA agency care, not
          consumer-directed CDPAP. Wisconsin is on the homepage and missing from the states
          sitemap. Shell NPIs already exist for CA, TX, KS, NH, MT, ME and others that are not
          claimed live.
        </p>
        <ul className="flow">
          {intel.states.map((s) => (
            <li key={s.code}>
              <em>{s.code}</em>
              {s.program}
            </li>
          ))}
        </ul>
      </section>

      <section className="intel-block two">
        <div>
          <h2>Who runs it · how long</h2>
          <dl className="facts">
            <div>
              <dt>Founder / CEO</dt>
              <dd>
                {people.founderCeo}
                <small>{people.ceoSince}</small>
              </dd>
            </div>
            <div>
              <dt>COO / CFO</dt>
              <dd>
                {people.coo} · {people.cfo}
              </dd>
            </div>
            <div>
              <dt>HQ</dt>
              <dd>{people.hq}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {people.phone} · {people.email}
              </dd>
            </div>
            <div>
              <dt>Entity</dt>
              <dd>
                {people.type}. LinkedIn aliases include FreedomCare, LLC and FreedomCare NY.
              </dd>
            </div>
            <div>
              <dt>NY operator</dt>
              <dd>{people.nyOperator}</dd>
            </div>
            <div>
              <dt>BBB</dt>
              <dd>{people.bbb}</dd>
            </div>
          </dl>
          <p>{people.footprint}</p>
          <ul className="offices">
            {people.offices.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Timeline</h2>
          <ol className="timeline">
            {timeline.map((t) => (
              <li key={t.year}>
                <b>{t.year}</b>
                <span>{t.event}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="intel-block">
        <h2>Employees — the number everyone argues about</h2>
        <p>{employees.caveat}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Date</th>
                <th>Figure</th>
                <th>Caregivers in the count?</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {employees.rows.map((r) => (
                <tr key={r.source}>
                  <td>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.source}
                    </a>
                  </td>
                  <td>{r.date}</td>
                  <td>{r.figure}</td>
                  <td>{r.includesCaregivers}</td>
                  <td>{r.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="callout">{employees.estimate}</p>
      </section>

      <section className="intel-block">
        <h2>SERP & domain</h2>
        <div className="serp">
          <p className="serp-chrome">Google · {serp.domain}</p>
          <p className="serp-url">https://{serp.domain} ↗</p>
          <a className="serp-title" href={`https://${serp.domain}/`} target="_blank" rel="noreferrer">
            {serp.title}
          </a>
          <p className="serp-meta">{serp.meta}</p>
          <ul className="sitelinks">
            {serp.sitelinks.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="whois">
          <h3>WHOIS · {serp.domain}</h3>
          <dl className="facts">
            <div>
              <dt>Created</dt>
              <dd>{serp.whois.created}</dd>
            </div>
            <div>
              <dt>Updated / expires</dt>
              <dd>
                {serp.whois.updated} · {serp.whois.expires}
              </dd>
            </div>
            <div>
              <dt>Registrar</dt>
              <dd>
                {serp.whois.registrar} · {serp.whois.privacy}
              </dd>
            </div>
            <div>
              <dt>Registry ID</dt>
              <dd>{serp.whois.registryId}</dd>
            </div>
            <div>
              <dt>NS</dt>
              <dd>{serp.whois.nameservers.join(" · ")}</dd>
            </div>
          </dl>
          <p>{serp.whois.note}</p>
        </div>
        <h3>Traffic estimates (third-party — treat as directional)</h3>
        <dl className="facts dense">
          {Object.entries(serp.traffic).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3>Queries to watch</h3>
        <ul className="queries">
          {serp.queries.map((q) => (
            <li key={q.q}>
              <code>{q.q}</code>
              <span>
                {q.intent} — {q.note}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="intel-block">
        <h2>Medicaid money — why the marketplace worked</h2>
        <p>
          {money.unit}. {money.growth}. Mix: {money.mix}. Company claim: {money.patients}.{" "}
          {money.reviews}.
        </p>
        <div className="bars" role="img" aria-label="Medicaid paid by year">
          {money.yearly.map((y) => (
            <div key={y.year} className="bar">
              <div style={{ height: `${(y.paid / maxPaid) * 140}px` }} />
              <span>${y.paid.toFixed(0)}M</span>
              <small>{y.year}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="intel-block two">
        <div>
          <h2>The app — the actual Grubhub surface</h2>
          <ul className="app-cards">
            <li>
              <b>iOS</b>
              <span>
                {apps.ios.rating} · {apps.ios.ratings} ratings · {apps.ios.version}
              </span>
              <a href={apps.ios.url} target="_blank" rel="noreferrer">
                App Store {apps.ios.id}
              </a>
            </li>
            <li>
              <b>Android</b>
              <span>
                {apps.android.reviews} reviews · {apps.android.downloads} · updated {apps.android.updated}
              </span>
              <a href={apps.android.url} target="_blank" rel="noreferrer">
                {apps.android.id}
              </a>
            </li>
          </ul>
          <p>{apps.patent}</p>
          <p>{apps.product}</p>
        </div>
        <div>
          <h2>Sources</h2>
          <ul className="sources">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
