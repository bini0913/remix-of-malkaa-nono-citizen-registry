import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ageTier,
  calcAge,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUSES,
  MARITAL_STATUSES,
  NATIONALITY_OPTIONS,
  RELIGIONS,
  TIER_LABEL,
} from "@/lib/registry";
import { AlertTriangle, IdCard, UserPlus, Users } from "lucide-react";
import { CommandCenter } from "@/components/CommandCenter";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Registry Reports | Malkaa Nono Subcity" },
      {
        name: "description",
        content:
          "Filterable reporting dashboard for resident registration across Malkaa Nono Subcity: demographics, National ID coverage and per-zone data completeness.",
      },
      { property: "og:title", content: "Registry Reports | Malkaa Nono Subcity" },
      { property: "og:description", content: "Resident registration reporting for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { data: scope, isLoading } = useScope();
  const t = useT();
  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (scope?.role === "subcity_admin") return <CommandCenter />;
  return <Dashboard />;
}

const ALL = "__all__";
const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#0B6E4F",
  "#D4A017",
  "#3F7D58",
  "#A65E2E",
  "#6B8E23",
  "#8B5E3C",
  "#2F6690",
  "#B23A48",
];

type Row = {
  id: string;
  zone_id: string;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
  nationality_status: string | null;
  address_detail: string | null;
  primary_phone: string | null;
  phone_unreachable: boolean;
  has_national_id: boolean;
  education_level: string | null;
  employment_status: string | null;
  marital_status: string | null;
  religion: string | null;
  relationship_to_head: string | null;
  status: string;
  is_stub: boolean;
};

