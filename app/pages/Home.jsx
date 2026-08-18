import { Link, useNavigate } from "react-router-dom";
import { caregivers, categories } from "../data.js";
import { Portrait, Stars } from "../chrome.jsx";
import { useStore } from "../store.jsx";

export default function Home() {
  const { zip, setZip } = useStore();
  const navigate = useNavigate();
  const featured = caregivers.filter((c) => c.open).slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Medicaid-funded · same-day caregiver pay</p>
          <h1>
            Order care
            <br />
            the way you
            <br />
            order dinner.
          </h1>
          <p className="lede">
            Kindred is Grubhub for home care. Pick who walks in the door — a
            daughter, a neighbor, a certified aide. The state pays the ticket.
            They get paid when the shift ends.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/browse");
            }}
          >
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              placeholder="ZIP code"
              aria-label="ZIP code"
            />
            <button type="submit">See who’s in the kitchen</button>
          </form>
          <p className="fine">
            Demo only. FreedomCare proved the model: 10 years, 15 states, $3.03B
            Medicaid 2018–24. <Link to="/intel">Open the intel desk →</Link>
          </p>
        </div>
        <div className="hero-stack" aria-hidden="true">
          {featured.slice(0, 3).map((c, i) => (
            <article key={c.id} className={`ticket t-${i}`}>
              <Portrait caregiver={c} size={48} />
              <div>
                <strong>{c.name}</strong>
                <span>
                  {c.neighborhood} · {c.eta} min · InstaPay
                </span>
              </div>
              <em>${c.rate}/hr</em>
            </article>
          ))}
          <div className="hero-pay">
            <span>Shift closed</span>
            <b>Paid in 12 seconds</b>
            <small>InstaPay analog · Rapid card</small>
          </div>
        </div>
      </section>

      <section className="cats">
        <header>
          <h2>What are you hungry for — in a care sense.</h2>
          <p>Categories work like cuisines. Family-hire is the house special.</p>
        </header>
        <div className="cat-grid">
          {categories.map((cat) => (
            <Link key={cat.id} className="cat" to={`/browse?cat=${cat.id}`}>
              <span className="cat-icon">{cat.icon}</span>
              <strong>{cat.label}</strong>
              <span>{cat.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="near">
        <header>
          <h2>Open near {zip || "you"}</h2>
          <Link to="/browse">Full menu</Link>
        </header>
        <div className="card-grid">
          {featured.map((c) => (
            <Link key={c.id} to={`/caregiver/${c.id}`} className="care-card">
              <div className="care-cover" style={{ background: `linear-gradient(135deg, ${c.palette[0]}, ${c.palette[2]})` }}>
                {c.promo ? <em>{c.promo}</em> : null}
              </div>
              <div className="care-body">
                <Portrait caregiver={c} size={52} />
                <div>
                  <h3>{c.name}</h3>
                  <p>
                    <Stars value={c.rating} /> {c.reviews} · {c.neighborhood} · {c.miles} mi
                  </p>
                  <p className="care-meta">
                    {c.creds} · ${c.rate}/hr
                    {c.familyOk ? " · Family OK" : ""}
                    {c.instantPay ? " · Instant pay" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
