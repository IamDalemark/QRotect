import { philippineDate } from '@/lib/directory/date';
import { contactSchema, guideSchema, mapSchema, quickCallSchema } from '@/lib/directory/schema';
export type ItemKind = 'contact' | 'guidance' | 'map' | 'quick-call';
export type FieldErrors = Record<string, string>;
export const itemSchemas = {
  contact: contactSchema,
  guidance: guideSchema,
  map: mapSchema,
  'quick-call': quickCallSchema,
};
export function itemErrors(kind: ItemKind, value: unknown): FieldErrors {
  if (value === null) return {};
  const result = itemSchemas[kind].safeParse(value);
  const errors: FieldErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_form';
      errors[path] ??= path.endsWith('dial')
        ? 'Enter one phone number, such as 09123456789 or +63333201234. Put extensions in the Extension field.'
        : path.endsWith('extension')
          ? 'Use up to 8 digits, or leave this blank.'
          : path === 'source'
            ? 'Enter the full source address, starting with https:// or http://.'
            : path.endsWith('reviewedAt') || path === 'verifiedAt'
              ? 'Choose a valid date.'
              : issue.code === 'too_big'
                ? 'This value is too long. Shorten it before publishing.'
                : 'Complete this field.';
    }
  }
  const read = (path: string) =>
    path
      .split('.')
      .reduce<unknown>(
        (part, key) =>
          part !== null && typeof part === 'object'
            ? (part as Record<string, unknown>)[key]
            : undefined,
        value,
      );
  const text = (path: string) => {
    const value = read(path);
    return typeof value === 'string' ? value.trim() : '';
  };
  const today = philippineDate();
  if (kind === 'contact' && read('active') === true) {
    if (!text('source'))
      errors.source = 'Add the official webpage where this contact was verified.';
    if (!text('verifiedAt')) errors.verifiedAt = 'Choose the date you checked this contact.';
    if (text('verifiedAt') > today)
      errors.verifiedAt = 'The verification date cannot be in the future.';
    if (!text('description.hil')) errors['description.hil'] = 'Add the Hiligaynon description.';
    const numbers = read('numbers');
    if (Array.isArray(numbers))
      numbers.forEach((_, i) => {
        if (!text(`numbers.${i}.label.hil`))
          errors[`numbers.${i}.label.hil`] = 'Add the Hiligaynon name for this line.';
      });
    if (read('approved') !== true)
      errors.approved = 'Confirm that you checked this contact and both language versions.';
  }
  if (kind === 'guidance' || kind === 'map') {
    const field = kind === 'guidance' ? 'title' : 'description';
    if (!text(`${field}.hil`))
      errors[`${field}.hil`] =
        `Add the Hiligaynon ${kind === 'guidance' ? 'title' : 'map description'}.`;
    const list = kind === 'guidance' ? 'steps' : 'instructions';
    const steps = read(list);
    if (Array.isArray(steps))
      steps.forEach((_, i) => {
        if (!text(`${list}.${i}.hil`))
          errors[`${list}.${i}.hil`] = 'Add the Hiligaynon version of this step.';
      });
    if (!text('reviewer'))
      errors.reviewer = 'Enter the name of the person who reviewed this content.';
    if (text('reviewedAt') > today) errors.reviewedAt = 'The review date cannot be in the future.';
    if (read('approved') !== true)
      errors.approved =
        'Confirm that the reviewer approved the content and both language versions.';
  }
  return errors;
}
