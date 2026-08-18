import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";

export default function Checkout() {
  const { cart, removeFromCart, placeOrder, zip } = useStore();
  const navigate = useNavigate();
  const subtotal = cart.reduce((s, r) => s + r.price * r.qty, 0);
  const minutes = cart.reduce((s, r) => s + r.minutes * r.qty, 0);

  function submit(e) {
    e.preventDefault();
    const order = placeOrder();
    if (order) navigate(`/track/${order.id}`);
  }

  return (
    <section className="checkout">
      <div>
        <h1>Ticket</h1>
        <p className="muted">Delivering care to {zip}. Covered 100% in this Medicaid-style demo.</p>
        {!cart.length ? (
          <p className="empty">
            Nothing on the ticket. <Link to="/browse">Pick a kitchen.</Link>
          </p>
        ) : (
          <ul className="ticket-lines">
            {cart.map((row) => (
              <li key={row.key}>
                <div>
                  <strong>
                    {row.qty}× {row.name}
                  </strong>
                  <span>
                    {row.caregiverName} · {row.neighborhood}
                  </span>
                </div>
                <em>${row.price * row.qty}</em>
                <button type="button" onClick={() => removeFromCart(row.key)} aria-label="Remove">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="pay-box" onSubmit={submit}>
        <h2>Who pays</h2>
        <label className="pay-row on">
          <input type="radio" name="pay" defaultChecked readOnly />
          <span>
            <b>Medicaid / MLTC</b>
            Authorized hours. You owe $0 today.
          </span>
        </label>
        <label className="pay-row">
          <input type="radio" name="pay" disabled />
          <span>
            <b>Private pay</b>
            Not in this demo.
          </span>
        </label>
        <dl>
          <div>
            <dt>Authorized time</dt>
            <dd>{minutes} min</dd>
          </div>
          <div>
            <dt>Ticket</dt>
            <dd>${subtotal.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Covered</dt>
            <dd>−${subtotal.toFixed(2)}</dd>
          </div>
          <div className="due">
            <dt>Due now</dt>
            <dd>$0.00</dd>
          </div>
        </dl>
        <button type="submit" className="primary" disabled={!cart.length}>
          Place the shift
        </button>
      </form>
    </section>
  );
}
