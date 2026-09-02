# Game Mode Plan — Copilot IoT Game

Status: **All open questions resolved** — see "Decisions" (§0). §9 now tracks implementation-level details only, nothing blocking.

## 0. Decisions locked in

| Question | Decision |
|---|---|
| Win-detection trigger | Copilot Studio agent conversation reaching a resolved topic calls a flow/action to record the win (§7, §8) |
| Dial hardware | Read by the panel Pi (already registered to IoT Hub) for the authoritative cloud log, **and** the same signal split electrically to the kiosk/screen Pi so it can react locally without a cloud round-trip (§4) |
| Contestant identity | Optional at claim time. Player may share name/email; if they skip it, the spin/prize is unaffected — sharing is opt-in only, never a gate or a penalty |
| Prize inventory | Finite stock per prize — `andy_prize.andy_remaining` decrements atomically on claim, depleted prizes drop out of the wheel (§5, §7 updated below) |
| Kiosk reset | Auto-resets to attract/idle **10 seconds** after the win/QR screen is shown. If the dial is turned mid-session (before a win), that's an immediate reset too — it's a whole new device, no partial session carries over (§4, §7) |
| Dial layout *(corrected)* | **12-position** rotary switch, not 6 — position 1 is a demo/info page (not a real game device), positions 2–12 are 11 actual troubleshooting devices (§5, §6, §11) |
| Spin page hosting | Either works — same site as another page, or a separate site. Default to same site (simpler, reuses Dataverse/API access) unless a reason to split comes up later |
| Panel logic per device | **Different per device** — each of the 11 devices needs its own LED/switch logic, not a shared `logic_map.json` (§4 updated below) |
| Prize weighting | Prizes live in one Dataverse table (`andy_prize`). Odds must be weighted so higher-value prizes are picked less often — see `andy_value`/`andy_weight` in §5 and the selection logic in §7 |
| Site platform *(corrected)* | The existing `iot-panel-dashboard` is a **Power Pages Code Site** — a React 19 + Vite SPA with client-side routing, deployed via `pac pages upload-code-site` — not a classic Liquid multi-page site. §3/§4/§6 below are corrected to match; the "multi-page vs SPA" framing in the original draft was wrong |
| Kiosk display hardware | Confirmed from the existing app's CSS: the **official Raspberry Pi 7" touchscreen, 800×480, landscape**. Every kiosk screen in §6 is designed against that exact viewport, not a desktop layout |

## 1. Baseline: what already exists (from `copilot-iot-service`)

