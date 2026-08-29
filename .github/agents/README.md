# Agent Instruction Files

Use this folder for project-specific AI assistant instructions that should be discoverable in-repo.

## What goes here

- Domain or architecture guidance for assistants (for example integration boundaries or compliance constraints)
- Reusable prompts/instructions that are broader than one source folder's `CLAUDE.md`
- Role-specific assistant definitions for specialized workflows

## Naming convention

- `*.instructions.md` — focused instruction documents for a topic or domain area
- `*.agent.md` — role/persona-style assistant definitions

Use clear, descriptive filenames like `azure-iot-edge-architecture.instructions.md` or `logic-apps-expert.agent.md`.

## When to use this folder

Use `.github/agents/` when:

- The instructions apply across multiple folders/components
- The guidance is assistant-specific and not part of user-facing project docs
- You want contributors and downstream templates to discover and reuse the pattern
