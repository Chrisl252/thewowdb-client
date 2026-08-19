export const LINKS = {
  access: "https://accessnevada.nv.gov",
  accessInfo: "https://www.dss.nv.gov/access-nv/",
  apply: "https://www.dss.nv.gov/programs/medical/apply-for-assistance/",
  pcs: "https://dhcfp.nv.gov/Pgms/LTSS/LTSSPCS/",
  nv211seniors: "https://www.nevada211.org/senior-services/",
  nv211: "https://www.nevada211.org/",
  stayCool: "https://allin.clarkcountynv.gov/Initiative/StayCool",
  dssMedical: "https://www.dss.nv.gov/programs/medical/",
};

export const PHONES = {
  pcsAssessment: { label: "800-525-2395", href: "tel:8005252395" },
  dssHelp: { label: "800-992-0900", href: "tel:8009920900" },
  dssTty: { label: "TTY 800-326-6888", href: "tel:8003266888" },
  vegasMedicaid: { label: "702-668-4200", href: "tel:7026684200" },
  nv211: { label: "211", href: "tel:211" },
  clark311: { label: "311", href: "tel:311" },
  emergency: { label: "911", href: "tel:911" },
};

export const OFFICIAL_DOORS = [
  {
    id: "access",
    en: "ACCESS Nevada — apply or check benefits",
    es: "ACCESS Nevada — solicitar o revisar beneficios",
    href: LINKS.access,
    phone: null,
    noteEn: "The only place this board sends you to start or check Nevada Medicaid / SNAP / cash. Not a private company.",
    noteEs: "El único lugar al que este tablero lo envía para iniciar o revisar Medicaid / SNAP / efectivo de Nevada. No es una empresa privada.",
  },
  {
    id: "apply",
    en: "DSS — how to apply for medical assistance",
    es: "DSS — cómo solicitar asistencia médica",
    href: LINKS.apply,
    phone: PHONES.dssHelp,
    noteEn: "Official apply page. Paper: DSS, PO Box 15400, Las Vegas, NV 89114. Help: 800-992-0900.",
    noteEs: "Página oficial para solicitar. Papel: DSS, PO Box 15400, Las Vegas, NV 89114. Ayuda: 800-992-0900.",
  },
  {
    id: "pcs",
    en: "DHCFP — Personal Care Services",
    es: "DHCFP — Servicios de Cuidado Personal",
    href: LINKS.pcs,
    phone: PHONES.pcsAssessment,
    noteEn: "State PCS program page. Assessment request if already on Medicaid: 800-525-2395.",
    noteEs: "Página estatal de PCS. Petición de evaluación si ya tiene Medicaid: 800-525-2395.",
  },
  {
    id: "211",
    en: "Nevada 211 — seniors and caregivers",
    es: "Nevada 211 — mayores y cuidadores",
    href: LINKS.nv211seniors,
    phone: PHONES.nv211,
    noteEn: "Human-staffed referral. Dial 211. Not a Medicaid fiscal intermediary.",
    noteEs: "Referencia con personas. Marque 211. No es un intermediario fiscal de Medicaid.",
  },
  {
    id: "cool",
    en: "Clark County Stay Cool",
    es: "Stay Cool del condado Clark",
    href: LINKS.stayCool,
    phone: PHONES.nv211,
    noteEn: "County heat initiative. Confirm cooling-center hours the day you go.",
    noteEs: "Iniciativa de calor del condado. Confirme el horario del centro el día que vaya.",
  },
  {
    id: "vegas",
    en: "Las Vegas Medicaid district office",
    es: "Oficina de distrito Medicaid Las Vegas",
    href: LINKS.dssMedical,
    phone: PHONES.vegasMedicaid,
    noteEn: "Local DWSS/Medicaid district number published for Las Vegas: 702-668-4200.",
    noteEs: "Número local de distrito DWSS/Medicaid publicado para Las Vegas: 702-668-4200.",
  },
];

export const SCAM_FLAGS = [
  {
    en: "They ask you to pay a fee to “get on Medicaid” or “get a caregiver number.”",
    es: "Le piden una cuota para “entrar a Medicaid” o “conseguir un número de cuidador.”",
  },
  {
    en: "Cold call or text asking for SSN, Medicaid ID, or bank login to “enroll you today.”",
    es: "Llamada o texto en frío pidiendo SSN, número de Medicaid o clave del banco para “inscribirlo hoy.”",
  },
  {
    en: "They say “we are Medicaid” or “we are the state” but the URL is not nv.gov / nevada211.org / clarkcountynv.gov.",
    es: "Dicen “somos Medicaid” o “somos el estado” pero la dirección no es nv.gov / nevada211.org / clarkcountynv.gov.",
  },
  {
    en: "They promise you will be paid as a caregiver before ACCESS Nevada and a PCS assessment have happened.",
    es: "Prometen que le pagarán como cuidador antes de ACCESS Nevada y una evaluación de PCS.",
  },
  {
    en: "They offer “instant Medicaid pay” or EVV from an app that is not your licensed ISO or agency.",
    es: "Ofrecen “pago instantáneo de Medicaid” o EVV desde una app que no es su ISO o agencia con licencia.",
  },
];

