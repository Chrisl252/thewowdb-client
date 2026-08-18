import { Link, useNavigate, useParams } from "react-router-dom";
import { caregivers, menuItems } from "../data.js";
import { Portrait, Stars } from "../chrome.jsx";
import { useStore } from "../store.jsx";

export default function Caregiver() {
  const { id } = useParams();
  const caregiver = caregivers.find((c) => c.id === id);
  const { addToCart } = useStore();
  const navigate = useNavigate();

  if (!caregiver) {
    return (
      <section className="pad">
        <p>That kitchen closed.</p>
        <Link to="/browse">Back to the line</Link>
      </section>
    );
  }

  const menu = menuItems.filter((item) => item.tags.some((t) => caregiver.tags.includes(t)));

  return (
    <article className="profile">
      <div className="profile-hero" style={{ background: `linear-gradient(120deg, ${caregiver.palette[0]}, ${caregiver.palette[2]})` }}>
        <Link to="/browse" className="ghost">
          ← Kitchens
        </Link>
        <div className="profile-id">
          <Portrait caregiver={caregiver} size={88} />
          <div>
            <h1>{caregiver.name}</h1>
            <p>
              <Stars value={caregiver.rating} /> {caregiver.reviews} ratings · {caregiver.neighborhood} · {caregiver.eta} min
            </p>
            <p>
              {caregiver.creds} · {caregiver.languages.join(" · ")} · ${caregiver.rate}/hr
            </p>
          </div>
        </div>
      </div>
      <div className="profile-grid">
        <div>
          <p className="lede">{caregiver.bio}</p>
          <ul className="flags">
            {caregiver.familyOk ? <li>Family members can be the paid aide</li> : <li>Certified aide — not a relative hire</li>}
            {caregiver.instantPay ? <li>Instant pay after clock-out</li> : <li>Weekly payroll</li>}
            <li>{caregiver.open ? "Accepting shifts now" : "Opens 6:00a"}</li>
            {caregiver.promo ? <li>{caregiver.promo}</li> : null}
          </ul>
          <h2>Menu of hours</h2>
          <ul className="menu">
            {menu.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.desc}</span>
                  <em>
                    {item.minutes} min · ${item.price}
                  </em>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(caregiver, item);
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
        <aside className="order-rail">
          <h2>Your ticket</h2>
          <p>Medicaid is the card on file. You do not pay at the door in this demo — FreedomCare’s real payer is the state.</p>
          <button type="button" className="primary" onClick={() => navigate("/checkout")}>
            Review ticket
          </button>
          <p className="fine">
            Grubhub analog: this page is the restaurant. The cart is a shift, not pad thai.
          </p>
        </aside>
      </div>
    </article>
  );
}
