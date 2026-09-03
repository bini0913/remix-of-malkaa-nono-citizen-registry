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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading record…</p>;
  if (!person)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record unavailable</CardTitle>
          <CardDescription>This record does not exist or is outside your assigned scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/residents">Back to residents</Link>
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
        toast.error("Full name is required");
        return;
      }
      const { error } = await supabase.from("persons").update(payload).eq("id", id);
      if (error) throw error;
      toast.success("Record updated");
      qc.invalidateQueries({ queryKey: ["person", id] });
      qc.invalidateQueries({ queryKey: ["person-audit", id] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const completeStub = async () => {
    setForm((f) => ({ ...f, is_stub: false }));
    toast.info("Fill in the remaining fields, then press Save changes to complete this record.");
  };

  const applyStatus = async () => {
    if (!statusValue) return;
    if (statusValue === person.status) {
      toast.info("That is already the current vital status.");
      return;
    }
    if (statusReason.trim().length < 3) {
      toast.error("A short reason is required when changing vital status");
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
      toast.success(`Vital status set to ${STATUS_LABEL[statusValue] ?? statusValue}`);
      setStatusReason("");
      setStatusDate("");
      qc.invalidateQueries({ queryKey: ["person", id] });
      qc.invalidateQueries({ queryKey: ["life-events", id] });
      qc.invalidateQueries({ queryKey: ["person-audit", id] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setBusy(false);
    }
  };

  const addEvent = async () => {
    if (!eventType) {
      toast.error("Select an event type");
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
      toast.success("Life event recorded");
      setEventType("");
      setEventDate("");
      setEventNotes("");
      qc.invalidateQueries({ queryKey: ["life-events", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the event");
    } finally {
      setBusy(false);
    }
  };

  const selectField = (label: string, key: string, options: string[]) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={val(key) || NONE} onValueChange={(v) => set(key, v === NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not recorded</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
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
              Residents
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{person.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {zoneName} · {tier ? TIER_LABEL[tier] : "Age unknown"} ·{" "}
            {STATUS_LABEL[person.status] ?? person.status}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {person.is_stub && <Badge variant="outline">Incomplete record</Badge>}
          {person.has_national_id ? (
            <Badge variant="secondary">Has Fayda</Badge>
          ) : (
            <Badge variant="destructive">No Fayda</Badge>
          )}
        </div>
      </header>

      {person.is_stub && (
        <Card>
          <CardHeader>
            <CardTitle>Complete this guardian record</CardTitle>
            <CardDescription>
              This record was created as a placeholder during a child&apos;s registration. Completing it keeps the same
              record — no duplicate person is created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={completeStub} disabled={form["is_stub"] === false}>
              {form["is_stub"] === false ? "Marked for completion — save below" : "Upgrade to full profile"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="status">Vital status</TabsTrigger>
          <TabsTrigger value="events">Life events</TabsTrigger>
          {(scope?.role === "subcity_admin" || scope?.role === "woreda_admin") && (
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Core details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name *</Label>
                <Input value={val("full_name")} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={val("date_of_birth")} onChange={(e) => set("date_of_birth", e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {age !== null ? `Computed age: ${age} years` : "Age is computed from the date of birth."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select value={val("sex") || NONE} onValueChange={(v) => set("sex", v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not recorded</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality status</Label>
                <Select
                  value={val("nationality_status") || NONE}
                  onValueChange={(v) => set("nationality_status", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not recorded</SelectItem>
                    {NATIONALITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectField("Relationship to household head", "relationship_to_head", RELATIONSHIPS)}
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input value={zoneName} readOnly />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address detail</Label>
                <Textarea rows={2} value={val("address_detail")} onChange={(e) => set("address_detail", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & guardian</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary phone</Label>
                <Input value={val("primary_phone")} onChange={(e) => set("primary_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Secondary phone</Label>
                <Input value={val("secondary_phone")} onChange={(e) => set("secondary_phone", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                <Checkbox
                  checked={Boolean(form["phone_unreachable"])}
                  onCheckedChange={(v) => set("phone_unreachable", v === true)}
                />
                No reachable phone number available
              </label>
              <div className="space-y-2 md:col-span-2">
                <Label>Guardian full name</Label>
                <Input value={val("guardian_full_name")} onChange={(e) => set("guardian_full_name", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>National ID (Fayda)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                <Checkbox
                  checked={Boolean(form["has_national_id"])}
                  onCheckedChange={(v) => set("has_national_id", v === true)}
                />
                This resident holds a National ID (Fayda)
              </label>
              <div className="space-y-2">
                <Label>FAN number</Label>
                <Input value={val("fan_number")} onChange={(e) => set("fan_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>FIN number</Label>
                <Input value={val("fin_number")} onChange={(e) => set("fin_number", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Socio-economic details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {selectField("Education level", "education_level", EDUCATION_LEVELS)}
              {selectField("Employment status", "employment_status", EMPLOYMENT_STATUSES)}
              {selectField("Marital status", "marital_status", MARITAL_STATUSES)}
              {selectField("Religion", "religion", RELIGIONS)}
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input value={val("occupation")} onChange={(e) => set("occupation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pension status</Label>
                <Input value={val("pension_status")} onChange={(e) => set("pension_status", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={val("notes")} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}>
              <Save className="size-4" />
              Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="status" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vital status</CardTitle>
              <CardDescription>
                Records are never deleted. Changing the vital status is recorded in the audit trail, and death or
                relocation also creates a life event.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusValue} onValueChange={setStatusValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {STATUS_LABEL[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of event (optional)</Label>
                <Input type="date" value={statusDate} onChange={(e) => setStatusDate(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Reason / note *</Label>
                <Textarea rows={3} value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={applyStatus} disabled={busy}>
                  Apply status change
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add life event</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Event type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Event date</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={addEvent} disabled={busy}>
                  <CalendarPlus className="size-4" />
                  Record event
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {(events ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No life events recorded for this resident yet.</p>
              ) : (
                <ol className="relative space-y-5 border-l pl-6">
                  {(events ?? []).map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-primary" />
                      <p className="text-sm font-medium capitalize text-foreground">{ev.event_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.event_date ?? "Date not recorded"} · logged {new Date(ev.created_at).toLocaleDateString()}
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
                <CardTitle>Audit trail</CardTitle>
                <CardDescription>Every change made to this record, newest first.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Role</TableHead>
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
                          No audit entries yet.
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
