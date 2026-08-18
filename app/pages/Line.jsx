import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";

export default function Line() {
  const { lineTickets, acceptTicket, closeTicket, wallet, order } = useStore();

  return (
    <section className="line">
      <header className="line-head">
        <div>
          <p className="eyebrow">Caregiver station</p>
          <h1>The Line</h1>
          <p className="muted">
            Grubhub’s kitchen display, for shifts. New tickets come in. You fire them. Clock-out
            hits the wallet — FreedomCare branded this InstaPay4Care.
          </p>
        </div>
        <aside className="wallet">
          <span>Rapid Pay card</span>
          <b>${wallet.toFixed(2)}</b>
          <small>Available now</small>
        </aside>
      </header>

      {order && order.status !== "paid" ? (
        <article className="live-ticket">
          <h2>Live family ticket {order.id}</h2>
          <p>
            {order.caregiver.name} is on {order.status}.{" "}
            <Link to={`/track/${order.id}`}>Watch the board →</Link>
          </p>
        </article>
      ) : null}

      <ul className="kds">
        {lineTickets.map((t) => (
          <li key={t.id} className={t.status}>
            <header>
              <strong>{t.id}</strong>
              <span>{t.when}</span>
            </header>
            <p>{t.who}</p>
            <p>{t.items}</p>
            <em>${t.pay} on clock-out</em>
            {t.status === "new" ? (
              <button type="button" onClick={() => acceptTicket(t.id)}>
                Fire it
              </button>
            ) : (
              <button type="button" className="primary" onClick={() => closeTicket(t.id)}>
                Clock out · get paid
              </button>
            )}
          </li>
        ))}
        {!lineTickets.length ? (
          <li className="empty-card">Line is clear. New Medicaid tickets print here.</li>
        ) : null}
      </ul>
    </section>
  );
}
