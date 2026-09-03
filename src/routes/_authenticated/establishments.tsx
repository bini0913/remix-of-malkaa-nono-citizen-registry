import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, ShieldAlert } from "lucide-react";
import {
  CATEGORY_LABEL,
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_STATUSES,
  EST_STATUS_LABEL,
} from "@/lib/establishments";
import { VERIFICATION_LABEL, VERIFICATION_STATUSES } from "@/lib/registry";

export const Route = createFileRoute("/_authenticated/establishments")({
  head: () => ({
    meta: [
      { title: "Establishment Registry | Malkaa Nono Subcity" },
      {
        name: "description",
        content:
          "Register, search and verify companies, schools, health facilities, religious institutions and other establishments across Malkaa Nono Subcity woredas.",
      },
      { property: "og:title", content: "Establishment Registry | Malkaa Nono Subcity" },
      { property: "og:description", content: "Woreda establishment registry for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Establishments,
});

const ALL = "__all__";
const NONE = "__none__";

function Establishments() {
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const queryClient = useQueryClient();

  const isSubcity = scope?.role === "subcity_admin";
  const isWoreda = scope?.role === "woreda_admin";
  const canManage = isSubcity || isWoreda;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [verification, setVerification] = useState(ALL);
  const [woredaFilter, setWoredaFilter] = useState(ALL);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "company",
    woreda_id: "",
    zone_id: NONE,
    status: "active",
    owner_name: "",
    manager_name: "",
    primary_phone: "",
    secondary_phone: "",
    email: "",
    address_detail: "",
    license_number: "",
    tin_number: "",
    employee_count: "",
    established_date: "",
    notes: "",
  });

  const woredas = hierarchy?.woredas ?? [];
  const zones = hierarchy?.zones ?? [];
  const lockedWoreda = isWoreda ? (scope?.woredaId ?? "") : "";
  const formWoreda = isWoreda ? lockedWoreda : form.woreda_id;
  const formZones = zones.filter((z) => z.woreda_id === formWoreda);

  const { data: rows } = useQuery({
    enabled: !!scope && canManage,
    queryKey: ["establishments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishments")
        .select(
          "id, registration_no, name, category, status, verification_status, woreda_id, zone_id, primary_phone, owner_name, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (category !== ALL && r.category !== category) return false;
      if (status !== ALL && r.status !== status) return false;
      if (verification !== ALL && r.verification_status !== verification) return false;
      if (woredaFilter !== ALL && r.woreda_id !== woredaFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.registration_no ?? "").toLowerCase().includes(q) ||
        (r.owner_name ?? "").toLowerCase().includes(q) ||
        (r.primary_phone ?? "").includes(q)
      );
    });
  }, [rows, search, category, status, verification, woredaFilter]);

  const nameOf = (list: { id: string; name: string }[], id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? "—") : "—";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const woreda_id = formWoreda;
    if (!woreda_id) {
      toast.error("Select a woreda");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("establishments").insert({
        name: form.name.trim(),
        category: form.category as "company",
        status: form.status as "active",
        woreda_id,
        zone_id: form.zone_id === NONE ? null : form.zone_id,
        owner_name: form.owner_name || null,
        manager_name: form.manager_name || null,
        primary_phone: form.primary_phone || null,
        secondary_phone: form.secondary_phone || null,
        email: form.email || null,
        address_detail: form.address_detail || null,
        license_number: form.license_number || null,
        tin_number: form.tin_number || null,
        employee_count: form.employee_count ? Number(form.employee_count) : null,
        established_date: form.established_date || null,
        notes: form.notes || null,
        created_by: scope?.userId ?? null,
      } as never);
      if (error) throw error;
      toast.success("Establishment registered");
      setOpen(false);
      setForm({ ...form, name: "", owner_name: "", manager_name: "", primary_phone: "", secondary_phone: "", email: "", address_detail: "", license_number: "", tin_number: "", employee_count: "", established_date: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
      queryClient.invalidateQueries({ queryKey: ["registry-overview"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register the establishment");
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Establishments are managed by administrators
          </CardTitle>
          <CardDescription>
            Zone registrars register residents only. Establishment records are maintained by the woreda administrator of
            each woreda. This restriction is enforced in the database as well as in this interface.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...(key === "name" ? { required: true } : {})}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Establishment registry</h1>
          <p className="text-sm text-muted-foreground">
            {isSubcity
              ? "All establishments across Malkaa Nono Subcity."
              : `Establishments inside ${nameOf(woredas, lockedWoreda)} Woreda only.`}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Building2 className="size-4" />
          {open ? "Close form" : "Register establishment"}
        </Button>
      </header>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle>New establishment</CardTitle>
            <CardDescription>A permanent registry number is issued automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
              {field("Establishment name", "name")}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTABLISHMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operating status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTABLISHMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {EST_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Woreda</Label>
                {isSubcity ? (
                  <Select value={form.woreda_id} onValueChange={(v) => setForm({ ...form, woreda_id: v, zone_id: NONE })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select woreda" />
                    </SelectTrigger>
                    <SelectContent>
                      {woredas.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={nameOf(woredas, lockedWoreda)} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Zone (optional)</Label>
                <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not specified</SelectItem>
                    {formZones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {field("Owner name", "owner_name")}
              {field("Manager name", "manager_name")}
              {field("Primary phone", "primary_phone")}
              {field("Secondary phone", "secondary_phone")}
              {field("Email", "email", "email")}
              {field("Licence number", "license_number")}
              {field("TIN number", "tin_number")}
              {field("Employees", "employee_count", "number")}
              {field("Established date", "established_date", "date")}
              <div className="space-y-2 md:col-span-2">
                <Label>Address detail</Label>
                <Input
                  value={form.address_detail}
                  onChange={(e) => setForm({ ...form, address_detail: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Register establishment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>{filtered.length} establishments</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input placeholder="Search name, reg. no, owner, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {ESTABLISHMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EST_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verification} onValueChange={setVerification}>
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All verification</SelectItem>
                {VERIFICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {VERIFICATION_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSubcity && (
              <Select value={woredaFilter} onValueChange={setWoredaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Woreda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All woredas</SelectItem>
                  {woredas.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg. no</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Woreda</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.registration_no}</TableCell>
                  <TableCell className="font-medium">
                    <Link to="/establishment/$id" params={{ id: r.id }} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>{CATEGORY_LABEL[r.category] ?? r.category}</TableCell>
                  <TableCell>{nameOf(woredas, r.woreda_id)}</TableCell>
                  <TableCell>{nameOf(zones, r.zone_id)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "active" ? "secondary" : "outline"}>
                      {EST_STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.verification_status === "verified" ? "secondary" : "outline"}>
                      {VERIFICATION_LABEL[r.verification_status] ?? r.verification_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No establishments match the current filters.
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
