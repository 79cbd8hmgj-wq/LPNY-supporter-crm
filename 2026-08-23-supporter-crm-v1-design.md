# LPNY Supporter CRM — v1 Design Specification

**Date:** 2026-08-23  
**Repository:** `lpny-supporter-crm`  
**Status:** Approved design  
**Primary stack:** Next.js + Supabase/PostgreSQL + Row-Level Security  

## 1. Purpose

Build a standalone, responsive web CRM for the Libertarian Party of New York to capture, organize, assign, and retain relationships with any interested person—not only verified party members.

The CRM is operational infrastructure for supporter and activist engagement. It is intentionally separate from the Atlas/election-intelligence codebase. Future integrations may connect the systems through deliberate APIs or data contracts, but the databases remain independent.

### Core operating loop

`Public acquisition → canonical person record → geographic routing → organizer queue → supporter profile → tasks/follow-up → activity history → reporting/admin`

## 2. v1 Scope

v1 includes:

- Public “Get Involved” intake form
- Canonical people database
- Duplicate detection and merge workflow
- Relationship/status tracking
- Interests and tags
- Intake source tracking
- County-based routing with statewide fallback
- Role-based access control
- Invite-only staff accounts with MFA
- Organizer dashboard and work queues
- Contact-linked tasks
- Activity timeline and internal notes
- Channel-specific communication consent tracking
- Search and combined filters
- Quick Add for organizers
- Saved private views
- CSV imports with preview and duplicate checks
- Admin-only filtered CSV exports
- Basic reporting and source-performance metrics
- Audit logging for sensitive administrative actions
- Staging and production deployment model

Explicitly out of scope for v1:

- Mass email sending
- Mass SMS
- Donation/payment processing
- Event registration system
- Automatic BOE membership verification
- Atlas integration
- Predictive supporter scoring
- AI-generated organizer recommendations
- Native mobile apps
- Complex custom report builder

## 3. Product Principles

1. **Anyone interested can enter the CRM.** CRM inclusion is not equivalent to LPNY membership.
2. **The public intake is low-friction.** Initial signup should take well under one minute.
3. **One person, many interactions.** Repeat submissions and event encounters attach to one canonical person where confidence is high.
4. **Security is enforced at the data layer.** UI hiding is not sufficient access control.
5. **The CRM is workflow-oriented.** Organizers should see who needs action, not just rows in a database.
6. **History is preserved.** Activities, merges, staff actions, and consent changes should remain traceable.
7. **Collect only useful organizing data.** Avoid unnecessary personal information.
8. **Design for future automation without implementing it prematurely.**

## 4. Public Intake Experience

### 4.1 Default `/get-involved` form

Required:

- First name
- Last name
- Email
- ZIP code
- Email communication consent

Optional:

- Phone
- SMS/text consent when a phone number is provided
- Phone-call permission when a phone number is provided
- “What are you interested in?” multi-select

Consent controls remain visually simple. Consent state is recorded separately by channel in the data model. Exact production consent copy must be reviewed before launch.

Initial interest options:

- Volunteering
- Local activism
- Helping campaigns/candidates
- Running for office
- Events
- Learning more
- Something else

The public form must not require account creation or a password.

### 4.2 Public submission behavior

After submission, show a generic success message. Do not reveal whether the person already exists in the CRM.

The form may be used through:

- LPNY website embed or link
- Standalone shareable URL
- QR code
- Organizer phone/tablet

Source-aware URLs may carry a server-validated source identifier such as:

- `website`
- `albany-summer-event`
- `petition-drive-03`

The user does not need to choose the source manually.

## 5. Intake Pipeline

Every public submission passes through a server-side intake service:

1. Validate input.
2. Normalize email, phone, ZIP, and names for comparison/storage.
3. Resolve intake source.
4. Resolve geography from ZIP when reliable.
5. Search for an existing canonical person.
6. Create a new person, attach to an exact match, or flag a possible duplicate.
7. Record consent.
8. Attach interests.
9. Attach source.
10. Record a form-submission activity.
11. Assign county/team or statewide fallback.
12. Create an initial follow-up task.
13. Surface the contact in the appropriate organizer queue.

Critical writes should be transactionally consistent where practical so a supporter is not partially processed without entering the workflow.

Non-critical enrichment failures, such as unresolved ZIP geography, must not reject the submission. Route these records to statewide review.

## 6. Geography and Assignment

### 6.1 Geography

ZIP code is the only required public geography field.

