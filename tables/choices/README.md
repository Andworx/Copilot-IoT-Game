# Global Choices (Option Sets)

Global choice definitions consumed by `scripts/Import-Tables.ps1`. Schema documented in
`tables/README.md`. The generic template base value is `756150000`, but this
environment's real publisher option-value prefix is `43570` (from
`solutions/CopilotIoTGame/Other/Solution.xml`'s `CustomizationOptionValuePrefix`) —
so real global choices here start at `435700000`, confirmed against
`andy_layout` (built manually in the maker portal, which assigns this
automatically; only matters if you're hand-writing values in a
`definition.json` for the scripted path). Increment by 1 per option either way.

| Choice | Used by | Notes |
|---|---|---|
| `andy_layout` | `andy_deviceprofile.andy_layout` | The 5 control-panel layouts in `power pages/restore-and-spin/src/components/layouts/` |
| `andy_gamewinstatus` | `andy_gamewin.andy_status` | Digital claim status (Unclaimed/Claimed/Expired) — PRIZE_ENGINE_SPEC.md §2.2/§2.3 |
| `andy_redemptionstatus` | `andy_gamewin.andy_redemptionstatus` | Physical handoff status (Not Redeemed/Redeemed) — PRIZE_ENGINE_SPEC.md §2.2/§2.3 |
