import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createStaffAccount, listStaffAccounts, setAccountActive } from "@/lib/accounts.functions";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Staff Accounts | Malkaa Nono Registry" },
      {
        name: "description",
        content:
          "Create, review, enable and disable woreda administrator and zone registrar accounts for the Malkaa Nono Subcity registry.",
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

type StaffRow = {
  id: string;
  user_id: string;
  role: string;
  woreda_id: string | null;
  zone_id: string | null;
  is_active: boolean;
  created_at: string;
  disabled_at: string | null;
  email: string | null;
  fullName: string | null;
  lastSignInAt: string | null;
};

function Accounts() {
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const queryClient = useQueryClient();
  const createAccount = useServerFn(createStaffAccount);
  const fetchStaff = useServerFn(listStaffAccounts);
  const toggleActive = useServerFn(setAccountActive);

  const isSubcity = scope?.role === "subcity_admin";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [woredaId, setWoredaId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<StaffRow | null>(null);
  const [working, setWorking] = useState(false);

  const role: "woreda_admin" | "zone_account" = isSubcity ? "woreda_admin" : "zone_account";
  const effectiveWoreda = isSubcity ? woredaId : (scope?.woredaId ?? "");
  const zoneOptions = (hierarchy?.zones ?? []).filter((z) => z.woreda_id === effectiveWoreda);

  const {
    data: staff,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: async () => (await fetchStaff({ data: undefined })) as unknown as StaffRow[],
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
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = async (row: StaffRow, active: boolean) => {
    setWorking(true);
    try {
      await toggleActive({ data: { roleRowId: row.id, active } });
      toast.success(
        active
          ? `${row.fullName ?? row.email ?? "Account"} can sign in again`
          : `${row.fullName ?? row.email ?? "Account"} has been disabled`,
      );
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
      setPending(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the account status");
    } finally {
      setWorking(false);
    }
  };

  const nameOf = (id: string | null, kind: "woreda" | "zone") => {
    if (!id) return "—";
    const list = kind === "woreda" ? (hierarchy?.woredas ?? []) : (hierarchy?.zones ?? []);
    return list.find((x) => x.id === id)?.name ?? "—";
  };

  const canManage = (row: StaffRow) => {
    if (row.user_id === scope?.userId) return false;
    if (isSubcity) return row.role === "woreda_admin";
    if (scope?.role === "woreda_admin") return row.role === "zone_account" && row.woreda_id === scope.woredaId;
    return false;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Staff accounts</h1>
        <p className="text-sm text-muted-foreground">
          {isSubcity
            ? "Create and manage woreda administrator accounts. Woreda administrators create their own zone registrars."
            : "Create and manage zone registrar accounts for zones inside your woreda."}
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
          <CardDescription>
            Accounts are never deleted — disabling blocks sign-in while keeping the audit history intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Could not load staff accounts."}
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading staff directory…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Woreda</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staff ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      No accounts in your scope yet.
                    </TableCell>
                  </TableRow>
                )}
                {(staff ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                    <TableCell>{ROLE_LABEL[s.role] ?? s.role}</TableCell>
                    <TableCell>{nameOf(s.woreda_id, "woreda")}</TableCell>
                    <TableCell>{nameOf(s.zone_id, "zone")}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "destructive"}>
                        {s.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {s.lastSignInAt ? new Date(s.lastSignInAt).toLocaleString() : "Never signed in"}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage(s) ? (
                        s.is_active ? (
                          <Button size="sm" variant="destructive" onClick={() => setPending(s)}>
                            Disable
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={working} onClick={() => applyStatus(s, true)}>
                            Enable
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.fullName ?? pending?.email ?? "This account"} will immediately lose access to the registry.
              Their records and audit history stay intact and you can enable the account again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(e) => {
                e.preventDefault();
                if (pending) void applyStatus(pending, false);
              }}
            >
              {working ? "Disabling…" : "Disable account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
