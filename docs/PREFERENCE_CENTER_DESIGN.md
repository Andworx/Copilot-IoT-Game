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

Two rules the code relies on, both native:
- **Opted in** means `donotbulkemail=false` **and** a Contact Note titled "Marketing opt-in
  confirmed". A bare `false` (the Dataverse default) is never treated as consent.
- **Game-created contact** means Created By is the Function's application user. Automatic
  retention and instant removal touch only these, so CRM contacts that happen to play are
  suppressed but never deleted automatically (a Task goes to staff instead).

**Contest Campaign:** new `andy_followupsendtime` (DateTime). Retention is 90 days after the
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
4. **Follow-up email** (daily timer, after `andy_followupsendtime`):
   - Only to contacts whose Grand Prize Entry is **Checked In** and who are not `donotemail`.
   - Opted-in contacts: thanks plus marketing content.
   - Everyone else: a neutral thank-you for visiting the booth and playing, with only a link to
     manage or remove their data. No promotion and no invitation to opt in.
   - **Send window:** the job only considers campaigns where now is between
     `andy_followupsendtime` and that time plus **3 days**. After that the campaign is ignored,
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

## Dataverse updates (portal checklist)

Repo convention: build in the maker portal / admin center, then `pac solution export` and
`pac solution unpack` the `PrizeEngine` solution. Nothing here is created from the repo.

### 1. Schema (one column)
- **Contest Campaign** (`andy_contestcampaign`): add `andy_followupsendtime`, display name
  "Follow-up send time", Date and Time, time-zone independent, optional, auditing on. Add it to the
  main form and the active view.
- No new Contact columns, no new tables, no relationship changes.

### 2. Auditing
- Power Platform admin center, environment Settings, Audit settings: turn on **Start auditing**
  (user-access auditing is not needed).
- Contact table: enable auditing on the table; enable on columns `donotemail` and `donotbulkemail`.
- Optionally enable on `andy_contestcampaign.andy_followupsendtime`.

### 3. Activities and notes
- Confirm **Notes** and **Activities (Email, Task)** are enabled on `contact` (default) and
  `andy_grandprizeentry` (needed for the entry notes and the entry-regarding emails).

### 4. Security role for the Function's application user
Grant the application user used by `DATAVERSE_CLIENT_ID` (organization level unless noted):
- Contact: Read, Write, **Delete**, Append, Append To
- Grand Prize Entry: Read, Write, Append, Append To
- Contest Campaign: Read
- Note (Annotation): Create, Read, Append
- Task: Create, Read, Append, Append To
- Email: Create, Read, Write, Delete, Append, Append To; plus the **Send Email as Another User**
  privilege if the sender is not the application user
- User (System User): Read (to look up the application user's id)
- Prize Claim: Read, Write (already granted)

### 5. Data fixes before launch
- **Existing game contacts:** in Advanced Find, Contacts where Created By = the Function's
  application user and Do Not Allow Bulk Emails = Allow: bulk edit to **Do Not Allow**. Anyone
  already there has not given marketing consent. Do not edit CRM contacts.
- Confirm `andy_grandprizeentry.andy_contact` and `andy_participantname` are optional (the
  removal routine clears both).
- Check `andy_iotgamewin` for inline contestant name or email columns still holding personal data
  from before #125; those are not cleared by the routine.

### 6. Email navigation properties (verify once)
The code binds notes, tasks and emails with these navigation property names. Confirm them against
the environment's `EntityDefinitions` metadata (the existing entry email binding is known to work):
`objectid_contact`, `objectid_andy_grandprizeentry`, `regardingobjectid_contact_email`,
`regardingobjectid_contact_task`, `regardingobjectid_andy_grandprizeentry`. Adjust the constants at
the top of `azure/functions/game/src/lib/consent.ts` if any differ.

### 7. Campaign data
- Set `andy_followupsendtime` on the active campaign (the job acts from that time for 3 days).
- Set `andy_preference_url` to the preference page URL (the prize wheel site; the page reads
  `?pref=`), and `andy_privacynoticeurl` once the notice exists. Without the preference URL no
  preference link, confirmation or follow-up email is sent.

### 8. Function App settings (both the public and staff apps)
- `PREFERENCE_TOKEN_SECRET`: random string of 32+ characters (same value on both apps; the staff
  app inherits it from the public app at the next staff-api release).
- `MARKETING_SENDER_ADDRESS` and `FOLLOW_UP_MARKETING_HTML`: set both to enable the marketing
  version of the follow-up; leave unset and everyone gets the neutral thank-you.
- `GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID` already exists and is reused.

### 9. After deployment
- Test sequence: claim with the marketing box ticked, confirm via the email link, check the Contact
  note and audit history, opt out, request removal on a game-created test contact, confirm the entry
  keeps its record with a "Contact removed" note.
- Set the plan items for #133 to Verify until those checks pass.

## Still to build
The prize wheel page (consent checkbox on the share step sending `marketingOptIn`, and the
preference page reading `?pref=`) is not part of this change.
