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
  component: Dashboard,
});

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

function tally(rows: Row[], pick: (r: Row) => string | null) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = pick(r) || "Not recorded";
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for the current filters.</p>
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
  const zoneName = (id: string) => zoneOf(id)?.name ?? "Unknown zone";
  const woredaName = (id: string) => woredas.find((w) => w.id === id)?.name ?? "Unknown woreda";

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
    { label: "Residents in view", value: filtered.length, icon: Users },
    { label: "With National ID", value: `${withId} (${filtered.length ? Math.round((withId / filtered.length) * 100) : 0}%)`, icon: IdCard },
    { label: "Households (heads)", value: households, icon: Users },
    { label: "Pending duplicates", value: pendingDupes ?? 0, icon: AlertTriangle },
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
          <SelectItem value={ALL}>All</SelectItem>
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
            {isZoneAccount ? "Zone report" : isWoredaAdmin ? "Woreda report" : "Registry reports"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Malkaa Nono Subcity ·{" "}
            {scope?.role === "subcity_admin"
              ? `${woredas.length} woredas · ${zones.length} zones`
              : isWoredaAdmin
                ? `${woredas.find((w) => w.id === scope?.woredaId)?.name ?? "Your woreda"} Woreda only`
                : `${zones.find((z) => z.id === scope?.zoneId)?.name ?? "Your zone"} zone only`}
          </p>
        </div>
        {scope?.role === "zone_account" && (
          <Button asChild>
            <Link to="/register">
              <UserPlus className="size-4" />
              Register resident
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Everything below reflects these filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scope?.role === "subcity_admin" &&
              filterSelect("Woreda", woreda, (v) => {
                setWoreda(v);
                setZone(ALL);
              }, woredas.map((w) => ({ value: w.id, label: w.name })))}
            {!isZoneAccount &&
              filterSelect("Zone", zone, setZone, zoneOptions.map((z) => ({ value: z.id, label: z.name })))}
            {filterSelect("Sex", sex, setSex, [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ])}
            {filterSelect(
              "Nationality",
              nationality,
              setNationality,
              NATIONALITY_OPTIONS.map((n) => ({ value: n.value, label: n.label })),
            )}
            {filterSelect("Education", education, setEducation, EDUCATION_LEVELS.map((e) => ({ value: e, label: e })))}
            {filterSelect(
              "Employment",
              employment,
              setEmployment,
              EMPLOYMENT_STATUSES.map((e) => ({ value: e, label: e })),
            )}
            {filterSelect("Marital status", marital, setMarital, MARITAL_STATUSES.map((m) => ({ value: m, label: m })))}
            {filterSelect("Religion", religion, setReligion, RELIGIONS.map((r) => ({ value: r, label: r })))}
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum age</Label>
              <Input type="number" min={0} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maximum age</Label>
              <Input type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={includeAll} onCheckedChange={(v) => setIncludeAll(v === true)} />
              Include deceased, relocated and duplicate records
            </label>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset filters
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
          title="National ID (Fayda) coverage"
          kind="pie"
          data={[
            { name: "Has Fayda", value: withId },
            { name: "No Fayda", value: filtered.length - withId },
          ].filter((d) => d.value > 0)}
        />
        <ChartCard
          title="Age tiers"
          kind="bar"
          data={tally(filtered, (r) => {
            const t = ageTier(calcAge(r.date_of_birth));
            return t ? TIER_LABEL[t] : null;
          })}
        />
        <ChartCard title="Sex" kind="pie" data={tally(filtered, (r) => (r.sex ? r.sex : null))} />
        <ChartCard
          title="Nationality status"
          kind="pie"
          data={tally(filtered, (r) => r.nationality_status)}
        />
        <ChartCard title="Education level" kind="bar" data={tally(filtered, (r) => r.education_level)} />
        <ChartCard title="Employment status" kind="bar" data={tally(filtered, (r) => r.employment_status)} />
        <ChartCard title="Marital status" kind="pie" data={tally(filtered, (r) => r.marital_status)} />
        <ChartCard title="Religion" kind="pie" data={tally(filtered, (r) => r.religion)} />
        {scope?.role === "subcity_admin" && <ChartCard title="Residents per woreda" kind="bar" data={byWoreda} />}
        {!isZoneAccount && (
          <ChartCard
            title="Residents per zone"
            kind="bar"
            data={byZone.slice(0, 12).map((z) => ({ name: z.zone, value: z.total }))}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZoneAccount ? "Data completeness" : "Data completeness by zone"}</CardTitle>
          <CardDescription>
            Where registration work is weakest — missing dates of birth, addresses and reachable phone numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Woreda</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Residents</TableHead>
                <TableHead className="text-right">Missing DOB</TableHead>
                <TableHead className="text-right">Missing address</TableHead>
                <TableHead className="text-right">Missing phone</TableHead>
                <TableHead className="text-right">Fayda coverage</TableHead>
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
                    No records match the current filters.
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
