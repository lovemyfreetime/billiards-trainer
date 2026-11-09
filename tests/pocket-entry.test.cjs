const assert = require('node:assert/strict');
const { mouths, analyze } = require('../trainer-pocket-entry.js');
const g = { L: 2.2352, W: 1.1176, R: .028575, sideMouth: .120, cornerLeg: .110 / Math.SQRT2 };
const line = (point, dir, start) => analyze(g, { objPos: start, normal: { x: point.x - start.x, y: point.y - start.y, ...(dir || {}) } });

assert.equal(mouths(g).length, 6);
const top = mouths(g).find(p => p.name === 'TM');
const topCenter = { x: g.L / 2, y: 0 };
const central = line(topCenter, null, { x: g.L / 2, y: g.W * .4 });
assert.equal(central.name, 'TM');
assert.equal(central.label, '0 · CENTER');
assert(Math.abs(central.mouthWidth - .120) < 1e-9);
assert(Math.abs(central.halfClearance - (.120 - 2 * g.R) / 2) < 1e-9);

const right = line({ x: topCenter.x + central.halfClearance * 2 / 3, y: 0 }, null, { x: g.L / 2, y: g.W * .45 });
assert.equal(right.label, 'R +2');
const left = line({ x: topCenter.x - central.halfClearance / 3, y: 0 }, null, { x: g.L / 2, y: g.W * .45 });
assert.equal(left.label, 'L -1');
const miss = line({ x: topCenter.x + central.halfClearance * 1.5, y: 0 }, null, { x: g.L / 2, y: g.W * .45 });
assert.equal(miss.label, 'R OUT');

for (const mouth of mouths(g)) {
  const start = { x: g.L / 2, y: g.W / 2 };
  const center = { x: (mouth.a.x + mouth.b.x) / 2, y: (mouth.a.y + mouth.b.y) / 2 };
  const measured = line(center, null, start);
  assert.equal(measured.name, mouth.name);
  assert.equal(measured.value, 0, `${mouth.name} center is zero`);
  assert.equal(measured.ticks.length, 7);
  if (mouth.kind === 'corner') {
    assert(Math.abs(measured.mouthWidth - .110) < 1e-9);
    assert.notDeepEqual(measured.center, { x: mouth.name.includes('R') ? g.L : 0, y: mouth.name.includes('B') ? g.W : 0 });
  }
}
assert.equal(analyze(g, null), null);
assert.equal(analyze(g, { objPos: { x: g.L / 2, y: g.W / 2 }, normal: { x: 0, y: 0 } }), null);
console.log('Pocket-mouth center, left/right entry scale, clearance and all six pockets passed.');
