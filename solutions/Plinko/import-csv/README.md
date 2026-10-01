# Plinko CSV Import Guide

These CSV files are intended for creating the initial table shapes in a Power Apps solution. Before importing, create or select the `Plinko` solution, set it as the preferred solution, and confirm the publisher prefix is `andy`.

CSV import is useful for the initial columns and starter rows, but it cannot fully express every Dataverse metadata requirement. After importing, review [plinko-schema-map.csv](plinko-schema-map.csv) and apply the remaining Dataverse settings manually in the maker UI.

## Import Order

1. In the existing PrizeEngine-backed environment, import [andy_contestsource_plinko.csv](andy_contestsource_plinko.csv) into `Contest Source` if the `plinko` source does not already exist.
2. Create the `Plinko` solution in Power Apps and set it as the preferred solution.
3. Import [andy_plinkostation.csv](andy_plinkostation.csv) to create `Plinko Station`.
4. Import [andy_plinkoplay.csv](andy_plinkoplay.csv) to create `Plinko Play`.
5. Add or fix the lookup columns that CSV import cannot reliably create:
   - `andy_plinkoplay.andy_prizeclaim` lookup to `andy_prizeclaim`, required.
   - `andy_plinkoplay.andy_station` lookup to `andy_plinkostation`, optional or business required depending on ingestion flow.
6. Add alternate keys:
   - `andy_plinkostation`: `andy_stationslug`.
   - `andy_plinkoplay`: `andy_hardwareeventid`.
7. Import or create the active-campaign Source Cap row using [andy_contestsourcecap_plinko_template.csv](andy_contestsourcecap_plinko_template.csv), replacing placeholder values first.
8. Delete the sample station/play rows if they were only used to create the table shape.
9. Export and unpack the finished `Plinko` solution into `solutions/Plinko/`.

## Required Table Metadata

Use these target table settings after import:

| Table | Logical name | Ownership | Change tracking | Primary name |
|---|---|---|---|---|
| Plinko Station | `andy_plinkostation` | User or Organization | On | `andy_name` |
| Plinko Play | `andy_plinkoplay` | User or Organization | On | `andy_name` |

The existing IoT-specific detail table is user-owned, while several shared configuration tables are organization-owned. If the Plinko board/play rows should be administered centrally rather than assigned to individual users, choose organization ownership before creating the table because ownership cannot be changed later.

## Open Clarifications

- Should `andy_plinkostation` and `andy_plinkoplay` be user-owned like `andy_iotgamewin`, or organization-owned like shared configuration/event tables?
- Should `andy_plinkoplay.andy_station` be required, or can backend ingestion accept a play when station resolution fails but the hardware event is otherwise valid?
- What active Campaign row should receive the Plinko Source Cap row?
- Does the hardware event id need to be globally unique across all boards, or unique only per station?
- Should the initial `Plinko Board 1` sample row use a final IoT Hub device id or remain a temporary placeholder?
