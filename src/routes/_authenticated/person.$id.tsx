import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHierarchy, useScope } from "@/hooks/use-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ageTier,
  calcAge,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUSES,
  MARITAL_STATUSES,
  NATIONALITY_OPTIONS,
  RELATIONSHIPS,
  RELIGIONS,
  STATUS_LABEL,
  TIER_LABEL,
} from "@/lib/registry";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { ArrowLeft, CalendarPlus, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/person/$id")({
  head: () => ({
    meta: [
      { title: "Resident Profile | Malkaa Nono Registry" },
      {
        name: "description",
        content:
          "View, correct and maintain an individual resident record of Malkaa Nono Subcity, including vital status, life events and audit history.",
      },
      { property: "og:title", content: "Resident Profile | Malkaa Nono Registry" },
      { property: "og:description", content: "Individual resident record management for Malkaa Nono Subcity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonProfile,
});

const STATUSES = ["active", "deceased", "relocated"] as const;
const EVENT_TYPES = ["birth", "marriage", "death", "relocation", "divorce"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const NONE = "__none__";
const s = (v: string | null | undefined) => v ?? "";

function PersonProfile() {
  const { id } = Route.useParams();
  const { data: scope } = useScope();
  const { data: hierarchy } = useHierarchy();
  const t = useT();
  const qc = useQueryClient();

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("persons").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["life-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("life_events")
        .select("*")
        .eq("person_id", id)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["person-audit", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("person_id", id)
        .order("changed_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: scope?.role === "subcity_admin" || scope?.role === "woreda_admin",
  });

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (person) setForm({ ...person });
  }, [person]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const val = (k: string) => (form[k] as string | null) ?? "";

  const age = useMemo(() => calcAge(val("date_of_birth")), [form]);
  const tier = ageTier(age);
  const zoneName = hierarchy?.zones.find((z) => z.id === val("zone_id"))?.name ?? "—";

  const [statusValue, setStatusValue] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [statusDate, setStatusDate] = useState("");

  const [eventType, setEventType] = useState<string>("");
  const [eventDate, setEventDate] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  useEffect(() => {
    if (person?.status) setStatusValue(person.status);
  }, [person?.status]);

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("pp.loading")}</p>;
  if (!person)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pp.recordUnavailable")}</CardTitle>
          <CardDescription>{t("pp.outOfScope")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/residents">{t("pp.backToResidents")}</Link>
          </Button>
        </CardContent>
      </Card>
    );

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        full_name: (val("full_name") || "").trim(),
        sex: (val("sex") || null) as "male" | "female" | null,
        date_of_birth: val("date_of_birth") || null,
        nationality_status: (val("nationality_status") || null) as "citizen" | "foreign_resident" | "other" | null,
        address_detail: val("address_detail") || null,
        relationship_to_head: val("relationship_to_head") || null,
        primary_phone: val("primary_phone") || null,
        secondary_phone: val("secondary_phone") || null,
        phone_unreachable: Boolean(form["phone_unreachable"]),
        guardian_full_name: val("guardian_full_name") || null,
        has_national_id: Boolean(form["has_national_id"]),
        fan_number: val("fan_number") || null,
        fin_number: val("fin_number") || null,
        education_level: val("education_level") || null,
        employment_status: val("employment_status") || null,
        marital_status: val("marital_status") || null,
        religion: val("religion") || null,
        occupation: val("occupation") || null,
        pension_status: val("pension_status") || null,
        notes: val("notes") || null,
        is_stub: Boolean(form["is_stub"]),
      };
      if (!payload.full_name) {
        toast.error(t("pp.toast.fullNameRequired"));
        return;
      }
      const { error } = await supabase.from("persons").update(payload).eq("id", id);
      if (error) throw error;
      toast.success(t("pp.toast.recordUpdated"));
      qc.invalidateQueries({ queryKey: ["person", id] });
      qc.invalidateQueries({ queryKey: ["person-audit", id] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pp.toast.updateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const completeStub = async () => {
    setForm((f) => ({ ...f, is_stub: false }));
    toast.info(t("pp.toast.fillRemaining"));
  };

  const applyStatus = async () => {
    if (!statusValue) return;
    if (statusValue === person.status) {
      toast.info(t("pp.toast.alreadyCurrentStatus"));
      return;
    }
    if (statusReason.trim().length < 3) {
      toast.error(t("pp.toast.reasonRequired"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("persons")
        .update({ status: statusValue as (typeof STATUSES)[number] })
        .eq("id", id);
      if (error) throw error;

      const mapped: Record<string, EventType | undefined> = { deceased: "death", relocated: "relocation" };
      const evType = mapped[statusValue];
      if (evType) {
        await supabase.from("life_events").insert({
          person_id: id,
          event_type: evType,
          event_date: statusDate || new Date().toISOString().slice(0, 10),
          notes: statusReason.trim(),
          recorded_by: scope?.userId ?? null,
        });
      }
      toast.success(t("pp.toast.statusSet", { status: t(`v.${STATUS_LABEL[statusValue] ?? statusValue}`) }));
      setStatusReason("");
      setStatusDate("");
      qc.invalidateQueries({ queryKey: ["person", id] });
      qc.invalidateQueries({ queryKey: ["life-events", id] });
      qc.invalidateQueries({ queryKey: ["person-audit", id] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pp.toast.statusFailed"));
    } finally {
      setBusy(false);
    }
  };

  const addEvent = async () => {
    if (!eventType) {
      toast.error(t("pp.toast.selectEventType"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("life_events").insert({
        person_id: id,
        event_type: eventType as EventType,
        event_date: eventDate || null,
        notes: eventNotes.trim() || null,
        recorded_by: scope?.userId ?? null,
      });
      if (error) throw error;
      toast.success(t("pp.toast.eventRecorded"));
      setEventType("");
      setEventDate("");
      setEventNotes("");
      qc.invalidateQueries({ queryKey: ["life-events", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pp.toast.eventFailed"));
    } finally {
      setBusy(false);
    }
  };

  const selectField = (label: string, key: string, options: string[]) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={val(key) || NONE} onValueChange={(v) => set(key, v === NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={t("pf.select")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("pp.notRecorded")}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {t(`v.${o}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to="/residents">
              <ArrowLeft className="size-4" />
              {t("pp.residents")}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{person.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {zoneName} · {tier ? t(`tier.${tier}`) : t("pp.ageUnknown")} ·{" "}
            {t(`v.${STATUS_LABEL[person.status] ?? person.status}`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {person.is_stub && <Badge variant="outline">{t("pp.incompleteRecord")}</Badge>}
          {person.has_national_id ? (
            <Badge variant="secondary">{t("dash.hasFayda")}</Badge>
          ) : (
            <Badge variant="destructive">{t("dash.noFayda")}</Badge>
          )}
        </div>
      </header>

      {person.is_stub && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pp.completeGuardianTitle")}</CardTitle>
            <CardDescription>{t("pp.completeGuardianBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={completeStub} disabled={form["is_stub"] === false}>
              {form["is_stub"] === false ? t("pp.markedForCompletion") : t("pp.upgradeToFullProfile")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t("pp.tab.details")}</TabsTrigger>
          <TabsTrigger value="status">{t("pp.tab.status")}</TabsTrigger>
          <TabsTrigger value="events">{t("pp.tab.events")}</TabsTrigger>
          {(scope?.role === "subcity_admin" || scope?.role === "woreda_admin") && (
            <TabsTrigger value="audit">{t("pp.tab.audit")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("pp.coreDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("pp.fullName")}</Label>
                <Input value={val("full_name")} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("pp.dob")}</Label>
                <Input type="date" value={val("date_of_birth")} onChange={(e) => set("date_of_birth", e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {age !== null ? t("pp.computedAge", { age: String(age) }) : t("pp.ageHint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("pp.sex")}</Label>
                <Select value={val("sex") || NONE} onValueChange={(v) => set("sex", v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pf.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("pp.notRecorded")}</SelectItem>
                    <SelectItem value="male">{t("common.male")}</SelectItem>
                    <SelectItem value="female">{t("common.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("pp.nationalityStatus")}</Label>
                <Select
                  value={val("nationality_status") || NONE}
                  onValueChange={(v) => set("nationality_status", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("pf.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("pp.notRecorded")}</SelectItem>
                    {NATIONALITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(`v.${o.label}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectField(t("pf.relationship"), "relationship_to_head", RELATIONSHIPS)}
              <div className="space-y-2">
                <Label>{t("pp.zone")}</Label>
                <Input value={zoneName} readOnly />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("pp.addressDetail")}</Label>
                <Textarea rows={2} value={val("address_detail")} onChange={(e) => set("address_detail", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("pp.contactGuardian")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("pp.primaryPhone")}</Label>
                <Input value={val("primary_phone")} onChange={(e) => set("primary_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("pp.secondaryPhone")}</Label>
                <Input value={val("secondary_phone")} onChange={(e) => set("secondary_phone", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                <Checkbox
                  checked={Boolean(form["phone_unreachable"])}
                  onCheckedChange={(v) => set("phone_unreachable", v === true)}
                />
                {t("pp.unreachable")}
              </label>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("pp.guardianFullName")}</Label>
                <Input value={val("guardian_full_name")} onChange={(e) => set("guardian_full_name", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("pp.nationalId")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                <Checkbox
                  checked={Boolean(form["has_national_id"])}
                  onCheckedChange={(v) => set("has_national_id", v === true)}
                />
                {t("pp.hasFaydaCheckbox")}
              </label>
              <div className="space-y-2">
                <Label>{t("pp.fan")}</Label>
                <Input value={val("fan_number")} onChange={(e) => set("fan_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("pp.fin")}</Label>
                <Input value={val("fin_number")} onChange={(e) => set("fin_number", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("pp.socioEconomic")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {selectField(t("pp.educationLevel"), "education_level", EDUCATION_LEVELS)}
              {selectField(t("pp.employmentStatus"), "employment_status", EMPLOYMENT_STATUSES)}
              {selectField(t("pp.maritalStatus"), "marital_status", MARITAL_STATUSES)}
              {selectField(t("pp.religion"), "religion", RELIGIONS)}
              <div className="space-y-2">
                <Label>{t("pp.occupation")}</Label>
                <Input value={val("occupation")} onChange={(e) => set("occupation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("pp.pensionStatus")}</Label>
                <Input value={val("pension_status")} onChange={(e) => set("pension_status", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("pp.notes")}</Label>
                <Textarea rows={3} value={val("notes")} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}>
              <Save className="size-4" />
              {t("pp.saveChanges")}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="status" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("pp.vitalStatus")}</CardTitle>
              <CardDescription>{t("pp.vitalStatusHint")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("pp.status")}</Label>
                <Select value={statusValue} onValueChange={setStatusValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pp.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {t(`v.${STATUS_LABEL[st]}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("pp.dateOfEventOptional")}</Label>
                <Input type="date" value={statusDate} onChange={(e) => setStatusDate(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("pp.reasonNote")}</Label>
                <Textarea rows={3} value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={applyStatus} disabled={busy}>
                  {t("pp.applyStatusChange")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("pp.addLifeEvent")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("pp.eventType")}</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pf.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((ev) => (
                      <SelectItem key={ev} value={ev}>
                        {t(`v.${ev}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("pp.eventDate")}</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("pp.notes")}</Label>
                <Input value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={addEvent} disabled={busy}>
                  <CalendarPlus className="size-4" />
                  {t("pp.recordEvent")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("pp.timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(events ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pp.noEventsYet")}</p>
              ) : (
                <ol className="relative space-y-5 border-l pl-6">
                  {(events ?? []).map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-primary" />
                      <p className="text-sm font-medium text-foreground">{t(`v.${ev.event_type}`)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.event_date ?? t("pp.dateNotRecorded")} · {t("pp.logged", { date: new Date(ev.created_at).toLocaleDateString() })}
                      </p>
                      {ev.notes && <p className="mt-1 text-sm text-muted-foreground">{ev.notes}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(scope?.role === "subcity_admin" || scope?.role === "woreda_admin") && (
          <TabsContent value="audit" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("pp.auditTrail")}</CardTitle>
                <CardDescription>{t("pp.auditHint")}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("pp.when")}</TableHead>
                      <TableHead>{t("pp.action")}</TableHead>
                      <TableHead>{t("pp.field")}</TableHead>
                      <TableHead>{t("pp.from")}</TableHead>
                      <TableHead>{t("pp.to")}</TableHead>
                      <TableHead>{t("pp.role")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(audit ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(a.changed_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{a.action_type}</TableCell>
                        <TableCell>{a.field_changed ?? "—"}</TableCell>
                        <TableCell className="max-w-40 truncate">{s(a.old_value) || "—"}</TableCell>
                        <TableCell className="max-w-40 truncate">{s(a.new_value) || "—"}</TableCell>
                        <TableCell className="text-xs">{a.changed_by_role ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(audit ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          {t("pp.noAuditEntries")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
