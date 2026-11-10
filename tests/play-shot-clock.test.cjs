const assert = require('node:assert/strict');
const test = require('node:test');
const Clock = require('../play-shot-clock');

const make = settings => {
  const profile = Clock.profile(settings);
  const state = Clock.initial();
  return { state, profile, act: (type, now, rest) => Clock.apply(state, profile, { type, ...rest }, now) };
};

test('post-break allowance goes to the first shooter once, including on a dry break', () => {
  for (const dry of [true, false]) {
    const { state, act } = make();
    assert(act('break', 1000));
    assert.equal(state.shot.status, 'armed');
    assert.equal(state.shot.deadline, null);
    assert(act(dry ? 'switch' : 'start', 7000, { seat: dry ? 1 : 0 }));
    assert.equal(state.turn, dry ? 1 : 0);
    assert.equal(state.shot.deadline, 67000);
    assert.equal(state.shot.kind, 'post-break');
    assert(act('next', 9000));
    assert.equal(state.shot.deadline, 39000);
    assert.equal(state.shot.kind, 'shot');
    assert.deepEqual(state.stats[state.turn], { shots: 1, total: 2000 });
  }
});

test('untimed first shot and a scored break requiring placement keep the opening rule', () => {
  const { state, act } = make({ opening: 'untimed' });
  act('start', 1000);
  act('sync', 2000, { record: true, afterBreak: true, seat: 1, ready: false });
  assert.equal(state.shot.status, 'armed');
  act('sync', 7000, { seat: 1, ready: true });
  assert.equal(state.shot.status, 'untimed');
  act('next', 8000);
  assert.equal(state.shot.deadline, 38000);
});

test('coaching early exit resumes the exact shot time and expiry waits for the operator', () => {
  const { state, profile, act } = make({ timeout: 10 });
  act('break', 1000);
  act('switch', 2000, { seat: 1 });
  act('timeout', 22000);
  assert.equal(state.shot.left, 40000);
  assert(!act('extend', 23000));
  act('end-timeout', 25000);
  assert.equal(state.shot.deadline, 65000);
  assert.equal(state.shot.kind, 'post-break');
  act('timeout', 28000);
  assert.equal(Clock.tick(state, profile, 38000), 'interruption');
  assert.equal(state.shot.status, 'resume-ready');
  assert.equal(state.shot.left, 37000);
  act('start', 45000);
  assert.equal(state.shot.deadline, 82000);
  assert(!act('timeout', 45001));
});

test('coaching supports fresh, shared-budget, and coaching-only profiles', () => {
  for (const mode of ['fresh', 'shared', 'off']) {
    const { state, profile, act } = make({ mode: mode === 'off' ? 'off' : 'countdown', timeoutEnd: mode, autoResume: true, timeout: 10 });
    if (mode !== 'off') act('start', 1000);
    assert(act('timeout', 9000));
    if (mode === 'fresh') {
      assert.equal(Clock.tick(state, profile, 19000), 'interruption');
      assert.equal(state.shot.deadline, 49000);
    } else {
      assert(act('end-timeout', 12000));
      assert.equal(state.shot?.deadline ?? null, mode === 'shared' ? 19000 : null);
    }
  }
});

test('all stop preserves both clocks and between-rack expiry can resume the match clock', () => {
  const { state, profile, act } = make({ match: 60, lateAt: 30, lateShot: 15, matchBreak: 5 });
  act('start', 1000);
  act('all-stop', 21000);
  assert.equal(state.shot.left, 10000);
  assert.equal(Clock.matchLeft(state, profile, 39000), 40000);
  act('all-stop', 41000);
  assert.equal(state.shot.deadline, 51000);
  act('next', 51000);
  assert.equal(state.shot.deadline, 66000);
  act('break', 52000);
  act('match-break', 53000);
  assert.equal(Clock.tick(state, profile, 58000), 'interruption');
  assert(state.match.pending);
  assert(act('resume-match', 59000));
  assert.equal(Clock.matchLeft(state, profile, 60000), 27000);
});

test('stance hold, extension windows, and per-rack allowance enforce independent rules', () => {
  const { state, act } = make({ extensions: 1, extensionWindow: 15, hold: 10 });
  act('start', 1000);
  assert(!act('stance', 15000));
  assert(act('extend', 10000));
  assert(!act('extend', 11000));
  assert(act('stance', 36000));
  assert.equal(state.shot.left, 10000);
  assert.equal(state.shot.status, 'held');
  assert(act('stance', 43000));
  assert.equal(state.shot.deadline, 53000);
  act('break', 47000);
  assert.deepEqual(state.extensions, {});
  act('start', 48000);
  assert(!act('extend', 64000));
});

test('solo runs keep best time and shootouts compare adjusted times after review', () => {
  const { state, act } = make({ players: 'solo', run: 'custom', foul: 5, breakFoul: 2 });
  act('run-start', 1000);
  assert(act('run-finish', 22000));
  assert(act('run-foul', 23000));
  assert(act('run-confirm', 24000));
  assert.equal(Clock.runResult(state.run.results[0]), 26000);
  assert.equal(state.run.best[0], 26000);
  assert(act('run-select', 30000, { seat: 0 }));
  act('run-start', 31000);
  act('run-invalid', 32000);
  assert.equal(state.run.best[0], 26000);
  act('run-reset', 40000, { duel: true, seat: 1 });
  act('run-start', 41000);
  act('run-finish', 61000);
  act('run-break-foul', 62000);
  act('run-confirm', 63000);
  assert(!act('run-select', 64000, { seat: 1 }));
  act('run-select', 64000, { seat: 0 });
  act('run-start', 65000);
  act('run-finish', 86000);
  act('run-confirm', 87000);
  assert(Clock.runResult(state.run.results[0]) < Clock.runResult(state.run.results[1]));
});

test('legacy countdown migrates paused with its existing remaining time and extension counts', () => {
  const { session, settings } = Clock.migrate({ turn: 1, seconds: 45, extension: 10, extensions: 2, remaining: 45000, deadline: 21000, used: { 1: 1 } }, 1000);
  assert.equal(settings.extensionScope, 'match');
  assert.equal(session.shot.status, 'paused');
  assert.equal(session.shot.left, 20000);
  assert.equal(session.extensions[1], 1);
  assert.equal(session.turn, 1);
});

test('post-push time can follow the incoming shooter, and a basic stopwatch finishes in two taps', () => {
  const { state, act } = make({ postPush: 60 });
  act('start', 1000);
  act('post-push', 2000);
  assert.equal(state.shot.deadline, null);
  act('switch', 4000, { seat: 1 });
  assert.equal(state.turn, 1);
  assert.equal(state.shot.kind, 'post-push');
  assert.equal(state.shot.deadline, 64000);
  act('run-start', 5000);
  act('run-finish', 7000);
  assert.equal(state.run.phase, 'done');
  assert.equal(state.run.best[0], 2000);
});
