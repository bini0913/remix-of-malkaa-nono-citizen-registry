import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllowedZones, useScope } from "@/hooks/use-scope";
import {
  ageTier,
  calcAge,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUSES,
  isMinor,
  MARITAL_STATUSES,
  NATIONALITY_OPTIONS,
  RELATIONSHIPS,
  RELIGIONS,
  TIER_LABEL,
} from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

type Guardian = { id: string; full_name: string; is_stub: boolean };

interface Props {
  onSaved?: (personId: string) => void;
}

export function PersonForm({ onSaved }: Props) {
  const { data: scope } = useScope();
  const zones = useAllowedZones();

  const [zoneId, setZoneId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState<string>("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState<string>("citizen");
  const [address, setAddress] = useState("");
  const [relationship, setRelationship] = useState<string>("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [unreachable, setUnreachable] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianResults, setGuardianResults] = useState<Guardian[]>([]);
  const [hasNationalId, setHasNationalId] = useState(false);
  const [fan, setFan] = useState("");
  const [fin, setFin] = useState("");
  const [education, setEducation] = useState("");
  const [employment, setEmployment] = useState("");
  const [marital, setMarital] = useState("");
  const [religion, setReligion] = useState("");
  const [occupation, setOccupation] = useState("");
  const [pension, setPension] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveZone = scope?.role === "zone_account" ? (scope.zoneId ?? "") : zoneId;
  const age = useMemo(() => calcAge(dob), [dob]);
  const tier = ageTier(age);
  const minor = isMinor(tier);

  const searchGuardian = async () => {
    if (guardianSearch.trim().length < 2) return;
    const { data } = await supabase
      .from("persons")
      .select("id, full_name, is_stub")
      .ilike("full_name", `%${guardianSearch.trim()}%`)
      .limit(10);
    setGuardianResults(data ?? []);
    if (!data?.length) toast.info("No matching registered person found. You can create a guardian record inline.");
  };

  const createGuardianStub = async () => {
    if (!effectiveZone) {
      toast.error("Select a zone first");
      return;
    }
    if (!guardianName.trim() || !primaryPhone.trim()) {
      toast.error("Guardian name and guardian primary phone are required for a guardian record");
      return;
    }
    const { data, error } = await supabase
      .from("persons")
      .insert({
        zone_id: effectiveZone,
        full_name: guardianName.trim(),
        primary_phone: primaryPhone.trim(),
        is_stub: true,
        created_by: scope?.userId ?? null,
      } as never)
      .select("id, full_name, is_stub")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setGuardian(data);
    toast.success("Guardian record created (incomplete — complete it later)");
  };

  const reset = () => {
    setFullName("");
    setSex("");
    setDob("");
    setAddress("");
    setRelationship("");
    setPrimaryPhone("");
    setSecondaryPhone("");
    setUnreachable(false);
    setGuardianName("");
    setGuardian(null);
    setGuardianResults([]);
    setGuardianSearch("");
    setHasNationalId(false);
    setFan("");
    setFin("");
    setEducation("");
    setEmployment("");
    setMarital("");
    setReligion("");
    setOccupation("");
    setPension("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveZone) {
      toast.error("Select the zone of residence");
      return;
    }
    if (!dob) {
      toast.error("Date of birth is required to determine the age tier");
      return;
    }
    if (!primaryPhone.trim() && !unreachable) {
      toast.error(
        minor ? "Guardian primary phone is required" : "Primary phone is required, or mark the person as unreachable",
      );
      return;
    }
    if (minor && !guardianName.trim()) {
      toast.error("Guardian full name is required for babies and children");
      return;
    }

    setBusy(true);
    try {
      // Duplicate detection: same name + same DOB + same zone
      const { data: dupes } = await supabase
        .from("persons")
        .select("id, full_name")
        .eq("zone_id", effectiveZone)
        .eq("date_of_birth", dob)
        .ilike("full_name", fullName.trim())
        .eq("is_stub", false);

      const { data: created, error } = await supabase
        .from("persons")
        .insert({
          zone_id: effectiveZone,
          full_name: fullName.trim(),
          sex: sex ? (sex as "male" | "female") : null,
          date_of_birth: dob,
          nationality_status: nationality as "citizen" | "foreign_resident" | "other",
          address_detail: address || null,
          relationship_to_head: relationship || null,
          primary_phone: primaryPhone.trim() || null,
          secondary_phone: secondaryPhone.trim() || null,
          phone_unreachable: unreachable,
          guardian_full_name: minor ? guardianName.trim() : null,
          guardian_id: minor ? (guardian?.id ?? null) : null,
          is_stub: false,
          has_national_id: hasNationalId,
          fan_number: hasNationalId ? fan.trim() || null : null,
          fin_number: hasNationalId ? fin.trim() || null : null,
          education_level: education || null,
          employment_status: employment || null,
          marital_status: marital || null,
          religion: religion || null,
          occupation: occupation || null,
          pension_status: pension || null,
          created_by: scope?.userId ?? null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      if (dupes && dupes.length > 0) {
        await supabase.from("duplicate_flags").insert(
          dupes.map((d) => ({
            new_person_id: created.id,
            existing_person_id: d.id,
          })),
        );
        toast.warning("Possible duplicate flagged for administrator review.");
      }
      toast.success(`${fullName} registered successfully`);
      reset();
      onSaved?.(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Core details</span>
            {tier && <Badge variant="secondary">{TIER_LABEL[tier]}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth *</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              {age !== null ? `Computed age: ${age} years` : "Age is computed automatically from the date of birth."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Sex</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nationality status</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zone of residence *</Label>
            {scope?.role === "zone_account" ? (
              <Input value={zones[0]?.name ?? "Your zone"} readOnly />
            ) : (
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Relationship to household head</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address detail (house no., landmark)</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{minor ? "Guardian contact" : "Contact numbers"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p1">{minor ? "Guardian primary phone *" : "Primary phone *"}</Label>
            <Input id="p1" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p2">{minor ? "Guardian secondary phone" : "Secondary phone"}</Label>
            <Input id="p2" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} inputMode="tel" />
          </div>
          {!minor && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
              <Checkbox checked={unreachable} onCheckedChange={(v) => setUnreachable(v === true)} />
              No reachable phone number available (mark as unreachable)
            </label>
          )}
        </CardContent>
      </Card>

      {minor && (
        <Card>
          <CardHeader>
            <CardTitle>Guardian details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gname">Guardian full name *</Label>
              <Input id="gname" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link an already registered guardian</Label>
              <div className="flex gap-2">
                <Input
                  value={guardianSearch}
                  placeholder="Search by name…"
                  onChange={(e) => setGuardianSearch(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={searchGuardian}>
                  <Search className="size-4" />
                  Search
                </Button>
              </div>
              {guardianResults.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {guardianResults.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        {g.full_name} {g.is_stub && <Badge variant="outline">incomplete</Badge>}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setGuardian(g)}>
                        Link
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {guardian ? (
                <p className="text-sm text-primary">Linked guardian: {guardian.full_name}</p>
              ) : (
                <Button type="button" variant="outline" onClick={createGuardianStub}>
                  Guardian not registered — create guardian record inline
                </Button>
              )}
            </div>
            {tier === "child" && (
              <div className="space-y-2">
                <Label>Education level / grade</Label>
                <Select value={education} onValueChange={setEducation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tier && !minor && (
        <Card>
          <CardHeader>
            <CardTitle>Socio-economic details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Education level</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment status</Label>
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marital status</Label>
              <Select value={marital} onValueChange={setMarital}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Religion</Label>
              <Select value={religion} onValueChange={setReligion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(tier === "adult" || tier === "elder") && (
              <div className="space-y-2">
                <Label htmlFor="occ">Occupation</Label>
                <Input id="occ" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </div>
            )}
            {tier === "elder" && (
              <div className="space-y-2">
                <Label htmlFor="pension">Pension / support status (optional)</Label>
                <Input id="pension" value={pension} onChange={(e) => setPension(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>National ID (Fayda)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasNationalId} onCheckedChange={(v) => setHasNationalId(v === true)} />
            This person has a National ID (Fayda)
          </label>
          {hasNationalId ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fan">FAN number</Label>
                <Input id="fan" value={fan} onChange={(e) => setFan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fin">FIN number</Label>
                <Input id="fin" value={fin} onChange={(e) => setFin(e.target.value)} />
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>No National ID recorded</AlertTitle>
              <AlertDescription>This record will appear in the National ID coverage report as lacking Fayda.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={reset}>
          Clear form
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Register resident"}
        </Button>
      </div>
    </form>
  );
}
