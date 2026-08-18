import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "./store.jsx";

export function Header() {
  const { cart, zip, setZip, role, setRole, wallet } = useStore();
  const navigate = useNavigate();
  const count = cart.reduce((s, r) => s + r.qty, 0);

  return (
    <header className="top">
      <div className="top-row">
        <Link to="/" className="mark" aria-label="Kindred home">
          <span className="mark-glyph" aria-hidden="true">
            ⌂
          </span>
          <span>
            Kindred
            <small>home care, to the door</small>
          </span>
        </Link>

        <form
          className="zip"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/browse");
          }}
        >
          <label>
            <span>Deliver care to</span>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              inputMode="numeric"
              aria-label="ZIP code"
              placeholder="ZIP"
            />
          </label>
          <button type="submit">Find care</button>
        </form>

        <nav className="top-nav">
          <NavLink to="/browse">Kitchen of care</NavLink>
          <NavLink to="/how">How it works</NavLink>
          <NavLink to="/intel">FreedomCare intel</NavLink>
          <NavLink to="/line" className="line-link">
            The Line
            <em>${wallet.toFixed(0)}</em>
          </NavLink>
        </nav>

        <div className="top-end">
          <button
            type="button"
            className={role === "caregiver" ? "role on" : "role"}
            onClick={() => {
              setRole(role === "caregiver" ? "family" : "caregiver");
              navigate(role === "caregiver" ? "/browse" : "/line");
            }}
          >
            {role === "caregiver" ? "Caregiver on" : "I'm a caregiver"}
          </button>
          <Link to="/checkout" className="bag">
            Ticket {count ? <b>{count}</b> : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Disclaimer() {
  return (
    <footer className="foot">
      <p>
        Kindred is a product demo — Grubhub’s ordering surface applied to Medicaid-style
        home care. It is not a licensed home care agency, fiscal intermediary, or Medicaid
        provider. Figures on the intel desk are from public sources as of 18 Aug 2026 and
        should be re-verified before any real-world use.
      </p>
      <p className="foot-links">
        <Link to="/intel">Competitive desk</Link>
        <Link to="/how">The analog</Link>
        <a href="https://freedomcare.com/" rel="noreferrer" target="_blank">
          FreedomCare.com
        </a>
      </p>
    </footer>
  );
}

export function Portrait({ caregiver, size = 64 }) {
  const [a, b, c] = caregiver.palette;
  const initials = caregiver.name
    .split(" ")
    .filter((p) => p[0] && p[0] === p[0].toUpperCase() && p[0] !== p[0].toLowerCase())
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <svg
      className="portrait"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${caregiver.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="18" fill={b} />
      <circle cx="58" cy="18" r="22" fill={a} opacity="0.85" />
      <circle cx="16" cy="62" r="18" fill={c} opacity="0.7" />
      <rect x="12" y="28" width="56" height="36" rx="18" fill={`url(#g-${caregiver.id})`} />
      <text x="40" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff8ec">
        {initials}
      </text>
    </svg>
  );
}

export function Stars({ value }) {
  return (
    <span className="stars">
      <b>{value.toFixed(2)}</b>
      <span aria-hidden="true">★</span>
    </span>
  );
}
