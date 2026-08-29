# Solution Package Exports

Use this folder for full Dataverse solution package exports and staged solution zip files that will be imported into another environment.

## Use `solutions/` when

- Exporting managed or unmanaged Dataverse solution zip files
- Staging a solution package for manual or scripted import into a target environment

## Use `scripts/exports/` when

- Exporting component-level assets such as tables, flows, views, forms, relationships, canvas apps, or web resources
- Capturing script-driven exports organized by component type with `_summary.json` output

## Naming convention

- Use the solution unique name in the zip filename
- Include the package type when useful: `YOUR_SOLUTION_NAME_managed.zip` or `YOUR_SOLUTION_NAME_unmanaged.zip`
- Keep zip files temporary and reproducible; they are ignored by Git and should not be committed long-term