- If a ZIP maps confidently to a single New York county, assign that county.
- If ambiguous, outside New York, or unresolved, retain the ZIP, leave county unresolved, and route to the statewide queue.
- Municipality may be added later by organizers or future enrichment.

### 6.2 Automatic assignment

Default flow:

`New signup → determine county → assign county team → follow-up queue`

If no active county organizer/team exists:

`New signup → State Organizer queue`

Assignments must be adjustable by authorized staff.

## 7. Core Data Model

### 7.1 `people`

Canonical supporter record.

Representative fields:

- `id`
- `first_name`
- `last_name`
- `email`
- `normalized_email`
- `phone`
- `normalized_phone`
- `zip_code`
- `county_id`
- `municipality`
- `engagement_stage`
- `assigned_team_id` and/or current assignment references
- `do_not_contact`
- `archived_at`
- `created_at`
- `updated_at`
- `last_activity_at`

The `people` table should remain relatively stable. Historical events belong in related tables.

### 7.2 Relationships

A person may hold multiple simultaneous relationship labels.

Initial relationship types:

- Supporter
- Volunteer
- Activist
- Donor Prospect
- Donor
- Member
- Candidate Interest
- Former Member

These are not mutually exclusive.

Suggested normalized structure:

- `relationship_types`
- `person_relationships`

### 7.3 Interests

Structured interest categories, many-to-many with people.

Initial set:

- Volunteering
- Local activism
- Campaign work
- Running for office
- Events
- Outreach
- Communications
- Data/research
- Other

Suggested structure:

- `interests`
- `person_interests`

### 7.4 Tags

Flexible operational metadata for information that does not justify a schema change. In v1, Admin/State Organizer users manage the available tag vocabulary, while authorized organizers can apply or remove existing tags from people. This prevents uncontrolled taxonomy sprawl without sacrificing flexibility.

Examples:

- `Good speaker`
- `Interested in petitions`
- `2026 convention`
- `Student outreach`
- `Potential candidate`

Suggested structure:

- `tags`
- `person_tags`

### 7.5 Sources

Track where/how a person entered or interacted with the organization.

Examples:

- Website → Get Involved Form
- Event QR → 2026 State Convention
- Organizer Entry → Albany County
- Campaign
- Referral
- Import
- Other

One person may have many source associations over time.

Suggested structure:

- `sources`
- `person_sources`

Each association should preserve its timestamp and relevant source metadata.

### 7.6 Activities

Chronological institutional history.

Examples:

- Form submitted
- Phone call
- Email
- Event attendance
- Volunteer activity
- Note added
- Relationship changed
- Engagement stage changed
- Organizer reassignment

Representative fields:

- `id`
- `person_id`
- `activity_type`
- `actor_staff_user_id`
- `occurred_at`
- structured metadata/payload where appropriate

Activities should be append-oriented rather than used as mutable current state.

### 7.7 Internal notes

Organizer-only notes tied to the person, author, and timestamp.

Notes should not be exposed through the public form or supporter-facing surfaces.

### 7.8 Tasks

Operational follow-up records tied to a person.

Fields include:

- `person_id`
- `assignee_staff_user_id` or team/queue
- `task_type`
- `due_at`
- `priority`
- `status`
- `completed_at`
- `created_by`

Typical tasks:

- Initial supporter follow-up
- Call about volunteering
- Follow up after an event
- Ask about candidate interest
- Confirm availability
- Reconnect with inactive supporter

### 7.9 Consent

Consent is stored by communication channel rather than as one global flag.

Channels:

- Email
- SMS/text
- Phone calls

Each change should preserve:

- Current state
- Effective timestamp
- Source/form where permission was recorded
- Withdrawal/opt-out history

The implementation may use a current-state table plus append-only consent history, or a history-first model with a derived current state, provided the auditability requirement remains intact.

### 7.10 Staff users

Internal users linked to Supabase Auth identities.

Track:

- Role
- Assigned counties
- Account status
- Auth identity
- Creation/invite metadata

Disabling an account must not erase historical activity attribution.

### 7.11 Counties

Canonical New York county table used by:

- Geography
- Routing
- Filtering
- Permissions
- Reporting

## 8. Engagement Stages

Engagement stage is separate from relationship labels.

Initial stages:

- New
- Follow-up Needed
- Contacted
- Engaged
- Inactive