This project was cloned from the Andworx Power Platform starter template. The prior sibling
project, [Andworx/copilot-iot-service](https://github.com/Andworx/copilot-iot-service), already
proves out the core real-time pipeline:

```
Raspberry Pi (GPIO switches/LEDs)
  → Azure IoT Hub (MQTT)
  → Azure Event Hub
  → Azure Function (Node.js) — writes telemetry to Dataverse, broadcasts via SignalR,
    and hosts /api/directline-token (exchanges the Direct Line secret server-side)
  → Azure SignalR Service
  → Power Pages Code Site "iot-panel-dashboard" — React 19 + Vite SPA, client-side
    routes (/, /history, /devices), deployed via `pac pages upload-code-site`
  → Copilot Studio "IoT Panel Troubleshooting Agent", reached over Direct Line REST
    (not the standard Web Chat embed) from a custom `useAgentChat` hook
```

Existing Dataverse tables: `andy_iot_sensor`, `andy_iottelemetryevent`, `andy_dispatch_history`,
`andy_technician`. Existing Copilot Studio agents: **IoT Dispatch Agent**, **IoT Panel
Troubleshooting Agent**. Existing Power Pages site: **iot-panel-dashboard**, a Code Site
(React SPA) — `src/components/{Layout,Navbar,SwitchIndicator,LedIndicator,AgentButton}.tsx`,
`src/hooks/{useSignalR,useAgentChat}.ts`, `src/context/SignalRContext.tsx`.

**The agent UI pattern (reused as-is for the game, per discussion):** `AgentButton` sits
collapsed by default as a slim "Help Fix" bar between panel sections — quiet unless there's a
mismatch, in which case it pulses amber. Tapping it doesn't open a chat; it sends one
structured prompt (`buildQuickFixPrompt` — current switch/LED state + "reply with ONLY a
plain numbered list of switch actions, no preamble, no markdown, no citations") over Direct
Line and shows just that numbered list inline. Tapping again closes it. No persistent
chat log, no always-visible widget — this is the pattern §6/§8 below carry forward.

This plan extends that proven pipeline — it does not replace it.

## 2. What's new for the game

1. **Multi-item / mode switch.** A physical dial selects which product or issue type is
   currently being troubleshot. The kiosk screen must update to show that item's
   troubleshooting flow.
2. **Win detection.** When a player successfully fixes the device, a record is written to
   Dataverse marking that they won.
3. **QR → spin wheel → prize.** The win produces a QR code on the kiosk. The player scans it
   on their own phone, which spins a wheel and reveals their prize.

## 3. Big decision: Power Pages Code Site — a fresh one, not extending `iot-panel-dashboard`

**Corrected twice now.** First correction: this was never actually "Power Pages multi-page
vs. SPA" — that framing assumed a classic Liquid portal, and the real `iot-panel-dashboard`
is already a Power Pages **Code Site** (a React + Vite SPA with client-side routing).
Second correction, once build actually started: rather than adding routes into
`iot-panel-dashboard` itself, the game is its own fresh Code Site — **`restore-and-spin`**,
built from scratch in `power pages/restore-and-spin/` (§6) — with `iot-panel-dashboard`
treated as reference only for its conventions, not as a codebase to extend. Reasoning that
still holds from the original decision:

- Same platform choice either way: a Power Pages **Code Site** (React + Vite SPA), not a
  classic Liquid multi-page portal — see `KIOSK_UI_SPEC.md` §1 for the shared tokens/
  patterns pulled from `iot-panel-dashboard`'s real source (`theme.css`, `AgentButton.tsx`,
  `useAgentChat.ts`) as the starting point for this app's conventions.
- New routes are just router entries either way: `/kiosk/:deviceSlug` and `/play-spin` in
  `restore-and-spin`'s own `App.tsx`, not mixed into `iot-panel-dashboard`'s `/`, `/history`,
  `/devices`.
- The `AgentButton` / `useAgentChat` pattern (§1) is the reference for the Help-Fix
  integration, ported into this app rather than imported from the other one — the
  Copilot Studio wiring itself is being built separately (§8).

What's now live in `power pages/restore-and-spin/`: `App.tsx` routing, `theme.css` (shared
tokens + all 11 skins), `src/data/deviceProfiles.ts` (all 11 devices, ported from
`KIOSK_UI_SPEC.md` §2), the 5 layout components, `HelpFixBar`/`WinOverlay`/`PrizeWheel`, and
working `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin` routes — verified running via
`npm run dev`. See that folder's own `README.md` for exactly what's stubbed (Copilot
integration, the real claim endpoint, dial-driven navigation, real QR generation) and where
each stub's real wiring point is.

## 3a. Hardware constraint: this all has to fit an 800×480 touchscreen

