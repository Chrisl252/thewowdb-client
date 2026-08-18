import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { caregivers, categories } from "../data.js";
import { Portrait, Stars } from "../chrome.jsx";
import { useStore } from "../store.jsx";

export default function Browse() {
  const { zip } = useStore();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const q = params.get("q") || "";

  const list = useMemo(() => {
    return caregivers
      .filter((c) => (cat === "all" ? true : c.tags.includes(cat)))
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.name} ${c.neighborhood} ${c.bio} ${c.creds}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => a.eta - b.eta);
  }, [cat, q]);

  return (
    <section className="browse">
      <aside className="filters">
        <h1>Kitchen of care</h1>
        <p className="muted">Delivering to {zip}. Aides staged like restaurants — ETA, rating, a ticket.</p>
        <label className="search-field">
          Search
          <input
            value={q}
            placeholder="Name, neighborhood, dementia…"
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
              setParams(next);
            }}
          />
        </label>
        <ul>
          <li>
            <button
              type="button"
              className={cat === "all" ? "on" : ""}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("cat");
                setParams(next);
              }}
            >
              All kitchens
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={cat === c.id ? "on" : ""}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("cat", c.id);
                  setParams(next);
                }}
              >
                {c.icon} {c.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="browse-list">
        {list.map((c) => (
          <Link key={c.id} to={`/caregiver/${c.id}`} className="row-card">
            <div className="row-cover" style={{ background: `linear-gradient(160deg, ${c.palette[0]}, ${c.palette[2]})` }} />
            <Portrait caregiver={c} size={56} />
            <div className="row-body">
              <header>
                <h2>{c.name}</h2>
                {!c.open ? <span className="pill dim">Opens later</span> : <span className="pill">Open</span>}
                {c.familyOk ? <span className="pill">Family hire</span> : null}
                {c.instantPay ? <span className="pill pay">Instant pay</span> : null}
              </header>
              <p>
                <Stars value={c.rating} /> ({c.reviews}) · {c.neighborhood} · {c.miles} mi · {c.eta} min
              </p>
              <p className="bio">{c.bio}</p>
              <p className="care-meta">
                {c.creds} · {c.languages.join(" / ")} · ${c.rate}/hr
              </p>
            </div>
            <div className="row-cta">
              {c.promo}
              <span>Open ticket →</span>
            </div>
          </Link>
        ))}
        {!list.length ? <p className="empty">Nobody plating that tonight. Try another category.</p> : null}
      </div>
    </section>
  );
}
