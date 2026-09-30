#!/usr/bin/env python3
"""Fail when an ARM what-if result contains actionable changes."""

import argparse
import json
import os
from pathlib import Path


ACTIONABLE_TYPES = {"Create", "Modify", "Delete"}


def is_actionable(change: dict, ignored_paths: set[str]) -> bool:
    if change.get("changeType") not in ACTIONABLE_TYPES:
        return False
    if change.get("changeType") != "Modify":
        return True

    delta = change.get("delta")
    if not delta:
        return True

    return any(
        item.get("propertyChangeType") != "NoEffect"
        and item.get("path") not in ignored_paths
        for item in delta
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("result", type=Path)
    parser.add_argument("--ignore-path", action="append", default=[])
    args = parser.parse_args()

    result = json.loads(args.result.read_text(encoding="utf-8-sig"))
    ignored_paths = set(args.ignore_path)
    changes = [
        change
        for change in result.get("changes", [])
        if is_actionable(change, ignored_paths)
    ]

    lines = ["## Infrastructure reconciliation", ""]
    if changes:
        lines.extend(
            [
                "Azure differs from the Bicep on `main`. Review this run, then approve the change by running the Infrastructure workflow with `action = deploy`.",
                "",
                "| Change | Resource |",
                "| --- | --- |",
            ]
        )
        for change in changes:
            resource = change.get("resourceId", "unknown resource").split("/providers/")[-1]
            lines.append(f"| {change['changeType']} | `{resource}` |")
    else:
        lines.append("Azure already matches the Bicep on `main`; no deployment is needed.")

    summary = "\n".join(lines) + "\n"
    print(summary)
    if summary_path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(summary)

    return 1 if changes else 0


if __name__ == "__main__":
    raise SystemExit(main())
