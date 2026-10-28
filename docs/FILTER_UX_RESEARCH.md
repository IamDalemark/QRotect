> Scope update — 29 October 2026: the owner removed offline access. References below to saved directories, Serwist, or offline tests describe earlier research/implementation, not the current product scope. See ARCHITECTURE.md for the online-only behavior.

# Directory filter UX research

Research date: 28 October 2026

## Chosen interaction

Keep search and one labeled **Filters** button on the same row. The button reveals a non-modal panel directly underneath at every screen size. Category and service-area selections update the loaded directory immediately. There is no Apply, draft, or Cancel state.

## Primary-source findings

- **Disclosure behavior:** WAI APG describes a button controlling a hidden or visible section. Enter and Space toggle it; `aria-expanded` reflects visibility and `aria-controls` can identify the panel. This is accessibility implementation guidance. [WAI APG disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- **Visible applied state:** Carbon recommends an applied count when filters can be hidden, plus clearing without reopening. It supports immediate filtering for simple selections. These are design recommendations rather than WCAG requirements. [Carbon filtering](https://www.carbondesignsystem.com/building-blocks/core/patterns/filtering)
- **Discoverability:** DfE observations found users missed Show filters buttons that appeared inactive, blended into their background, or were too far from results. [DfE filter guidance](https://design.education.gov.uk/design-system/components/filter)
- **Mobile tradeoff:** Scottish Government recommends explicit mobile Apply because users may miss results changing behind controls. That recommendation belongs to its pattern; QROTECT deliberately chooses immediate updates with an inline panel and nearby result feedback. Validate that users notice the change. [Scottish Government search filters](https://designsystem.gov.scot/patterns/search-results/search-filters)
- **Status announcements:** A concise result count is a status message that should be exposed to assistive technology without taking focus. The whole results list need not become a live region. [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- **Touch and reflow:** WCAG 2.2 AA specifies 24 × 24 CSS-pixel minimum pointer targets with exceptions, and reflow at an equivalent 320px width without loss or unnecessary horizontal scrolling. QROTECT's 48px controls exceed that minimum. [WCAG target size](https://www.w3.org/TR/WCAG22/#target-size-minimum), [WCAG reflow](https://www.w3.org/TR/WCAG22/#reflow)

## QROTECT recommendations

These are project design decisions informed by the sources:

- Use a native button with a filter icon and visible Filters text. Show `Filters (1)` or `Filters (2)` for active category and service-area groups; exclude the search query.
- Connect the button to a uniquely identified panel using `aria-controls` and correct `aria-expanded`. Remove collapsed controls from both keyboard navigation and the accessibility tree.
- Keep keyboard focus on the trigger when opening or closing. Normal Tab navigation reaches revealed controls. Do not trap focus or mark the panel modal.
- Keep focus on the chosen control when results update. Announce a short localized count through a polite status region; do not announce the entire directory.
- Apply selections immediately using the already-loaded snapshot. Preserve existing single-category and single-area semantics and URL/back-navigation behavior.
- Put Clear filters inside the opened panel. It resets category and service area while preserving search. Collapse preserves selections; reopening shows current values.
- Maintain 48px targets, readable labels, visible focus, and a fluid search input beside the button. Test 320px width, enlarged text, English, and Hiligaynon.
- Ensure zero-result feedback remains adjacent to the results and tells users they can change or clear filters.

## Tradeoffs and validation

Keeping Clear filters inside the panel preserves the requested single-button search row, but adds one action to clearing hidden restrictions and departs from Carbon's stronger discoverability recommendation. The applied count mitigates this partially; it does not identify the selected values until the panel opens.

Immediate updates minimize steps and suit local filtering. The open panel can push results downward on small screens, so validate that users notice result changes and can reach contacts quickly.

Check keyboard toggling and tab order; hidden-control exclusion; focus stability; result announcements; active counts; clearing while preserving search; collapsed-state persistence; URL/back restoration; no horizontal overflow; offline results; and no network requests caused by filter changes.
