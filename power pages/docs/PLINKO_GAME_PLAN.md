# Plinko Game Plan

Epic: [#119](https://github.com/Andworx/Copilot-IoT-Game/issues/119) · Schema: [#124](https://github.com/Andworx/Copilot-IoT-Game/issues/124) ·
Hardware-to-backend: [#128](https://github.com/Andworx/Copilot-IoT-Game/issues/128) · Operational UI: [#127](https://github.com/Andworx/Copilot-IoT-Game/issues/127)

## 1. Game rules

- A physical Plinko board has at least five buckets. Each bucket has an IR break-beam
  sensor insert (`3d Models/plinko bucket sensor/`) with no moving parts and no LEDs.
- The booth display runs the **chase light** animation across the buckets. Whichever
  bucket is lit at the moment the puck lands is the **lit bucket** for that drop.
- **Lit bucket:** `Lit Bucket Entries` grand-prize entries (a Plinko Station setting,
  default 2) **plus** one small-prize wheel spin.
- **Any other bucket:** `Standard Bucket Entries` (default 1) **plus** one small-prize
  wheel spin.
- The small prize comes from the **shared** PrizeEngine inventory — the same weighted
  wheel as the IoT game. No Plinko-specific prize schema.
- The booth display celebrates the result and shows a QR. The player can scan it or
  skip. Grand-prize entries are only created when the player shares contact info on
  the phone, same rule as IoT (`SHARED_CONTEST_ENTRY_MODEL.md`, *Entry Timing Decision*).

This replaces the epic's fixed "bucket 3 awards two entries" rule: the bonus follows
the lights, not a bucket number.

## 2. Ownership: a separate `Plinko` solution

Follow the IoT pattern: PrizeEngine owns everything shared, and the game solution owns
only game-specific detail.

| Solution | Owns |
|---|---|
| `andy_PrizeEngine` (existing) | Prize Types, Prizes, Prize Claim, Contest Campaign, Contest Source, Source Cap, Grand Prize Entry, Contact usage |
| `CopilotIoTGame` (existing) | IoT Game Win, Device Profile, IoT telemetry, Game Box State |
| **`Plinko` (new)** | Plinko Station, Plinko Play, Plinko views/forms, Plinko MDA, the Plinko display Code Site |

Rules:

- Publisher `Andworx`, prefix `andy`. Set **Plinko** as the preferred solution before
  creating any table, so tables do not land in the default publisher (see the
  `cr552_prizeclaim` note in `requirements/PRIZE_CLAIM_MIGRATION_PLAN.md`).
- `Plinko` depends on `andy_PrizeEngine`. It never adds Plinko columns to Prize Claim,
  Grand Prize Entry, or IoT tables, and never writes IoT Game Win rows.
- Add a `plinko` row to Contest Source (source key `plinko`) and a Source Cap row per
  campaign, so Plinko entries are capped and traced separately from IoT.
- Export and unpack into `solutions/Plinko/`, then pack and import as the other
  solutions do (repo `CLAUDE.md`, *Deployment Workflow*).

## 3. Dataverse schema (#124)

### `andy_plinkostation` — Plinko Station

One row per physical board. It also holds the entry settings, so the rules are
"decided by the table".

| Column | Type | Req | Notes |
|---|---|---|---|
| `andy_name` | Text | Yes | Primary name, e.g. `Plinko Board 1`. |
| `andy_stationslug` | Text | Yes | Alternate key. Matches the display's `?station=` and the Pi payload. |
| `andy_iotdeviceid` | Text | Yes | IoT Hub device id the Pi authenticates as. The backend rejects landings whose device id doesn't match the slug. |
| `andy_bucketcount` | Whole number | Yes | Default 5. Landings outside `1..bucketcount` are rejected. |
| `andy_litbucketentries` | Whole number | Yes | Default 2. Entries for a lit-bucket landing. |
| `andy_standardbucketentries` | Whole number | Yes | Default 1. Entries for any other bucket. |
| `andy_isenabled` | Yes/No | Yes | Disabled stations ignore landings (logged, no claim). |
| Status | Built-in | | Standard active/inactive. |

### `andy_plinkoplay` — Plinko Play

One row per accepted landing. It is the Plinko-specific detail row for a Prize Claim,
like IoT Game Win.

| Column | Type | Req | Notes |
|---|---|---|---|
| `andy_name` | Text | Yes | Generated: `<station> · bucket <n> · <time>`. |
| `andy_prizeclaim` | Lookup → `andy_prizeclaim` | Yes | Shared claim: token, status, Contact, prize. Relationship owned by `Plinko`. |
| `andy_station` | Lookup → `andy_plinkostation` | Yes | |
| `andy_hardwareeventid` | Text (100) | Yes | Pi-generated UUID. **Alternate key**: duplicate deliveries upsert the same row. |
| `andy_bucket` | Whole number | Yes | Bucket the puck landed in (1-based). |
| `andy_litbucket` | Whole number | Yes | Bucket the chase lights had lit at landing (1-based). |
| `andy_islitbucket` | Yes/No | Yes | `bucket == litBucket`, stored so views can filter on it. |
| `andy_entriesawarded` | Whole number | Yes | Snapshot of the station setting when the play was accepted. |
| `andy_landedtime` | DateTime | Yes | Pi timestamp. The server receive time is `createdon`. |
| `andy_firmwareversion` | Text | No | Troubleshooting. |

No choice columns are needed. Claim status, Contact, and prize come from the linked
Prize Claim, so views show them as related columns and nothing is duplicated.

## 4. Event contract (#128)

### Pi → IoT Hub (device-to-cloud message)

Use the same shared IoT Hub and `iot-telemetry` Event Hub pipeline as the panel Pi. The
Plinko Pi is a new device identity, registered manually; this repo never changes IoT
Hub or DPS.

```json
{
  "type": "plinkoLanding",
  "stationSlug": "plinko-1",
  "eventId": "0b8f6a3e-6c1d-4a39-9f4c-3f1f0b1e2a77",
  "bucket": 3,
  "litBucket": 3,
  "bucketCount": 5,
  "landedAt": "2026-09-28T15:04:05.123Z",
  "firmware": "plinko-0.1.0"
}
```

- `eventId` is generated once per physical landing, and resends reuse it.
- The Pi debounces the break-beam receiver and ignores new landings for a short lockout
  after one (the puck bounces).

**Telemetry cost:** the chase lights are display-only and never produce messages. Each
drop costs one device-to-cloud message, which is far below the IoT Hub daily quota the
panel Pi already uses. The display never needs LED telemetry.

### Function App

The existing `iot-telemetry` Event Hub trigger routes `type: "plinkoLanding"` to a
Plinko handler:

1. Validate: the station exists, is enabled, and is active; the IoT Hub
   `iothub-connection-device-id` system property equals `andy_iotdeviceid`;
   `1 ≤ bucket, litBucket ≤ bucketCount`; and `landedAt` is within a freshness window
   (replay control).
2. **Idempotency:** look up `andy_plinkoplay` by `andy_hardwareeventid`. If it exists,
   re-broadcast its existing result and stop. The Event Hub retry policy and IoT Hub
   redelivery must never create a second claim.
3. Create the Prize Claim (source key `plinko`, active campaign), then the Plinko Play
   with `entriesAwarded` = lit or standard entries from the station.
4. Broadcast `plinkoResult` (below) on the `gamebox` SignalR hub.

`claim-prize` changes: when the Prize Claim has a Plinko Play, create
`andy_entriesawarded` Grand Prize Entry rows, each checked against the campaign cap, so
drawing weight works as it does today. Return the created count to the phone.

### SignalR `plinkoResult` → display

```json
{
  "stationSlug": "plinko-1",
  "eventId": "…",
  "bucket": 3,
  "litBucket": 3,
  "bucketCount": 5,
  "entriesAwarded": 2,
  "claimToken": "…"
}
```

Typed in `power pages/plinko/src/types/plinko.ts`.

> **Open decision for #128:** the `gamebox` hub broadcasts to every connected client,
> so a broadcast `claimToken` is visible to anyone who negotiates a connection. The IoT
> kiosk avoids this because only the kiosk gets the token, in the `create-win`
> response. Recommended: send `plinkoResult` only to a per-station SignalR group, which
> the display joins through a station-scoped negotiate, or broadcast without the token
> and have the display fetch it. Either way, keep the token short-lived (unclaimed
> expiry) and one-claim-per-play.

## 5. Booth display — `power pages/plinko` (new Code Site)

A separate Power Pages Code Site (site name `Plinko`), in the `Plinko` solution.

- **Idle:** a how-it-works infographic. The ten steps run from dropping the puck,
  through the chase-light buckets, IR sensor, Pi, IoT Hub, Functions, Dataverse and SignalR, to
  this screen and the player's phone. A light travels through them in order, and each
  step's caption appears below. It shows no live LED state; the Pi owns the lights.
- **Win:** on `plinkoResult` for its station, a full-screen celebration with falling
  Power Platform logo confetti (the same pattern as the Game Box Control grand-prize
  reveal). It shows the landed bucket, the lit bucket, the entries awarded, the prize
  wheel spin, and a QR for the shared prize wheel (`?token=`).
- **Leaving the win screen:** a **Skip** button or a 45 s countdown returns to idle. A
  newer landing replaces the one on screen. Skipping only clears the screen: the claim
  stays valid until it expires.
- **Station:** set with `?station=<slug>` (default `plinko-1`).
- **Dev preview:** in `npm run dev`, keys `1`–`5` simulate a landing (bucket 3 lit) and
  `Esc` clears it.

### Prize wheel changes (shared site)

The phone flow is reused as-is, but the copy is IoT-specific ("You fixed it!"). Make the
headline source-aware, and show "N grand-prize entries" when the claim response
reports more than one.

## 6. Operational UI (#127)

A **Plinko Operations** model-driven app in the `Plinko` solution, with Plinko Station,
Plinko Play, and the PrizeEngine Prize Claim and Grand Prize Entry tables.

### Plinko Play views

| View | Filter / sort | Columns |
|---|---|---|
| Recent Plinko Plays (default) | Active, `landedtime` desc | Name, Station, Bucket, Lit Bucket, Lit?, Entries, Claim Status*, Contact*, Landed |
| Plays by Bucket | Active, sort Bucket then Landed desc | Bucket, Lit?, Entries, Claim Status*, Landed |
| Lit Bucket Wins | `islitbucket = Yes` | Station, Bucket, Entries, Contact*, Claim Status* |
| Unclaimed Plays | Prize Claim status = Unclaimed | Station, Bucket, Landed, Claim Token* |
| Plays with Contact | Prize Claim Contact contains data | Contact*, Entries, Prize*, Landed |
| Troubleshooting by Event Id | Active, sort Hardware Event Id | Hardware Event Id, Station, Firmware, Landed, Created On |

\* Related columns through the Prize Claim lookup.

### Forms

- **Plinko Play main form:** a *Landing* section (station, bucket, lit bucket, lit?,
  entries, landed time) and a *Hardware* section (event id, firmware), plus a **Prize
  Claim quick view** (claim status, claimed time, Contact, prize instance). There is no
  Device Profile or IoT field.
- **Plinko Station main form:** identity, IoT device id, bucket count, entry settings,
  enabled, and a Plays subgrid.
- **IoT Game Win forms stay unchanged**, including Device Profile, in `CopilotIoTGame`.

### Where records live

| Question | Look at |
|---|---|
| Which bucket, was it lit, how many entries? | Plinko Play |
| Was the QR claimed, by whom, which prize? | The Plinko Play's Prize Claim (quick view) |
| Did it produce grand-prize entries? | Grand Prize Entry, filtered by that Prize Claim |
| Why was a landing ignored? | Function App logs (rejections are not stored as plays) |

## 7. Build order

1. **#124 schema:** create the `Plinko` solution, both tables, alternate keys, the
   Contest Source `plinko` row, and the Source Cap. Export, unpack, pack, and import.
2. **#127 views and forms:** the Plinko Operations MDA, views, forms, and quick view.
   Export and unpack.
3. **#128 backend and Pi:** the landing handler, idempotency, multi-entry claim, and
   Pi chase-light and landing firmware.
4. **Display:** point `power pages/plinko` at the real `plinkoResult`, create and
  activate the Plinko Code Site, then set `POWER_PLINKO_WEBSITE_ID` so
  `.github/workflows/deploy-apps.yml` can deploy it on `main`.
5. **Prize wheel copy:** source-aware headline and entry count.
