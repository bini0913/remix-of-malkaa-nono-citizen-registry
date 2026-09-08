import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicate Review | Malkaa Nono Registry" },
      {
        name: "description",
        content:
          "Review possible duplicate resident registrations side by side and confirm or dismiss them for Malkaa Nono Subcity.",
      },
      { property: "og:title", content: "Duplicate Review | Malkaa Nono Registry" },
      { property: "og:description", content: "Resolve possible duplicate resident records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Duplicates,
});

const PERSON_COLS =
  "id, full_name, sex, date_of_birth, zone_id, primary_phone, address_detail, has_national_id, status, created_at";

function Duplicates() {
  const t = useT();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const qc = useQueryClient();
  const zoneName = (id?: string | null) => hierarchy?.zones.find((z) => z.id === id)?.name ?? "—";

  const isAdmin = scope?.role === "subcity_admin" || scope?.role === "woreda_admin";

  const { data: flags, isLoading } = useQuery({
    queryKey: ["duplicate-flags"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("duplicate_flags")
        .select(
          `id, resolution, created_at,
           new_person:persons!duplicate_flags_new_person_id_fkey(${PERSON_COLS}),
           existing_person:persons!duplicate_flags_existing_person_id_fkey(${PERSON_COLS})`,
        )
        .eq("resolution", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("common.adminOnly")}</CardTitle>
          <CardDescription>{t("dupes.adminOnlyBody")}</CardDescription>
        </CardHeader>
      </Card>
    );

  const resolve = async (flagId: string, newPersonId: string, existingPersonId: string, confirm: boolean) => {
    try {
      if (confirm) {
        // Cross-references the newer record to the kept one. Vital status is never
        // touched — duplicate state lives entirely in this review workflow.
        const { error } = await supabase
          .from("persons")
          .update({ duplicate_of: existingPersonId })
          .eq("id", newPersonId);
        if (error) throw error;
      }

      const { error: fErr } = await supabase
        .from("duplicate_flags")
        .update({
          resolution: confirm ? "confirmed" : "dismissed",
          resolved_by: scope?.userId ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", flagId);
      if (fErr) throw fErr;
      toast.success(confirm ? t("dupes.confirmed") : t("dupes.dismissed"));
      qc.invalidateQueries({ queryKey: ["duplicate-flags"] });
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["report-persons"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dupes.failed"));
    }
  };

  type P = {
    id: string;
    full_name: string;
    sex: string | null;
    date_of_birth: string | null;
    zone_id: string;
    primary_phone: string | null;
    address_detail: string | null;
    has_national_id: boolean;
    status: string;
    created_at: string;
  };

  const Side = ({ p, label }: { p: P; label: string }) => (
    <div className="flex-1 space-y-1 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{label}</Badge>
        <Button asChild size="sm" variant="ghost">
          <Link to="/person/$id" params={{ id: p.id }}>
            {t("common.open")}
          </Link>
        </Button>
      </div>
      <p className="text-base font-medium text-foreground">{p.full_name}</p>
      <dl className="grid grid-cols-2 gap-x-3 text-xs text-muted-foreground">
        <dt>{t("dupes.dob")}</dt>
        <dd>{p.date_of_birth ?? "—"}</dd>
        <dt>{t("common.sex")}</dt>
        <dd className="capitalize">{p.sex ?? "—"}</dd>
        <dt>{t("common.zone")}</dt>
        <dd>{zoneName(p.zone_id)}</dd>
        <dt>{t("common.phone")}</dt>
        <dd>{p.primary_phone ?? "—"}</dd>
        <dt>{t("dupes.address")}</dt>
        <dd>{p.address_detail ?? "—"}</dd>
        <dt>{t("dupes.fayda")}</dt>
        <dd>{p.has_national_id ? t("common.yes") : t("common.no")}</dd>
        <dt>{t("dupes.registered")}</dt>
        <dd>{new Date(p.created_at).toLocaleDateString()}</dd>
      </dl>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("dupes.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dupes.subtitle")}</p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">{t("dupes.loading")}</p>}

      {(flags ?? []).length === 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dupes.noneTitle")}</CardTitle>
            <CardDescription>{t("dupes.noneBody")}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {(flags ?? []).map((f) => {
        const np = f.new_person as unknown as P | null;
        const ep = f.existing_person as unknown as P | null;
        if (!np || !ep) return null;
        return (
          <Card key={f.id}>
            <CardHeader>
              <CardTitle className="text-base">{t("dupes.possible", { name: np.full_name })}</CardTitle>
              <CardDescription>{t("dupes.flagged", { when: new Date(f.created_at).toLocaleString() })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <Side p={ep} label={t("dupes.existing")} />
                <Side p={np} label={t("dupes.new")} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => resolve(f.id, np.id, ep.id, true)}>
                  <Check className="size-4" />
                  {t("dupes.confirm")}
                </Button>
                <Button variant="outline" onClick={() => resolve(f.id, np.id, ep.id, false)}>
                  <X className="size-4" />
                  {t("dupes.dismiss")}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
