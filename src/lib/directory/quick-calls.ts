import { telephoneHref } from './calling';
import { categoryIds, type Category, type Snapshot } from './schema';

// Explicit destinations for the owner's six authored demo records only.
export const demoQuickCalls = categoryIds.map((category, index) => ({
  category,
  contactId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  numberId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
}));

export function quickCallTarget(snapshot: Snapshot, category: Category) {
  const assignments = snapshot.quickCalls?.filter((q) => q.category === category) ?? [];
  if (assignments.length !== 1) return null;
  const assignment = assignments[0];
  const contacts = snapshot.contacts.filter((c) => c.id === assignment.contactId);
  if (contacts.length !== 1) return null;
  const contact = contacts[0];
  const numbers = contact.numbers.filter((n) => n.id === assignment.numberId);
  if (
    !contact.active ||
    contact.category !== category ||
    numbers.length !== 1 ||
    !telephoneHref(numbers[0])
  )
    return null;
  return { agency: contact.agency, branch: contact.branch, number: numbers[0] };
}
