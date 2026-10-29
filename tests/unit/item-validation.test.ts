import { expect, it } from 'vitest';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { itemErrors } from '../../src/lib/admin/item-validation';
it('returns field errors and practical phone examples without internal paths in messages', () => {
  const c = structuredClone(fixtureSnapshot.contacts[0]);
  c.numbers[0].dial = '0912 345 6789 ext123';
  const errors = itemErrors('contact', c);
  expect(errors['numbers.0.dial']).toContain('09123456789');
  expect(errors.source).toBeTruthy();
  expect(errors.verifiedAt).toBeTruthy();
  expect(errors.approved).toBeTruthy();
  expect(Object.values(errors).join(' ')).not.toContain('numbers.0');
});
it('validates every item language and reviewer without throwing on malformed input', () => {
  expect(
    itemErrors('guidance', { title: { en: 'Test', hil: '' }, steps: [{ en: 'Step', hil: '' }] }),
  ).toMatchObject({
    'title.hil': expect.any(String),
    'steps.0.hil': expect.any(String),
    reviewer: expect.any(String),
    approved: expect.any(String),
  });
  expect(() =>
    itemErrors('contact', {
      active: true,
      numbers: [{ label: { hil: 123 } }],
      description: { hil: 42 },
    }),
  ).not.toThrow();
});
it('accepts a reviewed contact and rejects future dates', () => {
  const c = structuredClone(fixtureSnapshot.contacts[0]);
  c.source = 'https://example.test/contact';
  c.verifiedAt = '2026-01-01';
  c.approved = true;
  expect(itemErrors('contact', c)).toEqual({});
  c.verifiedAt = '2999-01-01';
  expect(itemErrors('contact', c).verifiedAt).toContain('future');
});
it('permits removals and clearing assignments without inventing content', () => {
  for (const kind of ['contact', 'guidance', 'map', 'quick-call'] as const)
    expect(itemErrors(kind, null)).toEqual({});
});
