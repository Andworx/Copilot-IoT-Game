# MCP Quest Player Page

Power Pages Code Site (React + Vite SPA) for the MCP Quest station: a single-play,
scored game where the player calls read-only tools against a mock service desk, answers
a few questions, and lands on a high-score board. A passing run mints a prize QR through
the shared prize engine. Design and status: [requirements/MCP_QUEST_PLAN.md](../../requirements/MCP_QUEST_PLAN.md).

This runs on its own tablet or computer. It does not use `andy_gameboxstate`, `set-mode`
or the Game Box SignalR hub.

## Structure

```
power pages/mcpquest/
├── powerpages.config.json   # Code Site name and compiled output path
├── src/
│   ├── App.tsx              # Phase state machine: idle → playing → submitting → result
│   ├── config.ts            # API base URL, backend selection, ?station= parsing
│   ├── types.ts             # Shared shapes + the GameApi interface
│   ├── platform.ts          # The six Power Platform products
│   ├── designs.ts           # Flow and report design models, palettes, parsers
│   ├── format.ts            # Duration and JSON helpers
│   ├── api/
│   │   ├── localApi.ts      # Browser-side session, choose/test/submit, scoring, leaderboard
│   │   ├── modes.ts         # Game modes and the Investigate question builders
│   │   ├── cases.ts         # Fix-it cases: briefs, scenarios, acceptance criteria
│   │   ├── flowRunner.ts    # Executes a flow design against a scenario via MCP
│   │   ├── appRunner.ts     # Runs a canvas app as a person would use it
│   │   ├── siteRunner.ts    # Previews a Power Pages site as a visitor
│   │   ├── agentRunner.ts   # Sends a message through a Copilot Studio agent
│   │   ├── aggregate.ts     # Counts and option lists for the designers
│   │   ├── world.ts         # Shared World / WorldData / ObjectiveTemplate types
│   │   ├── shuffle.ts
│   │   ├── mcpWorld.ts      # "mcp" backend: real MCP JSON-RPC to an MCP server
│   │   ├── mockApi.ts       # "preview" backend: simulated tools, no MCP
│   │   └── httpApi.ts       # "live" client for /api/mcpquest/*
│   ├── components/          # CaseWorkspace, ToolChooser, RunHistory, and one designer per
│   │                        # product (Flow, Report, App, Site, Table, Security, Agent),
│   │                        # ObjectivesPanel, ToolWorkbench, McpStatus,
│   │                        # ResponseViewer, StartScreen, ResultScreen, Leaderboard
│   └── styles.css
└── vite.config.ts           # Dev server on port 5177
```

## Usage

```powershell
cd "power pages\mcpquest"
npm install
npm run dev      # http://localhost:5177
npm run build    # tsc -b && vite build
```

## Query parameters and configuration

| Setting | Purpose |
|---|---|
| `?mode=fixit` (default) / `incident-queue` | Preselects the mission on the start screen. |
| `?station=<slug>` | Identifies the physical device, sent on `start`. Defaults to `default`. |
| `?spec=<16 hex>` | Plays a generated game by id on the live backend (mission `spec:<id>`). |
| `?specUrl=<url>` | Plays a saved generated game (a file written by `generate-spec.mjs`) in the browser, with no backend. Not in live builds. |
| `?api=mcp` (default) / `preview` / `live`, or `VITE_MCPQUEST_API` | Backend, see below. |
| `VITE_MCPQUEST_MCP_URL` | MCP server for the `mcp` backend. Defaults to the public MCP Station `it-ticketing` server. |
| `VITE_API_BASE_URL` | Functions backend. Defaults to the same host as the Plinko display. |
| `VITE_PRIZE_WHEEL_URL` | Player phone Prize Wheel site the claim QR points at. |

## Backends

The page talks to a `GameApi` interface (`src/types.ts`) with three implementations:

| Kind | Tools come from | Scoring | Prize-eligible |
|---|---|---|---|
| `mcp` (default) | A real MCP server. The browser sends JSON-RPC `initialize`, `tools/list` and `tools/call` straight to it. | In the browser | No |
| `preview` | Simulated tools in `mockApi.ts`. No MCP involved. | In the browser | No |
| `live` | The Function App (`/api/mcpquest/*`): judge, state and prize claim all server-side. | On the server | Yes |

In `mcp` mode the questions and answer keys are built from the server's own data at the
start of every play, only read-only tools (`readOnlyHint`) are shown, and every call can be
inspected under Response → "MCP messages" (the raw JSON-RPC request and response). The
status strip above the tools shows the connected server, protocol version and endpoint.
If the MCP server cannot be reached the play falls back to `preview` with a banner, and the
next player tries MCP again.

The `mcp` and `preview` backends are prototyping paths: the answer key lives in the browser
and the public MCP Station server is a third-party dependency. Events and prizes use `live`,
which keeps the keys, the judge and the win-minting call on the server.

