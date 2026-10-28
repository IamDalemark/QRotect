import { expect, it } from 'vitest';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { workingDirectoryIssues } from '../../src/lib/directory/schema';
it('accepts the existing directory and its exact phone-line assignments', () => {
  expect(workingDirectoryIssues(fixtureSnapshot)).toEqual([]);
});
it('rejects a line identifier reused by another contact', () => {
  const draft = structuredClone(fixtureSnapshot);
  draft.contacts[1].numbers[0].id = draft.contacts[0].numbers[0].id;
  expect(workingDirectoryIssues(draft)).toContain(
    'Phone-line identifiers must be unique across all contacts.',
  );
});
it('requires reassignment or clearing before a selected contact is removed', () => {
  const draft = structuredClone(fixtureSnapshot);
  draft.contacts.shift();
  expect(workingDirectoryIssues(draft)).toContain(
    'Reassign or clear quick calls before removing their contact or phone line.',
  );
});
it('does not treat an inactive or text-only draft line as a broken reference', () => {
  const draft = structuredClone(fixtureSnapshot);
  draft.contacts[0].active = false;
  draft.contacts[0].numbers[0].channel = 'text';
  expect(workingDirectoryIssues(draft)).toEqual([]);
});