function tally(rows: Row[], pick: (r: Row) => string | null, notRecordedLabel: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = pick(r) || notRecordedLabel;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function ChartCard({
  title,
  data,
  kind,
}: {
  title: string;
  data: { name: string; value: number }[];
  kind: "pie" | "bar";
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noDataFilters")}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const t = useT();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();

  const [includeAll, setIncludeAll] = useState(false);
  const [woreda, setWoreda] = useState(ALL);
  const [zone, setZone] = useState(ALL);
  const [sex, setSex] = useState(ALL);
  const [education, setEducation] = useState(ALL);
  const [employment, setEmployment] = useState(ALL);
  const [marital, setMarital] = useState(ALL);
  const [religion, setReligion] = useState(ALL);
  const [nationality, setNationality] = useState(ALL);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  const isZoneAccount = scope?.role === "zone_account";
  const isWoredaAdmin = scope?.role === "woreda_admin";
  // The woreda a woreda_admin is locked to; subcity admins choose freely.
  const effectiveWoreda = isWoredaAdmin ? (scope?.woredaId ?? ALL) : woreda;

  const { data: rows } = useQuery({
    enabled: !!scope,
    queryKey: ["report-persons", scope?.role, scope?.zoneId, scope?.woredaId],
    queryFn: async () => {
      let q = supabase
        .from("persons")
        .select(
          "id, zone_id, full_name, sex, date_of_birth, nationality_status, address_detail, primary_phone, phone_unreachable, has_national_id, education_level, employment_status, marital_status, religion, relationship_to_head, status, is_stub, zones!inner(woreda_id)",
        )
        .limit(10000);
      if (isZoneAccount && scope?.zoneId) q = q.eq("zone_id", scope.zoneId);
      if (isWoredaAdmin && scope?.woredaId) q = q.eq("zones.woreda_id", scope.woredaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const zones = hierarchy?.zones ?? [];
  const woredas = hierarchy?.woredas ?? [];
  const zoneOf = (id: string) => zones.find((z) => z.id === id);
  const zoneName = (id: string) => zoneOf(id)?.name ?? t("dash.unknownZone");
  const woredaName = (id: string) => woredas.find((w) => w.id === id)?.name ?? t("dash.unknownWoreda");

  const zoneOptions = effectiveWoreda === ALL ? zones : zones.filter((z) => z.woreda_id === effectiveWoreda);

  const filtered = useMemo(() => {
    const min = minAge ? Number(minAge) : null;
    const max = maxAge ? Number(maxAge) : null;
    return (rows ?? []).filter((r) => {
      if (!includeAll && r.status !== "active") return false;
      if (zone !== ALL && r.zone_id !== zone) return false;
      if (effectiveWoreda !== ALL && zoneOf(r.zone_id)?.woreda_id !== effectiveWoreda) return false;
      if (sex !== ALL && r.sex !== sex) return false;
      if (education !== ALL && r.education_level !== education) return false;
      if (employment !== ALL && r.employment_status !== employment) return false;
      if (marital !== ALL && r.marital_status !== marital) return false;
      if (religion !== ALL && r.religion !== religion) return false;
      if (nationality !== ALL && r.nationality_status !== nationality) return false;
      const age = calcAge(r.date_of_birth);
      if (min !== null && (age === null || age < min)) return false;
      if (max !== null && (age === null || age > max)) return false;
      return true;
    });
  }, [rows, includeAll, zone, effectiveWoreda, sex, education, employment, marital, religion, nationality, minAge, maxAge, zones]);

  const { data: pendingDupes } = useQuery({
    queryKey: ["pending-dupes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("duplicate_flags")
        .select("id", { count: "exact", head: true })
        .eq("resolution", "pending");
      return count ?? 0;
    },
  });

  const withId = filtered.filter((r) => r.has_national_id).length;
  const households = new Set(
    filtered.filter((r) => r.relationship_to_head === "Household head").map((r) => r.id),
  ).size;

  const byZone = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const arr = map.get(r.zone_id) ?? [];
      arr.push(r);
      map.set(r.zone_id, arr);
    }
    return [...map.entries()]
      .map(([zid, list]) => ({
        zoneId: zid,
        zone: zoneName(zid),
        woreda: woredaName(zoneOf(zid)?.woreda_id ?? ""),
        total: list.length,
        missingDob: list.filter((r) => !r.date_of_birth).length,
        missingAddress: list.filter((r) => !r.address_detail).length,
        missingPhone: list.filter((r) => !r.primary_phone && !r.phone_unreachable).length,
        withFayda: list.filter((r) => r.has_national_id).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, zones, woredas]);

  const byWoreda = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const wid = zoneOf(r.zone_id)?.woreda_id ?? "";
      map.set(wid, (map.get(wid) ?? 0) + 1);
    }
    return [...map.entries()].map(([wid, value]) => ({ name: woredaName(wid), value }));
  }, [filtered, zones, woredas]);

  const cards = [
    { label: t("dash.kpi.inView"), value: filtered.length, icon: Users },
    { label: t("dash.kpi.withId"), value: `${withId} (${filtered.length ? Math.round((withId / filtered.length) * 100) : 0}%)`, icon: IdCard },
    { label: t("dash.kpi.households"), value: households, icon: Users },
    { label: t("dash.kpi.pendingDupes"), value: pendingDupes ?? 0, icon: AlertTriangle },
  ];

  const filterSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("common.all")}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const reset = () => {
    setWoreda(ALL);
    setZone(ALL);
    setSex(ALL);
    setEducation(ALL);
    setEmployment(ALL);
    setMarital(ALL);
    setReligion(ALL);
    setNationality(ALL);
    setMinAge("");
    setMaxAge("");
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isZoneAccount ? t("dash.zoneReport") : isWoredaAdmin ? t("dash.woredaReport") : t("dash.registryReports")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("app.subcity")} ·{" "}
            {scope?.role === "subcity_admin"
              ? t("dash.scopeSubcity", { woredas: woredas.length, zones: zones.length })
              : isWoredaAdmin
                ? t("dash.scopeWoreda", { name: woredas.find((w) => w.id === scope?.woredaId)?.name ?? t("dash.yourWoreda") })
                : t("dash.scopeZone", { name: zones.find((z) => z.id === scope?.zoneId)?.name ?? t("dash.yourZone") })}
          </p>
        </div>
        {scope?.role === "zone_account" && (
          <Button asChild>
            <Link to="/register">
              <UserPlus className="size-4" />
              {t("dash.registerResident")}
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("common.filters")}</CardTitle>
          <CardDescription>{t("dash.filtersHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scope?.role === "subcity_admin" &&
              filterSelect(t("common.woreda"), woreda, (v) => {
                setWoreda(v);
                setZone(ALL);
              }, woredas.map((w) => ({ value: w.id, label: w.name })))}
            {!isZoneAccount &&
              filterSelect(t("common.zone"), zone, setZone, zoneOptions.map((z) => ({ value: z.id, label: z.name })))}
            {filterSelect(t("common.sex"), sex, setSex, [
              { value: "male", label: t("common.male") },
              { value: "female", label: t("common.female") },
            ])}
            {filterSelect(
              t("dash.nationality"),
              nationality,
              setNationality,
              NATIONALITY_OPTIONS.map((n) => ({ value: n.value, label: n.label })),
            )}
            {filterSelect(t("dash.education"), education, setEducation, EDUCATION_LEVELS.map((e) => ({ value: e, label: e })))}
            {filterSelect(
              t("dash.employment"),
              employment,
              setEmployment,
              EMPLOYMENT_STATUSES.map((e) => ({ value: e, label: e })),
            )}
            {filterSelect(t("dash.marital"), marital, setMarital, MARITAL_STATUSES.map((m) => ({ value: m, label: m })))}
            {filterSelect(t("dash.religion"), religion, setReligion, RELIGIONS.map((r) => ({ value: r, label: r })))}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("dash.minAge")}</Label>
              <Input type="number" min={0} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("dash.maxAge")}</Label>
              <Input type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={includeAll} onCheckedChange={(v) => setIncludeAll(v === true)} />
              {t("dash.includeAll")}
            </label>
            <Button variant="ghost" size="sm" onClick={reset}>
              {t("common.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <c.icon className="size-4" />
                {c.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("dash.chart.faydaCoverage")}
          kind="pie"
          data={[
            { name: t("dash.hasFayda"), value: withId },
            { name: t("dash.noFayda"), value: filtered.length - withId },
          ].filter((d) => d.value > 0)}
        />
        <ChartCard
          title={t("dash.chart.ageTiers")}
          kind="bar"
          data={tally(filtered, (r) => {
            const tier = ageTier(calcAge(r.date_of_birth));
            return tier ? t(`tier.${tier}`) : null;
          }, t("common.notRecorded"))}
        />
        <ChartCard title={t("common.sex")} kind="pie" data={tally(filtered, (r) => (r.sex ? r.sex : null), t("common.notRecorded"))} />
        <ChartCard
          title={t("dash.chart.nationality")}
          kind="pie"
          data={tally(filtered, (r) => r.nationality_status, t("common.notRecorded"))}
        />
        <ChartCard title={t("dash.chart.education")} kind="bar" data={tally(filtered, (r) => r.education_level, t("common.notRecorded"))} />
        <ChartCard title={t("dash.chart.employment")} kind="bar" data={tally(filtered, (r) => r.employment_status, t("common.notRecorded"))} />
        <ChartCard title={t("dash.chart.marital")} kind="pie" data={tally(filtered, (r) => r.marital_status, t("common.notRecorded"))} />
        <ChartCard title={t("dash.chart.religion")} kind="pie" data={tally(filtered, (r) => r.religion, t("common.notRecorded"))} />
        {scope?.role === "subcity_admin" && <ChartCard title={t("dash.chart.perWoreda")} kind="bar" data={byWoreda} />}
        {!isZoneAccount && (
          <ChartCard
            title={t("dash.chart.perZone")}
            kind="bar"
            data={byZone.slice(0, 12).map((z) => ({ name: z.zone, value: z.total }))}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZoneAccount ? t("dash.completeness") : t("dash.completenessByZone")}</CardTitle>
          <CardDescription>
            {t("dash.completenessHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.woreda")}</TableHead>
                <TableHead>{t("common.zone")}</TableHead>
                <TableHead className="text-right">{t("common.residents")}</TableHead>
                <TableHead className="text-right">{t("dash.missingDob")}</TableHead>
                <TableHead className="text-right">{t("dash.missingAddress")}</TableHead>
                <TableHead className="text-right">{t("dash.missingPhone")}</TableHead>
                <TableHead className="text-right">{t("dash.faydaCoverage")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byZone.map((z) => (
                <TableRow key={z.zoneId}>
                  <TableCell>{z.woreda}</TableCell>
                  <TableCell className="font-medium">{z.zone}</TableCell>
                  <TableCell className="text-right">{z.total}</TableCell>
                  <TableCell className="text-right">{z.missingDob}</TableCell>
                  <TableCell className="text-right">{z.missingAddress}</TableCell>
                  <TableCell className="text-right">{z.missingPhone}</TableCell>
                  <TableCell className="text-right">
                    {z.total ? Math.round((z.withFayda / z.total) * 100) : 0}%
                  </TableCell>
                </TableRow>
              ))}
              {byZone.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {t("dash.noMatch")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
