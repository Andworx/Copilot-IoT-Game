# Preference center and consent handling (issue #133)

Design for tokenized preference links, marketing consent and data-removal requests.
Parent epic: #122. Builds on the Contact model from #125. Applies the **EU standard
(GDPR / ePrivacy) to every attendee**, EU or US. Counsel must review notice wording and
the retention period before launch; this is a design record, not legal advice.

## Principles

- Stay Dataverse-native: standard Contact fields, Notes, Tasks, auditing. Extend only when needed.
- Entering the grand-prize drawing never depends on marketing consent.
- Marketing consent is opt-in, unticked by default, and double opt-in confirmed by email.
- Changes take effect immediately and are auditable.
- A GET request never changes state (mail scanners prefetch links).
- Preference links use a dedicated signed token, never the prize claim token.

## Data model

**Contact: no new columns.**

| Standard field | Use |
|---|---|
| `donotbulkemail` | Marketing flag. `true` means no marketing. New contacts are created `true`; existing contacts are never changed implicitly. Opted in only when `false` after the confirm step. |
| `donotemail` | Hard stop: no email of any kind. Set on a removal request. |

Turn on Dataverse auditing for both fields.

**Contest Campaign:** new `andy_followup_send_time` (DateTime). Retention is 90 days after the
existing `andy_drawingtime`; the number lives in the retention process configuration.
Existing `andy_privacynoticeurl` holds the privacy notice; existing `andy_Preference_Url` is the
base of the preference-page link.

**Grand Prize Entry:** no new columns. The follow-up is an email activity regarding the entry,
and that activity is the record that it was sent. Existing `andy_privacyacceptancetime` /
`andy_privacynoticeversion` are filled at capture.

No new tables, no relationship changes.

## Evidence and audit

- **Notes on the Contact** record each consent action in plain text: timestamp, source
  (`claim-page` or `preference-page`), privacy notice version, and the new setting.
- Dataverse auditing records the field flips; the confirmation email activity records the request.
- Notes on a Contact are deleted with it, so anything that must outlive the Contact is written
  to the **Grand Prize Entry** note (below), without personal data.

## Flows

1. **Capture (prize wheel share step).** Unticked "Send me news and offers" checkbox, separate
   from entering the drawing, with the purpose and a privacy-notice link. Ticking emails a
   confirmation link carrying a signed, expiring "confirm" token. Until it is clicked the
   contact stays `donotbulkemail=true`.
2. **Confirm (double opt-in).** The link opens the preference page; a button press (POST) sets
   `donotbulkemail=false` and writes the Contact note.
3. **Preference page** (prize wheel Code Site, signed token in the link): masked email and
   current setting. Actions: opt in, opt out, request removal, request a copy of my data.
   Removal and copy requests create a **Task** on the Contact due in 30 days; removal also sets
   `donotemail=true` and `donotbulkemail=true` immediately.
4. **Follow-up email** (daily timer, after `andy_followup_send_time`):
   - Only to contacts whose Grand Prize Entry is **Checked In** and who are not `donotemail`.
   - Opted-in contacts: thanks plus marketing content.
   - Everyone else: a neutral thank-you for visiting the booth and playing, with only a link to
     manage or remove their data. No promotion and no invitation to opt in.
   - **Send window:** the job only considers campaigns where now is between
     `andy_followup_send_time` and that time plus **3 days**. After that the campaign is ignored,
     so entries that were skipped (not checked in, `donotemail`, removed) are not re-checked
     forever. The 3 days is a job setting, not a column.
   - **Sent once, draft first:** for each due entry the job creates the email activity as a
     pending draft regarding the entry, then sends it. The draft is the claim: any follow-up
     activity on the entry, in any status (draft, sent or failed), counts as attempted and is
     skipped on later runs. A failed one stays on the timeline for staff to resend; it is not
     retried automatically. Matched by a fixed subject; there is no sent-flag column.
   - Safe to run as often as needed. Timer triggers run on one instance at a time, and the draft
     claim covers any remaining gap. Runs on one API surface only.
5. **Removal and retention routine** (one routine, two triggers: a removal request, and the
   daily check for contacts with `donotbulkemail=true` 90 days past the campaign drawing, or
   90 days since their last play if later). For each Grand Prize Entry of the Contact:
   1. Clear the Contact lookup and `andy_participantname`.
   2. Add a **Note to the entry**: date, reason (`removal request` or `retention expiry`),
      and "contact removed, personal data cleared". No name or email in the note.
   Then delete the Contact. The **entry is kept**, so the drawing record and counts survive.
   Prize claims already use Remove Link and keep their history.
6. **Email guard.** One `canEmail(contact, purpose)` check before every send. Check-in and
   reminder emails are blocked only by `donotemail`; marketing needs a confirmed opt-in.
   Opt-out or removal cancels that contact's scheduled reminder activities.

## Every marketing email

Unsubscribe link (preference page), sender identity, and a physical address.

## Open items

- **Privacy notice**: not yet written. Needs Andworx named as controller and the purposes
  listed. Build with the campaign URL as configuration; do not launch without it.
- Counsel to confirm: neutral follow-up to non-consenting checked-in contacts; 90-day
  retention; Dataverse region versus EU data transfers.
- Existing contacts are treated as having no marketing consent.
- Check whether Customer Insights – Journeys is licensed; it could replace the follow-up and
  subscription pieces later without changing the Contact data.

## Delivery order

1. Schema: one new campaign column, auditing (repo definitions under `tables/`).
2. Function: signed tokens, preference route (public surface), `canEmail`, Notes and Tasks.
3. Prize wheel: consent checkbox and preference page.
4. Follow-up timer, removal and retention routine, docs and plan items.

## Schema setup (maker portal, then export)

Repo convention is to build columns in the maker portal and bring them into source control
with `pac solution export` and `pac solution unpack` (the `PrizeEngine` solution). Nothing is
created from this repo.

1. Contest Campaign: add `andy_followup_send_time`, display name "Follow-up send time",
   DateTime (date and time, time-zone independent), optional, auditing on.
2. Contact: turn on auditing for the table and for `donotemail` and `donotbulkemail`
   (no new Contact columns).
3. Environment: confirm auditing is enabled (Power Platform admin center, Settings, Audit).
4. Add Follow-up send time to the Contest Campaign main form and a view.
5. Export and unpack `PrizeEngine`; commit the Entity.xml and form changes.
6. Set the `andy_privacynoticeurl` value on the active campaign once the notice exists.
