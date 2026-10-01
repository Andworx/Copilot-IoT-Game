# Plinko Solution

This folder stages the Dataverse modeling artifacts for issue #124: the Plinko profile/state row and accepted Plinko play detail records.

The live solution should be created in Power Apps as `Plinko`, with publisher prefix `andy`, and with `andy_PrizeEngine` installed as a dependency. Keep the Plinko solution focused on Plinko-specific detail only:

- Shared claim, contact, campaign, source cap, and grand-prize entry data stays in `andy_PrizeEngine`.
- `andy_plinkoplay` links to the shared `andy_prizeclaim` row instead of duplicating claim status, contact, or prize fields.
- No Plinko fields are added to IoT-specific tables.

## CSV Import Package

Use the files in [import-csv](import-csv) as maker-portal import starters:

- [import-csv/andy_plinkoprofile.csv](import-csv/andy_plinkoprofile.csv) creates the Plinko Profile table shape and one sample profile/state row.
- [import-csv/andy_plinkoplay.csv](import-csv/andy_plinkoplay.csv) creates the Plinko Play scalar field shape and one sample play row.
- [import-csv/andy_contestsource_plinko.csv](import-csv/andy_contestsource_plinko.csv) seeds or verifies the shared `plinko` contest source in PrizeEngine.
- [import-csv/andy_contestsourcecap_plinko_template.csv](import-csv/andy_contestsourcecap_plinko_template.csv) is a fill-in template for the active campaign's Plinko source cap row.
- [import-csv/plinko-schema-map.csv](import-csv/plinko-schema-map.csv) is the field-by-field schema checklist to apply after import.

After the maker import is complete, export and unpack the created `Plinko` solution into this folder so source control contains the actual Dataverse solution XML.
