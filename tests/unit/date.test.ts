import { expect, it } from 'vitest';
import { formatPhilippineDate } from '../../src/lib/directory/date';
it('formats the supplied timestamp as a readable Philippine date', () => {
  expect(formatPhilippineDate('2026-10-30T13:20:13.766446+00:00')).toBe('Oct 30, 2026');
});
it('uses the Philippine day across UTC midnight and preserves calendar-only dates', () => {
  expect(formatPhilippineDate('2026-10-29T15:59:59Z')).toBe('Oct 29, 2026');
  expect(formatPhilippineDate('2026-10-29T16:00:00Z')).toBe('Oct 30, 2026');
  expect(formatPhilippineDate('2026-10-30')).toBe('Oct 30, 2026');
  expect(formatPhilippineDate('')).toBe('—');
  expect(formatPhilippineDate('invalid')).toBe('—');
});
