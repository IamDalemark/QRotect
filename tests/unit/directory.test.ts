import { describe, expect, it } from 'vitest';
import { emptySnapshot, fixtureSnapshot } from '../../src/lib/directory/fixtures';
import {
  localized,
  numberSchema,
  publicationIssues,
  searchContacts,
  snapshotSchema,
} from '../../src/lib/directory/schema';

describe('public directory boundaries', () => {
  it('validates sample content while preventing its publication', () => {
    expect(snapshotSchema.safeParse(fixtureSnapshot).success).toBe(true);
    expect(publicationIssues(fixtureSnapshot)).toContain('Sample records cannot be published.');
  });
  it('rejects private fields and unsupported schema versions', () => {
    expect(
      snapshotSchema.safeParse({ ...emptySnapshot, administratorEmail: 'private@example.test' })
        .success,
    ).toBe(false);
    expect(snapshotSchema.safeParse({ ...emptySnapshot, schemaVersion: 2 }).success).toBe(false);
  });
  it('rejects ranges and extensions inside dial values', () => {
    const number = fixtureSnapshot.contacts[0].numbers[0];
    for (const dial of ['0289115061-65', '0289115061 ext100', 'javascript:alert(1)'])
      expect(numberSchema.safeParse({ ...number, dial }).success).toBe(false);
    expect(
      numberSchema.safeParse({ ...number, dial: '+63333200000', extension: '100' }).success,
    ).toBe(true);
  });
  it('combines category, area and bilingual search without inactive records', () => {
    expect(searchContacts(fixtureSnapshot.contacts, 'bulig', 'medical', 'iloilo')).toHaveLength(1);
    expect(searchContacts(fixtureSnapshot.contacts, 'bulig', 'medical', 'cpu')).toHaveLength(0);
    expect(
      searchContacts(
        fixtureSnapshot.contacts.map((c) => ({ ...c, active: false })),
        '',
      ),
    ).toHaveLength(0);
  });
  it('labels a missing translated description instead of silently inventing it', () => {
    expect(localized({ en: 'Campus', hil: '' }, 'hil')).toBe('Campus (English)');
  });
  it('accepts HTTP verification sources and rejects executable URL schemes', () => {
    const contact = fixtureSnapshot.contacts[0];
    for (const source of ['https://example.test/source', 'http://example.test/source'])
      expect(
        snapshotSchema.safeParse({ ...emptySnapshot, contacts: [{ ...contact, source }] }).success,
      ).toBe(true);
    for (const source of ['javascript:alert(1)', 'data:text/html,test', 'ftp://example.test'])
      expect(
        snapshotSchema.safeParse({ ...emptySnapshot, contacts: [{ ...contact, source }] }).success,
      ).toBe(false);
  });
  it('allows an empty publication without manufacturing hotline records', () => {
    expect(publicationIssues(emptySnapshot)).toEqual([]);
  });
});
