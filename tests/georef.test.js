import { describe, it, expect, vi } from 'vitest';

// Mock firebase.js before importing Georef to avoid Node import errors
vi.mock('../src/firebase.js', () => {
  return {
    Firestore: {
      collection: () => ({
        doc: () => ({
          set: () => Promise.resolve(),
        }),
      }),
    },
    Auth: {
      currentUser: {
        getIdToken: () => Promise.resolve('mock-token'),
      },
    },
  };
});

import Georef from '../src/components/georef/Georef.js';

describe('Georef Equality and Change Detection', () => {
  it('differentTo should detect ORCID changes', () => {
    const g1 = new Georef();
    g1.locality = 'Cape Town';
    g1.by = 'Ian';
    g1.byORCID = null;

    const g2 = g1.copy();
    g2.byORCID = 'orcid-123';

    expect(g1.differentTo(g2)).toBe(true);
  });

  it('hasSpatialOrAuthorChanges should NOT detect ORCID changes', () => {
    const g1 = new Georef();
    g1.locality = 'Cape Town';
    g1.by = 'Ian';
    g1.byORCID = null;

    const g2 = g1.copy();
    g2.byORCID = 'orcid-123';

    expect(g1.hasSpatialOrAuthorChanges(g2)).toBe(false);
  });

  it('hasSpatialOrAuthorChanges should detect spatial changes', () => {
    const g1 = new Georef();
    g1.locality = 'Cape Town';
    g1.decimalLatitude = -33.9;

    const g2 = g1.copy();
    g2.decimalLatitude = -34.0;

    expect(g1.hasSpatialOrAuthorChanges(g2)).toBe(true);
  });
});