A public signup begins as `New` and receives an initial follow-up task immediately. The follow-up queue is driven by open tasks, so a `New` supporter can already appear as needing follow-up. `Follow-up Needed` is available for organizer triage/reclassification after initial review. Completing the first successful outreach normally advances the person to `Contacted`; active participation may advance them to `Engaged`.

`Do Not Contact` is a communication restriction/special state, not merely another engagement stage.

Stage changes should create activity history entries automatically.

## 9. Duplicate Detection and Merging

### 9.1 Exact/high-confidence matches

Primary high-confidence key: normalized email.

If normalized email matches an existing person:

- Do not create a second person.
- Attach the new source.
- Add new interests without dropping existing ones.
- Record the new submission/activity.
- Update contact data only under explicit safe merge rules.
- Preserve prior history.

### 9.2 Possible duplicates

Examples:

- Same normalized phone but different email
- Similar name + ZIP + overlapping contact data

Do not automatically merge these. Add them to a duplicate-review queue.

### 9.3 Manual merge

Authorized organizers/admins can merge two records into one canonical person.

The merge must preserve:

- Activities
- Tasks
- Sources
- Interests
- Tags
- Consent history
- Internal notes
- Relationships
- Original creation provenance

The merge event is written to the audit log.

## 10. Authentication and Authorization

### 10.1 Account model

Internal CRM accounts are invite-only.

Requirements:

- No public staff signup
- Verified email
- MFA
- Admin-controlled invitations
- Immediate account disablement
- Session expiration/reauthentication appropriate for protected data

### 10.2 Roles

Each staff account has one primary v1 role. County assignments and explicit person/task assignments define the scope within that role. The schema should not prevent a future multi-role model, but v1 does not require one.

#### Admin

- Statewide people access
- Statewide tasks/activities
- Staff management
- Role and county assignment
- Imports
- Exports
- Administrative configuration
- Duplicate merges
- Audit-sensitive actions

#### State Organizer

- Statewide operational people access
- Statewide tasks/activities
- Assignment/reassignment
- No export by default
- No staff management by default

#### County Organizer

- Access only to assigned counties
- Access to tasks/activities for those counties
- No statewide export

A staff user may be assigned multiple counties.

#### Volunteer/Staff

- Access only to explicitly assigned contacts/tasks
- No general county or statewide browsing unless separately granted by role
- No exports

### 10.3 Row-Level Security

Supabase/PostgreSQL Row-Level Security is the authoritative enforcement layer.

The UI must not be treated as a security boundary.

Required security behavior includes:

- County Organizer assigned Albany cannot retrieve Erie records.
- Multi-county organizers see only explicitly assigned counties.
- Volunteer/Staff users see only explicitly assigned contacts/work.
- Disabled staff accounts cannot retrieve protected data.
- Admin receives statewide access.
- State Organizer receives statewide operational access but not Admin-only actions.
- Public intake credentials/endpoints cannot read CRM records.

## 11. Public Endpoint Isolation

The public `/get-involved` form must not have privileged database credentials in the browser.

Flow:

`Public form → validated server endpoint → intake service → database`

The endpoint returns generic responses and must never leak:

- Whether an email already exists
- Names of existing contacts
- Database errors
- SQL
- Internal identifiers
- Authentication details

## 12. Organizer UX

### 12.1 Dashboard

The first internal screen should prioritize action.

Primary modules:

- New supporters
- Follow-up due today
- Overdue tasks
- Recently contacted
- Unassigned contacts
- Recent activity
- Basic counts by county, source, and engagement stage

Access scopes apply automatically to all dashboard metrics.

### 12.2 People Directory

Search/filter by:

- Name
- Email/phone
- County
- ZIP
- Engagement stage
- Relationship/status
- Interests
- Tags
- Assigned organizer
- Intake source
- Date joined
- Last activity
- Has open task
- Candidate interest
- Member status

Filters may be combined.

Example:

`Albany County + Volunteer + Local Activism + No Contact in 30 Days`

### 12.3 Saved views

Staff can save combined filters as private views in v1.

Example:

`Albany volunteers needing follow-up`

Shared organizational views can be added later.

### 12.4 Supporter profile

Header:

- Name
- Contact information
- Geography
- Engagement stage
- Relationships
- Assigned organizer/team

Sections/tabs:

- Overview
- Activity
- Tasks
- Sources
- Consent
- Internal Notes

The profile should make clear who the person is, what has happened, and what action is next.

### 12.5 Follow-up actions

From a supporter profile, authorized organizers can:

