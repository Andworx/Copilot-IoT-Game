# Plinko Profile

`andy_plinkoprofile` stores one row per Plinko station. The Function App reads it to
score landings, expose the display chase schedule, and let the staff Code App update
station configuration.

## Bucket Icons JSON

`andy_bucketiconsjson` is a multiline text column containing one JSON array item per
bucket, in physical bucket order. Example:

```json
["powerapps", "dataverse", "powerautomate", "powerpages", "aibuilder", "powerplatform"]
```

Supported icon ids are `powerapps`, `dataverse`, `powerautomate`, `powerpages`,
`aibuilder`, and `powerplatform`. The backend normalizes the value before returning it:
missing, invalid, or short arrays fall back to the default rotating icon set for the
configured bucket count. The staff Code App should update this field through the
`/api/plinko-game-mode` staff route rather than writing Dataverse directly.

Update this file whenever Plinko Profile columns, forms, views, or operational ownership
change.
