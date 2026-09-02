# Prize Engine Spec

Companion to [`GAME_MODE_PLAN.md`](GAME_MODE_PLAN.md) (architecture, §5/§7 give the short
version) and [`KIOSK_UI_SPEC.md`](KIOSK_UI_SPEC.md) (the on-screen side of the spin). This
document is the detailed spec for the one subsystem neither of those fully covers: **how a
prize gets picked, how the schema backs that, and what happens physically at the booth
between "the app says you won X" and the player actually walking away with X.**

## 1. Prize weighting — how a prize gets picked

### 1.1 The rule

Odds are controlled by `andy_prize.andy_weight`, not `andy_value` — see
`GAME_MODE_PLAN.md` §5 for why those are two separate fields (organizers hand-tune odds;
`andy_value` is reference/reporting only). The convention: **higher `andy_value` → lower
`andy_weight`.** There's no enforced formula between them — an admin sets both by judgment.

### 1.2 Selection algorithm

Runs entirely server-side, inside the claim endpoint (§3 of `GAME_MODE_PLAN.md` §7 — an
Azure Function, not a Power Automate flow, because this logic is a loop with a retry
branch, which is painful in a flow designer and trivial in code).

```
eligible = andy_prize rows where andy_isactive = true AND andy_remaining > 0
if eligible is empty:
    eligible = [ the designated fallback prize ]   -- see §1.4

totalWeight = sum(p.andy_weight for p in eligible)
r = random_float(0, totalWeight)
running = 0
for p in eligible (stable order, e.g. by andy_name):
    running += p.andy_weight
    if r <= running:
        chosen = p
        break

decremented = try_decrement(chosen)   -- conditional update, see §1.3
if not decremented:
    retry from "eligible = ..." (someone else just took the last unit)
```

**Worked example** (the 5 prizes used in the prototype):

| Prize | `andy_weight` | Cumulative | Odds |
|---|---:|---:|---:|
| Sticker Pack | 40 | 40 | 40% |
| Andworx T-Shirt | 30 | 70 | 30% |
| $25 Gift Card | 18 | 88 | 18% |
| Wireless Earbuds | 9 | 97 | 9% |
| Grand Prize: Conference Pass | 3 | 100 | 3% |

A draw of `r = 72` lands past the T-Shirt's cumulative 70 and at/before the Gift Card's 88
→ Gift Card wins.

### 1.3 Atomic decrement (why this can't be "read, then write")

Two players can claim within the same second, especially right after a booth rush. A naive
"read `andy_remaining`, check `> 0`, write `remaining - 1`" has a race: both reads can see
`1` before either write lands, and the count goes negative or a prize with 0 stock left
still gets awarded twice.

Use Dataverse optimistic concurrency: the read includes an `ETag`/`@odata.etag`; the update
sends `If-Match: <etag>` and Dataverse rejects it with `412 Precondition Failed` if the row
changed since the read. On `412`, re-read that prize's current `andy_remaining`, and either
retry the decrement (if still `> 0`) or fall out of the `eligible` set and re-run selection
from §1.2. This is the "retry from eligible" branch above — don't let a losing race show
the player a prize that's actually sold out.

### 1.4 The empty-pool fallback

If every real prize hits `andy_remaining = 0` (a hit event can outpace supply), the claim
endpoint must not error out for the player standing there having just won. Designate
**exactly one** `andy_prize` row as the fallback (`andy_isfallback = true`, §2.1) — something
with effectively unlimited stock (a digital-only consolation, e.g. a discount code or a
"thank you" badge) that's excluded from normal weighted selection and only used when
`eligible` from §1.2 comes back empty. Flagged here as a required v1 behavior, not optional
— the alternative is a broken claim screen at the exact moment supply runs out, which is a
bad look at a booth.

## 2. Dataverse schema

Extends `GAME_MODE_PLAN.md` §5 with the fields this document's workflow (§3) needs —
mainly the redemption lifecycle, which the architecture plan didn't cover in depth.

### 2.1 `andy_prize` — full schema

| Column | Type | Notes |
|---|---|---|
| `andy_name` | String | Prize name, shown to the player and to booth staff |
| `andy_value` | Currency | Reference value — reporting only, not read by the picker (§1.1) |
| `andy_weight` | Whole Number | Relative odds — the field the picker actually uses (§1.2) |
| `andy_remaining` | Whole Number | Finite stock, decremented atomically on claim (§1.3) |
| `andy_isactive` | Yes/No | Inactive prizes are excluded from selection entirely (distinct from `andy_remaining = 0` — use this to retire a prize mid-event without it looking "sold out") |
| `andy_isfallback` | Yes/No | Exactly one row should be `true` — the empty-pool safety valve (§1.4). Validate this at deploy time, not just at claim time |
| `andy_totalawarded` | Whole Number | Running counter, incremented alongside the `andy_remaining` decrement — lets reporting show "claimed" even after `andy_remaining` hits 0 |
| `andy_imageurl` | String | Optional — reference image for booth staff / a future admin view |

### 2.2 `andy_gamewin` — full schema (supersedes the shorter version in `GAME_MODE_PLAN.md` §5)

