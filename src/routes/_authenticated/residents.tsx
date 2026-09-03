import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ageTier, calcAge, STATUS_LABEL, TIER_LABEL } from "@/lib/registry";

export const Route = createFileRoute("/_authenticated/residents")({
  head: () => ({
    meta: [
      { title: "Resident Records | Malkaa Nono Registry" },
      {
        name: "description",
        content: "Browse and search registered residents within your assigned zone or woreda of Malkaa Nono Subcity.",
      },
      { property: "og:title", content: "Resident Records | Malkaa Nono Registry" },
      { property: "og:description", content: "Browse registered residents of Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Residents,
});

function Residents() {
  const [search, setSearch] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const { data: hierarchy } = useHierarchy();
  const { data: scope } = useScope();
  const zoneName = (id: string) => hierarchy?.zones.find((z) => z.id === id)?.name ?? "—";

  const { data: rows } = useQuery({
    enabled: !!scope,
    queryKey: ["residents", includeAll, scope?.role, scope?.zoneId, scope?.woredaId],
    queryFn: async () => {
      let query = supabase
        .from("persons")
        .select(
          "id, full_name, sex, date_of_birth, zone_id, primary_phone, has_national_id, status, is_stub, marital_status, zones!inner(woreda_id)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (!includeAll) query = query.eq("status", "active");
      if (scope?.role === "zone_account" && scope.zoneId) query = query.eq("zone_id", scope.zoneId);
      if (scope?.role === "woreda_admin" && scope.woredaId)
        query = query.eq("zones.woreda_id", scope.woredaId);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = (rows ?? []).filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resident records</h1>
        <p className="text-sm text-muted-foreground">Records are never deleted — corrections are made through edits.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>{filtered.length} records</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={includeAll} onCheckedChange={(v) => setIncludeAll(v === true)} />
              Include non-active records
            </label>
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age tier</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const age = calcAge(r.date_of_birth);
                const tier = ageTier(age);
                return (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to="/person/$id" params={{ id: r.id }} className="hover:underline">
                        {r.full_name}
                      </Link>{" "}
                      {r.is_stub && (
                        <Badge variant="outline" className="ml-1">
                          incomplete
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>{tier ? TIER_LABEL[tier] : "—"}</TableCell>
                    <TableCell className="capitalize">{r.sex ?? "—"}</TableCell>
                    <TableCell>{zoneName(r.zone_id)}</TableCell>
                    <TableCell>{r.primary_phone ?? "—"}</TableCell>
                    <TableCell>
                      {r.has_national_id ? (
                        <Badge variant="secondary">Has Fayda</Badge>
                      ) : (
                        <Badge variant="destructive">No Fayda</Badge>
                      )}
                    </TableCell>
                    <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No records found in your scope yet.
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