export const PACK_ITEMS = {
  maabd: [
    {
      id: "id",
      en: "Photo ID and proof of Nevada residency (lease, bill, or official mail)",
      es: "Identificación con foto y prueba de residencia en Nevada (contrato, factura o correo oficial)",
      href: LINKS.apply,
    },
    {
      id: "ssn-card",
      en: "Social Security card or SSA letter — take it to ACCESS / DSS, do not type it here",
      es: "Tarjeta de Seguro Social o carta de SSA — llévela a ACCESS / DSS, no la escriba aquí",
      href: LINKS.access,
    },
    {
      id: "income",
      en: "Proof of income and resources (award letters, bank statements you will hand to DSS)",
      es: "Prueba de ingresos y recursos (cartas de beneficios, estados de cuenta que entregará a DSS)",
      href: LINKS.apply,
    },
    {
      id: "medicare",
      en: "Medicare card if they have one",
      es: "Tarjeta de Medicare si la tiene",
      href: LINKS.apply,
    },
    {
      id: "access-acct",
      en: "ACCESS Nevada account created on accessnevada.nv.gov — or a paper packet to PO Box 15400, Las Vegas, NV 89114",
      es: "Cuenta de ACCESS Nevada en accessnevada.nv.gov — o paquete en papel a PO Box 15400, Las Vegas, NV 89114",
      href: LINKS.access,
    },
  ],
  pcs: [
    {
      id: "medicaid-active",
      en: "Nevada Medicaid already active (or MAABD pending with your caseworker)",
      es: "Medicaid de Nevada ya activo (o MAABD pendiente con su trabajador)",
      href: LINKS.pcs,
    },
    {
      id: "doctor",
      en: "Talk to the primary doctor / clinic about a PCS assessment request",
      es: "Hable con el médico o clínica principal sobre una petición de evaluación PCS",
      href: LINKS.pcs,
    },
    {
      id: "pcs-phone",
      en: "If already on Medicaid: request assessment via DHCFP 800-525-2395",
      es: "Si ya tiene Medicaid: pida la evaluación al DHCFP 800-525-2395",
      href: LINKS.pcs,
    },
    {
      id: "who-aide",
      en: "Decide agency staff vs self-directed relative/friend — spouses, guardians, and parents of minors are usually not payable",
      es: "Decida personal de agencia vs pariente/amigo autodirigido — cónyuges, tutores y padres de menores generalmente no se pagan",
      href: LINKS.pcs,
    },
    {
      id: "iso",
      en: "If self-directed: the licensed ISO (not this site) handles enrollment, payroll, and EVV after DHCFP authorizes hours",
      es: "Si es autodirigido: el ISO con licencia (no este sitio) maneja inscripción, nómina y EVV después de que DHCFP autorice horas",
      href: LINKS.pcs,
    },
  ],
};

/** Names/addresses from widely published LV lists. Hours must be confirmed — do not treat as 2026 gospel. */
export const COOLING_PLACES = [
  {
    id: "east-las-vegas",
    en: "East Las Vegas Community / senior campus area (confirm which building is open)",
    es: "Zona del campus comunitario / de mayores East Las Vegas (confirme qué edificio está abierto)",
    area: "E Charleston",
  },
  {
    id: "west-las-vegas",
    en: "West Las Vegas / historic westside recreation sites used in heat events",
    es: "West Las Vegas / sitios de recreación del westside histórico usados en olas de calor",
    area: "W Las Vegas",
  },
  {
    id: "whitney",
    en: "Whitney area recreation / senior sites (Henderson–Whitney corridor)",
    es: "Sitios de recreación / mayores en Whitney (corredor Henderson–Whitney)",
    area: "Whitney",
  },
  {
    id: "library",
    en: "Any open Las Vegas–Clark County Library District branch with public AC",
    es: "Cualquier sucursal abierta de la biblioteca del condado con aire acondicionado público",
    area: "Countywide",
  },
  {
    id: "mall",
    en: "Public indoor malls during posted hours (not a medical facility)",
    es: "Centros comerciales públicos en horario anunciado (no es un centro médico)",
    area: "Countywide",
  },
];
