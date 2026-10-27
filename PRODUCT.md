# QROTECT product brief

## Purpose and audience

Help learners, teachers, and staff quickly identify the correct campus or public emergency contact after scanning a QR code. Initial coverage is the campus, Iloilo City, and selected national contacts.

## First release

A campus emergency contact website with English and Hiligaynon public interfaces, no visitor registration, and contact confirmation followed by swipe-to-call or an accessible button alternative. Confirmation hands the selected number to the phone app through a telephone link; the website does not place or monitor the call itself.

## Primary experience

The homepage prioritizes the national emergency call action and six category groups: Police, Fire, Medical/Ambulance, Hospital, Disaster Response, and Campus Emergency. Each group shows its assigned agency and branch, with separate Call and View contacts actions. Call opens the exact confirmation in one activation, followed by deliberate swipe or the accessible alternative to open Phone. View contacts opens the directory filtered to that category. Missing assignments retain browsing without a call action. Home ends with search and has no School & local contacts / priority list.

Public navigation has exactly three page links: Home (`/`), All contacts (`/directory`), and Guide (`/guidance`). On phones up to 760px they form a fixed bottom bar with icons, visible labels, safe-area padding and a measured content reservation; it hides during call confirmation. Desktop uses top navigation. Active state follows the real URL even when a saved fallback shell serves it. About and administrator access are in the footer.

Guide is always useful: it explains contact selection, confirmation/Phone handoff and saved-directory access. Approved safety guidance and a link to the approved campus map appear when available; no emergency advice or map is invented. Existing guidance and map URLs remain valid offline.

Directory search stays visible beside one Filters button. Category and service-area controls expand inline below it, update loaded contacts immediately, and retain URL/back-navigation state. The button counts active filter groups, excluding search text; clearing filters preserves search, while the empty-results reset clears all restrictions.

Contacts show agency, branch, area, individual numbers, channel, and verification information. Number ranges are expanded into individually verified entries; extensions stay separate. Text-only services never receive voice-call actions.

## Content and administration

Invited administrators maintain working records, select an exact contact and voice line for each Home quick call, preview changes, and explicitly publish a complete version. Assignments publish atomically with contacts; inactive, missing, text-only, duplicate or mismatched targets must be reassigned or cleared. Existing publications without assignments remain readable and offer category browsing. The legacy priority flag remains in stored documents for compatibility but has no public display or administrator checkbox. Private previews show the saved draft without reading or writing visitor caches or refreshing public data. Unpublished content is private. The research group supplies or approves contact sources, verification dates, translations, emergency guidance, and evacuation map.

Safety guidance and map links inside Guide remain hidden until approved content exists. A static supplied map includes accompanying textual information. Do not invent routes, medical instructions, translations, or agency availability.

## Offline behavior

Public pages include a cached, validated publication at first load. After the first successful online visit, save the public directory, both languages, approved guidance, and a supplied map when downloaded. Returning visits open the saved public shell immediately and check for updates separately. Public server data/pages revalidate on demand after 60 seconds, and publication explicitly invalidates caches; this is a refresh policy rather than a guaranteed update deadline. Show saved, published, and verified dates distinctly. First-time uncached QR access needs internet. Flag snapshots older than seven days and contacts not verified within 30 days; retain saved information with warnings.

## Boundaries

No student records, medical profiles, personal emergency contacts, GPS, automatic nearest-branch selection, incident reports, SMS, dispatch, live responder availability, or AI-generated emergency advice.

## Technical foundation

Next.js, Vercel, Supabase, TypeScript, Tailwind CSS, Zod, and Serwist. Use Supabase clients, SQL migrations, and database-generated types rather than an ORM. Public browsing, administrator editing and publication, private map storage, and offline recovery are implemented and verified locally. The configured hosted Supabase schema is initialized. Vercel deployments remain user-managed. Approved school content, reviewed Hiligaynon wording, physical-device checks, and participant pilot remain release gates.

See `DESIGN.md` before interface changes.

## Owner-requested public demo

The public demo contains six sample contacts, one per category, using `0912 345 6789`. The owner explicitly approved retaining this number for the real phone handoff. Sample agency names and unverified status remain visible; no approval or verification evidence is fabricated. All simulation and practice interfaces are removed. The separate placeholder banner remains omitted at the owner's request. A controlled first-time installer supplies this demo snapshot without fabricating approvals, sources or verification dates; the ordinary administrator publisher still requires reviewed real content.

## Calling behavior

The confirmation card shows the exact agency, branch, number label, display number and extension. It uses a bottom sheet on mobile and a centered dialog on desktop. Swipe completion requires a deliberate release near the end; partial/cancelled gestures never initiate a handoff. The same card offers a tap/keyboard phone link. The operating system can show its own final confirmation. No ringing, connected, completed or responder-arrival states are fabricated.

Calling works from a saved public directory without a Supabase request. Legacy all-zero fixture numbers remain non-callable. Selected recipient details are frozen while the card is open. The old v1 test-contact field remains inert for database/cache compatibility; it has no interface or calling path.

## Public wording

Use “Emergency Hotline System” as the tagline under QROTECT in both languages. Use “Campus” in the English service-area label and “Kampus” in the Hiligaynon service-area label. Do not display CPU branding, prototype/simulation banners, sample-directory notices, or translation-review notices. About describes the directory, phone handoff, offline access and privacy directly. Preserve verification/source information and existing stored service-area identifiers for compatibility.