**Shipping a live build:** build with `VITE_MCPQUEST_API=live`. The browser-side backends and
all case logic are then left out of the bundle entirely (they are loaded on demand in other
builds). The shared contract and the judge live in the Function App
(`azure/functions/game/src/mcpquest/`) and are imported through the `@mcpquest` alias, so a
Code Site build now also depends on that folder. See
[docs/MCP_QUEST_ENGINE.md](../../docs/MCP_QUEST_ENGINE.md).

## Modes

| Mode | What the player does |
|---|---|
| `fixit` (default) | Three business problems. For each: choose the right Power Platform product, **build the solution in that product's designer**, and test it against the live service desk. |
| `incident-queue` | Three fact-finding questions answered by querying the system (a warm-up). |

### Fix it with Power Platform

Each play draws three cases from the pool in `src/api/cases.ts`, one per product, so a play
shows breadth. A case has a brief, acceptance criteria ("what a good solution does"), and a
checker that runs against what the solution actually did.

1. **Choose the tool.** A Create-page-style grid of the six products. A wrong choice explains
   what that product is for and costs points; the right one opens its designer.
2. **Build it** in that product's designer:

   | Product | Designer | What the player builds |
   |---|---|---|
   | Power Automate | Flow designer | Trigger, conditions, MCP actions, approval, email |
   | Power BI | Report designer | A visual and a field well, with a live chart of the real data |
   | Power Apps | Canvas app designer | Controls on a screen (text input, dropdown, button, gallery) wired to the service desk |
   | Power Pages | Site designer | Authentication, table permissions and who can submit |
   | Dataverse | Table designer, security roles | Column data types (text, choice, lookup) and role privileges |
   | Copilot Studio | Agent designer | Knowledge sources and MCP actions the agent may use |

3. **Test it.** Flows, apps, sites and agents are *run*: scenarios drawn from the live data
   are pushed through the design and a run history shows each step and, for MCP steps, the
   real inputs and outputs. Reports, tables and security roles are judged on the design
   itself. Six tests per case.
4. **Submit.** The same checks run again as the final grade.

Writes on the public MCP Station server are simulated (`_mock: true`), so nothing persists.
Where the server validates input (for example `create_incident` needs a description and a
category) an app that forgets a field gets a real rejection.

There is no raw tool panel in this mission: the MCP server is reached through the
designers and their test runs, and each case states what a good solution does. The raw tools
panel and response viewer only appear in the Investigate warm-up, which needs them.

Cases in the pool (13): *Hand-sorted queue*, *Sign-off by email chain*, *The 7am status
chase* (Power Automate); *No big picture*, *Too much marked urgent?*, *Who is carrying the
load?* (Power BI); *Problems arrive by email*, *Technicians on the move* (Power Apps);
*Partners can't get in* (Power Pages); *Four spreadsheets, four truths*, *Everyone can edit
everything* (Dataverse); *Same question, every day*, *Please just open it for me* (Copilot
Studio).

Designs travel as JSON in `answers[objectiveId]`, so the same payload can go to the Function
judge later.

## Scoring (preview defaults, tuned in the backend later)

| Component | Rule |
|---|---|
| Investigate answer | 100 each |
| Fix it: right tool | 30, minus 10 per wrong choice |
| Fix it: build | up to 100, in proportion to the acceptance criteria met |
| Speed bonus | up to 100, full at half of par time, zero at twice par (par 4:00, or 8:00 in Fix it) |
| Extra tool calls | −5 per call beyond 8, capped at −50 (test runs are not counted) |
| Hints | −25 each |
| Pass | Investigate: every answer correct and at least 250. Fix it: every solution meets all its criteria and at least 330 (max 490) |

Speed bonus only counts once something is correct. Fix-it plays end at 20 minutes and
Investigate at 15; whatever is built is submitted automatically.

## Deployment

**Current state (2026-10-09):** bootstrapped by hand into the Development environment with
`pac pages upload-code-site`. The website record exists but has **not been activated**, so it
has no public URL yet.

| | |
|---|---|
| Site name | MCP Quest |
| Website ID | `4fb95e05-e635-4f0c-a0e3-4065f5dfb72a` |
| Environment | Development (`andworx-development.crm.dynamics.com`) |
| Activation | Pending: activate through Power Pages or `pac pages activate --webSiteId <id>`; it uses site capacity |

Manual re-upload (recovery only; the generated `.powerpages-site/` folder is git-ignored and
is what ties the upload to this website, so keep it local and never commit it):

```powershell
cd "power pages\mcpquest"
npm install
npm run build
pac pages upload-code-site --rootPath "."
```

Still to do for routine releases, following the Plinko pattern in
[docs/CI_CD.md](../../docs/CI_CD.md): add a `POWER_MCPQUEST_WEBSITE_ID` repository variable
with the ID above, add build and deploy steps to `.github/workflows/deploy-apps.yml`, and add
a section to `PAC_COMMANDS.md`.

Things to check once it is live:

- **Content Security Policy.** The page calls the MCP server directly from the browser. If
  the site's CSP blocks that origin, the status strip will show "Offline preview" instead of
  "MCP connected" and the play falls back automatically.
- **Site visibility.** Confirm whether the site is private before sharing a link.

## Updating This README

Update it when routes, query parameters, environment variables, scoring or the deployment
flow change.