Every kiosk-facing screen (not `/play-spin`, which renders on the player's own phone)
targets the **official Raspberry Pi 7" touchscreen — 800×480, landscape**, confirmed from
the existing app's `theme.css` kiosk media queries. That means, concretely: no hover-only
affordances (it's touch-only), tap targets sized for a finger at close range, no layout
that assumes it can scroll for more room, and text sized for the stated ~30-50cm viewing
distance the existing CSS comment already calls out. This is a harder constraint than
"small screen" — 480px of *height* in landscape is the tight dimension, not width.

## 4. The hard part: swapping content when the dial switches

Your instinct is the right one: **don't try to make one page dynamically re-skin itself —
make the dial change *navigate* to a different page.**

Corrected topology (per discussion): there are two physical Pis — the existing **panel
Pi** (switches/LEDs, already registered to IoT Hub) and a separate **screen/kiosk Pi**
driving the display. The dial wire is **split electrically to both**: the panel Pi reads
it as one more GPIO input for logging, and the same signal is paralleled to the kiosk Pi's
own GPIO so the machine actually rendering the page can react to it instantly, with no
cloud round-trip in the critical path. (Electrically fine — see the hardware note below.)

**Hardware note:** splitting one dial signal to two Pis' GPIO inputs is safe as long as (a)
the two Pis share a common ground — tie their GND pins together in the harness, since
they're on separate supplies, and (b) both GPIO pins stay configured as inputs on both
boards, always (never let either side drive the line — GPIO inputs are high-impedance, so
two boards reading the same node in parallel is a non-issue; contention would only happen
if a pin got misconfigured as output). Internal pull-ups on both boards just combine in
parallel, which is harmless. If the wire run between the two Pis is long, add basic
debounce (software debounce on both boards is enough for a tabletop build).

1. **Panel Pi (cloud path, authoritative log):** add the dial as one more GPIO read in the
   *existing* telemetry service — no new IoT Hub device needed. Include a `deviceSlug` /
   `dialPosition` field in the same payload already sent for switch/LED state. This flows
   through the existing pipeline (Function → Dataverse `andy_dialstate`/telemetry →
   SignalR) — used for the authoritative record of what was active when, and as a fallback
   signal if the local path below is ever unavailable.
2. **Kiosk Pi (local path, instant swap):** the kiosk Pi reads the same dial line directly
   on its own GPIO. Since it's the machine actually running the browser, it can react
   immediately — no waiting on IoT Hub → Event Hub → Function → SignalR (~5-10s today).
   Simplest implementation: a small local daemon (the same Python GPIO-watcher pattern
   already used on the panel Pi) that, on dial change, pushes a `deviceSlug` message over a
   **local** WebSocket (`ws://localhost:<port>`) that the kiosk browser page is already
   connected to.
3. Every `/kiosk/:deviceSlug` route listens on **both** channels: the local WebSocket
   (primary — near-instant) and the existing cloud SignalR group (secondary/fallback, and
   still the source of truth written to Dataverse). On a message whose `deviceSlug` doesn't
   match the currently-mounted route, from either channel, it calls React Router's
   `navigate('/kiosk/' + payload.deviceSlug)` — **not** `window.location.href`. This is the
   one correction from the original draft: since this is an SPA with a shared
   `SignalRContext` already open at the app root, a hard page reload would force that
   connection to reconnect on every dial turn for no benefit. Client-side navigation keeps
   it alive.
   - To still get the "no stale state carries over" guarantee a hard reload would have
     given for free, key the route's page component on `deviceSlug`
     (`<KioskDevicePage key={deviceSlug} ... />`) so React fully unmounts the old device's
     component tree and mounts a fresh one on every change — same guarantee, without
     dropping the socket.
   - Dedupe by `deviceSlug` so a slightly-delayed cloud message doesn't re-trigger a
     navigation the local WebSocket already fired.
4. Each `/kiosk/:deviceSlug` route is self-contained: its own copy (intro, troubleshooting
   text, images), its own `AgentButton` prompt template (§1, §8), and its own
   panel-telemetry subscription for that device's switch/LED state — all sourced from the
   `andy_deviceprofile` row for that slug (§5).

**Panel logic is per-device, not shared.** Each of the 11 devices needs its own switch/LED
behavior, not one shared `logic_map.json`. Extend the existing "edit in repo, Pi pulls on
boot" convention rather than replacing it:

- `raspberry-pi/logic_maps/<deviceSlug>.json` — one file per device (5 files, `smart-lock`,
  `thermostat`, etc.), same schema as today's single `logic_map.json`.
- Since the panel Pi already reads the dial locally (step 1 above), it also decides locally
  which file is active — no extra network round-trip needed. On dial change, it loads
  `logic_maps/<deviceSlug>.json` into memory and applies that ruleset to subsequent
  switch/LED reads.
- Position 1 (demo/info, §0) has no real wiring logic to enforce — the panel Pi can either
  skip logic entirely for that position or use a trivial "all LEDs off" file, whichever
  matches how the demo page is meant to look.
- Content authoring for these 5 rulesets (what "fixed" looks like per device) is tracked as
  its own work item — see §9.

This keeps every route simple and independently editable, and the "swap" is just a
keyed client-side route change — no hand-rolled state machine, and no risk of stale state
bleeding from one device's session into the next, while the SignalR connection stays warm
across the whole dial cycle.

## 5. Dataverse schema additions

All new tables use the project's publisher prefix, `andy_` — the same prefix already used
by the existing tables (`andy_iot_sensor`, `andy_iottelemetryevent`, `andy_dispatch_history`,
`andy_technician`). `project.tokens.json` still needs `YOUR_PUBLISHER_PREFIX` stamped to
`andy` to make that official, but the schema below is written against the real value, not a
placeholder.

### `andy_deviceprofile` — one row per dial position (12 total: 1 demo + 11 devices)
| Column | Type | Notes |
|---|---|---|
| `andy_name` | String | Display name, e.g. "Smart Lock", or "Demo / Info" for position 1 |
| `andy_deviceslug` | String | URL slug, matches `/kiosk/<slug>` page and telemetry `deviceSlug` |
| `andy_dialposition` | Whole Number | 1–12, matches the physical dial position reported by the Pi |
| `andy_isgamedevice` | Yes/No | `No` for position 1 (demo/info) — tells the win-detection and Copilot-agent wiring to skip this page entirely |
| `andy_introcopy` | Multiline text | Optional — intro/troubleshooting copy if not hardcoded in the page |
| `andy_copilottopic` | String | Which Copilot Studio topic/context this page should invoke (null for the demo page) |
| `andy_layout` | Choice | Which control-panel layout renders this device — one option per layout in `KIOSK_UI_SPEC.md` §2 (dial-arc / keypad / dip-strip / paired-columns / radio-cluster). Lets a future 6th device reuse an existing layout via data instead of a new code branch |
| `andy_isactive` | Yes/No | Allows retiring a device type without deleting history |

> **Superseded by a fuller spec:** the `andy_gamewin` and `andy_prize` schemas below are the
> short version. [`PRIZE_ENGINE_SPEC.md`](PRIZE_ENGINE_SPEC.md) has the full column list
> (including the redemption-lifecycle fields needed for physical prize handoff at the
> booth), the weighting algorithm with a worked example, the atomic-decrement/concurrency
> approach, and the empty-pool fallback rule. Build against that document for these two
> tables, not this summary.

### `andy_gamewin` — one row per completed troubleshooting session
| Column | Type | Notes |
|---|---|---|
| `andy_deviceprofile` | Lookup → `andy_deviceprofile` | Which item was fixed |
| `andy_claimtoken` | String (GUID) | Encoded in the QR code; single-use |
| `andy_status` | Choice | `Unclaimed` / `Claimed` / `Expired` |
| `andy_wontime` | DateTime | When the fix was detected |
| `andy_prize` | Lookup → `andy_prize` | Null until claimed |
| `andy_claimedtime` | DateTime | Null until claimed |
| `andy_contestantname` | String | Optional — null if the player skips sharing |
| `andy_contestantemail` | String | Optional — null if the player skips sharing |
| `andy_sharedinfo` | Yes/No | Whether the player opted in — purely informational, never gates the spin/prize |

### `andy_prize` — prize catalog ("Prizes")
| Column | Type | Notes |
|---|---|---|
| `andy_name` | String | Prize name |
| `andy_value` | Decimal/Currency | Reference value — informational, and the basis for setting weight (see below) |
| `andy_weight` | Whole Number | Relative odds on the wheel — **set inversely to `andy_value`**: cheap/common items get a high weight, rare/high-value items get a low weight. This is the field the picker actually uses |
| `andy_remaining` | Whole Number | Finite stock — decremented atomically on claim; 0 = drops out of the wheel |
| `andy_isactive` | Yes/No | |

`cascadeDelete: Restrict` on both lookups, per existing table conventions.

**Why two fields instead of deriving weight from value automatically:** a strict formula
(e.g. `weight = 1/value`) is brittle — event organizers usually want to hand-tune odds
without doing math (e.g. "make the grand prize rarer than its dollar value alone would
suggest" for supply-count reasons). `andy_value` documents intent/reporting; `andy_weight` is
the actual dial admins turn. If you'd rather have a formula compute weight automatically
from value, that's a small change to flag before build.

## 6. Code site structure

> **Visual/interaction spec lives separately:** see [`KIOSK_UI_SPEC.md`](KIOSK_UI_SPEC.md)
> for exactly what each component below should look like and do — per-device palettes,
> fonts, motifs, the 5 distinct control-panel layouts, the Help-Fix and win-overlay
> behavior, and the phone flow. This section is about where the code lives; that one is
> what to build.

A fresh Code Site — `power pages/restore-and-spin/` — built against `iot-panel-dashboard`'s
real source as a style/pattern reference (§3), not as a codebase extended in place. This is
the **actual current structure**, already built and verified running (`npm run dev`), not a
plan:

```
power pages/restore-and-spin/
├── src/
│   ├── App.tsx                        # routes: /kiosk/info, /kiosk/:deviceSlug, /play-spin
│   ├── main.tsx
│   ├── types/game.ts                  # DeviceProfile, LampColor, DeviceState, Prize
│   ├── data/
│   │   ├── deviceProfiles.ts          # all 11 devices — content from KIOSK_UI_SPEC.md §2
│   │   └── prizes.ts                  # TEMPORARY client-side prize pool — see §9 below
│   ├── components/
│   │   ├── LampDot.tsx, TactileButton.tsx, DialTicks.tsx   # shared primitives
│   │   ├── HelpFixBar.tsx             # collapsed "Help Fix" pattern (§1/§8) — static steps for now
│   │   ├── WinOverlay.tsx             # full-viewport takeover, 10s countdown, placeholder QR
│   │   ├── PrizeWheel.tsx             # canvas wheel — client-side pick for now, see §9
│   │   └── layouts/                   # the 5 distinct control-panel layouts (KIOSK_UI_SPEC.md §2)
│   │       ├── DialArcPanel.tsx, KeypadPanel.tsx, DipStripPanel.tsx,
│   │       │   PairedColumnsPanel.tsx, RadioClusterPanel.tsx
│   │   └── styles/theme.css           # shared tokens + all 11 skins
│   └── pages/
│       ├── KioskInfoPage.tsx          # /kiosk/info — dial position 1, demo/info, no agent
│       ├── KioskDevicePage.tsx        # /kiosk/:deviceSlug — one component, 11 data-driven instances,
│       │                              #   keyed by slug at the router level (App.tsx) — §4
│       └── PlaySpinPage.tsx           # /play-spin — optional-info → wheel → result
├── package.json, vite.config.ts, tsconfig.json, index.html
└── README.md                          # what's stubbed and where the real wiring goes
```

Not yet built (tracked in that app's own `README.md`, not repeated here): the real
`AgentButton`/`useAgentChat` Direct Line wiring (§8, being built separately), the real claim
endpoint replacing `data/prizes.ts`'s client-side pick (`PRIZE_ENGINE_SPEC.md` §1), the
local-WebSocket dial listener that would make `useDialNav`-style navigation real (§4 below
— there's no dial hardware yet to build it against), and real QR encoding in `WinOverlay`.

`App.tsx`'s router gains `/kiosk/info`, `/kiosk/:deviceSlug` (rendered by the same
`KioskDevicePage`, keyed by the slug per §4), and `/play-spin`. Deployed the same way as
today — `npm run build` then `pac pages upload-code-site` — no new `pac pages upload`
(classic-portal) path involved anywhere.

## 7. Win → QR → Spin flow

> **See [`PRIZE_ENGINE_SPEC.md`](PRIZE_ENGINE_SPEC.md) §3 for the fuller version of this
> flow** — it continues past step 6 below into what happens physically at the booth
> (redemption codes, staff lookup, marking a prize as handed over), which this summary
> doesn't cover.

1. Player works through the troubleshooting agent (the `AgentButton` "Help Fix" pattern,
   §1/§8) on the active `/kiosk/:deviceSlug` route (`andy_isgamedevice = Yes` — the demo/info
   route never enters this flow).
2. On win, the agent's resolved-topic action creates a `andy_gamewin` row: `status =
   Unclaimed`, `claimtoken = new GUID`, `deviceprofile = <current>`.
3. The kiosk page — already listening on SignalR — receives the win event and renders a
   full-screen QR code pointing at `https://<site>/play-spin?token=<claimtoken>`.
4. Player scans with their phone → lands on `/play-spin`. Page first asks (optional, with a
   clear skip option): "Want to share your name/email for [whatever the upside is]?" —
   skipping proceeds identically to sharing; `andy_sharedinfo` just records which happened.
5. `/play-spin` page JS calls a **Custom API — an HTTP-triggered endpoint on the existing
   Azure Function App**, not a Power Automate flow and not a raw anonymous table PATCH,
   with the token (plus name/email if shared). Weighted-random-with-atomic-decrement is
   naturally imperative logic (loop + retry-on-conflict) that's much easier to write and
   unit-test in the Function's existing Node.js codebase than in a low-code flow designer:
   - Validates the token exists and `status = Unclaimed`.
   - Filters `andy_prize` to `andy_isactive = true AND andy_remaining > 0`, does a weighted-random
     pick using `andy_weight` (see §5 — lower weight for higher-value prizes), then decrements
     `andy_remaining` using a concurrency-safe update (Dataverse optimistic concurrency /
     `If-Match` ETag, or a retry-on-conflict loop) so two simultaneous claims can't both take
     the last unit of a prize.
   - If the decrement fails because another claim just took the last unit, re-pick from the
     remaining pool before responding — don't let the player see a prize that's actually
     sold out.
   - Sets `status = Claimed`, `prize = <chosen>`, `claimedtime = now`, and the optional
     contestant fields, all in the same request (also avoids the race condition of two
     devices opening the same link).
   - Returns the prize to the page, which then runs the spin animation and lands on the
     returned result (so the *visual* spin is theater — the prize was already decided
     server-side, which is what prevents replay/double-claim).
6. Kiosk resets to attract/idle **10 seconds** after showing the QR/win screen. If the dial
   is turned again before that — whether during troubleshooting or during the win/QR
   screen — the resulting page navigation (§4) itself is the reset: no partial session or
   pending win state carries into the newly-selected device.

Routing the claim through a server-side endpoint instead of exposing `andy_gamewin` to
anonymous Web API writes is the one non-negotiable security point here — an unguessable
GUID is a reasonable bearer token, but only if the "spend it" step is server-side and
atomic.

## 8. Copilot Studio agent changes

> **Deferred — owned separately by the user, outside this plan's build-out for now.**
> The integration points this plan depends on (the `AgentButton`/`useAgentChat` pattern
> per `/kiosk/:deviceSlug` route, a resolved-topic action that creates the `andy_gamewin`
> row) are still noted below so the page work in §6 leaves the right hooks in place, but
> the topic dialogue itself is not being built here.

- Reuses the existing pattern exactly (§1): collapsed "Help Fix" bar, pulses amber only
  when `hasMismatch`, and on tap sends one structured prompt built from the device's live
  switch/LED state (`buildQuickFixPrompt`-equivalent per device, using that device's
  target state from §11 instead of the current dashboard's "all 4 LEDs on") and displays
  **only** the numbered-list response — no persistent chat, no free-form Q&A.
  `deviceProfiles.ts` (§6) supplies each device's `andy_copilottopic` so the same component
  can point at a different topic per device without new component code.
- The existing **IoT Panel Troubleshooting Agent** becomes device-aware: either (a) one
  agent with topics parametrized by a `deviceSlug` variable passed in from the prompt, or
  (b) one topic per device type inside the same agent. Prefer (a) unless the
  troubleshooting logic diverges enough per device to warrant separate topics — start
  simple, split later if needed.
- The agent needs a way to signal "resolved" back to the platform (topic reaching a
  specific end state calls a flow/action that writes the `andy_gamewin` row).

## 9. Remaining items (non-blocking)

All architecture-gating questions are resolved (§0). What's left is content/build-out work,
not design decisions:

1. **Author the 11 device profiles + the demo/info page** — the roster, fault scenarios, and
   restore conditions are now decided (§11). What's left is turning each row into actual
   Copilot Studio topic dialogue (the step-by-step diagnostic conversation) and the
   corresponding `logic_maps/<slug>.json` rules. Still likely the single largest chunk of
   real work in the project — flag if you want help drafting the topic dialogue next.
2. **Restock/low-stock reporting** — deliberately deferred, to be worked on as its own
   piece once `andy_prize` exists. Likely a small Power BI report or admin view over
   `andy_remaining` per prize; no design blocker, just not scheduled yet.
3. **Exact wheel-spin visual/animation** — the claim result is decided server-side (§7);
   the spin itself is just presentation. Left open until `/play-spin` is actually built.

## 10. Phased build plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Dataverse: `andy_deviceprofile` (6 rows incl. demo), `andy_gamewin`, `andy_prize` tables + choices/relationships | ⬜ TODO |
| 2 | Panel Pi: add dial GPIO read + `deviceSlug` field to existing telemetry payload; author 5 `logic_maps/<slug>.json` files. Kiosk Pi: split dial wire (shared ground), local GPIO-watcher daemon + local WebSocket | ⬜ TODO |
| 3 | Code site (`restore-and-spin`, §6): `KioskInfoPage` + `KioskDevicePage`, all 11 devices, 10s reset timer, built against the real 800×480 viewport (§3a) | ✅ Done — `useDialNav`/local WebSocket still ⬜ TODO, no hardware yet to build it against |
| 4 | Copilot Studio: parametrize troubleshooting agent by `deviceSlug`, wire resolved-topic → win-creation action | ⬜ TODO — being built separately |
| 5 | Azure Function: new claim endpoint (validate token → weighted-pick from `andy_prize` → atomic decrement → mark claimed) | ⬜ TODO — `PlaySpinPage` currently picks client-side as a stand-in |
| 6 | Power Pages: `/play-spin` page, QR generation on kiosk win, wheel animation | ✅ Done, except real QR encoding (placeholder pattern) and the real claim call (depends on Phase 5) |
| 7 | All 11 device pages + content | ✅ Done |
| 8 | Playwright e2e: dial-switch navigation (incl. mid-session reset), win → QR → claim → no-double-claim regression | ⬜ TODO |
| Future | Low-stock/restock reporting (§9) | Future |

Update `requirements/PLAN.md` with these as tracked items now that scope is locked.

## 11. Device roster

Spans home → military so a Power Platform Community Conference crowd of very different
backgrounds each recognize something. Every device reuses the **same physical panel**
(4 switches, 4 LEDs) — only the theme, `logic_maps/<slug>.json` ruleset, and Copilot Studio
topic differ per `andy_deviceprofile` row. Every device's win condition is framed the same
way — restore it from a faulted state back to normal working order — so the agent's closing
line follows one consistent shape across all five.

| # | `andy_deviceslug` | Device | Switches | LEDs | Fault (starting state) | Restore condition | Win message |
|---|---|---|---|---|---|---|---|
| 1 | `thermostat` | Smart Thermostat *(Home)* | Power / Eco Mode / Fan / Heat-Cool Select | Power / Heating / Cooling / Fault | Heat and Cool both engaged at once — conflicting mode trips Fault | Power on, exactly one of Heat/Cool matches the select switch, Fault clears | "Thermostat restored — holding your set temperature." |
| 2 | `smart-lock` | Smart Lock & Security Panel *(Home/Security)* | Power / Deadbolt Engage / Auto-Lock / Alarm Arm | Locked / Unlocked-Ajar / Low Battery / Tamper Alert | False tamper trip + low battery disengaged the deadbolt | Power on, deadbolt engaged, alarm armed, tamper cleared | **"House is secured now."** |
| 3 | `coldchain-sensor` | Cold-Chain Warehouse Sensor *(Enterprise/Industrial)* | Power / Calibration / Alert Threshold / Cloud Sync | In-Range / Alert-High / Alert-Low / Link Status | Drifted calibration triggers false Alert-High; cloud link dropped | Calibration corrected, In-Range lit, cloud link restored | "Cold storage is stable and monitoring is back online." |
| 4 | `water-pump` | Water Pump Station Controller *(Public Sector/Utility)* | Power / Pump Enable / Pressure Relief / Remote Override | Running / Pressure OK / Fault / Remote-Connected | Pressure spike tripped Fault + disabled pump; remote override left on from maintenance | Pressure relieved, Fault cleared, remote override off, pump re-enabled | "Pump station is back online and operating normally." |
| 5 | `field-radio` | Tactical Field Radio / Comms Relay *(Military/Defense)* | Power / Encryption Mode / Channel Hop / Transmit Enable | Signal Lock / Encrypted Link / Battery Critical / Interference | Wrong channel causing interference; encryption mismatched with base | Clear channel found, encryption matched, signal + encrypted link both lit | "Secure link established with base." |
| 6 | `ev-charger` | Smart EV Charger *(Home)* | Power / Charge Enable / Reset Breaker / Schedule Mode | Charging / Fault / Scheduled / Connected | Breaker tripped, charging disabled | Breaker reset, charging enabled | "EV charger restored — charging resumed." |
| 7 | `elevator` | Elevator Control Panel *(Enterprise/Facilities)* | Power / Door Sensor Reset / Floor Call Override / Emergency Phone Test | Ready / Door Fault / In Service / Alarm | Door sensor fault; floor call override stuck on | Door sensor reset, override cleared | "Elevator back in service." |
| 8 | `traffic-signal` | Traffic Signal Controller *(Public Sector/Transportation)* | Power / Auto Timing / Manual Override / Pedestrian Signal | Cycling / Conflict / Override / Pedestrian Req | Manual override stuck on; auto timing disabled | Auto timing on, override cleared | "Traffic signal restored to normal cycle." |
| 9 | `patient-monitor` | Hospital Patient Monitor *(Healthcare)* | Power / Leads Check / Alarm Silence / Backup Battery | Vitals OK / Lead-Off / Battery Low / Alarm Muted | Lead disconnected; alarm silenced | Leads reconnected, alarm active | "Patient monitor restored — vitals streaming normally." |
| 10 | `retail-kiosk` | Retail Payment Kiosk *(Commercial/Retail)* | Power / Card Reader Reset / Printer Feed / Network Sync | Ready / Reader Offline / Printer Jam / Synced | Card reader offline; network sync dropped | Reader reset, network synced | "Payment kiosk back online and processing." |
| 11 | `drone-ground-control` | Drone Ground Control *(Aerospace/Defense)* | Power / GPS Lock / RTH Override / Payload Arm | GPS Locked / Link Up / Battery Critical / RTH Active | GPS lock lost; Return-to-Home stuck engaged | GPS locked, RTH cleared | "Drone link restored — ready for flight ops." |

Kept deliberately to comms/sensor/logistics-flavored equipment for #5 and #11 rather than
weapons systems — reads as "cool tactical tech" at a booth without anything that'd feel
out of place. #6–11 round the roster out to the corrected 12-position dial (§0):
home/enterprise/public-sector get a second entry each, plus two new sectors (healthcare,
commercial/retail) for broader recognition across a large, varied conference crowd.

Each row above becomes one `andy_deviceprofile` record (dial positions 2–12) plus one
`logic_maps/<slug>.json` file (§4) plus one `/kiosk/<slug>` page (§6) plus one Copilot
Studio topic (§8) walking the fault → restore steps in that row. Full visual spec
(palette/font/motif, and which of the 5 control layouts each reuses) is in
`KIOSK_UI_SPEC.md` §2.
