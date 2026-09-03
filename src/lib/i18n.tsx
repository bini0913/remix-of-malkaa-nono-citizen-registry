import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "om";

export const LANGUAGES: { value: Lang; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "om", label: "Afaan Oromoo", short: "OM" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // Brand / shared
  "app.name": "Malkaa Nono Subcity Resident Registry",
  "app.longName": "Malkaa Nono Subcity Resident Registration System",
  "app.tagline": "Sheger City · Oromia · Official records system",
  "app.subtitle":
    "Sheger City · Oromia, Ethiopia — an official record of every resident, maintained by subcity, woreda and zone administrations.",
  "common.language": "Language",
  "common.loading": "Loading…",
  "common.pleaseWait": "Please wait…",
  "common.cancel": "Cancel",
  "common.none": "—",
  "common.print": "Print",
  "common.search": "Search",
  "common.total": "Total",
  "common.actions": "Action",
  "common.yes": "Yes",
  "common.no": "No",

  // Roles
  "role.subcity_admin": "Subcity Administrator",
  "role.woreda_admin": "Woreda Administrator",
  "role.zone_account": "Zone Registrar",
  "role.none": "No role assigned",

  // Navigation
  "nav.commandCentre": "Command centre",
  "nav.dashboard": "Dashboard",
  "nav.register": "Register resident",
  "nav.residents": "Residents",
  "nav.establishments": "Establishments",
  "nav.duplicates": "Duplicates",
  "nav.audit": "Audit trail",
  "nav.accounts": "Accounts",
  "nav.reports": "Official reports",
  "nav.signOut": "Sign out",

  // Landing
  "home.cta.dashboard": "Open dashboard",
  "home.cta.signIn": "Staff sign in",
  "home.f1.title": "Age-tier registration",
  "home.f1.body": "Forms adapt automatically from the date of birth — baby, child, youth, adult and elder tiers.",
  "home.f2.title": "Strict role hierarchy",
  "home.f2.body": "Subcity, woreda and zone accounts each see only the residents inside their own scope.",
  "home.f3.title": "Permanent audit trail",
  "home.f3.body": "Nothing is ever deleted. Every creation and correction is recorded with who changed what and when.",

  // Auth
  "auth.signIn": "Staff sign in",
  "auth.setup": "Create subcity administrator",
  "auth.signInHint": "Use the credentials issued by your administrator.",
  "auth.setupHint": "The first account created becomes the Subcity Administrator.",
  "auth.fullName": "Full name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.submitSignIn": "Sign in",
  "auth.submitSetup": "Create administrator account",
  "auth.toSetup": "First-time setup — create the subcity administrator",
  "auth.toSignIn": "Back to sign in",
  "auth.created": "Account created. Please sign in.",
  "auth.failed": "Authentication failed",

  // Accounts
  "accounts.title": "Staff accounts",
  "accounts.subtitleSubcity":
    "Create and manage woreda administrator accounts. Woreda administrators create their own zone registrars.",
  "accounts.subtitleWoreda": "Create and manage zone registrar accounts for zones inside your woreda.",
  "accounts.newTitle": "New {role} account",
  "accounts.newHint": "The account signs in with this email and password.",
  "accounts.tempPassword": "Temporary password",
  "accounts.woreda": "Woreda",
  "accounts.zone": "Zone",
  "accounts.selectWoreda": "Select woreda",
  "accounts.selectZone": "Select zone",
  "accounts.create": "Create account",
  "accounts.creating": "Creating…",
  "accounts.created": "{role} account created",
  "accounts.createFailed": "Could not create the account",
  "accounts.existing": "Existing accounts in your scope",
  "accounts.existingHint":
    "Accounts are never deleted — disabling blocks sign-in while keeping the audit history intact.",
  "accounts.name": "Name",
  "accounts.role": "Role",
  "accounts.status": "Status",
  "accounts.createdOn": "Created",
  "accounts.lastSignIn": "Last sign-in",
  "accounts.never": "Never signed in",
  "accounts.active": "Active",
  "accounts.disabled": "Disabled",
  "accounts.enable": "Enable",
  "accounts.disable": "Disable",
  "accounts.disabling": "Disabling…",
  "accounts.empty": "No accounts in your scope yet.",
  "accounts.loadFailed": "Could not load staff accounts.",
  "accounts.loading": "Loading staff directory…",
  "accounts.confirmTitle": "Disable this account?",
  "accounts.confirmBody":
    "{name} will immediately lose access to the registry. Their records and audit history stay intact and you can enable the account again at any time.",
  "accounts.enabled": "{name} can sign in again",
  "accounts.disabledToast": "{name} has been disabled",
  "accounts.statusFailed": "Could not change the account status",
  "accounts.thisAccount": "This account",

  // Age tiers / statuses
  "tier.baby": "Baby (0–4)",
  "tier.child": "Child (5–17)",
  "tier.youth": "Youth (18–34)",
  "tier.adult": "Adult (35–60)",
  "tier.elder": "Elder (60+)",
  "status.active": "Active",
  "status.deceased": "Deceased",
  "status.relocated": "Relocated",
  "verification.registered": "Registered",
  "verification.verified": "Verified",
  "verification.needs_correction": "Needs correction",
};

