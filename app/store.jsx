import { createContext, useContext, useMemo, useState } from "react";
import { copy } from "./copy.js";

const KEY_LANG = "freecare.lang";
const KEY_PACK = "freecare.packChecks";

const StoreContext = createContext(null);

function loadLang() {
  try {
    const v = localStorage.getItem(KEY_LANG);
    if (v === "es" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

function loadPack() {
  try {
    const raw = localStorage.getItem(KEY_PACK);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const emptyWizard = {
  where: "",
  medicaid: "",
  needs: [],
  who: "",
};

export function StoreProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);
  const [packChecks, setPackChecks] = useState(loadPack);
  const [wizard, setWizard] = useState(emptyWizard);
  const [step, setStep] = useState(0);

  const t = copy[lang] ?? copy.en;

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY_LANG, next);
    } catch {
      /* ignore */
    }
  };

  const togglePack = (id) => {
    setPackChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(KEY_PACK, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const resetPack = () => {
    setPackChecks({});
    try {
      localStorage.removeItem(KEY_PACK);
    } catch {
      /* ignore */
    }
  };

  const resetWizard = () => {
    setWizard(emptyWizard);
    setStep(0);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      packChecks,
      togglePack,
      resetPack,
      wizard,
      setWizard,
      step,
      setStep,
      resetWizard,
    }),
    [lang, t, packChecks, wizard, step],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
