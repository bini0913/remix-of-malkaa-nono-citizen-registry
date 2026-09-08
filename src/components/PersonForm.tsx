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
import { useT } from "@/lib/i18n";

type Guardian = { id: string; full_name: string; is_stub: boolean };

interface Props {
  onSaved?: (personId: string) => void;
}

export function PersonForm({ onSaved }: Props) {
  const t = useT();
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
    if (!data?.length) toast.info(t("pf.toast.noGuardianMatch"));
  };

  const createGuardianStub = async () => {
    if (!effectiveZone) {
      toast.error(t("pf.toast.selectZoneFirst"));
      return;
    }
    if (!guardianName.trim() || !primaryPhone.trim()) {
      toast.error(t("pf.toast.guardianStubRequired"));
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
    toast.success(t("pf.toast.guardianStubCreated"));
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
      toast.error(t("pf.toast.selectZoneResidence"));
      return;
    }
    if (!dob) {
      toast.error(t("pf.toast.dobRequired"));
      return;
    }
    if (!primaryPhone.trim() && !unreachable) {
      toast.error(
        minor ? t("pf.toast.guardianPhoneRequired") : t("pf.toast.primaryPhoneRequired"),
      );
      return;
    }
    if (minor && !guardianName.trim()) {
      toast.error(t("pf.toast.guardianNameRequired"));
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
        toast.warning(t("pf.toast.dupeFlagged"));
      }
      toast.success(t("pf.toast.registered", { name: fullName }));
      reset();
      onSaved?.(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pf.toast.registerFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{t("pf.coreDetails")}</span>
            {tier && <Badge variant="secondary">{t(`tier.${tier}`)}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("pf.fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">{t("pf.dob")}</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              {age !== null ? t("pf.computedAge", { age: String(age) }) : t("pf.ageHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("pf.sex")}</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger>
                <SelectValue placeholder={t("pf.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("pf.male")}</SelectItem>
                <SelectItem value="female">{t("pf.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("pf.nationalityStatus")}</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue placeholder={t("pf.select")} />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {t(`v.${o.label}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("pf.zoneOfResidence")}</Label>
            {scope?.role === "zone_account" ? (
              <Input value={zones[0]?.name ?? t("pf.yourZone")} readOnly />
            ) : (
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pf.selectZone")} />
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
            <Label>{t("pf.relationship")}</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder={t("pf.select")} />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`v.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">{t("pf.addressDetail")}</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{minor ? t("pf.guardianContact") : t("pf.contactNumbers")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p1">{minor ? t("pf.guardianPrimaryPhone") : t("pf.primaryPhone")}</Label>
            <Input id="p1" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p2">{minor ? t("pf.guardianSecondaryPhone") : t("pf.secondaryPhone")}</Label>
            <Input id="p2" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} inputMode="tel" />
          </div>
          {!minor && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
              <Checkbox checked={unreachable} onCheckedChange={(v) => setUnreachable(v === true)} />
              {t("pf.unreachable")}
            </label>
          )}
        </CardContent>
      </Card>

      {minor && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pf.guardianDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gname">{t("pf.guardianFullName")}</Label>
              <Input id="gname" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("pf.linkGuardian")}</Label>
              <div className="flex gap-2">
                <Input
                  value={guardianSearch}
                  placeholder={t("pf.searchByName")}
                  onChange={(e) => setGuardianSearch(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={searchGuardian}>
                  <Search className="size-4" />
                  {t("pf.search")}
                </Button>
              </div>
              {guardianResults.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {guardianResults.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        {g.full_name} {g.is_stub && <Badge variant="outline">{t("pf.incomplete")}</Badge>}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setGuardian(g)}>
                        {t("pf.link")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {guardian ? (
                <p className="text-sm text-primary">{t("pf.linkedGuardian", { name: guardian.full_name })}</p>
              ) : (
                <Button type="button" variant="outline" onClick={createGuardianStub}>
                  {t("pf.createGuardianStub")}
                </Button>
              )}
            </div>
            {tier === "child" && (
              <div className="space-y-2">
                <Label>{t("pf.educationGrade")}</Label>
                <Select value={education} onValueChange={setEducation}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pf.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {t(`v.${l}`)}
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
            <CardTitle>{t("pf.socioEconomic")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("pf.educationLevel")}</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pf.select")} />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`v.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("pf.employmentStatus")}</Label>
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pf.select")} />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`v.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("pf.maritalStatus")}</Label>
              <Select value={marital} onValueChange={setMarital}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pf.select")} />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`v.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("pf.religion")}</Label>
              <Select value={religion} onValueChange={setReligion}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pf.select")} />
                </SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`v.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(tier === "adult" || tier === "elder") && (
              <div className="space-y-2">
                <Label htmlFor="occ">{t("pf.occupation")}</Label>
                <Input id="occ" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </div>
            )}
            {tier === "elder" && (
              <div className="space-y-2">
                <Label htmlFor="pension">{t("pf.pensionOptional")}</Label>
                <Input id="pension" value={pension} onChange={(e) => setPension(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("pf.nationalId")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasNationalId} onCheckedChange={(v) => setHasNationalId(v === true)} />
            {t("pf.hasFaydaCheckbox")}
          </label>
          {hasNationalId ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fan">{t("pf.fan")}</Label>
                <Input id="fan" value={fan} onChange={(e) => setFan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fin">{t("pf.fin")}</Label>
                <Input id="fin" value={fin} onChange={(e) => setFin(e.target.value)} />
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>{t("pf.noNationalIdTitle")}</AlertTitle>
              <AlertDescription>{t("pf.noNationalIdBody")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={reset}>
          {t("pf.clearForm")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? t("pf.saving") : t("pf.registerResident")}
        </Button>
      </div>
    </form>
  );
}
