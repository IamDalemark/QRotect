import { z } from 'zod';

export const categoryIds = ['police', 'fire', 'medical', 'hospital', 'disaster', 'school'] as const;
export const languageSchema = z.enum(['en', 'hil']);
export type Language = z.infer<typeof languageSchema>;
export const bilingualSchema = z
  .object({ en: z.string().trim().min(1).max(2000), hil: z.string().trim().max(2000) })
  .strict();
const date = z.iso.date();
const source = z.union([z.url({ protocol: /^https?$/ }).max(500), z.literal('')]);
export const numberSchema = z
  .object({
    id: z.uuid(),
    label: bilingualSchema,
    display: z.string().trim().min(1).max(50),
    dial: z.string().regex(/^\+?[0-9]{3,15}$/, 'Enter one number, without ranges or extensions.'),
    extension: z.string().regex(/^[0-9]{0,8}$/),
    channel: z.enum(['voice', 'text']),
  })
  .strict();
export const contactSchema = z
  .object({
    id: z.uuid(),
    agency: z.string().trim().min(1).max(160),
    branch: z.string().trim().max(160),
    category: z.enum(categoryIds),
    area: z.enum(['cpu', 'iloilo', 'national']),
    description: bilingualSchema,
    aliases: z.array(z.string().max(100)).max(20),
    hours: z.string().max(100),
    numbers: z.array(numberSchema).min(1).max(10),
    verifiedAt: z.union([date, z.literal('')]),
    source,
    approved: z.boolean(),
    active: z.boolean(),
    priority: z.boolean(),
  })
  .strict();
export const guideSchema = z
  .object({
    id: z.uuid(),
    title: bilingualSchema,
    category: z.enum(categoryIds),
    steps: z.array(bilingualSchema).min(1).max(12),
    source: z.url({ protocol: /^https?$/ }),
    reviewedAt: date,
    reviewer: z.string().trim().min(1).max(120),
    approved: z.boolean(),
  })
  .strict();
export const mapSchema = z
  .object({
    id: z.uuid(),
    assetPath: z.string().regex(/^[0-9a-f-]{36}\.(png|jpg|webp)$/),
    description: bilingualSchema,
    instructions: z.array(bilingualSchema).min(1).max(20),
    source: z.url({ protocol: /^https?$/ }),
    reviewedAt: date,
    reviewer: z.string().trim().min(1).max(120),
    approved: z.boolean(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().min(1).max(100),
    publishedAt: z.union([z.iso.datetime({ offset: true }), z.null()]),
    mode: z.literal('research'),
    fixture: z.boolean(),
    contacts: z.array(contactSchema).max(300),
    guidance: z.array(guideSchema).max(30),
    map: mapSchema.nullable(),
    // Legacy v1 field retained only to read existing publications and offline caches.
    // No public or administrator interface uses it.
    testContact: z
      .object({
        name: z.string().min(1).max(100),
        dial: z.string().regex(/^\+?[0-9]{7,15}$/),
        consentedAt: date,
      })
      .strict()
      .nullable(),
  })
  .strict();
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Category = (typeof categoryIds)[number];
export function publicationIssues(data: Snapshot): string[] {
  const issues: string[] = [];
  if (data.fixture) issues.push('Sample records cannot be published.');
  const ids = data.contacts.map((c) => c.id);
  if (new Set(ids).size !== ids.length) issues.push('Contact identifiers must be unique.');
  for (const c of data.contacts.filter((c) => c.active)) {
    if (!c.approved || !c.verifiedAt || !c.source)
      issues.push(`${c.agency}: approval, verification date, and source are required.`);
    if (!c.description.hil || c.numbers.some((n) => !n.label.hil))
      issues.push(`${c.agency}: reviewed Hiligaynon wording is required.`);
    if (c.verifiedAt > new Date().toISOString().slice(0, 10))
      issues.push(`${c.agency}: verification cannot be in the future.`);
  }
  for (const g of data.guidance)
    if (!g.approved || !g.title.hil || g.steps.some((s) => !s.hil))
      issues.push('Guidance requires approval and both languages.');
  if (
    data.map &&
    (!data.map.approved || !data.map.description.hil || data.map.instructions.some((s) => !s.hil))
  )
    issues.push('Map content requires approval and both languages.');
  return issues;
}
export function localized(value: { en: string; hil: string }, language: Language) {
  return language === 'hil' ? value.hil || `${value.en} (English)` : value.en;
}
export function searchContacts(contacts: Contact[], query: string, category = '', area = '') {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return contacts.filter(
    (c) =>
      c.active &&
      (!category || c.category === category) &&
      (!area || c.area === area) &&
      terms.every((term) =>
        [
          c.agency,
          c.branch,
          c.description.en,
          c.description.hil,
          ...c.aliases,
          ...c.numbers.map((n) => n.display),
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(term),
      ),
  );
}
