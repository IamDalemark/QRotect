# Contact confirmation and phone handoff

Call → review selected contact → swipe and release near the end → native phone application. A visible **Open Phone instead** link provides the same handoff for tap, keyboard and assistive technology. The mobile confirmation is a bottom sheet; desktop uses a centered dialog in the existing design system.

## Behavior

- Opening the card, tapping the swipe handle, partial drags, pointer cancellation, vertical movement, focus loss and closing never initiate a handoff.
- The handle must be released at least 90% along its available travel. It resets after incomplete gestures; reduced-motion preferences remove the reset animation.
- A completed gesture clicks the same telephone link as the accessible alternative, synchronously in the pointer-up event. There is no asynchronous request before opening Phone.
- A one-shot guard prevents duplicate activation until the card is closed and reopened. After an attempt, the card tells users to continue in Phone, without claiming that Phone opened or the call connected. Closing and reopening permits a deliberate retry.
- The card freezes the selected agency, branch, number label, display number and extension. Public refreshes queue until the dialog closes. Multiple phone lines never substitute for one another.
- Only validated voice numbers receive a usable call action. Text-only numbers have none. Display punctuation and extensions are excluded from the URL. Extensions remain visible for manual entry.
- The website does not track calls, simulate ringing, infer success or bypass operating-system confirmation. Calling applications and cellular service are controlled by the device.

## Data and compatibility

The six owner-requested contacts retain `09123456789`, with readable formatting `0912 345 6789`, including in sample review mode. The owner explicitly approved this number for the new flow. Their sample names, source and verification metadata remain unchanged. No supplemental placeholder banner is added.

Existing schema-v1 publications remain compatible. The legacy `testContact` field and research mode literal stay in the validated wire format, but no screen, editor or phone handoff reads that field. No database migration or hosted record mutation is necessary. Exact obsolete descriptions from old fixture publications are replaced at public read boundaries; other descriptions and all dialing values remain untouched. Older all-zero fixture numbers stay non-callable until the directory refreshes.

The retired `/practice` URL redirects to the online directory. No offline directory is provided. The static retirement worker and public-page cleanup remove previous worker registrations and QROTECT caches once an old installation reconnects.

## Verification

Automated browser checks intercept every activated telephone link before default navigation. They verify the target URL and interaction without opening a phone application or placing a call. Coverage includes cancellation, release threshold, retry, keyboard access, text-only entries, multiple lines, extension separation, queued refreshes, both languages and old zero placeholders. Public viewport/accessibility checks cover the dialog as well as the directory.

Physical Android Chrome and iPhone Safari checks remain necessary to confirm the operating-system handoff. Use a consenting number for these checks; do not test by calling emergency services. Browser emulation cannot certify cellular behavior or determine whether a call connected.
