# Supporter Intake Design

## Purpose

Add the public entry point that turns an interested person into a safe, traceable CRM record and an organizer follow-up item.

The v1 operating path is:

`/get-involved -> validated server endpoint -> atomic intake service -> person/source/consent/activity/task history`

The public browser never receives privileged Supabase credentials and never reads CRM data.

## Public form

Route: `/get-involved`

The form is deliberately short and mobile-first.

Required fields:
- First name
- Last name
- ZIP code
- At least one of email or phone

Optional fields:
- Email when phone is supplied
- Phone when email is supplied
- Interests from the existing active `interests` taxonomy
- Email opt-in when email is present
- Call/text opt-in when phone is present

The call/text checkbox records both `sms` and `phone` consent events. Unchecked boxes do not create an opt-out event; withdrawal is a separate future flow and a missing opt-in must not overwrite a prior consent record.

A hidden `website` honeypot field is included. A populated honeypot receives the same generic success response as a real submission but no CRM write.

## Validation and normalization

Server validation uses Zod and accepts JSON only.

Limits:
- First/last name: trimmed, 1-80 characters
- Email: valid email, maximum 254 characters
- Phone: 7-15 digits after normalization
- ZIP: exactly 5 digits
- Interest slugs: maximum 9 unique values, each from the allow-listed v1 taxonomy

Normalization:
- Email: trim and lowercase
- Phone: retain digits only; accept an optional US leading `1` and store the canonical 10-digit form when possible
- ZIP: trim to a 5-digit string
- Names: trim and collapse repeated internal whitespace; preserve casing supplied by the person

## ZIP and county resolution

Use `zipcodes-us` version `1.1.3` locally on the server. It has no runtime dependencies and returns state, city, county, and validity information without sending the ZIP to a remote service.

For a valid New York ZIP:
- municipality is populated from the returned city/place name;
- county is resolved against the canonical `counties.name` table.

For a valid non-New-York ZIP or a ZIP whose county cannot be mapped:
- the person is still accepted;
- `county_id` is null;
- the initial follow-up task enters the statewide queue.

An invalid/nonexistent ZIP is rejected as a validation error.

## Public endpoint

Endpoint: `POST /api/intake/get-involved`

Responses:
- `200 { "ok": true }` for accepted submissions and honeypot submissions
- `400` with field-safe validation errors for invalid user input
- `500 { "ok": false }` for unexpected server/database failure

The response never reveals whether a person already existed, which prevents the endpoint from becoming a supporter-directory enumeration mechanism.

No raw form payload is written to application logs.

## Privileged database access

Add a server-only `SUPABASE_SERVICE_ROLE_KEY` environment variable and a dedicated admin Supabase client. The key must never use a `NEXT_PUBLIC_` prefix.

The route handler calls a focused intake service. The service resolves ZIP geography and then invokes one database RPC. The database RPC performs the CRM mutation atomically.

The RPC is revoked from `public`, `anon`, and `authenticated` and granted only to `service_role`.

## Atomic intake behavior

Database function: `public.process_get_involved_intake(...)`.

### Person matching

1. If normalized email matches an active person, reuse that person.
2. Otherwise, if normalized phone and case-insensitive last name match an active person, reuse that person.
3. Otherwise create a new person.
4. If a new person is created and the normalized phone matches another active person, create an open `duplicate_candidates` record with reason `normalized_phone_match_without_name_match` and confidence `0.9000` rather than silently merging them.

This avoids creating duplicate records for strong matches without collapsing shared/ambiguous phone numbers.

### Person enrichment

For a new person:
- set `engagement_stage = 'follow_up_needed'`;
- store contact/geography fields.

For an existing person:
- refresh ZIP/county/municipality from the current self-submission;
- fill missing raw/normalized email or phone values;
- do not downgrade `contacted` or `engaged` stages;
- move only `new` or `inactive` to `follow_up_needed`.

Every matched/created person receives the `Supporter` relationship if it is not already present.

### Interests

Every submitted active interest slug is upserted into `person_interests`. Existing interests remain in place; a later signup does not erase historical/known interests.

### Source

Every accepted submission creates a new `person_sources` row for `website-get-involved`, even when the person already exists. This preserves repeated signup/source history.

### Consent

Create consent events only for explicit opt-ins:
- email checked -> `email / opted_in`
- call/text checked -> `sms / opted_in` and `phone / opted_in`

Consent event metadata includes `form_version = "v1"`.

### Activity

Create one `activities` row:
- `activity_type = 'form_submitted'`
- metadata includes `source = 'website-get-involved'`, `form_version = 'v1'`, and whether this intake created a new person

The existing activity trigger updates `people.last_activity_at`.

### Follow-up task

Ensure the person has an open `initial_follow_up` task. Do not create another if one is already open.

New task values:
- `task_type = 'initial_follow_up'`
- `priority = 'normal'`
- `status = 'open'`
- `due_at = now() + interval '24 hours'`
- county known -> `queue_scope = 'county'`, `queue_county_id = person.county_id`
- county unknown/out of state -> `queue_scope = 'statewide'`, `queue_county_id = null`

No specific organizer is auto-assigned in v1; assignment happens from the queue.

## UI behavior

The page uses touch-friendly native inputs and checkboxes and keeps the primary contact fields above optional interests.

States:
- idle
- submitting with disabled submit button
- field validation errors inline
- generic server error with retry
- success confirmation that does not expose CRM internals

The success message confirms receipt and tells the supporter an organizer may follow up.

## Testing

### Unit
- email/phone/name normalization
- schema requirement that email or phone is present
- ZIP validity and NY/non-NY geography behavior
- interest allow-list validation

### Database / pgTAP
- new supporter creation
- exact normalized-email reuse
- normalized-phone + last-name reuse
- ambiguous phone creates duplicate candidate instead of merge
- supporter relationship
- interest preservation/upsert
- repeated source history
- consent events only for checked channels
- activity creation
- exactly one open initial follow-up task
- county versus statewide queue behavior
- RPC execute privilege unavailable to anon/authenticated

### Browser
Chromium and WebKit cover:
- mobile-friendly form renders
- validation error for missing contact method
- successful NY submission
- success screen
- CRM rows created in the local Supabase test environment through the public endpoint

## Out of scope for this increment

- Email/SMS sending
- CAPTCHA or external anti-bot providers
- public consent withdrawal/unsubscribe UI
- fuzzy name/address matching
- organizer dashboard/profile UI
- manual duplicate merge UI
- automatic organizer assignment
