export const ESTABLISHMENT_CATEGORIES = [
  { value: "company", label: "Companies / Businesses" },
  { value: "government", label: "Government Institutions" },
  { value: "religious", label: "Churches / Mesgids" },
  { value: "school", label: "Schools" },
  { value: "health", label: "Hospitals / Clinics" },
  { value: "shop", label: "Shops" },
  { value: "mall", label: "Malls" },
  { value: "ngo", label: "NGOs" },
  { value: "bank", label: "Banks" },
  { value: "hotel", label: "Hotels" },
  { value: "factory", label: "Factories" },
  { value: "restaurant", label: "Restaurants" },
  { value: "market", label: "Markets" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other Establishment" },
] as const;

export type EstablishmentCategory = (typeof ESTABLISHMENT_CATEGORIES)[number]["value"];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ESTABLISHMENT_CATEGORIES.map((c) => [c.value, c.label]),
);

export const ESTABLISHMENT_STATUSES = ["active", "closed", "relocated", "suspended"] as const;
export type EstablishmentStatus = (typeof ESTABLISHMENT_STATUSES)[number];

export const EST_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  closed: "Closed",
  relocated: "Relocated",
  suspended: "Suspended",
};
