# QROTECT design direction

## Campus safety board

A clear campus emergency notice with strong headings, readable phone numbers, compact contact rows, and orderly separators. Prioritize emergency discovery and recognition. Use the references for useful search/category patterns, with QROTECT's own hierarchy and identity.

## Colors

| Token        | Value     | Role                         |
| ------------ | --------- | ---------------------------- |
| Primary      | `#890B1A` | Masthead, controls, headings |
| Primary deep | `#650814` | Hover and pressed states     |
| Primary soft | `#FAF3F4` | Subtle emphasis              |
| Surface      | `#FFFFFF` | Main canvas                  |
| Ink          | `#281E20` | Main text                    |
| Muted        | `#66565A` | Supporting text              |
| Divider      | `#E6DADD` | Boundaries                   |
| Caution      | `#8A5200` | Connection/review messages   |
| Success      | `#17665C` | Published/verified statuses  |

The main maroon is sampled from the supplied poster. Validate actual color combinations for contrast; color alone never carries status.

## Typography and layout

The interface uses self-hosted Public Sans through Next.js, with a system sans-serif fallback. Body text is 16–18px, numbers approximately 24–28px, and headings compact and bold. Use tabular numerals for numbers.

Design mobile-first from 320px. Categories use two columns where labels fit; allow them to collapse for large text. Contacts use rows rather than nested cards. Desktop content stays within approximately 1120px. Use restrained 6–8px radii, thin borders, and minimal shadows.

Controls have at least 48px touch targets and clear keyboard focus. Verify English/Hiligaynon text, 200% zoom, screen readers, daylight contrast, and device safe areas. Navigation must not cover contact actions.

## Avoid

Oversized marketing heroes, decorative statistics, gradients, glass effects, floating chat widgets, carousels, oversized icon containers, nested cards, pulsing alerts, unnecessary animation, and unverified status badges.

## Design review

Before interface feature work, read `PRODUCT.md` and this file. Impeccable 4.7.0 is installed for this project. Its manual detector returned no findings on the implemented interface. Desktop and mobile captures receive an independent finish review alongside browser accessibility and emergency-flow checks. Native Codex hook execution still requires hook approval in the app; the installed manifest alone does not prove execution. Automated audits supplement visual, accessibility, and emergency-flow review.
