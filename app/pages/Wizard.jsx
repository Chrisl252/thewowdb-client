import { ExtLink } from "../chrome.jsx";
import { LINKS, PHONES } from "../data.js";
import { useStore } from "../store.jsx";

const NEED_KEYS = [
  ["bath", "needBath"],
  ["toilet", "needToilet"],
  ["meal", "needMeal"],
  ["move", "needMove"],
  ["meds", "needMeds"],
  ["none", "needNone"],
];

function Choice({ name, value, checked, onChange, children }) {
  return (
    <label className={`choice ${checked ? "is-on" : ""}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

function resultFor(wizard) {
  const blockedWho = ["spouse", "parentMinor", "guardian"].includes(wizard.who);
  const out = wizard.where === "out";
  const adlNeed = wizard.needs.some((n) => n !== "none");
  const companionOnly = wizard.needs.includes("none") && !adlNeed;
  return { blockedWho, out, companionOnly };
}

export default function Wizard() {
  const { t, wizard, setWizard, step, setStep, resetWizard } = useStore();
  const setField = (key, value) => setWizard((w) => ({ ...w, [key]: value }));
  const toggleNeed = (id) => {
    setWizard((w) => {
      const has = w.needs.includes(id);
      return { ...w, needs: has ? w.needs.filter((n) => n !== id) : [...w.needs, id] };
    });
  };

  const canNext =
    (step === 0 && wizard.where) ||
    (step === 1 && wizard.medicaid) ||
    (step === 2 && wizard.needs.length > 0) ||
    (step === 3 && wizard.who);

  const goNext = () => {
    if (step === 0 && wizard.where === "out") {
      setStep(4);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const outcome = resultFor(wizard);

  return (
    <section className="page">
      <p className="kicker">1 / 4</p>
      <h1>{t.wizardTitle}</h1>
      <p className="lead">{t.wizardLead}</p>

      {step === 0 && (
        <fieldset className="step">
          <legend>{t.stepWhere}</legend>
          <Choice name="where" value="vegas" checked={wizard.where === "vegas"} onChange={() => setField("where", "vegas")}>
            {t.whereVegas}
          </Choice>
          <Choice name="where" value="nv" checked={wizard.where === "nv"} onChange={() => setField("where", "nv")}>
            {t.whereNv}
          </Choice>
          <Choice name="where" value="out" checked={wizard.where === "out"} onChange={() => setField("where", "out")}>
            {t.whereOut}
          </Choice>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="step">
          <legend>{t.stepMedicaid}</legend>
          <Choice name="medicaid" value="yes" checked={wizard.medicaid === "yes"} onChange={() => setField("medicaid", "yes")}>
            {t.medYes}
          </Choice>
          <Choice name="medicaid" value="no" checked={wizard.medicaid === "no"} onChange={() => setField("medicaid", "no")}>
            {t.medNo}
          </Choice>
          <Choice name="medicaid" value="unsure" checked={wizard.medicaid === "unsure"} onChange={() => setField("medicaid", "unsure")}>
            {t.medUnsure}
          </Choice>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="step">
          <legend>{t.stepNeed}</legend>
          {NEED_KEYS.map(([id, key]) => (
            <label key={id} className={`choice ${wizard.needs.includes(id) ? "is-on" : ""}`}>
              <input type="checkbox" checked={wizard.needs.includes(id)} onChange={() => toggleNeed(id)} />
              <span>{t[key]}</span>
            </label>
          ))}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="step">
          <legend>{t.stepWho}</legend>
          {[
            ["self", t.whoSelf],
            ["spouse", t.whoSpouse],
            ["parentMinor", t.whoParentMinor],
            ["guardian", t.whoGuardian],
            ["adultChild", t.whoAdultChild],
            ["friend", t.whoFriend],
            ["agency", t.whoAgency],
            ["unsure", t.whoUnsure],
          ].map(([value, label]) => (
            <Choice key={value} name="who" value={value} checked={wizard.who === value} onChange={() => setField("who", value)}>
              {label}
            </Choice>
          ))}
        </fieldset>
      )}

      {step === 4 && (
        <div className="results">
          <h2>{t.resultTitle}</h2>
          <p className="notice">{t.resultNotAdvice}</p>

          {outcome.out && (
            <article className="path path-warn">
              <h3>{t.pathOutTitle}</h3>
              <p>{t.pathOutBody}</p>
            </article>
          )}

          {outcome.blockedWho && !outcome.out && (
            <article className="path path-stop">
              <h3>{t.pathCannotPayTitle}</h3>
              <p>{t.pathCannotPayBody}</p>
            </article>
          )}

          {!outcome.out && (
            <article className="path">
              <h3>{t.pathAccessTitle}</h3>
              <p>{t.pathAccessBody}</p>
              <div className="path-actions">
                <ExtLink className="btn" href={LINKS.access}>
                  {t.openAccess}
                </ExtLink>
                <ExtLink className="btn btn-ghost" href={LINKS.apply}>
                  {t.openApply}
                </ExtLink>
              </div>
            </article>
          )}

          {!outcome.out && (
            <article className="path">
              <h3>{t.pathPcsTitle}</h3>
              <p>{t.pathPcsBody}</p>
              {outcome.companionOnly && <p className="notice">{t.companionOnly}</p>}
              <div className="path-actions">
                <ExtLink className="btn" href={LINKS.pcs}>
                  {t.openPcs}
                </ExtLink>
                <a className="btn btn-ghost" href={PHONES.pcsAssessment.href}>
                  {t.callPcs} · {PHONES.pcsAssessment.label}
                </a>
              </div>
            </article>
          )}

          <article className="path">
            <h3>{t.path211Title}</h3>
            <p>{t.path211Body}</p>
            <div className="path-actions">
              <ExtLink className="btn" href={LINKS.nv211seniors}>
                {t.open211}
              </ExtLink>
              <a className="btn btn-ghost" href={PHONES.nv211.href}>
                {t.dirCall} 211
              </a>
              <a className="btn btn-ghost" href={PHONES.dssHelp.href}>
                {t.callDss} · {PHONES.dssHelp.label}
              </a>
              {wizard.where === "vegas" && (
                <a className="btn btn-ghost" href={PHONES.vegasMedicaid.href}>
                  {t.callVegas} · {PHONES.vegasMedicaid.label}
                </a>
              )}
            </div>
          </article>
        </div>
      )}

      <div className="step-nav">
        {step > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStep((s) => (wizard.where === "out" ? 0 : Math.max(0, s - 1)))}
          >
            {t.back}
          </button>
        )}
        {step < 4 && (
          <button type="button" className="btn" disabled={!canNext} onClick={goNext}>
            {t.next}
          </button>
        )}
        {step === 4 && (
          <button type="button" className="btn" onClick={resetWizard}>
            {t.restart}
          </button>
        )}
      </div>
    </section>
  );
}
