'use strict';

const assert = require('assert');
const { reportedSaveCount, nextSaveCount, resolveVisibleSaveCount } = require('../lib/save-count-utils');

assert.strictEqual(reportedSaveCount(0, true), 1, 'saved listing must not report 0');
assert.strictEqual(reportedSaveCount(3, true), 3);
assert.strictEqual(reportedSaveCount(0, false), 0);
assert.strictEqual(reportedSaveCount(2, false), 2);
assert.strictEqual(reportedSaveCount(null, true), 1);
assert.strictEqual(reportedSaveCount(undefined, false), 0);

assert.strictEqual(nextSaveCount(1, { saved: true, saveCount: 0 }), 1, 'keep optimistic 1 when API count is 0');
assert.strictEqual(nextSaveCount(1, { saved: true, saveCount: 4 }), 4);
assert.strictEqual(nextSaveCount(0, { saved: true, saveCount: 0 }), 1, 'icon-on with missing count still shows 1');
assert.strictEqual(nextSaveCount(5, { saved: false, saveCount: 4 }), 4);
assert.strictEqual(nextSaveCount(1, { saved: false, saveCount: 0 }), 0);
assert.strictEqual(nextSaveCount(2, { stale: true, saved: true, saveCount: 0 }), 2);
assert.strictEqual(nextSaveCount(3, null), 3);

assert.strictEqual(resolveVisibleSaveCount({ initial: 2, saved: true, cached: 3 }), 3, 'keep optimistic count after navigation');
assert.strictEqual(resolveVisibleSaveCount({ initial: 2, saved: true }), 2);
assert.strictEqual(resolveVisibleSaveCount({ initial: 0, saved: true }), 1);
assert.strictEqual(resolveVisibleSaveCount({ initial: 3, saved: false, cached: 2 }), 2, 'unsave must not revive stale listing count');
assert.strictEqual(resolveVisibleSaveCount({ initial: 5, saved: true, cached: 3 }), 5, 'listing payload can catch up past optimistic');
assert.strictEqual(resolveVisibleSaveCount({ initial: 2, saved: false }), 2);

console.log('test-save-count-utils: ok');
