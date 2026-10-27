# Quick-call UX research

Research date: 28 October 2026

Status: planning only. Placement and shortcut selection remain subject to the owner's choices. No application behavior was changed by this research.

## Problem observed in the repository

`HomeScreen` in `src/components/public/screens.tsx` presents category links before search and the existing priority contact rows. Those category links navigate to a filtered directory; they do not initiate a call confirmation. A user who already knows they need police must still find an agency and its call action. The contact schema has a `priority` boolean and multiple numbered lines, but no explicit category-to-contact-and-line quick-call assignment. These are repository observations, not usability-study findings.

## Primary-source findings

- **Name the action:** GOV.UK recommends sentence-case button text describing the action and cautions that many competing actions make the next step harder to identify. This supports distinguishing `Call police` from a browsing link such as `View police contacts`; it does not establish the ideal number of shortcuts for this emergency service. [GOV.UK buttons](https://design-system.service.gov.uk/components/button/)
- **Make visible and accessible names agree:** WCAG 2.5.3 requires a control's accessible name to contain its visible label. A visible `Call police` label should therefore also occur in its accessible name, with the named agency added if helpful. [W3C Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
- **Keep a tap alternative to swiping:** WCAG 2.5.7 requires an equivalent single-pointer action without dragging unless an exception applies. Keyboard support alone is insufficient. Retain the existing visible `Open Phone instead` alternative beside the deliberate swipe. [W3C Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- **Accessible confirmation behavior:** WAI APG's modal pattern moves focus inside the dialog, contains Tab navigation, supports Escape, and normally returns focus to the trigger when closed. It recommends a visible close action. [WAI APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **Touch and enlarged text:** WCAG 2.2 AA defines a 24-by-24 CSS-pixel minimum pointer target with exceptions; larger controls can help users. Reflow guidance requires content to work at an equivalent 320 CSS-pixel width without unnecessary two-dimensional scrolling. Keep QROTECT's existing 48px targets and test long localized agency labels. [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- **Phone handoff is platform controlled:** Apple's archived first-party reference documents `tel:` links launching phone handling and user confirmation. It is dated 2017 and is not evidence of every current device/browser's precise interface. Test representative current devices; describe handoff rather than claiming a connected call. [Apple Phone Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html)

The W3C Understanding pages explain normative success criteria; APG and GOV.UK provide implementation/design guidance. None of these sources proves a measured emergency-response improvement for QROTECT. That requires user testing.

## Confirmed scope

The owner selected Home only and all six existing categories. After review, the owner chose a combined category group: keep a category heading and exact assigned agency with separate Call and View contacts actions. Remove the School & local contacts section. Use Get help / All contacts / Guide navigation, fixed at the bottom on phones and at the top on desktop. The directory retains its current search/filter layout.

## Recommended interaction

These are project recommendations informed by the sources, not mandated layouts:

1. Present a small, visible **Quick call** group near the top of the chosen pages. Each item shows its purpose, exact agency/branch, and a labeled action such as **Call police**. Use compact rows or tiles, not a horizontally scrolling carousel or hidden speed-dial menu.
2. Tapping that action opens the existing confirmation card immediately. No category-navigation or database request is needed first.
3. The confirmation shows the same agency, branch, exact line label, displayed number, and extension as the chosen shortcut. Swipe or the existing accessible alternative hands that specific number to the phone application.
4. Keep **All contacts** and search/filters for alternate agencies and numbers. Browsing and calling must remain visually and verbally distinct.
5. Resolve each shortcut through an explicit administrator-selected `contactId` and `numberId`, published atomically with the public snapshot. Do not infer a destination from array order or the first `priority` record. A purpose/category is not a unique telephone destination.
6. If an assignment is missing, withdrawn, inactive, or no longer a valid voice line, do not silently substitute another agency. Remove its call action and offer a clearly named route to browse that category. Validation should explain the broken assignment to the administrator before publication.
7. Use the existing cached/offline snapshot and existing confirmation's frozen target. A later publication must not change an already-open call destination. Offline access still cannot establish that a number or service is currently reachable.

## Decisions and tradeoffs

- **Home plus directory versus home only:** both pages improve access from category/QR/deep links, but repeating the group consumes vertical space above directory results. Home-only is smaller in scope but leaves people entering the directory without the shortcut. Owner chose Home only.
- **Four versus six shortcuts:** Police, Fire, Medical, and Campus form a proposed compact starting set. All six existing categories cover more destinations but increase scanning and push search/results down. Neither count is established by the cited guidance; owner chose all six existing categories; task testing remains useful.
- **Explicit assignment versus automatic selection:** assignment adds administrator setup and publication/schema compatibility work, but makes the intended recipient stable and reviewable. Automatically choosing the first contact is cheaper but can change silently when ordering changes.
- **Confirmation versus immediate phone handoff:** retaining the existing confirmation adds one deliberate step while letting users verify the exact recipient. It also preserves the owner's agreed calling interaction. Native phone software may add its own confirmation.
- **Named recipient versus generic category only:** including the agency takes more room but makes `Call police` unambiguous when several police contacts exist. Never imply that the shortcut selects the nearest agency or performs live dispatch routing.

## Acceptance criteria for implementation

- From every page chosen for quick-call placement, one shortcut activation opens the correct confirmation without visiting a category or changing current filters.
- Exact configured contact and line remain stable after contact reordering, search/filter changes, and language changes. Multiple contacts and multiple voice/text lines have explicit test coverage.
- Opening a shortcut causes no directory network query; saved-data offline behavior works. Cold visits without cached data retain existing availability limits.
- Missing, inactive, withdrawn, and text-only assignments never become unintended phone links. Publication validation and old-snapshot compatibility are defined before implementation.
- Dialog focus, Escape, cancellation, focus return, and the non-drag alternative remain operable. Automated checks intercept `tel:` handoff and never place calls.
- At 320px and 390px widths, English and Hiligaynon labels reflow, targets remain at least 48px, and shortcut purpose and recipient are readable. Enlarged text does not overlap or obscure actions.
- Compare the existing and proposed flows with a simple task: find the intended police agency and open its confirmation. Measure successful recipient selection, time, mistaken taps, and backtracking; do not judge only by click count.