- Mark contacted
- Add note
- Create follow-up task
- Change engagement stage
- Add/remove relationships
- Add/remove interests
- Add/remove tags
- Reassign
- Mark unable to reach
- Set do-not-contact
- Archive where authorized

Relevant changes produce timeline and/or audit entries automatically.

### 12.6 Quick Add

Authenticated organizer flow optimized for phone use.

Minimum useful input:

`Name + email or phone + ZIP`

Before creation, search for likely existing contacts and present a “possible existing contact” warning.

## 13. Destructive and Sensitive Actions

- Contacts are archived rather than routinely hard-deleted.
- Duplicate records are merged with history preserved.
- Do-not-contact prevents outreach but does not erase the record.
- Disabled staff accounts retain historical attribution.
- Sensitive administrative actions are audited.

## 14. Audit Log

Maintain an append-oriented `audit_log` for sensitive actions including:

- Staff role changed
- County permissions changed
- Contact manually merged
- Contact archived
- Export generated
- Do-not-contact changed
- Staff account disabled

Every page view does not need auditing in v1.

Representative fields:

- `id`
- `actor_staff_user_id`
- `action_type`
- `target_type`
- `target_id`
- `occurred_at`
- structured metadata sufficient to understand the administrative action

## 15. Reporting

### 15.1 Dashboard metrics

Admin and State Organizer statewide; County Organizer scoped to assigned geography.

Metrics:

- Total active contacts
- New contacts over selected period
- Contacts by county
- Contacts by engagement stage
- Contacts by relationship
- Contacts by interest
- Contacts by acquisition source
- Follow-up completion rate
- Overdue tasks
- Unassigned contacts

### 15.2 Source performance

Track conversion beyond raw signup counts.

Example measures by source:

- Signups
- Contacted
- Engaged
- Volunteers

This should make it possible to compare events, campaigns, website acquisition, and other sources based on downstream engagement.

## 16. CSV Imports

Admin-only guided workflow:

`Upload → map columns → validate → preview → duplicate check → confirm → import`

Preview should report:

- Total rows
- New people
- Exact matches
- Possible duplicates
- Invalid rows

Every import receives a source/provenance label such as `Legacy Volunteer Spreadsheet`.

Imports must not blindly overwrite richer CRM data. Conflicting values require explicit merge rules or review.

## 17. Exports

Admin-only in v1.

Requirements:

- CSV format initially
- Filterable
- Timestamped
- Attributed to the Admin who generated it
- Audit logged

Example export scope:

`Albany + Rensselaer counties + Volunteer + Active + Email consent yes`

Internal audit data should not be included in normal people exports.

## 18. Administration

### Staff management

Admins can:

- Invite
- Disable
- Change roles
- Assign counties
- Review account status

### Source management

Admins can manage:

- Website sources
- Event sources
- QR campaigns
- Organizer initiatives
- Import sources

### Taxonomy management

Admins can manage structured interests and the centrally governed tag vocabulary without requiring a code release for routine organizational changes. State Organizers may also create/manage tags; County Organizer and Volunteer/Staff users may apply existing tags within their authorized scope.

### Duplicate review

Dedicated queue:

`Possible duplicates → compare → merge / keep separate`

### Unassigned review

State organizers can review people who cannot be automatically routed.

## 19. Data Normalization

Before storage/use in matching:

- Trim and normalize email for comparison.
- Canonicalize phone numbers.
- Validate 5-digit ZIP format for the initial New York workflow.
- Preserve human-readable name capitalization while maintaining comparison-friendly normalized values.
- Convert empty strings to null where appropriate.
- Validate structured interests against known records/options.

The exact matching rules must be deterministic and unit-tested.

## 20. Security and Abuse Protection

Public intake should include:

- Server-side validation
- Rate limiting
- Bot protection
- Submission size limits
- Generic success/error messages
- No service-role or privileged credentials in client-side code

Application-wide rules:

- No supporter PII in URLs.
- No sensitive supporter data in logs.
- Production data is not copied into local development.
- Channel-specific opt-outs are respected in all communication-related views/actions.
- Bulk exports are restricted.

## 21. Technical Architecture

### Frontend/application

- Next.js
- Responsive web UI
- Public and protected routes in one application

Representative route groups:

- `/get-involved`
- `/crm/dashboard`
- `/crm/people`
- `/crm/people/[id]`
- `/crm/tasks`
- `/crm/admin/...`

Exact route organization may change during implementation while preserving the functional boundaries.

### Backend/data

