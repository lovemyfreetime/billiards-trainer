/* Pocket-entry teaching geometry. Measurements are in the trainer's table units (metres). */
(function (root, make) {
  const geometry = make();
  if (typeof module === 'object' && module.exports) module.exports = geometry;
  if (root) root.BilliardsPocketEntryGeometry = geometry;
})(typeof globalThis === 'object' ? globalThis : null, function () {
  'use strict';
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const between = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const from = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const length = a => Math.hypot(a.x, a.y);
  const normalized = a => { const d = length(a); return d > 1e-9 ? { x: a.x / d, y: a.y / d } : null; };
  const addScaled = (a, b, t) => ({ x: a.x + b.x * t, y: a.y + b.y * t });

  function mouths(g) {
    const { L, W, cornerLeg: c, sideMouth } = g, h = sideMouth / 2;
    return [
      { name: 'TL', kind: 'corner', a: { x: c, y: 0 }, b: { x: 0, y: c }, outside: { x: -1, y: -1 } },
      { name: 'TM', kind: 'side', a: { x: L / 2 - h, y: 0 }, b: { x: L / 2 + h, y: 0 }, outside: { x: 0, y: -1 } },
      { name: 'TR', kind: 'corner', a: { x: L - c, y: 0 }, b: { x: L, y: c }, outside: { x: 1, y: -1 } },
      { name: 'BR', kind: 'corner', a: { x: L, y: W - c }, b: { x: L - c, y: W }, outside: { x: 1, y: 1 } },
      { name: 'BM', kind: 'side', a: { x: L / 2 - h, y: W }, b: { x: L / 2 + h, y: W }, outside: { x: 0, y: 1 } },
      { name: 'BL', kind: 'corner', a: { x: 0, y: W - c }, b: { x: c, y: W }, outside: { x: -1, y: 1 } }
    ];
  }

  function analyze(g, contact) {
    if (!g || !contact?.objPos || !contact?.normal) return null;
    const direction = normalized(contact.normal);
    if (!direction) return null;
    let best = null, bestScore = Infinity;
    for (const mouth of mouths(g)) {
      const center = between(mouth.a, mouth.b), toCenter = from(contact.objPos, center);
      const distance = length(toCenter), toward = dot(direction, toCenter) / distance;
      if (!Number.isFinite(toward) || toward < .55) continue;
      const segment = from(mouth.a, mouth.b), denominator = cross(direction, segment);
      if (Math.abs(denominator) < 1e-8) continue;
      const toMouth = from(contact.objPos, mouth.a);
      const travel = cross(toMouth, segment) / denominator;
      if (travel <= 0) continue;
      const hit = addScaled(contact.objPos, direction, travel);
      // A distant arbitrary direction is not an intended pocket target.
      if (Math.abs(dot(from(center, hit), normalized(segment))) > length(segment) * 1.5) continue;
      const score = Math.acos(Math.max(-1, Math.min(1, toward))) + distance * .012;
      if (score < bestScore) { best = { ...mouth, center, hit }; bestScore = score; }
    }
    if (!best) return null;
    const tangent = normalized(from(best.a, best.b));
    const right = { x: -direction.y, y: direction.x };
    const positive = dot(tangent, right) >= 0 ? tangent : { x: -tangent.x, y: -tangent.y };
    const mouthWidth = length(from(best.a, best.b));
    const halfClearance = Math.max(0, (mouthWidth - 2 * g.R) / 2);
    if (halfClearance < 1e-6) return null;
    const offset = dot(from(best.center, best.hit), positive);
    const position = offset / halfClearance * 3;
    const out = Math.abs(offset) > halfClearance + 1e-8;
    const value = Math.round(Math.max(-3, Math.min(3, position))) || 0;
    const label = value < 0 ? `L ${value}` : value > 0 ? `R +${value}` : '0 · CENTER';
    return {
      ...best, mouthWidth, halfClearance, offset, position, value, out,
      label: out ? `${offset < 0 ? 'L' : 'R'} OUT` : label,
      ticks: Array.from({ length: 7 }, (_, i) => {
        const step = i - 3;
        return { step, point: addScaled(best.center, positive, step / 3 * halfClearance) };
      })
    };
  }

  return { mouths, analyze };
});
