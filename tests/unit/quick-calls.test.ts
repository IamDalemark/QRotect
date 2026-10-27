import { describe, expect, it } from 'vitest';
import { emptySnapshot, fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { quickCallTarget } from '../../src/lib/directory/quick-calls';
import { publicSnapshot } from '../../src/lib/directory/public-snapshot';
import { categoryIds, quickCallIssues, snapshotSchema } from '../../src/lib/directory/schema';

describe('explicit quick-call destinations', () => {
  it('keeps older v1 snapshots readable without guessing a destination', () => {
    const snapshot = snapshotSchema.parse({ ...emptySnapshot, contacts: fixtureSnapshot.contacts });
    expect(quickCallTarget(snapshot, 'police')).toBeNull();
    expect(quickCallIssues(snapshot)).toEqual([]);
  });
  it('resolves all six authored demo assignments to the owner-supplied number', () => {
    for (const category of categoryIds) {
      const target = quickCallTarget(fixtureSnapshot, category)!;
      expect(target.number.dial).toBe('09123456789');
      expect(target.agency).toBe(
        fixtureSnapshot.contacts.find((c) => c.category === category)!.agency,
      );
    }
  });
  it('keeps the exact line when contacts and numbers are reordered or alternatives are added', () => {
    const snapshot = structuredClone(fixtureSnapshot);
    const police = snapshot.contacts[0];
    police.numbers.unshift({
      ...police.numbers[0],
      id: '20000000-0000-4000-8000-000000000099',
      dial: '09999999999',
      channel: 'text',
    });
    snapshot.contacts.unshift({
      ...structuredClone(police),
      id: '10000000-0000-4000-8000-000000000099',
      agency: 'Another station',
    });
    snapshot.contacts.reverse();
    expect(quickCallTarget(snapshot, 'police')!.number.dial).toBe('09123456789');
    expect(quickCallTarget(snapshot, 'police')!.agency).toBe('Sample police station');
  });
  for (const failure of [
    'missing-contact',
    'inactive',
    'category',
    'missing-line',
    'text',
    'zero',
    'duplicate-assignment',
    'duplicate-line',
  ] as const) {
    it(`never substitutes another recipient for ${failure}`, () => {
      const snapshot = structuredClone(fixtureSnapshot);
      const contact = snapshot.contacts[0];
      if (failure === 'missing-contact') snapshot.contacts.shift();
      if (failure === 'inactive') contact.active = false;
      if (failure === 'category') contact.category = 'fire';
      if (failure === 'missing-line')
        contact.numbers[0].id = '20000000-0000-4000-8000-000000000099';
      if (failure === 'text') contact.numbers[0].channel = 'text';
      if (failure === 'zero') contact.numbers[0].dial = '00000000';
      if (failure === 'duplicate-assignment') snapshot.quickCalls!.push(snapshot.quickCalls![0]);
      if (failure === 'duplicate-line') contact.numbers.push({ ...contact.numbers[0] });
      expect(quickCallTarget(snapshot, 'police')).toBeNull();
      expect(quickCallIssues(snapshot).length).toBeGreaterThan(0);
    });
  }
  it('adds assignments only to known legacy demo IDs and honors explicitly cleared assignments', () => {
    const legacy = { ...fixtureSnapshot, quickCalls: undefined };
    expect(quickCallTarget(publicSnapshot(legacy), 'police')).not.toBeNull();
    expect(quickCallTarget(publicSnapshot({ ...legacy, quickCalls: [] }), 'police')).toBeNull();
    expect(quickCallTarget(publicSnapshot({ ...legacy, fixture: false }), 'police')).toBeNull();
    const different = structuredClone(legacy);
    different.contacts[0].id = '10000000-0000-4000-8000-000000000099';
    expect(quickCallTarget(publicSnapshot(different), 'police')).toBeNull();
  });
  it('rejects extra configuration fields and malformed destinations', () => {
    expect(
      snapshotSchema.safeParse({
        ...emptySnapshot,
        quickCalls: [{ category: 'police', contactId: 'bad', numberId: 'bad' }],
      }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...fixtureSnapshot,
        quickCalls: [{ ...fixtureSnapshot.quickCalls![0], dial: '09999999999' }],
      }).success,
    ).toBe(false);
  });
});
