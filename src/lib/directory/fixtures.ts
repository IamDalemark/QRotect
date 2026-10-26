import { categoryIds, type Snapshot } from './schema';

export const emptySnapshot: Snapshot = {
  schemaVersion: 1,
  version: 'unpublished',
  publishedAt: null,
  mode: 'research',
  fixture: false,
  contacts: [],
  guidance: [],
  map: null,
  testContact: null,
};
export const fixtureSnapshot: Snapshot = {
  ...emptySnapshot,
  version: 'sample-v1',
  fixture: true,
  contacts: categoryIds.map((category, index) => ({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    agency: [
      'Sample police station',
      'Sample fire station',
      'Sample ambulance service',
      'Sample hospital',
      'Sample disaster response office',
      'Sample campus security office',
    ][index],
    branch: 'Demonstration record',
    category,
    area: category === 'school' ? 'cpu' : 'iloilo',
    description: {
      en: 'Sample entry for navigation and simulated calling. Replace with an approved contact.',
      hil: 'Halimbawa lamang para sa pagpraktis. Kinahanglan sang gin-aprobahan nga impormasyon.',
    },
    aliases: [category, category === 'medical' ? 'bulig medikal' : category],
    hours: '',
    numbers: [
      {
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        label: { en: 'Sample line', hil: 'Halimbawa nga linya' },
        display: '09XX XXX XXXX',
        dial: '000',
        extension: '',
        channel: 'voice',
      },
    ],
    verifiedAt: '',
    source: '',
    approved: false,
    active: true,
    priority: category === 'school' || category === 'medical',
  })),
};
