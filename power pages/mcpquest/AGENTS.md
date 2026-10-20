# MCP Quest UI development

Read `README.md` and `PIXEL_ART_GUIDE.md` before changing the player UI. Follow the
root repository contribution instructions and preserve unrelated local work.

For retro UI work, use the `8-bit-pixel-art-patterns` skill when available. Read its
installed `SKILL.md` before applying it. The source and installation command are
documented in `PIXEL_ART_GUIDE.md`; the local skill installation is not a project
dependency.

For HUD metrics and state-driven feedback, use `gaming-ui-state-management` when
available. For shared retro styles, typography, and sprite rendering, use
`retro-css-architecture` when available. Read each skill before applying it and
follow the project adaptations in `PIXEL_ART_GUIDE.md`.

Adapt the patterns to the existing React and CSS implementation. Keep official
Power Platform logos intact, retain accessible controls and focus indicators, and
verify desktop/mobile screenshots before considering a visual change complete.
Record each UI iteration and its validation on GitHub issue #328. Keep review
images in the git-ignored root `refrences/` folder.
