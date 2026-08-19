import { useStore } from "../store.jsx";

export default function Legal() {
  const { t } = useStore();
  return (
    <section className="page">
      <p className="kicker">{t.product}</p>
      <h1>{t.legalTitle}</h1>
      <p className="lead">{t.legalBody}</p>
    </section>
  );
}
