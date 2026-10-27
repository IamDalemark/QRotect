import { describe, expect, it } from 'vitest';
import { telephoneHref } from '../../src/lib/directory/calling';
import { publicSnapshot } from '../../src/lib/directory/public-snapshot';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';

describe('telephone handoff boundaries', () => {
  it('accepts mobile, international, landline and short-code voice numbers', () => {
    for (const dial of ['09123456789', '+63333200000', '0333200000', '911'])
      expect(telephoneHref({ dial, channel: 'voice' })).toBe(`tel:${dial}`);
  });
  it('rejects text channels, legacy zero placeholders and unsafe dial values', () => {
    expect(telephoneHref({ dial: '09123456789', channel: 'text' })).toBeNull();
    for (const dial of [
      '000',
      '+0000',
      '0912 345 6789',
      '09123456789;123',
      'tel:911',
      'javascript:alert(1)',
    ])
      expect(telephoneHref({ dial, channel: 'voice' })).toBeNull();
  });
  it('keeps owner-supplied demo numbers callable without fabricated verification', () => {
    for (const contact of fixtureSnapshot.contacts) {
      expect(contact.approved).toBe(false);
      expect(contact.verifiedAt).toBe('');
      expect(telephoneHref(contact.numbers[0])).toBe('tel:09123456789');
    }
  });
  it('reads old fixture copy without changing numbers or real publication content', () => {
    const legacy = structuredClone(fixtureSnapshot);
    legacy.contacts[0].description.en =
      'Sample entry for navigation and simulated calling. Replace with an approved contact.';
    legacy.contacts[0].numbers[0].dial = '000';
    const result = publicSnapshot(legacy);
    expect(result.contacts[0].description.en).toBe('School and public contact directory.');
    expect(result.contacts[0].numbers[0].dial).toBe('000');
    expect(publicSnapshot({ ...legacy, fixture: false }).contacts[0].description.en).toBe(
      legacy.contacts[0].description.en,
    );
    expect(legacy.contacts[0].description.en).toContain('simulated');
  });
});
