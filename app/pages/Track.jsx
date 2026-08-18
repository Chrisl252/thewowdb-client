import { Link, useParams } from "react-router-dom";
import { Portrait } from "../chrome.jsx";
import { useStore } from "../store.jsx";

const steps = [
  { id: "accepted", label: "Kitchen accepted" },
  { id: "enroute", label: "Aide en route" },
  { id: "invisit", label: "Clocked in · EVV" },
  { id: "paid", label: "Shift closed · Instant pay" },
];

export default function Track() {
  const { id } = useParams();
  const { order, advanceOrder } = useStore();

  if (!order || order.id !== id) {
    return (
      <section className="pad">
        <h1>No live ticket</h1>
        <p>Place a shift to watch the Grubhub loop: accept → en route → clock-in → paid.</p>
        <Link to="/browse">Open kitchens</Link>
      </section>
    );
  }

  const idx = steps.findIndex((s) => s.id === order.status);

  return (
    <section className="track">
      <header>
        <p className="eyebrow">Ticket {order.id}</p>
        <h1>
          {order.status === "paid" ? "Paid. The aide is off the clock." : "Care is on the way."}
        </h1>
        <p>
          {order.caregiver.name} · {order.caregiver.neighborhood} · {order.caregiver.eta} min baseline
        </p>
      </header>
      <div className="track-grid">
        <div className="map" aria-hidden="true">
          <svg viewBox="0 0 400 280">
            <rect width="400" height="280" fill="#1a1612" />
            <path d="M20 220 C 80 180, 90 90, 160 110 S 250 210, 310 140 S 360 40, 390 70" fill="none" stroke="#d4a054" strokeWidth="3" strokeDasharray="8 10" />
            <circle cx="48" cy="208" r="8" fill="#f3ead8" />
            <g className={`pin pin-${order.status}`}>
              <circle r="14" fill="#c4491d" />
              <text textAnchor="middle" y="5" fontSize="12" fill="#fff8ec">
                ⌂
              </text>
            </g>
          </svg>
          <div className="map-card">
            <Portrait caregiver={order.caregiver} size={44} />
            <div>
              <strong>{order.caregiver.name}</strong>
              <span>{steps[idx]?.label}</span>
            </div>
          </div>
        </div>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.id} className={i <= idx ? "done" : ""}>
              <b>{s.label}</b>
              {s.id === "paid" && order.status === "paid" ? (
                <span>InstaPay analog: ${order.subtotal.toFixed(2)} pushed to the Rapid card.</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      {order.status !== "paid" ? (
        <button type="button" className="primary" onClick={advanceOrder}>
          Advance the visit
        </button>
      ) : (
        <Link className="primary linkish" to="/line">
          Open the caregiver line
        </Link>
      )}
    </section>
  );
}
