export type AgeTier = "baby" | "child" | "youth" | "adult" | "elder";

export function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 ? null : age;
}

export function ageTier(age: number | null): AgeTier | null {
  if (age === null) return null;
  if (age <= 4) return "baby";
  if (age <= 17) return "child";
  if (age <= 34) return "youth";
  if (age <= 60) return "adult";
  return "elder";
}

export const TIER_LABEL: Record<AgeTier, string> = {
  baby: "Baby (0–4)",
  child: "Child (5–17)",
  youth: "Youth (18–34)",
  adult: "Adult (35–60)",
  elder: "Elder (60+)",
};

export const isMinor = (tier: AgeTier | null) => tier === "baby" || tier === "child";

export const EDUCATION_LEVELS = [
  "None",
  "Pre-school",
  "Grade 1-4",
  "Grade 5-8",
  "Grade 9-10",
  "Grade 11-12",
  "TVET / Diploma",
  "Bachelor's degree",
  "Master's degree or above",
];

export const EMPLOYMENT_STATUSES = [
  "Employed (government)",
  "Employed (private)",
  "Self-employed",
  "Farmer",
  "Daily labourer",
  "Unemployed",
  "Student",
  "Retired",
];

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"];

export const RELIGIONS = ["Orthodox", "Protestant", "Muslim", "Catholic", "Waaqeffannaa", "Other", "Prefer not to say"];

export const RELATIONSHIPS = [
  "Household head",
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grandchild",
  "Other relative",
  "Non-relative",
];

export const NATIONALITY_OPTIONS: { value: "citizen" | "foreign_resident" | "other"; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "foreign_resident", label: "Foreign resident" },
  { value: "other", label: "Other" },
];

/** Vital status only — duplicate handling is a separate review workflow. */
export const VITAL_STATUSES = ["active", "deceased", "relocated"] as const;
export type VitalStatus = (typeof VITAL_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  deceased: "Deceased",
  relocated: "Relocated",
};

export const VERIFICATION_STATUSES = ["registered", "verified", "needs_correction"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABEL: Record<string, string> = {
  registered: "Registered",
  verified: "Verified",
  needs_correction: "Needs correction",
};

