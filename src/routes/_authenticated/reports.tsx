import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { REPORT_TYPES, runReport, type ReportFilters, type ReportResult } from "@/lib/reports.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTABLISHMENT_CATEGORIES, ESTABLISHMENT_STATUSES, EST_STATUS_LABEL } from "@/lib/establishments";
import { STATUS_LABEL, VERIFICATION_LABEL, VERIFICATION_STATUSES, VITAL_STATUSES } from "@/lib/registry";
import { FileText, Printer, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Official Report Center | Malkaa Nono Subcity" },
      {
        name: "description",
        content:
          "Generate, preview and print official administrative reports on residents, establishments, woredas, zones, National ID coverage and verification status.",
      },
      { property: "og:title", content: "Official Report Center | Malkaa Nono Subcity" },
      {
        property: "og:description",
        content: "Print-ready official administrative reports for Malkaa Nono Subcity Administration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportCenter,
});

const ALL = "__all__";

function ReportCenter() {
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const execute = useServerFn(runReport);

  const [type, setType] = useState<ReportFilters["type"]>("residents");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [woreda, setWoreda] = useState(ALL);
  const [zone, setZone] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [verification, setVerification] = useState(ALL);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [snapshot, setSnapshot] = useState<{ label: string; scopeLines: string[] } | null>(null);

  const meta = REPORT_TYPES.find((r) => r.value === type)!;
  const isEstScope = meta.scope === "establishments";
  const zones = (hierarchy?.zones ?? []).filter((z) => woreda === ALL || z.woreda_id === woreda);
  const woredaName = (id: string) => hierarchy?.woredas.find((w) => w.id === id)?.name ?? id;
  const zoneName = (id: string) => hierarchy?.zones.find((z) => z.id === id)?.name ?? id;

  const statusOptions = isEstScope
    ? ESTABLISHMENT_STATUSES.map((s) => ({ value: s, label: EST_STATUS_LABEL[s] ?? s }))
    : VITAL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: ReportFilters = {
        type,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        woredaId: woreda === ALL ? null : woreda,
        zoneId: zone === ALL ? null : zone,
        category: category === ALL ? null : category,
        status: status === ALL ? null : status,
        verification: verification === ALL ? null : verification,
      };
      return (await execute({ data: payload })) as unknown as ReportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      const lines: string[] = [];
      lines.push(`Woreda: ${woreda === ALL ? "All woredas" : woredaName(woreda)}`);
      lines.push(`Zone: ${zone === ALL ? "All zones" : zoneName(zone)}`);
      if (isEstScope || meta.scope === "both")
        lines.push(
          `Category: ${category === ALL ? "All categories" : (ESTABLISHMENT_CATEGORIES.find((c) => c.value === category)?.label ?? category)}`,
        );
      lines.push(`Status: ${status === ALL ? "All statuses" : (statusOptions.find((s) => s.value === status)?.label ?? status)}`);
      lines.push(
        `Verification: ${verification === ALL ? "All verification states" : (VERIFICATION_LABEL[verification] ?? verification)}`,
      );
      setSnapshot({ label: meta.label, scopeLines: lines });
      if (data.truncated) toast.warning("Result truncated to the first 5,000 records — narrow the filters.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate the report"),
  });

  if (scope && scope.role !== "subcity_admin") {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Restricted
          </CardTitle>
          <CardDescription>
            The Official Report Center is available to the Subcity Administration only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const periodText =
    dateFrom || dateTo
      ? `${dateFrom ? new Date(dateFrom).toLocaleDateString() : "Start of registry"} — ${dateTo ? new Date(dateTo).toLocaleDateString() : "Today"}`
      : "All records to date";

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <FileText className="size-6" />
            Official Report Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Malkaa Nono Subcity Administration · generate, preview and print official administrative reports.
          </p>
        </div>
        <Button variant="outline" disabled={!result} onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / save as PDF
        </Button>
      </header>

      <Card className="no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report definition</CardTitle>
          <CardDescription>Choose a report type and narrow the scope before generating.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReportFilters["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From (registration date)</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Woreda</Label>
              <Select
                value={woreda}
                onValueChange={(v) => {
                  setWoreda(v);
                  setZone(ALL);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All woredas</SelectItem>
                  {(hierarchy?.woredas ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Establishment category</Label>
              <Select value={category} onValueChange={setCategory} disabled={meta.scope === "residents"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {ESTABLISHMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Verification status</Label>
              <Select value={verification} onValueChange={setVerification}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All verification states</SelectItem>
                  {VERIFICATION_STATUSES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {VERIFICATION_LABEL[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Generating…" : "Generate preview"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setWoreda(ALL);
                setZone(ALL);
                setCategory(ALL);
                setStatus(ALL);
                setVerification(ALL);
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && snapshot && (
        <section className="print-sheet mx-auto w-full max-w-[210mm] rounded-md border border-border bg-card p-8 text-card-foreground shadow-sm">
          <div className="print-header border-b-2 border-foreground pb-4 text-center">
            <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Malkaa Nono Subcity Administration</h2>
            <p className="text-sm font-semibold uppercase tracking-[0.3em]">Official Administrative Report</p>
          </div>

          <div className="mt-5 text-center">
            <h3 className="text-base font-bold uppercase">{snapshot.label}</h3>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border-y border-border py-3 text-xs">
            <div className="flex gap-2">
              <dt className="font-semibold">Generated:</dt>
              <dd>{new Date(result.generatedAt).toLocaleString()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Reporting period:</dt>
              <dd>{periodText}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Generated by:</dt>
              <dd>{result.generatedBy}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Records:</dt>
              <dd>
                {result.rowCount.toLocaleString()}
                {result.truncated ? " (truncated at 5,000)" : ""}
              </dd>
            </div>
            <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-1">
              <dt className="font-semibold">Scope:</dt>
              {snapshot.scopeLines.map((l) => (
                <dd key={l}>{l}</dd>
              ))}
            </div>
          </dl>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-border bg-muted px-2 py-1.5 text-left font-semibold">#</th>
                  {result.columns.map((c) => (
                    <th
                      key={c.key}
                      className={`border border-border bg-muted px-2 py-1.5 font-semibold ${c.numeric ? "text-right" : "text-left"}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 && (
                  <tr>
                    <td className="border border-border px-2 py-3 text-center" colSpan={result.columns.length + 1}>
                      No records match the selected scope.
                    </td>
                  </tr>
                )}
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="border border-border px-2 py-1 text-right">{i + 1}</td>
                    {result.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`border border-border px-2 py-1 ${c.numeric ? "text-right tabular-nums" : ""}`}
                      >
                        {row[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {result.totals && (
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border border-border px-2 py-1.5" />
                    {result.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`border border-border bg-muted px-2 py-1.5 ${c.numeric ? "text-right tabular-nums" : ""}`}
                      >
                        {result.totals?.[c.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="print-signatures mt-10 grid grid-cols-2 gap-10 text-xs">
            <div>
              <p className="border-t border-foreground pt-1 font-semibold">Prepared by</p>
              <p className="mt-1">{result.generatedBy}</p>
              <p className="mt-6">Signature: ______________________</p>
              <p className="mt-2">Date: ______________________</p>
            </div>
            <div>
              <p className="border-t border-foreground pt-1 font-semibold">Approved by</p>
              <p className="mt-1">Subcity Administrator</p>
              <p className="mt-6">Signature: ______________________</p>
              <p className="mt-2">Official stamp / date: ______________</p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
            Malkaa Nono Subcity Administration · Official Administrative Report · This document is generated from the
            official resident and establishment registry.
          </div>

          <div className="print-footer print-only text-center">
            Malkaa Nono Subcity Administration — Official Administrative Report · Page <span className="print-page-number" />
          </div>
        </section>
      )}
    </div>
  );
}
