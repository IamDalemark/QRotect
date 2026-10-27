import { numberSchema } from './schema';

/** Display formatting and extensions must never become part of the telephone URL. */
export function telephoneHref(number: { dial: string; channel: string }): string | null {
  if (
    number.channel !== 'voice' ||
    !numberSchema.shape.dial.safeParse(number.dial).success ||
    /^\+?0+$/.test(number.dial)
  )
    return null;
  return `tel:${number.dial}`;
}
