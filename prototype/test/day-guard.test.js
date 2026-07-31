import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mayReplaceDay } from '../src/day.js';

describe('replacing a stored day', () => {
  it('writes a normal recomputation', () => {
    assert.equal(mayReplaceDay(3, 2), true);
  });

  it('writes the first catches of a day', () => {
    assert.equal(mayReplaceDay(2, 0), true);
  });

  it('writes nothing over nothing', () => {
    assert.equal(mayReplaceDay(0, 0), true);
  });

  it('refuses to wipe a day when the recomputation finds nothing', () => {
    // The trail was pruned or dropped, so the day recomputes to zero. That is
    // missing evidence, not an empty day, and it cost a real catch once.
    assert.equal(mayReplaceDay(0, 1), false);
  });

  it('still refuses when many catches are at stake', () => {
    assert.equal(mayReplaceDay(0, 9), false);
  });
});
