# QROTECT product brief

## Purpose and audience

Help learners, teachers, and staff quickly identify the correct campus or public emergency contact after scanning a QR code. Initial coverage is the campus, Iloilo City, and selected national contacts.

## First release

A campus emergency contact website with English and Hiligaynon public interfaces, no visitor registration, and contact confirmation followed by swipe-to-call or an accessible button alternative. Confirmation hands the selected number to the phone app through a telephone link; the website does not place or monitor the call itself.

## Primary experience

The homepage prioritizes the national emergency call action, six categories, priority school/local contacts, and search. Categories are Police, Fire, Medical/Ambulance, Hospitals, Disaster Response, and School Emergency. Users should reach a category's confirmation card in two taps from the homepage, followed by a deliberate swipe or accessible alternative to open Phone.

Contacts show agency, branch, area, individual numbers, channel, and verification information. Number ranges are expanded into individually verified entries; extensions stay separate. Text-only services never receive voice-call actions.

## Content and administration

Invited administrators maintain working records, preview changes, and explicitly publish a complete version. Unpublished content is private. The research group supplies or approves contact sources, verification dates, translations, emergency guidance, and evacuation map.

Guidance and map navigation remain hidden until approved content exists. A static supplied map includes accompanying textual information. Do not invent routes, medical instructions, translations, or agency availability.

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
