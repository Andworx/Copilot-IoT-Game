# Genpage Plan

## User Requirements
Create a generative page for the model-driven app (Power Apps) that lets a maker
bulk-add more Prize records into the andy_Prizes table faster. The page should have
a Prize Type choice/picker (selecting from the existing andy_PrizeTypes table
records) and a quantity input, to make it quick to add many Prizes in the future.
Prize Name and Prize Info (both required on andy_Prizes) are auto-filled from the
selected Prize Type — no extra fields needed from the user.

## Working Directory
C:/Code Projects/Copilot-IoT-Game/power apps/bulk-add-prizes

## Plugin Root
C:/Users/edrft/AppData/Roaming/Code/agentPlugins/file-c-3A-Users-edrft-copilot-installed-plugins-power-platform-skills-model-apps/1a086730b00

## Environment
- URL: https://andworx-development.crm.dynamics.com
- App: Game Backend (b3e4d83d-ccab-f111-aaac-7ced8dd8cdea)
- Languages: English (1033) only
- Solution: CopilotIoTGame
- Publisher Prefix: andy

## Pages
| Page | File | Purpose | Entities |
|------|------|---------|----------|
| Bulk Add Prizes | bulk-add-prizes.tsx | Quickly create many Prize records at once from a Prize Type + quantity | andy_prizes, andy_prizetypes |

## Entity Creation Required
No entity creation required — all entities already exist.

## Existing Entities
andy_prizes, andy_prizetypes

## Connector Bindings
No connector bindings.

## Custom API Bindings
No custom API bindings.

## Solution Packaging
- Package into solution: true
- Solution unique name: CopilotIoTGame
- Connection references: none

## Design Preferences
- Styling: Match the existing Game Backend model-driven app look — clean, compact
  Fluent UI V9 form, no custom colors/theme overrides.
- Features: Prize Type selector (Combobox/Dropdown bound to andy_prizetypes,
  showing andy_prizetypename), a Quantity numeric input (min 1, integer), and a
  "Create Prizes" submit action. On submit, create `Quantity` new andy_prizes rows,
  each with: andy_prizetype set to the selected Prize Type, andy_prizename set to
  the selected Prize Type's andy_prizetypename (append " #1", " #2", ... when
  Quantity > 1 to keep names distinguishable), andy_prizeinfo set to an
  auto-generated note (e.g. "Bulk added on <date> via Bulk Add Prizes page"), and
  andy_prizetaken set to false (not yet taken). Show a success message with how
  many prizes were created, and a running list/table of prizes created in the
  current session on this page. Disable submit while the selected Prize Type or
  quantity is invalid, and show inline validation errors.
- Accessibility: WCAG AA — labeled form fields, keyboard-navigable submit,
  aria-live region for the success/error message.

## Relevant Samples
| Page | Sample | Reason |
|------|--------|--------|
| Bulk Add Prizes | 6-comprehensive-form.tsx | Form layout, validation, and submit patterns |
| Bulk Add Prizes | 3-account-crud-dataverse.tsx | Dataverse create/list patterns via dataApi |

## Per-Page Specifications

### Bulk Add Prizes
- **File:** bulk-add-prizes.tsx
- **Purpose:** Quickly create many Prize records at once from a Prize Type + quantity
- **Entities:** andy_prizes, andy_prizetypes
- **Needs caching:** true
- **Key Features:** Load Prize Types on mount for the picker; form with Prize Type
  Combobox and Quantity number input; on submit, loop `Quantity` times creating
  andy_prizes rows via dataApi with andy_prizetype, auto-filled andy_prizename
  (append index when > 1), auto-filled andy_prizeinfo note, andy_prizetaken =
  false; show progress/result summary and a session list of created prizes with
  their names; allow resetting the form to add another batch.
- **Components:** Fluent UI V9 `Card`, `Field`, `Combobox`/`Dropdown`,
  `Input` (type=number) or `SpinButton`, `Button`, `MessageBar`, `Table` /
  `DataGrid` for the created-prizes list, `Spinner` for in-flight state.
- **Layout:** Single-column responsive form (max-width container, centered),
  stacked fields with flexbox, full-width on small viewports.
- **Data Binding:** `dataApi.retrieveMultipleRecords` (or `queryTable`) against
  andy_prizetypes for the picker options; `dataApi.createRecord` against
  andy_prizes once per unit of quantity on submit.
- **Interactions:** Combobox selection, numeric input with min/max validation,
  submit button with loading state, success/error MessageBar, "Add Another Batch"
  reset action.
