import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  CATEGORY_LABEL,
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_STATUSES,
  EST_STATUS_LABEL,
} from "@/lib/establishments";
import { VERIFICATION_LABEL, VERIFICATION_STATUSES } from "@/lib/registry";

export const Route = createFileRoute("/_authenticated/establishment/$id")({
  head: () => ({
    meta: [
      { title: "Establishment Record | Malkaa Nono Subcity" },
      {
        name: "description",
        content:
          "View and correct a registered establishment record — category, ownership, contacts, licence details, operating status and verification.",
      },
      { property: "og:title", content: "Establishment Record | Malkaa Nono Subcity" },
      { property: "og:description", content: "Establishment record detail for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstablishmentDetail,
});

const NONE = "__none__";

type FormState = Record<string, string>;

function EstablishmentDetail() {
  const { id } = Route.useParams();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const queryClient = useQueryClient();
  const canManage = scope?.role === "subcity_admin" || scope?.role === "woreda_admin";

  const { data: row, isLoading } = useQuery({
    queryKey: ["establishment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("establishments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!row) return;
    setForm({
      name: row.name ?? "",
      category: row.category,
      status: row.status,
      verification_status: row.verification_status,
      verification_note: row.verification_note ?? "",
      zone_id: row.zone_id ?? NONE,
      owner_name: row.owner_name ?? "",
      manager_name: row.manager_name ?? "",
      primary_phone: row.primary_phone ?? "",
      secondary_phone: row.secondary_phone ?? "",
      email: row.email ?? "",
      address_detail: row.address_detail ?? "",
      license_number: row.license_number ?? "",
      tin_number: row.tin_number ?? "",
      employee_count: row.employee_count?.toString() ?? "",
      established_date: row.established_date ?? "",
      notes: row.notes ?? "",
    });
  }, [row]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!row)
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Record not available</CardTitle>
          <CardDescription>This establishment does not exist or is outside your woreda scope.</CardDescription>
        </CardHeader>
      </Card>
    );

  const woredas = hierarchy?.woredas ?? [];
  const zones = (hierarchy?.zones ?? []).filter((z) => z.woreda_id === row.woreda_id);
  const woredaName = woredas.find((w) => w.id === row.woreda_id)?.name ?? "—";

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          name: form["name"]?.trim() || row.name,
          category: form["category"] as "company",
          status: form["status"] as "active",
          verification_status: form["verification_status"] as "registered",
          verification_note: form["verification_note"] || null,
          zone_id: form["zone_id"] === NONE ? null : (form["zone_id"] ?? null),
          owner_name: form["owner_name"] || null,
          manager_name: form["manager_name"] || null,
          primary_phone: form["primary_phone"] || null,
          secondary_phone: form["secondary_phone"] || null,
          email: form["email"] || null,
          address_detail: form["address_detail"] || null,
          license_number: form["license_number"] || null,
          tin_number: form["tin_number"] || null,
          employee_count: form["employee_count"] ? Number(form["employee_count"]) : null,
          established_date: form["established_date"] || null,
          notes: form["notes"] || null,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Establishment updated");
      queryClient.invalidateQueries({ queryKey: ["establishment", id] });
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
      queryClient.invalidateQueries({ queryKey: ["registry-overview"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the record");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: string, type = "text") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        readOnly={!canManage}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const select = (label: string, key: string, options: { value: string; label: string }[]) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={form[key] ?? ""} onValueChange={(v) => setForm({ ...form, [key]: v })} disabled={!canManage}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/establishments">
          <ArrowLeft className="size-4" />
          Back to establishments
        </Link>
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{row.name}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{row.registration_no}</span> · {CATEGORY_LABEL[row.category] ?? row.category} ·{" "}
            {woredaName} Woreda
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={row.status === "active" ? "secondary" : "outline"}>
            {EST_STATUS_LABEL[row.status] ?? row.status}
          </Badge>
          <Badge variant={row.verification_status === "verified" ? "secondary" : "outline"}>
            {VERIFICATION_LABEL[row.verification_status] ?? row.verification_status}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Establishment record</CardTitle>
          <CardDescription>
            {canManage
              ? "Records are corrected, never deleted. The registry number cannot change."
              : "Read-only: establishment records are maintained by administrators."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {field("Establishment name", "name")}
          {select(
            "Category",
            "category",
            ESTABLISHMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          )}
          {select(
            "Operating status",
            "status",
            ESTABLISHMENT_STATUSES.map((s) => ({ value: s, label: EST_STATUS_LABEL[s] ?? s })),
          )}
          <div className="space-y-2">
            <Label>Woreda</Label>
            <Input readOnly value={woredaName} />
          </div>
          {select("Zone", "zone_id", [
            { value: NONE, label: "Not specified" },
            ...zones.map((z) => ({ value: z.id, label: z.name })),
          ])}
          {field("Owner name", "owner_name")}
          {field("Manager name", "manager_name")}
          {field("Primary phone", "primary_phone")}
          {field("Secondary phone", "secondary_phone")}
          {field("Email", "email", "email")}
          {field("Licence number", "license_number")}
          {field("TIN number", "tin_number")}
          {field("Employees", "employee_count", "number")}
          {field("Established date", "established_date", "date")}
          {select(
            "Verification",
            "verification_status",
            VERIFICATION_STATUSES.map((v) => ({ value: v, label: VERIFICATION_LABEL[v] ?? v })),
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Address detail</Label>
            <Input
              readOnly={!canManage}
              value={form["address_detail"] ?? ""}
              onChange={(e) => setForm({ ...form, address_detail: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Verification note</Label>
            <Textarea
              readOnly={!canManage}
              value={form["verification_note"] ?? ""}
              onChange={(e) => setForm({ ...form, verification_note: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Notes</Label>
            <Textarea
              readOnly={!canManage}
              value={form["notes"] ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {canManage && (
            <div className="md:col-span-3">
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
