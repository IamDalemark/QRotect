---
version: 1
slug: "src-app-admin-protected-layout-tsx"
primary_target: "src/app/admin/(protected)/layout.tsx"
related_targets: ["src/components/admin/admin-shell.tsx","src/components/ui/sidebar.tsx"]
---

# Administrator navigation

Mode: Operate. Extend the protected administrator shell; leave login and public previews outside it.

## Direction contract

THESIS: Keep editing space clear with a compact navigation rail that expands on request. Avoid the old wrapped navigation row on small screens.

OWN-WORLD: Inherit QROTECT's Public Sans, maroon and white, restrained separators, 7px corners and 48px controls.

STORY: Administrators identify the current section, switch among seven tasks, and retain control over unpublished browser edits.

FIRST VIEWPORT: Desktop places a full-height 72px icon rail on the left, expandable to 256px, with navigation in the middle and public access/sign-out below. Main content remains readable. Below 1024px a visible Menu control opens a bounded 288px modal drawer with full labels.

FORM: Precisely specified extension of the incumbent system; no concept round. In-memory expansion survives admin client navigation, resets on fresh load, and has no saved preference. Mobile closes after committed navigation; refused dirty navigation stays open.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Validation and finish

The independent finish review returned **ship** for the protected administrator sidebar and its reviewed desktop/mobile states, with no material fixes. This verdict is scoped to this extension.

- `pnpm check`: formatting, lint, strict types and Webpack production build passed.
- Local administrator browser checks: 4 passed; 2 existing publishing-workflow engine skips. Sidebar coverage ran on desktop Chromium, Android Chromium and iPhone WebKit.
- Public navigation, public interface and calling regression checks: 63 passed; 9 intentional profile skips.
- Reviewed states include collapsed/expanded desktop, mobile open/closed, 320px width, 200% text enlargement, keyboard focus, refused navigation and refused/accepted sign-out with unpublished edits. Axe checks passed.
- One manual design-detector scan of changed UI files returned no findings. Captures and detector output are development evidence and are not shipped.