- Supabase-hosted PostgreSQL
- Supabase Auth
- MFA
- PostgreSQL Row-Level Security
- Versioned SQL/database migrations in the repository

### Deployment

- Vercel for Next.js
- Supabase for database/auth

## 22. Environments

Three environments:

### Local

Developer environment using seeded fake data.

### Staging

Realistic application testing with non-production data.

### Production

Real supporter data with production-only credentials and policies.

Production supporter records must not be casually copied to local or staging.

## 23. Repository Structure

Initial target structure:

```text
lpny-supporter-crm/
├── app/ or src/app/
├── components/
├── lib/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
├── docs/
│   └── superpowers/
│       └── specs/
└── ...
```

The repository, migrations, RLS policies, and tests are the authoritative definition of the system. Production dashboard state should not become undocumented configuration.

## 24. Error Handling and Transaction Boundaries

Public and internal workflows should fail safely.

Critical multi-write operations should use transactions or equivalent server-side orchestration where practical.

Examples:

- Intake should not leave a successfully created person with no initial workflow state because later writes failed silently.
- A failed merge must not partially move child records.
- Import confirmation should be atomic at an appropriate batch boundary or expose recoverable partial-failure semantics explicitly.

User-facing errors remain simple and non-sensitive. Technical diagnostics belong in protected logs without supporter PII.

## 25. Testing Strategy

### Unit tests

Cover isolated business rules:

- Email normalization
- Phone normalization
- ZIP validation
- County resolution
- Engagement-stage transitions
- Duplicate-match rules/scoring
- Permission helper logic
- Intake source parsing

### Database/RLS tests

At minimum:

- Albany organizer can retrieve Albany contacts.
- Albany organizer cannot retrieve Erie contacts.
- Multi-county organizer sees exactly assigned counties.
- Volunteer/Staff sees only explicitly assigned contacts/work.
- Disabled account sees no protected data.
- State Organizer receives statewide operational access.
- Only Admin can export.
- Public intake cannot read supporter records.

Tests must exercise actual database policies, not only UI gating.

### Integration tests

Example new-person flow:

`submission → person → source → geography → consent → activity → assignment → follow-up task`

Example repeat-person flow:

`existing normalized email → no duplicate person → additional source/activity/interests preserved`

### End-to-end tests

Critical browser flows:

- Submit Get Involved form
- Staff invite/login/MFA
- Organizer dashboard
- Search/filter people
- Open supporter profile
- Record follow-up
- Complete task
- Quick Add
- Duplicate merge
- CSV import preview
- Export permission enforcement

Mobile layouts must be explicitly tested for public intake and Quick Add.

## 26. Backups and Recovery

Before production launch:

- Automated Supabase database backups enabled.
- Recovery process documented.
- Database migrations versioned and reversible where practical.
- Contacts archived rather than routinely deleted.
- Imports remain traceable.
- Merge operations remain audited.

## 27. Privacy-by-Design Rules

- Collect only information useful for organizing.
- Restrict personal information to staff who need it.
- Do not expose PII through URLs.
- Do not log sensitive supporter data unnecessarily.
- Use fake data for development/testing.
- Preserve consent history.
- Respect opt-outs by channel.
- Restrict bulk exports.
- Separate supporter CRM data from election-intelligence databases unless a future approved integration explicitly connects them.

## 28. Success Criteria for v1

v1 is successful when the organization can reliably:

1. Capture an interested person from a simple public form.
2. Avoid obvious duplicate person records.
3. Record how that person entered the organization.
4. Route the supporter to the correct county or statewide queue.
5. Give an organizer a clear follow-up task.
6. Allow authorized staff to understand the person's current relationship and history.
7. Search/filter supporters for real organizing work.
8. Enforce county and assignment-based data boundaries at the database level.
9. Import legacy contacts with preview and duplicate safeguards.
10. Export authorized filtered data with an audit trail.
11. Report whether acquisition sources are producing actual engagement.
12. Preserve institutional history when staff, assignments, stages, or records change.

## 29. Future-Compatible Extensions

The following are intentionally deferred but should remain architecturally possible:

- Membership registry verification integration
- BOE data enrichment
- Atlas opportunity-to-supporter integration
- Email/SMS provider integrations
- Event registration/attendance automation
- Donation integrations
- Shared organizational reports
- Advanced engagement analytics
- Candidate recruitment workflows
- Controlled external API access

These extensions must not be implemented in v1 merely because the schema anticipates them.
