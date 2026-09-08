import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail | Malkaa Nono Registry" },
      {
        name: "description",
        content:
          "Searchable audit trail of every resident record creation and correction across Malkaa Nono Subcity, scoped to your administrative level.",
      },
      { property: "og:title", content: "Audit Trail | Malkaa Nono Registry" },
      { property: "og:description", content: "Searchable registry audit trail for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const t = useT();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const [search, setSearch] = useState("");
  const isAdmin = scope?.role === "subcity_admin" || scope?.role === "woreda_admin";
  const zoneName = (id?: string | null) => hierarchy?.zones.find((z) => z.id === id)?.name ?? "—";

  const { data: rows, isLoading } = useQuery({
    queryKey: ["audit-log"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*, person:persons(id, full_name, zone_id)")
        .order("changed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("common.adminOnly")}</CardTitle>
          <CardDescription>{t("audit.adminOnlyBody")}</CardDescription>
        </CardHeader>
      </Card>
    );

  const q = search.trim().toLowerCase();
  const filtered = (rows ?? []).filter((r) => {
    if (!q) return true;
    const person = r.person as unknown as { full_name?: string } | null;
    return [person?.full_name, r.field_changed, r.old_value, r.new_value, r.action_type]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("audit.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>{t("audit.count", { count: filtered.length })}</CardTitle>
          <Input
            className="w-64"
            placeholder={t("audit.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.when")}</TableHead>
                <TableHead>{t("audit.resident")}</TableHead>
                <TableHead>{t("common.zone")}</TableHead>
                <TableHead>{t("audit.action")}</TableHead>
                <TableHead>{t("audit.field")}</TableHead>
                <TableHead>{t("audit.from")}</TableHead>
                <TableHead>{t("audit.to")}</TableHead>
                <TableHead>{t("accounts.role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const person = r.person as unknown as { id: string; full_name: string; zone_id: string } | null;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {person ? (
                        <Link to="/person/$id" params={{ id: person.id }} className="hover:underline">
                          {person.full_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{zoneName(person?.zone_id)}</TableCell>
                    <TableCell className="capitalize">{r.action_type}</TableCell>
                    <TableCell>{r.field_changed ?? "—"}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.old_value ?? "—"}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.new_value ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.changed_by_role ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("audit.empty")}
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
