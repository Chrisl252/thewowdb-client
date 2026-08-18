import { Link } from "react-router-dom";

export default function How() {
  return (
    <article className="how">
      <header>
        <p className="eyebrow">The analog</p>
        <h1>Grubhub, but the kitchen is a person you already love.</h1>
      </header>
      <div className="how-grid">
        <section>
          <h2>What FreedomCare actually built</h2>
          <p>
            Not a doctor-on-demand app. Not DoorDash for RNs. They productized a Medicaid
            benefit that already existed: consumer-directed personal care. The hard parts were
            enrollment ops, timesheets, EVV, and paying family members like W-2 labor — then
            wrapping that in an app that feels like placing an order.
          </p>
          <p>
            Kindred copies the surface: browse → ticket → track → instant pay. A real competitor
            still has to become a licensed agency or FI in each state, contract with plans, and
            survive policy shocks (New York’s 2025 single-FI mandate wiped the original CDPAP
            middle).
          </p>
        </section>
        <ol className="compare">
          <li>
            <b>Hungry person</b>
            <span>Medicaid member who needs ADLs</span>
          </li>
          <li>
            <b>Restaurant list</b>
            <span>Family, friends, or certified aides near the ZIP</span>
          </li>
          <li>
            <b>Menu</b>
            <span>Authorized hour blocks, not dumplings</span>
          </li>
          <li>
            <b>Card on file</b>
            <span>The state. Eligibility is checkout.</span>
          </li>
          <li>
            <b>Driver tracking</b>
            <span>EVV clock-in at the house</span>
          </li>
          <li>
            <b>Dasher pay</b>
            <span>InstaPay4Care the minute the visit closes</span>
          </li>
        </ol>
      </div>
      <p>
        <Link to="/browse">Order a demo shift →</Link> · <Link to="/intel">Read the desk →</Link>
      </p>
    </article>
  );
}