| Column | Type | Notes |
|---|---|---|
| `andy_deviceprofile` | Lookup → `andy_deviceprofile` | Which item was fixed |
| `andy_claimtoken` | String (GUID) | Encoded in the kiosk QR code; single-use; this is what `/play-spin?token=…` reads |
| `andy_status` | Choice | `Unclaimed` / `Claimed` / `Expired` — see §2.3 |
| `andy_redemptionstatus` | Choice | `NotRedeemed` / `Redeemed` — **separate from `andy_status`**, see §2.3 for why |
| `andy_redemptioncode` | String | Short (6-character) human-typeable code, generated at claim time — what the player shows staff and what staff searches on (§3, step 5). Not the same value as `andy_claimtoken`: the token is a bearer secret embedded in a URL, the code is meant to be read off a phone screen and typed by a person |
| `andy_wontime` | DateTime | When the fix was detected |
| `andy_prize` | Lookup → `andy_prize` | Null until claimed |
| `andy_claimedtime` | DateTime | Null until claimed |
| `andy_redeemedtime` | DateTime | Null until a staff member fulfills it |
| `andy_redeemedby` | Lookup → `andy_technician` | Which staff member handed over the prize — reuses the existing technician table rather than inventing a new one |
| `andy_contestantname` | String | Optional — null if the player skips sharing |
| `andy_contestantemail` | String | Optional — null if the player skips sharing |
| `andy_sharedinfo` | Yes/No | Whether the player opted in — purely informational, never gates the spin/prize |

### 2.3 Why status and redemption status are two separate fields

`andy_status` tracks the **digital claim** (has the wheel been spun and a prize assigned).
`andy_redemptionstatus` tracks the **physical handoff** (has a human actually given the
player the item). These move independently and both matter for reporting:

- A row can be `Claimed` + `NotRedeemed` for a long stretch — the player spun the wheel
  and walked away before visiting the prize table. `andy_remaining` was already decremented
  at claim time (§1.3), so this is real stock sitting unclaimed physically — worth
  surfacing in the low-stock report (`GAME_MODE_PLAN.md` §9) as its own number, not
  conflated with "given out."
- Collapsing these into one field would make it impossible to answer "how much of our
  claimed-but-not-yet-picked-up stock might still come back" during the event.

### 2.4 Relationships

```
andy_gamewin.andy_deviceprofile → andy_deviceprofile  (existing, cascadeDelete: Restrict)
andy_gamewin.andy_prize         → andy_prize          (existing, cascadeDelete: Restrict)
andy_gamewin.andy_redeemedby    → andy_technician     (new,      cascadeDelete: Restrict)
```

## 3. Workflow: win → claim → physical delivery

1. **Win.** Copilot Studio's resolved-topic action creates `andy_gamewin`: `andy_status =
   Unclaimed`, `andy_redemptionstatus = NotRedeemed`, `andy_claimtoken = new GUID`,
   `andy_deviceprofile = <current>`.
2. **QR.** The kiosk (already listening on SignalR) shows a full-screen QR pointing at
   `/play-spin?token=<claimtoken>`.
3. **Scan → optional share → claim.** Player scans on their own phone, optionally shares
   name/email (never gating, per the locked decision in `GAME_MODE_PLAN.md` §0), then the
   page calls the claim endpoint with the token.
4. **Server-side pick.** The claim endpoint runs §1.2/§1.3: validates the token is
   `Unclaimed`, weighted-picks a prize, atomically decrements `andy_remaining`, increments
   `andy_totalawarded`, generates a `andy_redemptioncode`, and sets `andy_status = Claimed`,
   `andy_claimedtime = now`, plus the contestant fields if shared.
5. **Reveal.** The phone plays the spin animation (already-decided theater — the prize was
   picked in step 4) and lands on the result screen showing the prize name **and the
   redemption code prominently** — this is the one piece of information the player needs
   to carry to the prize table.
6. **Physical redemption at the booth.** Staff need a way to look up a `andy_gamewin` row by
   `andy_redemptioncode` and mark it fulfilled. **Recommended default: don't build a custom
   staff app for this** — an out-of-the-box Dataverse view/model-driven app screen
   (`andy_gamewin` filtered to `andy_status = Claimed AND andy_redemptionstatus = NotRedeemed`,
   sorted by `andy_claimedtime`, with `andy_redemptioncode` as a searchable column) is enough
   for a single-booth conference event, and it's zero additional build. Staff finds the
   code, hands over the item matching `andy_prize.andy_name`, sets
   `andy_redemptionstatus = Redeemed`, `andy_redeemedtime = now`, `andy_redeemedby = <themselves>`.
7. **Reset.** Kiosk auto-resets 10s after showing the QR (`GAME_MODE_PLAN.md` §0/§7) —
   independent of whether the player has claimed yet; claiming happens on their own phone
   on their own time, not gated by the kiosk session.

### 3.1 What's deliberately out of scope for v1

- **Auto-expiry / restocking unclaimed wins.** A `andy_gamewin` that's `Claimed` but never
  `Redeemed` keeps its decremented stock gone for the rest of the event. Restocking it
  (e.g. "expire and return to pool after 4 hours") would need a scheduled process
  (Power Automate recurrence or a Function timer trigger) re-incrementing `andy_remaining`
  and flipping `andy_status = Expired`. Reasonable to add later; not required to run the
  event — some leakage from no-shows is a normal, acceptable tradeoff for a short
  conference booth window rather than a problem worth solving up front.
- **A dedicated staff redemption UI.** Flagged in step 6 — start with a Dataverse view;
  only build a custom page if the out-of-the-box view proves too slow/clunky in practice.

## 4. Open items

1. **Fallback prize content** — what should the actual empty-pool fallback (§1.4) be? A
   discount code, a "thank you" digital badge, something else? Needs a real answer before
   `andy_prize` seed data is written, not just the schema flag.
2. **Redemption code format** — 6-character alphanumeric assumed above (matches the
   prototype's `GW-XXXXXX` pattern). Confirm that's legible/short enough for booth staff to
   type quickly, or if a shorter/QR-rescan-based approach is preferred instead.
