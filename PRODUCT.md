# QROTECT product brief

## Purpose and audience

Help learners, teachers, and staff quickly identify the correct campus or public emergency contact after scanning a QR code. Initial coverage is the campus, Iloilo City, and selected national contacts.

## First release

A campus emergency contact website with English and Hiligaynon public interfaces, no visitor registration, and contact confirmation followed by swipe-to-call or an accessible button alternative. Confirmation hands the selected number to the phone app through a telephone link; the website does not place or monitor the call itself.

## Primary experience

The homepage prioritizes the national emergency call action and six category groups: Police, Fire, Medical/Ambulance, Hospital, Disaster Response, and Campus Emergency. Each group shows its assigned agency and branch, with separate Call and View contacts actions. Call opens the exact confirmation in one activation, followed by deliberate swipe or the accessible alternative to open Phone. View contacts opens the directory filtered to that category. Missing assignments retain browsing without a call action. Home ends with search and has no School & local contacts / priority list.

Public navigation has exactly three page links: Get help (`/`), All contacts (`/directory`), and Guide (`/guidance`). On phones up to 760px they form a fixed bottom bar with icons, visible labels, safe-area padding and a measured content reservation; it hides during call confirmation. Desktop centers the three links in its top navigation. Active state follows the current URL. About and administrator access are in the footer.

Guide is always useful: it explains contact selection, confirmation/Phone handoff and internet access. Approved safety guidance and a link to the approved campus map appear when available; no emergency advice or map is invented. Pages and approved maps require internet access.

Directory search stays visible beside one Filters button. Category and service-area controls expand inline below it, update loaded contacts immediately, and retain URL/back-navigation state. The button counts active filter groups, excluding search text; clearing filters preserves search, while the empty-results reset clears all restrictions.

Contacts show agency, branch, area, individual numbers, channel, and verification information. Number ranges are expanded into individually verified entries; extensions stay separate. Text-only services never receive voice-call actions.

## Content and administration

Invited administrators edit and publish one contact, Home quick-call assignment, guidance topic or campus map at a time. There is no separate save-draft or publish-all workflow in the interface. Unpublished browser edits are discarded only after confirmation; they are not autosaved. Field examples and inline errors explain the required content. Each successful item update creates a complete immutable public snapshot for existing readers and history; unrelated stored private edits are not released. Hidden contacts remain available to administrators for later reactivation.

Quick calls must name an already published active contact and exact callable voice line. Removing, hiding, recategorizing or making an assigned line text-only requires clearing or reassigning the Home action first. Existing publications without assignments remain readable; legacy sample shortcuts remain compatible. Guidance and maps require reviewed English and Hiligaynon text, sources, review dates and reviewer names. Uploading a map privately does not publish it; replacement images require renewed review. The map uploader supports drag-and-drop and a keyboard-accessible file picker. Only PNG/JPEG/WebP images up to 5 MB are accepted, with server-side content checks.

Publication history is retained. Restoring a version explicitly replaces the whole directory; the confirmation explains that scope. Existing private working records and low-level save/publish functions remain for compatibility and restore, without exposing that workflow in normal editing. The research group supplies or approves contact sources, verification dates, translations, emergency guidance and the map.

Safety guidance and map links inside Guide remain hidden until approved content exists. A static supplied map includes accompanying textual information. Do not invent routes, medical instructions, translations, or agency availability.

## Online access and freshness

Internet is required to open pages and load or refresh directory information. Public pages include a validated publication at first load and check for updates in the background. Public server data/pages revalidate on demand after 60 seconds, and publication explicitly invalidates caches; this is a refresh policy rather than a guaranteed update deadline. Failed refreshes retain the currently displayed in-memory directory with a connection notice. Do not save directory data or maps in browser Cache API or register an offline worker. Retire previously installed QROTECT workers and their owned caches. Contacts not verified within 30 days retain their review warning.

## Boundaries

No student records, medical profiles, personal emergency contacts, GPS, automatic nearest-branch selection, incident reports, SMS, dispatch, live responder availability, or AI-generated emergency advice.

## Technical foundation

Next.js, Vercel, Supabase, TypeScript, Tailwind CSS, and Zod. Use Supabase clients, SQL migrations, and database-generated types rather than an ORM. Public browsing, administrator editing and publication, private map storage, and online publication refresh are implemented and verified locally. The configured hosted Supabase schema is initialized. Vercel deployments remain user-managed. Approved school content, reviewed Hiligaynon wording, physical-device checks, and participant pilot remain release gates.

See `DESIGN.md` before interface changes.

## Owner-requested public demo

The public demo contains six sample contacts, one per category, using `0912 345 6789`. The owner explicitly approved retaining this number for the real phone handoff. Sample agency names and unverified status remain visible; no approval or verification evidence is fabricated. All simulation and practice interfaces are removed. The separate placeholder banner remains omitted at the owner's request. A controlled first-time installer supplies this demo snapshot without fabricating approvals, sources or verification dates; the ordinary administrator publisher still requires reviewed real content.

## Calling behavior

The confirmation card shows the exact agency, branch, number label, display number and extension. It uses a bottom sheet on mobile and a centered dialog on desktop. Swipe completion requires a deliberate release near the end; partial/cancelled gestures never initiate a handoff. The same card offers a tap/keyboard phone link. The operating system can show its own final confirmation. No ringing, connected, completed or responder-arrival states are fabricated.

Calling uses the currently displayed directory without an activation-time Supabase request. Legacy all-zero fixture numbers remain non-callable. Selected recipient details are frozen while the card is open. The old v1 test-contact field remains inert for database/publication compatibility; it has no interface or calling path.

## Public wording

Use “Emergency Hotline System” as the tagline under QROTECT in both languages. Use “Campus” in the English service-area label and “Kampus” in the Hiligaynon service-area label. Do not display CPU branding, prototype/simulation banners, sample-directory notices, or translation-review notices. About describes the directory, phone handoff, internet access and privacy directly. Preserve verification/source information and existing stored service-area identifiers for compatibility.
