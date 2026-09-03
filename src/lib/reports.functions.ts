import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REPORT_TYPES = [
  { value: "residents", label: "Resident register", scope: "residents" },
  { value: "demographic", label: "Demographic breakdown", scope: "residents" },
  { value: "national_id", label: "National ID coverage", scope: "residents" },
  { value: "zone", label: "Zone summary", scope: "residents" },
  { value: "establishments", label: "Establishment register", scope: "establishments" },
  { value: "establishment_status", label: "Establishment status", scope: "establishments" },
  { value: "category", label: "Establishment category", scope: "establishments" },
  { value: "woreda", label: "Woreda summary (combined)", scope: "both" },
  { value: "verification", label: "Verification status (combined)", scope: "both" },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["value"];

const filterSchema = z.object({
  type: z.enum([
    "residents",
    "demographic",
    "national_id",
    "zone",
    "establishments",
    "establishment_status",
    "category",
    "woreda",
    "verification",
  ]),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  woredaId: z.string().uuid().nullable().optional(),
  zoneId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  verification: z.string().nullable().optional(),
});

export type ReportFilters = z.infer<typeof filterSchema>;

export interface ReportResult {
  columns: { key: string; label: string; numeric?: boolean }[];
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number> | null;
  rowCount: number;
  truncated: boolean;
  generatedAt: string;
  generatedBy: string;
}

const MAX_ROWS = 5000;

const ageOf = (dob: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a < 0 ? null : a;
};

const tierOf = (age: number | null) => {
  if (age === null) return "Unknown";
  if (age <= 4) return "Baby (0–4)";
  if (age <= 17) return "Child (5–17)";
  if (age <= 34) return "Youth (18–34)";
  if (age <= 60) return "Adult (35–60)";
  return "Elder (60+)";
};
const TIERS = ["Baby (0–4)", "Child (5–17)", "Youth (18–34)", "Adult (35–60)", "Elder (60+)", "Unknown"];

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface PersonRow {
  registration_no: string | null;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
  has_national_id: boolean;
  status: string;
  verification_status: string;
  primary_phone: string | null;
  created_at: string;
  zone_id: string;
  zones: { name: string; woreda_id: string; woredas: { name: string } | null } | null;
}

interface EstRow {
  registration_no: string;
  name: string;
  category: string;
  status: string;
  verification_status: string;
  owner_name: string | null;
  primary_phone: string | null;
  created_at: string;
  woreda_id: string;
  zone_id: string | null;
  woredas: { name: string } | null;
  zones: { name: string } | null;
}

function group<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}

