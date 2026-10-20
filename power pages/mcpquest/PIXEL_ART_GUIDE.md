# Pixel Art Guidance

The MCP Quest title, selector, mission room, and results should share the classic
8-bit adventure style approved in issue [#328](https://github.com/Andworx/Copilot-IoT-Game/issues/328).

Use the [8-bit-pixel-art-patterns skill](https://github.com/TheOrcDev/8bitcn-ui/blob/main/.claude/skills/8-bit-pixel-art-patterns/SKILL.md)
to guide pixel borders, shadows, and component treatments. It is installed locally
as `8-bit-pixel-art-patterns` under the Codex skills directory. To install it on
another machine, run the skill-installer helper with:

```text
--repo TheOrcDev/8bitcn-ui --path .claude/skills/8-bit-pixel-art-patterns
```

## Applying The Skill

Additional locally installed skills for future development:

- [gaming-ui-state-management](https://github.com/TheOrcDev/8bitcn-ui/blob/main/.claude/skills/gaming-ui-state-management/SKILL.md):
  state-driven progress bars, threshold feedback, and completion notifications.
- [retro-css-architecture](https://github.com/TheOrcDev/8bitcn-ui/blob/main/.claude/skills/retro-css-architecture/SKILL.md):
  shared retro styling, semantic colors, typography, and crisp sprite rendering.

Install both with the skill-installer helper arguments:

```text
--repo TheOrcDev/8bitcn-ui --path .claude/skills/gaming-ui-state-management .claude/skills/retro-css-architecture
```

Adapt their library-specific examples to this project's React/plain CSS setup.
Reuse the existing HUD/progress controls and actual session state. Do not invent
health, XP, or rewards unrelated to the game's rules. Respect reduced motion for
threshold and completion feedback. Keep sprite dimensions on integer pixel units
and apply pixelated image rendering only to pixel sprites, not official logos.
Use a shared retro stylesheet if styles are extracted; the example's `@/` import
path is specific to its source repository. Keep body text readable and reserve
pixel typography for short labels and metrics. Project typography uses zero
letter spacing. Do not add Tailwind/shadcn or remote font imports solely to match
the skill examples.

- Use square corners and stepped border segments for framed controls and dialogue.
- Use a consistent integer pixel unit for border segments and hard shadows.
- Position decorative border segments inside a relative container. Keep them
  noninteractive so the underlying button remains accessible.
- Preserve visible keyboard focus, readable contrast, and clear disabled states.
- Keep plain links and ghost controls free of unnecessary decorative frames.
- Adapt examples to the existing CSS; installing shadcn or Tailwind is not required.
- Preserve official product logos instead of pixelating or redrawing their branding.

## Current UI Review

The skill was applied as a design review after the win-screen refinement:

- Primary actions still use a smooth gradient and 2px rounded corners. A future
  visual pass should use flat fills, stepped edges, and hard inset shading.
- Dialogue and score frames currently use conventional rectangular borders;
  stepped corner treatments can make them closer to the reference aesthetic.
- Map foliage uses circular gradient dots. Replace these with reusable pixel tile
  shapes when refining terrain, while preserving mission marker readability.
- Keep readable body text rather than forcing dense mission instructions into
  a decorative pixel font.

These are follow-up refinements, not completed visual changes. Review them with
desktop/mobile screenshots and update issue #328 for each implementation pass.
