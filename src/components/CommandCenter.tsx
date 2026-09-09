import { Link } from "@tanstack/react-router";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VERIFICATION_LABEL, STATUS_LABEL } from "@/lib/registry";
import { CATEGORY_LABEL, EST_STATUS_LABEL } from "@/lib/establishments";
import { Building2, FileText, IdCard, Users } from "lucide-react";
import { useT } from "@/lib/i18n";

const PALETTE = ["#0B6E4F", "#D4A017", "#2F6690", "#A65E2E", "#6B8E23", "#B23A48", "#3F7D58", "#8B5E3C"];

type Counts = Record<string, number>;
type NamedList = { name: string; value: number; woreda?: string }[];

interface Overview {
  role: string | null;
  residents: {
    total: number;
    with_national_id: number;
    by_status: Counts;
    by_sex: Counts;
    by_verification: Counts;
    by_age_tier: Counts;
    by_woreda: NamedList;
    by_zone: NamedList;
    recent: { id: string; name: string; zone: string; at: string }[];
  };
  establishments: {
    total: number;
    by_category: Counts;
    by_status: Counts;
    by_verification: Counts;
    by_woreda: NamedList;
    by_zone: NamedList;
    recent: { id: string; name: string; woreda: string; at: string }[];
  };
}

const toSeries = (counts: Counts | undefined, label?: (k: string) => string): NamedList =>
  Object.entries(counts ?? {})
    .map(([k, v]) => ({ name: label ? label(k) : k, value: v }))
    .sort((a, b) => b.value - a.value);

function ChartCard({
  title,
  description,
  data,
  kind,
}: {
  title: string;
  description?: string;
  data: NamedList;
  kind: "pie" | "bar";
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
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

export function CommandCenter() {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["registry-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("registry_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });

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

  if (error) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : t("cc.loadFailed")}</p>;
  }
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("cc.loading")}</p>;
  }

  const r = data.residents;
  const e = data.establishments;
  const idCoverage = r.total ? Math.round((r.with_national_id / r.total) * 100) : 0;

  const kpis = [
    { label: t("cc.kpi.totalResidents"), value: r.total.toLocaleString(), icon: Users },
    { label: t("cc.kpi.idCoverage"), value: `${r.with_national_id.toLocaleString()} (${idCoverage}%)`, icon: IdCard },
    { label: t("cc.kpi.totalEstablishments"), value: e.total.toLocaleString(), icon: Building2 },
    { label: t("cc.kpi.pendingDupes"), value: (pendingDupes ?? 0).toLocaleString(), icon: FileText },
  ];

  const ageSeries = ["baby", "child", "youth", "adult", "elder", "unknown"].map((k) => ({
    name: k === "unknown" ? t("common.unknown") : t(`tier.${k}`),
    value: r.by_age_tier?.[k] ?? 0,
  }));

  const woredaCompare = (() => {
    const names = new Set<string>([...(r.by_woreda ?? []).map((x) => x.name), ...(e.by_woreda ?? []).map((x) => x.name)]);
    return [...names]
      .map((name) => ({
        name,
        residents: r.by_woreda?.find((x) => x.name === name)?.value ?? 0,
        establishments: e.by_woreda?.find((x) => x.name === name)?.value ?? 0,
      }))
      .sort((a, b) => b.residents - a.residents);
  })();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("cc.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("cc.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/establishments">
              <Building2 className="size-4" />
              {t("cc.establishmentsLink")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/reports">
              <FileText className="size-4" />
              {t("cc.officialReports")}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-md bg-secondary p-2.5 text-secondary-foreground">
                <k.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-semibold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t("cc.residentsHeading")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t("cc.ageCategories")} data={ageSeries} kind="bar" />
          <ChartCard
            title={t("common.sex")}
            data={toSeries(r.by_sex, (k) => (k === "unknown" ? t("common.notRecorded") : k === "male" ? t("common.male") : t("common.female")))}
            kind="pie"
          />
          <ChartCard
            title={t("cc.registrationStatus")}
            data={toSeries(r.by_status, (k) => t(`v.${STATUS_LABEL[k] ?? k}`))}
            description={t("cc.registrationStatusHint")}
            kind="pie"
          />
          <ChartCard
            title={t("cc.verificationStatus")}
            data={toSeries(r.by_verification, (k) => t(`v.${VERIFICATION_LABEL[k] ?? k}`))}
            kind="pie"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t("cc.establishmentsHeading")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title={t("cc.byCategory")}
            data={toSeries(e.by_category, (k) => t(`v.${CATEGORY_LABEL[k] ?? k}`))}
            kind="bar"
          />
          <ChartCard title={t("cc.byWoreda")} data={e.by_woreda ?? []} kind="bar" />
          <ChartCard
            title={t("cc.operatingStatus")}
            data={toSeries(e.by_status, (k) => EST_t(`v.${STATUS_LABEL[k] ?? k}`))}
            description={t("cc.operatingStatusHint")}
            kind="pie"
          />
          <ChartCard
            title={t("cc.verificationStatus")}
            data={toSeries(e.by_verification, (k) => t(`v.${VERIFICATION_LABEL[k] ?? k}`))}
            kind="pie"
          />
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("cc.woredaComparison")}</CardTitle>
          <CardDescription>{t("cc.woredaComparisonHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woredaCompare} margin={{ left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="residents" name={t("cc.residentsSeries")} fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="establishments" name={t("cc.establishmentsSeries")} fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.woreda")}</TableHead>
                  <TableHead className="text-right">{t("common.residents")}</TableHead>
                  <TableHead className="text-right">{t("common.establishments")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {woredaCompare.map((w) => (
                  <TableRow key={w.name}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.residents.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.establishments.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("cc.zoneActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.zone")}</TableHead>
                  <TableHead>{t("common.woreda")}</TableHead>
                  <TableHead className="text-right">{t("common.residents")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(r.by_zone ?? []).slice(0, 10).map((z) => (
                  <TableRow key={`${z.woreda}-${z.name}`}>
                    <TableCell>{z.name}</TableCell>
                    <TableCell>{z.woreda ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{z.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("cc.latest")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("cc.residentsHeading")}</p>
              {(r.recent ?? []).length === 0 && <p className="text-muted-foreground">{t("cc.noneYet")}</p>}
              {(r.recent ?? []).map((x) => (
                <p key={x.id} className="flex justify-between gap-4 border-b border-border/60 py-1">
                  <span>
                    {x.name} · <span className="text-muted-foreground">{x.zone}</span>
                  </span>
                  <span className="text-muted-foreground">{new Date(x.at).toLocaleDateString()}</span>
                </p>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("cc.establishmentsHeading")}</p>
              {(e.recent ?? []).length === 0 && <p className="text-muted-foreground">{t("cc.noneYet")}</p>}
              {(e.recent ?? []).map((x) => (
                <p key={x.id} className="flex justify-between gap-4 border-b border-border/60 py-1">
                  <span>
                    {x.name} · <span className="text-muted-foreground">{x.woreda}</span>
                  </span>
                  <span className="text-muted-foreground">{new Date(x.at).toLocaleDateString()}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
