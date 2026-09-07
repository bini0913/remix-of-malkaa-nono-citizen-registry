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
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const ROLE_LABEL: Record<string, string> = {
    subcity_admin: t("role.subcity_admin"),
    woreda_admin: t("role.woreda_admin"),
    zone_account: t("role.zone_account"),
  };

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
      toast.error(t("accounts.selectWoredaError"));
      return;
    }
    if (role === "zone_account" && !zoneId) {
      toast.error(t("accounts.selectZoneError"));
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
      toast.success(t("accounts.created", { role: ROLE_LABEL[role] ?? role }));
      setEmail("");
      setFullName("");
      setPassword("");
      setZoneId("");
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("accounts.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = async (row: StaffRow, active: boolean) => {
    setWorking(true);
    try {
      await toggleActive({ data: { roleRowId: row.id, active } });
      const name = row.fullName ?? row.email ?? t("accounts.thisAccount");
      const nameStr = name ?? "";
      toast.success(active ? t("accounts.enabled", { name: nameStr }) : t("accounts.disabledToast", { name: nameStr }));
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
      setPending(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("accounts.statusFailed"));
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("accounts.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {isSubcity ? t("accounts.subtitleSubcity") : t("accounts.subtitleWoreda")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("accounts.newTitle", { role: ROLE_LABEL[role] ?? role })}</CardTitle>
          <CardDescription>{t("accounts.newHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mail">{t("auth.email")}</Label>
              <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">{t("accounts.tempPassword")}</Label>
              <Input id="pw" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("common.woreda")}</Label>
              {isSubcity ? (
                <Select value={woredaId} onValueChange={setWoredaId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("accounts.selectWoreda")} />
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
                <Label>{t("common.zone")}</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("accounts.selectZone")} />
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
                {busy ? t("accounts.creating") : t("accounts.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("accounts.existing")}</CardTitle>
          <CardDescription>{t("accounts.existingHint")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : t("accounts.loadFailed")}
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">{t("accounts.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{t("accounts.role")}</TableHead>
                  <TableHead>{t("common.woreda")}</TableHead>
                  <TableHead>{t("common.zone")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("accounts.createdOn")}</TableHead>
                  <TableHead>{t("accounts.lastSignIn")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staff ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      {t("accounts.empty")}
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
                        {s.is_active ? t("accounts.active") : t("accounts.disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {s.lastSignInAt ? new Date(s.lastSignInAt).toLocaleString() : t("accounts.never")}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage(s) ? (
                        s.is_active ? (
                          <Button size="sm" variant="destructive" onClick={() => setPending(s)}>
                            {t("accounts.disable")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={working} onClick={() => applyStatus(s, true)}>
                            {t("accounts.enable")}
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
            <AlertDialogTitle>{t("accounts.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("accounts.confirmBody", { name: pending?.fullName ?? pending?.email ?? t("accounts.thisAccount") ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(e) => {
                e.preventDefault();
                if (pending) void applyStatus(pending, false);
              }}
            >
              {working ? t("accounts.disabling") : t("accounts.disable")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
