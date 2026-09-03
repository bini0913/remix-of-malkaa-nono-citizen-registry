import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createStaffAccount } from "@/lib/accounts.functions";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Staff Accounts | Malkaa Nono Registry" },
      {
        name: "description",
        content: "Create and review woreda administrator and zone registrar accounts for the Malkaa Nono Subcity registry.",
      },
      { property: "og:title", content: "Staff Accounts | Malkaa Nono Registry" },
      { property: "og:description", content: "Manage registry staff accounts for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accounts,
});

const ROLE_LABEL: Record<string, string> = {
  subcity_admin: "Subcity Administrator",
  woreda_admin: "Woreda Administrator",
  zone_account: "Zone Registrar",
};

function Accounts() {
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const queryClient = useQueryClient();
  const createAccount = useServerFn(createStaffAccount);

  const isSubcity = scope?.role === "subcity_admin";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [woredaId, setWoredaId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [busy, setBusy] = useState(false);

  const role: "woreda_admin" | "zone_account" = isSubcity ? "woreda_admin" : "zone_account";
  const effectiveWoreda = isSubcity ? woredaId : (scope?.woredaId ?? "");
  const zoneOptions = (hierarchy?.zones ?? []).filter((z) => z.woreda_id === effectiveWoreda);

  const { data: staff } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("id, role, user_id, woreda_id, zone_id, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveWoreda) {
      toast.error("Select a woreda");
      return;
    }
    if (role === "zone_account" && !zoneId) {
      toast.error("Select a zone");
      return;
    }
    setBusy(true);
    try {
      await createAccount({
        data: {
          email,
          password,
          fullName,
          role,
          woredaId: effectiveWoreda,
          zoneId: role === "zone_account" ? zoneId : null,
        },
      });
      toast.success(`${ROLE_LABEL[role]} account created`);
      setEmail("");
      setFullName("");
      setPassword("");
      setZoneId("");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (id: string | null, kind: "woreda" | "zone") => {
    if (!id) return "—";
    const list = kind === "woreda" ? (hierarchy?.woredas ?? []) : (hierarchy?.zones ?? []);
    return list.find((x) => x.id === id)?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Staff accounts</h1>
        <p className="text-sm text-muted-foreground">
          {isSubcity
            ? "Create woreda administrator accounts. Woreda administrators create their own zone registrars."
            : "Create zone registrar accounts for zones inside your woreda."}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New {ROLE_LABEL[role]} account</CardTitle>
          <CardDescription>The account signs in with this email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mail">Email</Label>
              <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Temporary password</Label>
              <Input id="pw" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Woreda</Label>
              {isSubcity ? (
                <Select value={woredaId} onValueChange={setWoredaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select woreda" />
                  </SelectTrigger>
                  <SelectContent>
                    {(hierarchy?.woredas ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={nameOf(scope?.woredaId ?? null, "woreda")} />
              )}
            </div>
            {role === "zone_account" && (
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneOptions.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end md:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing accounts in your scope</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Woreda</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(staff ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{ROLE_LABEL[s.role] ?? s.role}</TableCell>
                  <TableCell>{nameOf(s.woreda_id, "woreda")}</TableCell>
                  <TableCell>{nameOf(s.zone_id, "zone")}</TableCell>
                  <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
