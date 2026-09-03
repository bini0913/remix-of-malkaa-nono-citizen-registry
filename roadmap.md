# Upgrade Roadmap — Malkaa Nono Registry (approved scope)

EXCLUDED by user: #10 nationality country, #14 reports/exports, #7 RLS architecture rewrite (keep as-is, minimal changes only). NO age-tier changes (youth stays 18–34).

## Phase 1 — Single coherent DB migration (NEXT STEP, not yet submitted)
- [ ] `can_edit(_zone_id)` helper: true only for subcity_admin (all) / woreda_admin (own woreda). Swap `persons` UPDATE policy from `can_access_zone` → `can_edit` (zone accounts become registration-only). Keep SELECT/INSERT policies unchanged.
- [ ] `life_events` INSERT policy → admin-only via `can_edit` (drop zone-account insert).
- [ ] person_status enum swap: remove 'duplicate' (map existing 'duplicate' rows → 'active'; duplicate state lives in duplicate_flags + persons.duplicate_of). Drop default → alter type USING → restore default.
- [ ] persons new columns: `registration_no text UNIQUE` (trigger-generated `MN-YYYY-000001` from sequence, backfill existing by created_at order, immutable via BEFORE UPDATE trigger), `household_id uuid FK`, `verification_status` enum (registered/verified/needs_correction, default registered), `verified_by uuid`, `verified_at timestamptz`, `source text default 'registration'`.
- [ ] BEFORE UPDATE trigger: when verification_status changes, auto-set verified_by=auth.uid(), verified_at=now().
- [ ] Guardian trigger: INSERT (and UPDATE clearing guardian) of person with DOB age<18 requires guardian_id NOT NULL.
- [ ] `households` table: id, zone_id FK, household_code, address_detail, head_person_id FK persons, created_by, timestamps. GRANTs + RLS (read can_access_zone, insert can_register OR can_edit, update can_edit).
- [ ] `registration_requests` table (idempotency): id uuid PK (client-generated), person_id, created_by, created_at. RLS locked, definer-only.
- [ ] duplicate_flags: add `confidence text default 'possible' check (high/possible)`, `match_reasons text[]`.
- [ ] pg_trgm extension; `check_duplicates(...)` definer fn: FAN/FIN exact match anywhere = high; name-trgm+DOB same zone = high; phone+similar name, normalized-name+DOB = possible. Returns candidates + reasons.
- [ ] `register_resident(payload jsonb)` SECURITY DEFINER RPC: idempotent via request_id; requires can_register(zone); creates household (or validates existing in-zone) → guardian (new full record or existing id) → person → sets household head → runs check_duplicates → inserts flags → records request. Single transaction.
- [ ] `import_residents(rows jsonb)` definer RPC: admin-only, per-row zone scope check (woreda via zones.woreda_id), per-row exception handling, insert-only (never overwrite), returns per-row results, source='import'.
- [ ] Audit triggers on life_events INSERT and duplicate_flags UPDATE (resolution) → audit_log. Confirm audit_log has no UPDATE/DELETE grants/policies (immutable).
- [ ] Indexes: trgm on lower(full_name), btree fan_number, fin_number, primary_phone, registration_no, household_id, zone_id, created_by, verification_status, date_of_birth.

## Phase 2 — Backend server functions (after migration + types regen)
- [ ] accounts.functions.ts: rollback orphan auth user if role insert fails; server-side check zone belongs to woreda; listStaffAccounts (email/name/status/banned/last sign-in via admin API after role check); disableAccount / enableAccount (ban); resetAccountPassword. Preserve hierarchy rules.

## Phase 3 — Frontend
- [ ] PersonForm → multi-step: household find/create + head designation; guardian step for minors (search in zone → link, else inline "register parent first" full sub-form; typed-name-only NOT allowed); child phone fields = child's own (optional), guardian contact shown from guardian record; pre-submit duplicate check warning; submit via rpc register_resident with request_id.
- [ ] Offline queue: localStorage draft queue keyed by request_id, sync status UI on /register, retry on 'online' event, idempotent resubmit.
- [ ] person.$id: zone accounts view-only (no edit/save/status/life-events UI); guardian card shows linked guardian's phones; household card; verification controls (admins): verify / needs correction, show verified_by/at; remove 'duplicate' from status options; registration_no in header.
- [ ] residents: server-side search (registration_no, name ilike/trgm, FAN, FIN, phone, DOB) + pagination via .range(); verification badge; reg no column; exclude duplicate_of records from default view.
- [ ] duplicates: show confidence + match_reasons; confirm sets duplicate_of only (no status change).
- [ ] accounts page: staff list with email/name/status, disable/enable, reset password dialogs.
- [ ] NEW /import route (admins): CSV parse (papaparse to add), column mapping, validation preview, commit via import_residents, per-row results. No delete/overwrite.
- [ ] NEW /performance route: registrar metrics (submitted, verified, pending, dup flags, per zone/period), scope-aware (zone account sees own only).
- [ ] registry.ts: STATUS_LABEL drop duplicate; VERIFICATION_LABEL; nav updates in route.tsx.

## Phase 4 — Verification tests
- [ ] SQL role simulation (set request.jwt.claims): zone acct can INSERT own zone, cannot UPDATE persons, cannot INSERT life_events, cannot UPDATE duplicate_flags; woreda admin scoped; subcity global; cross-zone insert fails.
- [ ] Child registration without linked guardian fails; registration numbers unique; idempotent retry returns same person.
- [ ] Playwright pass over register/person/residents/accounts/import/performance.

## Notes
- Registration numbers: single global sequence, format MN-<year>-<6 digits>; backfill setval = count+1.
- Guardian stubs deprecated for new registrations (parent gets full record); keep is_stub column + admin stub-upgrade for legacy rows.
- Legacy minors without guardian: trigger enforces on INSERT only (+ guardian clearing), so existing rows stay valid/editable by admins.

## Phase 5 — Completed this pass
- [x] Nav: Establishments (admins), Official reports (subcity), role-aware labels, `print:hidden` chrome.
- [x] Accounts page on listStaffAccounts/setAccountActive: name, email, role, woreda, zone, status, created, last sign-in; enable/disable with confirmation + toasts.
- [x] Subcity command centre on registry_overview() (server aggregation) with resident + establishment KPIs, charts, woreda comparison.
- [x] /reports Official Report Center: 9 report types, filters, preview, A4 print CSS with official header/footer/signature block.
- [ ] Authenticated end-to-end role testing — blocked: database has no woredas/zones/accounts and no preview session.