const om: Dict = {
  "app.name": "Galmee Jiraattota Kutaa Magaalaa Malkaa Nonoo",
  "app.longName": "Sirna Galmee Jiraattota Kutaa Magaalaa Malkaa Nonoo",
  "app.tagline": "Magaalaa Sheger · Oromiyaa · Sirna galmee hojii mootummaa",
  "app.subtitle":
    "Magaalaa Sheger · Oromiyaa, Itoophiyaa — galmee jiraataa hunda kan bulchiinsa kutaa magaalaa, aanaalee fi gandootaan eegamu.",
  "common.language": "Afaan",
  "common.loading": "Fe'aa jira…",
  "common.pleaseWait": "Maaloo eegaa…",
  "common.cancel": "Haquu",
  "common.none": "—",
  "common.print": "Maxxansi",
  "common.search": "Barbaadi",
  "common.total": "Ida'ama",
  "common.actions": "Gochaa",
  "common.yes": "Eeyyee",
  "common.no": "Lakki",

  "role.subcity_admin": "Bulchaa Kutaa Magaalaa",
  "role.woreda_admin": "Bulchaa Aanaa",
  "role.zone_account": "Galmeessaa Ganda",
  "role.none": "Gahee hin kennamne",

  "nav.commandCentre": "Wiirtuu To'annoo",
  "nav.dashboard": "Daashboordii",
  "nav.register": "Jiraataa galmeessi",
  "nav.residents": "Jiraattota",
  "nav.establishments": "Dhaabbilee",
  "nav.duplicates": "Irra deebii",
  "nav.audit": "Galmee jijjiirama",
  "nav.accounts": "Herregoota",
  "nav.reports": "Gabaasa Ifaa",
  "nav.signOut": "Ba'i",

  "home.cta.dashboard": "Daashboordii bani",
  "home.cta.signIn": "Hojjettootni seenaa",
  "home.f1.title": "Galmee sadarkaa umuriitiin",
  "home.f1.body":
    "Unkaan guyyaa dhalootaa irratti hundaa'ee ofumaan jijjiirama — daa'ima, ijoollee, dargaggoo, ga'eessa fi maanguddoo.",
  "home.f2.title": "Sadarkaa aangoo cimaa",
  "home.f2.body":
    "Herregni kutaa magaalaa, aanaa fi gandaa tokkoon tokkoon isaanii jiraattota daangaa isaanii keessa jiran qofa argu.",
  "home.f3.title": "Galmee jijjiiramaa yeroo hunda turu",
  "home.f3.body":
    "Wanti tokkollee hin haqamu. Uumamuu fi sirreeffamni hundi eenyu maal yoom akka jijjiire waliin galmaa'a.",

  "auth.signIn": "Hojjettootni seenaa",
  "auth.setup": "Bulchaa kutaa magaalaa uumi",
  "auth.signInHint": "Odeeffannoo bulchaan kee siif kenne fayyadami.",
  "auth.setupHint": "Herregni jalqabaa uumamu Bulchaa Kutaa Magaalaa ta'a.",
  "auth.fullName": "Maqaa guutuu",
  "auth.email": "Imeelii",
  "auth.password": "Jecha darbii",
  "auth.submitSignIn": "Seeni",
  "auth.submitSetup": "Herrega bulchaa uumi",
  "auth.toSetup": "Qophii jalqabaa — bulchaa kutaa magaalaa uumi",
  "auth.toSignIn": "Gara seensaatti deebi'i",
  "auth.created": "Herregni uumameera. Maaloo seeni.",
  "auth.failed": "Seensi hin milkoofne",

  "accounts.title": "Herregoota hojjettootaa",
  "accounts.subtitleSubcity":
    "Herregoota bulchaa aanaa uumii bulchi. Bulchitoonni aanaa galmeessitoota gandaa ofii isaanii uumu.",
  "accounts.subtitleWoreda": "Herregoota galmeessitoota gandaa aanaa kee keessatti uumii bulchi.",
  "accounts.newTitle": "Herrega {role} haaraa",
  "accounts.newHint": "Herregni kun imeelii fi jecha darbii kanaan seena.",
  "accounts.tempPassword": "Jecha darbii yeroo",
  "accounts.woreda": "Aanaa",
  "accounts.zone": "Ganda",
  "accounts.selectWoreda": "Aanaa filadhu",
  "accounts.selectZone": "Ganda filadhu",
  "accounts.create": "Herrega uumi",
  "accounts.creating": "Uumaa jira…",
  "accounts.created": "Herregni {role} uumameera",
  "accounts.createFailed": "Herrega uumuun hin danda'amne",
  "accounts.existing": "Herregoota daangaa kee keessa jiran",
  "accounts.existingHint":
    "Herregoonni gonkumaa hin haqaman — dhaamsuun seensa dhorka, seenaan galmee garuu ni hafa.",
  "accounts.name": "Maqaa",
  "accounts.role": "Gahee",
  "accounts.status": "Haala",
  "accounts.createdOn": "Guyyaa uumame",
  "accounts.lastSignIn": "Seensa dhumaa",
  "accounts.never": "Takkaa hin seenne",
  "accounts.active": "Hojiirra",
  "accounts.disabled": "Dhaamame",
  "accounts.enable": "Banii",
  "accounts.disable": "Dhaamsi",
  "accounts.disabling": "Dhaamsaa jira…",
  "accounts.empty": "Amma daangaa kee keessa herregni hin jiru.",
  "accounts.loadFailed": "Herregoota hojjettootaa fe'uun hin danda'amne.",
  "accounts.loading": "Galmee hojjettootaa fe'aa jira…",
  "accounts.confirmTitle": "Herrega kana dhaamsuu barbaaddaa?",
  "accounts.confirmBody":
    "{name} yeroo battalaatti galmee kana seenuu hin danda'u. Galmeen fi seenaan isaanii ni hafa, yeroo barbaaddetti deebistee banuu dandeessa.",
  "accounts.enabled": "{name} amma deebi'ee seenuu danda'a",
  "accounts.disabledToast": "{name} dhaamameera",
  "accounts.statusFailed": "Haala herregaa jijjiiruun hin danda'amne",
  "accounts.thisAccount": "Herregni kun",

  "tier.baby": "Daa'ima (0–4)",
  "tier.child": "Ijoollee (5–17)",
  "tier.youth": "Dargaggoo (18–34)",
  "tier.adult": "Ga'eessa (35–60)",
  "tier.elder": "Maanguddoo (60+)",
  "status.active": "Hojiirra",
  "status.deceased": "Du'e",
  "status.relocated": "Iddoo jijjiire",
  "verification.registered": "Galmaa'e",
  "verification.verified": "Mirkanaa'e",
  "verification.needs_correction": "Sirreeffama barbaada",
};

const DICTS: Record<Lang, Dict> = { en, om };

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: TFunction }>({
  lang: "en",
  setLang: () => {},
  t: (k) => en[k] ?? k,
});

const STORAGE_KEY = "mn-registry-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "om") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "om" ? "om" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const template = DICTS[lang][key] ?? en[key] ?? key;
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        template,
      );
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  return useContext(LangContext);
}

/** Convenience: just the translate function. */
export function useT(): TFunction {
  return useContext(LangContext).t;
}
