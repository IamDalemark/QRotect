# QROTECT product brief

## Purpose and audience

Help CPU Senior High School learners, teachers, and staff quickly identify the correct school or public emergency contact after scanning a QR code. Initial coverage is CPU, Iloilo City, and selected national contacts.

## First release

A clearly labeled research demonstration, with English and Hiligaynon public interfaces, no visitor registration, simulated agency calling, and one separately identified consenting test contact for a real dialer demonstration.

## Primary experience

The homepage prioritizes the national emergency practice action, six categories, priority school/local contacts, and search. Categories are Police, Fire, Medical/Ambulance, Hospitals, Disaster Response, and School Emergency. Users should reach a category's action in two taps from the homepage.

Contacts show agency, branch, area, individual numbers, channel, and verification information. Number ranges are expanded into individually verified entries; extensions stay separate. Text-only services never receive voice-call actions.

## Content and administration

Invited administrators maintain working records, preview changes, and explicitly publish a complete version. Unpublished content is private. The research group supplies or approves contact sources, verification dates, translations, emergency guidance, evacuation map, and test contact consent.

Guidance and map navigation remain hidden until approved content exists. A static supplied map includes accompanying textual information. Do not invent routes, medical instructions, translations, or agency availability.

## Offline behavior

After the first successful online visit, save the public directory, both languages, approved guidance, and a supplied map when downloaded. Show saved, published, and verified dates distinctly. First-time uncached QR access needs internet. Flag snapshots older than seven days and contacts not verified within 30 days; retain saved information with warnings.

## Boundaries

No student records, medical profiles, personal emergency contacts, GPS, automatic nearest-branch selection, incident reports, SMS, dispatch, live responder availability, or AI-generated emergency advice.

## Technical foundation

Next.js, Vercel, Supabase, TypeScript, Tailwind CSS, Zod, and Serwist. Use Supabase clients, SQL migrations, and database-generated types rather than an ORM. Public browsing, administrator editing and publication, private map storage, and offline recovery are implemented and verified locally. The configured hosted Supabase schema is initialized. Vercel deployments remain user-managed. Approved school content, reviewed Hiligaynon wording, physical-device checks, and participant pilot remain release gates.

See `DESIGN.md` before interface changes.