export const runReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filterSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReportResult> => {
    const { supabase, userId } = context;

    const { data: me } = await supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();
    if (!me || me.is_active === false) throw new Error("No active role assigned to your account.");
    if (me.role !== "subcity_admin") throw new Error("The Official Report Center is restricted to subcity administrators.");

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
    const generatedBy = profile?.full_name || profile?.email || "Subcity Administrator";
    const base = { generatedAt: new Date().toISOString(), generatedBy };

    const wantsResidents = ["residents", "demographic", "national_id", "zone", "woreda", "verification"].includes(
      data.type,
    );
    const wantsEst = ["establishments", "establishment_status", "category", "woreda", "verification"].includes(
      data.type,
    );

    let persons: PersonRow[] = [];
    let ests: EstRow[] = [];

    if (wantsResidents) {
      let q = supabase
        .from("persons")
        .select(
          "registration_no, full_name, sex, date_of_birth, has_national_id, status, verification_status, primary_phone, created_at, zone_id, zones!inner(name, woreda_id, woredas!inner(name))",
        )
        .is("duplicate_of", null)
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS + 1);
      if (data.dateFrom) q = q.gte("created_at", data.dateFrom);
      if (data.dateTo) q = q.lte("created_at", `${data.dateTo}T23:59:59.999Z`);
      if (data.zoneId) q = q.eq("zone_id", data.zoneId);
      if (data.woredaId) q = q.eq("zones.woreda_id", data.woredaId);
      if (data.status) q = q.eq("status", data.status as never);
      if (data.verification) q = q.eq("verification_status", data.verification as never);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      persons = (rows ?? []) as unknown as PersonRow[];
    }

    if (wantsEst) {
      let q = supabase
        .from("establishments")
        .select(
          "registration_no, name, category, status, verification_status, owner_name, primary_phone, created_at, woreda_id, zone_id, woredas!inner(name), zones(name)",
        )
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS + 1);
      if (data.dateFrom) q = q.gte("created_at", data.dateFrom);
      if (data.dateTo) q = q.lte("created_at", `${data.dateTo}T23:59:59.999Z`);
      if (data.woredaId) q = q.eq("woreda_id", data.woredaId);
      if (data.zoneId) q = q.eq("zone_id", data.zoneId);
      if (data.category) q = q.eq("category", data.category as never);
      if (data.type !== "woreda" && data.type !== "verification" && data.status)
        q = q.eq("status", data.status as never);
      if (data.verification) q = q.eq("verification_status", data.verification as never);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      ests = (rows ?? []) as unknown as EstRow[];
    }

    const truncated = persons.length > MAX_ROWS || ests.length > MAX_ROWS;
    persons = persons.slice(0, MAX_ROWS);
    ests = ests.slice(0, MAX_ROWS);

    const wname = (p: PersonRow) => p.zones?.woredas?.name ?? "Unassigned";
    const zname = (p: PersonRow) => p.zones?.name ?? "Unassigned";

    const done = (
      columns: ReportResult["columns"],
      rows: Record<string, string | number>[],
      totals?: Record<string, string | number> | null,
    ): ReportResult => ({ columns, rows, totals: totals ?? null, rowCount: rows.length, truncated, ...base });

    switch (data.type) {
      case "residents":
        return done(
          [
            { key: "reg", label: "Registration no." },
            { key: "name", label: "Full name" },
            { key: "sex", label: "Sex" },
            { key: "age", label: "Age", numeric: true },
            { key: "tier", label: "Age category" },
            { key: "woreda", label: "Woreda" },
            { key: "zone", label: "Zone" },
            { key: "nid", label: "National ID" },
            { key: "status", label: "Status" },
            { key: "verification", label: "Verification" },
            { key: "registered", label: "Registered on" },
          ],
          persons.map((p) => {
            const age = ageOf(p.date_of_birth);
            return {
              reg: p.registration_no ?? "—",
              name: p.full_name,
              sex: p.sex ? titleCase(p.sex) : "—",
              age: age ?? "—",
              tier: tierOf(age),
              woreda: wname(p),
              zone: zname(p),
              nid: p.has_national_id ? "Yes" : "No",
              status: titleCase(p.status),
              verification: titleCase(p.verification_status),
              registered: new Date(p.created_at).toISOString().slice(0, 10),
            };
          }),
          { name: "Total residents", age: persons.length },
        );

      case "demographic": {
        const rows = TIERS.map((t) => {
          const list = persons.filter((p) => tierOf(ageOf(p.date_of_birth)) === t);
          return {
            tier: t,
            male: list.filter((p) => p.sex === "male").length,
            female: list.filter((p) => p.sex === "female").length,
            unknown: list.filter((p) => !p.sex).length,
            total: list.length,
          };
        });
        return done(
          [
            { key: "tier", label: "Age category" },
            { key: "male", label: "Male", numeric: true },
            { key: "female", label: "Female", numeric: true },
            { key: "unknown", label: "Unrecorded sex", numeric: true },
            { key: "total", label: "Total", numeric: true },
          ],
          rows,
          {
            tier: "TOTAL",
            male: rows.reduce((s, r) => s + r.male, 0),
            female: rows.reduce((s, r) => s + r.female, 0),
            unknown: rows.reduce((s, r) => s + r.unknown, 0),
            total: rows.reduce((s, r) => s + r.total, 0),
          },
        );
      }

      case "national_id": {
        const m = group(persons, (p) => `${wname(p)}||${zname(p)}`);
        const rows = [...m.entries()]
          .map(([k, list]) => {
            const [woreda, zone] = k.split("||");
            const withId = list.filter((p) => p.has_national_id).length;
            return {
              woreda: woreda ?? "",
              zone: zone ?? "",
              total: list.length,
              withId,
              without: list.length - withId,
              coverage: `${list.length ? Math.round((withId / list.length) * 100) : 0}%`,
            };
          })
          .sort((a, b) => b.total - a.total);
        const total = persons.length;
        const withId = persons.filter((p) => p.has_national_id).length;
        return done(
          [
            { key: "woreda", label: "Woreda" },
            { key: "zone", label: "Zone" },
            { key: "total", label: "Residents", numeric: true },
            { key: "withId", label: "With National ID", numeric: true },
            { key: "without", label: "Without", numeric: true },
            { key: "coverage", label: "Coverage" },
          ],
          rows,
          {
            woreda: "TOTAL",
            zone: "",
            total,
            withId,
            without: total - withId,
            coverage: `${total ? Math.round((withId / total) * 100) : 0}%`,
          },
        );
      }

      case "zone": {
        const m = group(persons, (p) => `${wname(p)}||${zname(p)}`);
        const rows = [...m.entries()]
          .map(([k, list]) => {
            const [woreda, zone] = k.split("||");
            return {
              woreda: woreda ?? "",
              zone: zone ?? "",
              total: list.length,
              male: list.filter((p) => p.sex === "male").length,
              female: list.filter((p) => p.sex === "female").length,
              active: list.filter((p) => p.status === "active").length,
              deceased: list.filter((p) => p.status === "deceased").length,
              relocated: list.filter((p) => p.status === "relocated").length,
              verified: list.filter((p) => p.verification_status === "verified").length,
            };
          })
          .sort((a, b) => b.total - a.total);
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
        return done(
          [
            { key: "woreda", label: "Woreda" },
            { key: "zone", label: "Zone" },
            { key: "total", label: "Residents", numeric: true },
            { key: "male", label: "Male", numeric: true },
            { key: "female", label: "Female", numeric: true },
            { key: "active", label: "Active", numeric: true },
            { key: "deceased", label: "Deceased", numeric: true },
            { key: "relocated", label: "Relocated", numeric: true },
            { key: "verified", label: "Verified", numeric: true },
          ],
          rows,
          rows.length
            ? {
                woreda: "TOTAL",
                zone: "",
                total: sum("total"),
                male: sum("male"),
                female: sum("female"),
                active: sum("active"),
                deceased: sum("deceased"),
                relocated: sum("relocated"),
                verified: sum("verified"),
              }
            : null,
        );
      }

      case "establishments":
        return done(
          [
            { key: "reg", label: "Registration no." },
            { key: "name", label: "Establishment" },
            { key: "category", label: "Category" },
            { key: "woreda", label: "Woreda" },
            { key: "zone", label: "Zone" },
            { key: "owner", label: "Owner / manager" },
            { key: "phone", label: "Phone" },
            { key: "status", label: "Status" },
            { key: "verification", label: "Verification" },
            { key: "registered", label: "Registered on" },
          ],
          ests.map((e) => ({
            reg: e.registration_no,
            name: e.name,
            category: titleCase(e.category),
            woreda: e.woredas?.name ?? "—",
            zone: e.zones?.name ?? "—",
            owner: e.owner_name ?? "—",
            phone: e.primary_phone ?? "—",
            status: titleCase(e.status),
            verification: titleCase(e.verification_status),
            registered: new Date(e.created_at).toISOString().slice(0, 10),
          })),
          { reg: "Total establishments", name: ests.length },
        );

      case "establishment_status": {
        const m = group(ests, (e) => e.woredas?.name ?? "Unassigned");
        const rows = [...m.entries()]
          .map(([woreda, list]) => ({
            woreda,
            total: list.length,
            active: list.filter((e) => e.status === "active").length,
            closed: list.filter((e) => e.status === "closed").length,
            relocated: list.filter((e) => e.status === "relocated").length,
            suspended: list.filter((e) => e.status === "suspended").length,
          }))
          .sort((a, b) => b.total - a.total);
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
        return done(
          [
            { key: "woreda", label: "Woreda" },
            { key: "total", label: "Establishments", numeric: true },
            { key: "active", label: "Active", numeric: true },
            { key: "closed", label: "Closed", numeric: true },
            { key: "relocated", label: "Relocated", numeric: true },
            { key: "suspended", label: "Suspended", numeric: true },
          ],
          rows,
          rows.length
            ? {
                woreda: "TOTAL",
                total: sum("total"),
                active: sum("active"),
                closed: sum("closed"),
                relocated: sum("relocated"),
                suspended: sum("suspended"),
              }
            : null,
        );
      }

      case "category": {
        const m = group(ests, (e) => titleCase(e.category));
        const rows = [...m.entries()]
          .map(([category, list]) => ({
            category,
            total: list.length,
            active: list.filter((e) => e.status === "active").length,
            verified: list.filter((e) => e.verification_status === "verified").length,
            woredas: new Set(list.map((e) => e.woreda_id)).size,
          }))
          .sort((a, b) => b.total - a.total);
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
        return done(
          [
            { key: "category", label: "Category" },
            { key: "total", label: "Establishments", numeric: true },
            { key: "active", label: "Active", numeric: true },
            { key: "verified", label: "Verified", numeric: true },
            { key: "woredas", label: "Woredas present", numeric: true },
          ],
          rows,
          rows.length
            ? { category: "TOTAL", total: sum("total"), active: sum("active"), verified: sum("verified"), woredas: "" }
            : null,
        );
      }

      case "woreda": {
        const names = new Set<string>([...persons.map(wname), ...ests.map((e) => e.woredas?.name ?? "Unassigned")]);
        const rows = [...names]
          .map((w) => {
            const p = persons.filter((x) => wname(x) === w);
            const e = ests.filter((x) => (x.woredas?.name ?? "Unassigned") === w);
            return {
              woreda: w,
              residents: p.length,
              male: p.filter((x) => x.sex === "male").length,
              female: p.filter((x) => x.sex === "female").length,
              nid: p.filter((x) => x.has_national_id).length,
              zones: new Set(p.map((x) => zname(x))).size,
              establishments: e.length,
              estActive: e.filter((x) => x.status === "active").length,
            };
          })
          .sort((a, b) => b.residents - a.residents);
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
        return done(
          [
            { key: "woreda", label: "Woreda" },
            { key: "residents", label: "Residents", numeric: true },
            { key: "male", label: "Male", numeric: true },
            { key: "female", label: "Female", numeric: true },
            { key: "nid", label: "With National ID", numeric: true },
            { key: "zones", label: "Zones covered", numeric: true },
            { key: "establishments", label: "Establishments", numeric: true },
            { key: "estActive", label: "Active establishments", numeric: true },
          ],
          rows,
          rows.length
            ? {
                woreda: "TOTAL",
                residents: sum("residents"),
                male: sum("male"),
                female: sum("female"),
                nid: sum("nid"),
                zones: "",
                establishments: sum("establishments"),
                estActive: sum("estActive"),
              }
            : null,
        );
      }

      case "verification": {
        const names = new Set<string>([...persons.map(wname), ...ests.map((e) => e.woredas?.name ?? "Unassigned")]);
        const rows = [...names]
          .map((w) => {
            const p = persons.filter((x) => wname(x) === w);
            const e = ests.filter((x) => (x.woredas?.name ?? "Unassigned") === w);
            return {
              woreda: w,
              rRegistered: p.filter((x) => x.verification_status === "registered").length,
              rVerified: p.filter((x) => x.verification_status === "verified").length,
              rCorrection: p.filter((x) => x.verification_status === "needs_correction").length,
              eRegistered: e.filter((x) => x.verification_status === "registered").length,
              eVerified: e.filter((x) => x.verification_status === "verified").length,
              eCorrection: e.filter((x) => x.verification_status === "needs_correction").length,
            };
          })
          .sort((a, b) => b.rVerified - a.rVerified);
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
        return done(
          [
            { key: "woreda", label: "Woreda" },
            { key: "rRegistered", label: "Residents registered", numeric: true },
            { key: "rVerified", label: "Residents verified", numeric: true },
            { key: "rCorrection", label: "Residents needing correction", numeric: true },
            { key: "eRegistered", label: "Establishments registered", numeric: true },
            { key: "eVerified", label: "Establishments verified", numeric: true },
            { key: "eCorrection", label: "Establishments needing correction", numeric: true },
          ],
          rows,
          rows.length
            ? {
                woreda: "TOTAL",
                rRegistered: sum("rRegistered"),
                rVerified: sum("rVerified"),
                rCorrection: sum("rCorrection"),
                eRegistered: sum("eRegistered"),
                eVerified: sum("eVerified"),
                eCorrection: sum("eCorrection"),
              }
            : null,
        );
      }
    }
  });
