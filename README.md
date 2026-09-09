# Remix of Malkaa Nono Citizen Registry

Build "Malkaa Nono Subcity Resident Registration System" — a civic administrative web app for registering every resident of Malkaa Nono Subcity (Sheger City, Oromia, Ethiopia), with strict role-based hierarchy, reporting, and an audit trail. Use Lovable Cloud (Supabase) for auth + database + RLS.

## 1. Administrative hierarchy (seed this data)
Subcity: Malkaa Nono
Woredas: Nono (14 zones), Bero (14 zones), Malka Gafarsa (16 zones)

Nono zones: Ada'aa Jamoo, Gaddisaa Walini, Gattiraa Qawwee, Jamoo 2ffaa, Ejersaa Qacaraa, Ejersaa, Lalistuu, Burqaa Kulle, G/Barrisaa, Hanquu, Kusayee, Tulluu Jamoo, Jamoo 3ffaa, Burqaa Dadhii

Bero zones: Baatii Roobii, Tokkummaa Keenya, Gullallee, T/Guddinaa, Sulula Araaraa, Malkaa Leencaa, Qaree Waamii, H/Ciisaa, Mana Waliinii, H/Lalistuu, Qaree Odaa, Q/A/Booraa, H.Guddinaa, B.Balasee

Malka Gafarsa zones: Malkaa Odaa, Malkaa Horaa, Odaa Gulallee, Malkaa Gulallee, Hulaa Horaa, Abdii Boruu, Beeroo 1ffaa, Beeroo 2ffaa, Dirree Taliila, Qarsaa, Dirree Lagaa Buqqee, Anfoo Guddinaa, Aradaa Bokkuu, Malkaa Qoraanii, Jilaa Gulallee, Malkaa Masqalaa

Zones are keyed by (woreda_id, zone_name) — name reuse across woredas is fine.

## 2. Roles & permissions (enforce via Supabase RLS, not just UI)
- Subcity Admin: created at setup. Creates Woreda Admin accounts. Sees/edits every person and every audit log entry across all woredas. Cannot delete anything.
- Woreda Admin: created by a Subcity Admin, scoped to one woreda. Creates zone (registration) accounts for zones under their woreda. Sees/edits all persons within their own woreda only, and audit log entries scoped to their own woreda only.
- Zone account: created by a Woreda Admin, scoped to one zone. Registration-only. Sees/edits only persons registered under their own zone. No audit log access.
- Deletion is disabled system-wide for every role, everywhere. Corrections happen only via edits.
- All roles authenticate via email + password (Supabase Auth).

## 3. Person registration — age-tier adaptive form
Registrar picks who they're registering; the form adapts based on date of birth (age is computed from DOB, never manually entered/tiered).

Tiers: Baby (0–4), Child (5–17), Youth (18–34), Adult (35–60), Elder (60+).

Core fields on every person: full name, sex, date of birth, nationality status (dropdown: citizen / foreign resident / other), address (linked to zone/woreda), relationship to household head, national ID status, vital status (see below).

Phone number fields (every person has room for 2):
- Youth/Adult/Elder: primary phone (required, but allow save with an "unreachable" flag if truly unavailable) + secondary phone (optional) — the person's own numbers.
- Baby/Child (under 18): primary phone (required) + secondary phone (optional) hold the GUARDIAN's numbers, not the child's.

Baby/Child extra required fields: guardian full name (free text, always captured directly on the child's record), guardian primary phone (required), guardian secondary phone (optional), plus a guardian_id link (see below).
Child (5–17) also gets: education level (enrollment/grade).
Youth/Adult/Elder extra fields: education level, employment status, marital status, religion. Adult/Elder also get: occupation. Elder also gets an optional pension/support-status field.

Guardian linkage: when registering a Baby/Child, the registrar can search and link an existing registered guardian (guardian_id FK to persons), OR create a lightweight "guardian stub" inline right there (name + phone, flagged is_stub = true) if the guardian isn't registered yet. Stubs are real minimal person rows (queryable FK), shown as incomplete in the data-completeness report, and get upgraded in place (same person_id) when the guardian is later fully registered — never duplicated.

National ID (Fayda): "Does this person have a National ID?" Yes/No. If Yes, show FAN Number and FIN Number as separate TEXT fields (not numeric, to preserve leading zeros — no validation/generation logic, just capture what's entered). If No, set has_national_id = false, which feeds the ID-coverage report.

## 4. Vital status & life events
Add status to every person: active | deceased | relocated | duplicate. Never delete rows. All reports/counts default to status = active with a toggle to include others. Status changes get logged to audit_log like any other field edit.

Add a lightweight life_events table: id, person_id, event_type (birth/marriage/death/relocation/divorce), event_date, recorded_by, notes. Not a full workflow engine — just a simple chronological log a registrar can add entries to from a person's profile, alongside (not instead of) updating fields like marital_status or status.

## 5. Duplicate detection & data quality
On creating a new person, check for likely duplicates (same full name + same DOB + same zone). If found, don't silently allow it — surface a warning/flag for the Woreda/Subcity Admin to review (confirm duplicate → mark newer record status = duplicate, cross-referenced to the kept record; or dismiss as coincidence).
Add a data-completeness dashboard/report: counts of records missing key fields (DOB, address, required phone) broken down by zone.

## 6. Audit log
audit_log table: id, person_id, changed_by_user_id, changed_by_role (subcity/woreda/zone, denormalized), field_changed, old_value, new_value, changed_at, action_type (create/update only, never delete). Visibility follows the same role scoping as person data (see Section 2).

## 7. Reporting (Subcity Admin: full scope; Woreda Admin: own-woreda scope)
Filter/sort residents by any field (age, sex, education, employment, marital status, religion, nationality status). Pie/bar charts and breakdowns. National ID coverage report (has vs. lacks Fayda, filterable by zone/woreda). Household/individual counts by zone and woreda. All of the above default to active-status residents only, with a toggle for the full historical set. Include the data-completeness widget from Section 5.

## 8. Visual design
Civic/government feel — calm and trustworthy, not flashy. Primary: deep green #0B6E4F. Accent: ochre/gold #D4A017. Alert (sparing use, real flags only — missing ID, likely duplicate, incomplete record): deep red. Neutral base: off-white/light-gray backgrounds, dark slate text. Avoid combining red/yellow/green together as the main palette (reads as a political flag, not an official records tool).

## 9. Build order
1. Set up Supabase auth + the three roles with RLS policies enforcing the scoping in Section 2.
2. Seed subcities/woredas/zones tables with the hierarchy data above.
3. Build persons table + the age-tier adaptive registration form (Section 3) with phone fields, guardian stub logic, and national ID handling.
4. Add life_events table and a simple add-event UI on the person profile.
5. Add duplicate-detection check on person creation.
6. Build audit_log and wire it to fire on every create/update, including status changes.
7. Build the reporting dashboard (Section 7) with the active/all toggle and data-completeness widget.
8. Apply the visual design direction across the whole app.

Start with steps 1–3 (auth/roles/RLS, hierarchy seed data, and the core adaptive registration form) — that's the critical path everything else depends on.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d6e9b57d-23d3-47ab-aaf0-79bc41c73933).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
