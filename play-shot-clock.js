(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BilliardsShotClock = api;
})(globalThis, function() {
  'use strict';

  const defaults = Object.freeze({
    players: 'table', mode: 'countdown', shot: 30, opening: 'special', postBreak: 60, postPush: 0,
    timeout: 60, timeouts: 2, timeoutScope: 'match', timeoutOwner: 'player', timeoutEnd: 'remaining', autoResume: false,
    extension: 15, extensions: 3, extensionScope: 'rack', extensionOwner: 'player', extensionCap: 0, extensionWindow: 0, hillExtensions: 0,
    match: 0, lateAt: 0, lateShot: 15, matchEnd: 'notice', matchBreak: 0, matchBreaks: 1, hold: 0,
    warning: 'ten', countdown: 0, expiry: true, zero: 'time', run: 'stopwatch', target: 0, foul: 0, breakFoul: 0, shootout: false
  });
  const presets = Object.freeze({
    stopwatch: { target: 0, foul: 0, breakFoul: 0 },
    reds: { target: 6, foul: 5, breakFoul: 0 },
    speed: { target: 15, foul: 10, breakFoul: 5 }
  });
  const bounds = {
    shot: [1, 600], postBreak: [1, 600], postPush: [0, 600], timeout: [1, 3600], timeouts: [0, 20],
    extension: [1, 600], extensions: [0, 20], extensionCap: [0, 1200], extensionWindow: [0, 600], hillExtensions: [0, 20],
    match: [0, 36000], lateAt: [0, 36000], lateShot: [1, 600], matchBreak: [0, 3600], matchBreaks: [0, 20],
    hold: [0, 60], countdown: [0, 10], target: [0, 30], foul: [0, 120], breakFoul: [0, 120]
  };
  const choices = {
    players: ['table', 'solo'], mode: ['off', 'advisory', 'countdown'], opening: ['special', 'standard', 'untimed'],
    timeoutScope: ['match', 'rack'], timeoutOwner: ['player', 'shared'], timeoutEnd: ['remaining', 'fresh', 'shared'],
    extensionScope: ['match', 'rack'], extensionOwner: ['player', 'shared'],
    matchEnd: ['notice', 'score', 'shootout'], warning: ['off', 'ten', 'time', 'ten-five'],
    zero: ['time', 'zero'], run: ['stopwatch', 'reds', 'speed', 'custom']
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  function profile(input = {}) {
    const settings = { ...defaults };
    for (const [key, [min, max]] of Object.entries(bounds)) {
      if (Number.isInteger(input[key])) settings[key] = Math.max(min, Math.min(max, input[key]));
    }
    for (const [key, values] of Object.entries(choices)) {
      if (values.includes(input[key])) settings[key] = input[key];
    }
    for (const key of ['autoResume', 'expiry', 'shootout']) {
      if (typeof input[key] === 'boolean') settings[key] = input[key];
    }
    return settings;
  }
  function initial(turn = 0) {
    return {
      enabled: false, turn, openingSeat: turn, inning: 1, betweenRacks: true, shot: null, interruption: null,
      match: { elapsed: 0, since: null }, scores: [], held: null, extensions: {}, timeouts: {}, breaks: {}, stats: {},
      run: { phase: 'ready', seat: turn, since: null, raw: 0, penalty: 0, results: {}, best: {}, duel: false }
    };
  }
  const remaining = (clock, now) => clock.deadline === null ? clock.left : Math.max(0, clock.deadline - now);
  const elapsed = (clock, now) => clock.elapsed + (clock.since === null ? 0 : Math.max(0, now - clock.since));
  const runTime = (run, now) => run.since === null ? run.raw : Math.max(0, now - run.since);
  const runResult = run => run.raw + run.penalty;
  const clock = (seconds, kind, now, running = true) => ({
    kind, status: running ? 'running' : 'ready', left: seconds * 1000, limit: seconds * 1000,
    deadline: running ? now + seconds * 1000 : null, elapsed: 0, started: false
  });

  function freeze(shot, now, status = 'paused') {
    if (!shot || shot.status !== 'running') return;
    const left = remaining(shot, now);
    shot.elapsed += Math.max(0, shot.left - left);
    shot.left = left;
    shot.deadline = null;
    shot.status = status;
  }
  function resume(shot, now) {
    if (!shot || shot.deadline !== null || !shot.left) return false;
    shot.deadline = now + shot.left;
    shot.status = 'running';
    shot.started = true;
    return true;
  }
  function settle(s) {
    if (!s.shot?.started) return;
    const stats = s.stats[s.turn] ||= { shots: 0, total: 0 };
    stats.shots++;
    stats.total += s.shot.elapsed;
  }
  function select(s, seat, inning = true) {
    if (inning && s.turn !== seat && seat === s.openingSeat) s.inning++;
    s.turn = seat;
  }
  function rack(s, p, seat = s.turn) {
    s.betweenRacks = true;
    s.openingSeat = seat;
    s.turn = seat;
    s.shot = null;
    if (p.extensionScope === 'rack') s.extensions = {};
    if (p.timeoutScope === 'rack') s.timeouts = {};
  }
  function matchLeft(s, p, now) {
    return p.match ? Math.max(0, p.match * 1000 - elapsed(s.match, now)) : null;
  }
  function regular(s, p, now) {
    const left = matchLeft(s, p, now);
    return left !== null && p.lateAt && left <= p.lateAt * 1000 ? p.lateShot : p.shot;
  }
  function armed(p, now) {
    return { ...clock(p.opening === 'special' ? p.postBreak : p.shot, 'post-break', now, false), status: 'armed' };
  }
  function startShot(s, p, now, kind = 'shot', start = true) {
    const seconds = kind === 'post-break' && p.opening === 'special' ? p.postBreak :
      kind === 'post-push' ? p.postPush : regular(s, p, now);
    s.betweenRacks = false;
    if (s.match.since === null) s.match.since = now;
    delete s.match.pending;
    if (p.mode === 'off' || (kind === 'post-break' && p.opening === 'untimed')) {
      s.shot = { ...clock(0, kind, now, false), status: 'untimed' };
      return;
    }
    s.shot = clock(seconds, kind, now, start);
    s.shot.started = start;
  }

  function endInterruption(s, p, now, atZero = false) {
    const current = s.interruption;
    if (!current) return false;
    if (current.kind === 'coaching' && current.shared) {
      const left = remaining(current.clock, now);
      s.shot = { ...clock(current.clock.limit / 1000, 'shared', now, false), left, status: left ? 'paused' : 'expired' };
      if (left) resume(s.shot, now);
    } else if (current.kind === 'coaching' && current.resume && p.mode !== 'off') {
      if (p.timeoutEnd === 'fresh') startShot(s, p, now, s.shot.kind, false);
      if (!atZero || p.autoResume) resume(s.shot, now);
      else s.shot.status = 'resume-ready';
    }
    if (current.matchRunning) {
      if (!atZero || p.autoResume) s.match.since = now;
      else s.match.pending = true;
    }
    s.interruption = null;
    return true;
  }
  function tick(s, p, now) {
    if (s.held) return false;
    if (s.interruption?.clock.status === 'running' && remaining(s.interruption.clock, now) === 0) {
      endInterruption(s, p, now, true);
      return 'interruption';
    }
    if (s.shot?.status === 'running' && remaining(s.shot, now) === 0) {
      freeze(s.shot, now, 'expired');
      return 'shot';
    }
    return false;
  }

  function apply(s, p, action, now) {
    const { type, seat = s.turn } = action;
    if (type === 'all-stop') {
      if (s.held) {
        const held = s.held;
        if (held.shot) resume(s.shot, now);
        if (held.match) s.match.since = now;
        if (held.interruption) resume(s.interruption.clock, now);
        s.held = null;
      } else {
        s.held = { shot: s.shot?.status === 'running', match: s.match.since !== null, interruption: s.interruption?.clock.status === 'running' };
        freeze(s.shot, now);
        freeze(s.interruption?.clock, now);
        s.match = { elapsed: elapsed(s.match, now), since: null };
      }
      return true;
    }
    if (s.held) return false;
    if (type.startsWith('run-')) return applyRun(s, p, action, now);
    if (type === 'end-timeout') return endInterruption(s, p, now);
    if (s.interruption) return false;
    if (type === 'resume-match') {
      if (!s.match.pending) return false;
      delete s.match.pending;
      s.match.since = now;
      return true;
    }

    switch (type) {
      case 'break':
        if (s.shot?.status === 'armed') return false;
        freeze(s.shot, now);
        settle(s);
        rack(s, p);
        s.enabled = true;
        s.shot = armed(p, now);
        return true;
      case 'start':
        s.enabled = true;
        if (['running', 'untimed', 'held'].includes(s.shot?.status)) return false;
        if (s.shot?.status === 'armed' || !s.shot || s.shot.status === 'expired') startShot(s, p, now, s.shot?.status === 'armed' ? s.shot.kind : 'shot');
        else {
          if (s.match.since === null) s.match.since = now;
          resume(s.shot, now);
        }
        return true;
      case 'pause':
        if (s.shot?.status !== 'running') return false;
        freeze(s.shot, now);
        return true;
      case 'stop':
        if (!s.shot) return false;
        s.shot = null;
        s.enabled = false;
        return true;
      case 'post-push':
        if (!p.postPush || s.shot?.status === 'armed') return false;
        freeze(s.shot, now);
        settle(s);
        s.enabled = true;
        s.shot = { ...clock(p.postPush, 'post-push', now, false), status: 'armed' };
        return true;
      case 'switch':
      case 'next':
        if (s.shot?.status === 'armed') {
          select(s, seat, false);
          startShot(s, p, now, s.shot.kind);
          return true;
        }
        if (type === 'switch' && !s.shot) {
          select(s, seat, false);
          if (!s.enabled) s.openingSeat = seat;
          return true;
        }
        {
          const start = !['paused', 'resume-ready', 'held'].includes(s.shot?.status);
          freeze(s.shot, now);
          settle(s);
          select(s, seat);
          s.enabled = true;
          startShot(s, p, now, 'shot', start);
          return true;
        }
      case 'sync':
        if (!s.enabled) { select(s, seat, false); return true; }
        if (action.rackChanged) {
          freeze(s.shot, now);
          if (action.record) settle(s);
          rack(s, p, seat);
          return true;
        }
        if (action.finished) {
          freeze(s.shot, now);
          if (action.record) settle(s);
          s.shot = null;
          s.match = { elapsed: elapsed(s.match, now), since: null };
          return true;
        }
        if (action.record) {
          freeze(s.shot, now);
          settle(s);
          s.shot = null;
        }
        if (action.breaking || action.afterBreak && !action.ready) {
          select(s, seat, false);
          s.shot = armed(p, now);
          return true;
        }
        if (action.ready) {
          const kind = s.shot?.status === 'armed' ? s.shot.kind : action.afterBreak ? 'post-break' : 'shot';
          select(s, seat, kind === 'shot');
          startShot(s, p, now, kind);
        } else select(s, seat);
        return true;
      case 'extend': {
        const shot = s.shot;
        if (!shot || shot.status !== 'running') return false;
        const key = p.extensionOwner === 'shared' ? 'shared' : s.turn;
        const limit = p.extensions + (action.hill ? p.hillExtensions : 0);
        const left = remaining(shot, now);
        if ((s.extensions[key] || 0) >= limit || !left || (p.extensionWindow && shot.elapsed + shot.left - left >= p.extensionWindow * 1000)) return false;
        const extended = p.extensionCap ? Math.min(left + p.extension * 1000, p.extensionCap * 1000) : left + p.extension * 1000;
        if (extended <= left) return false;
        freeze(shot, now);
        shot.left = extended;
        shot.limit = Math.max(shot.limit, extended);
        resume(shot, now);
        s.extensions[key] = (s.extensions[key] || 0) + 1;
        return true;
      }
      case 'timeout': {
        const key = p.timeoutOwner === 'shared' ? 'shared' : s.turn;
        if (!p.timeouts || (s.timeouts[key] || 0) >= p.timeouts || s.shot?.status === 'armed') return false;
        if (p.mode !== 'off' && ['expired', 'untimed'].includes(s.shot?.status)) return false;
        const canResume = s.shot?.status === 'running' && remaining(s.shot, now) > 0;
        freeze(s.shot, now);
        s.timeouts[key] = (s.timeouts[key] || 0) + 1;
        s.interruption = { kind: 'coaching', clock: clock(p.timeout, 'coaching', now), resume: canResume, shared: p.mode !== 'off' && p.timeoutEnd === 'shared' };
        return true;
      }
      case 'match-break': {
        if (!s.betweenRacks || !p.matchBreak || (s.breaks[seat] || 0) >= p.matchBreaks) return false;
        const matchRunning = s.match.since !== null;
        s.match = { elapsed: elapsed(s.match, now), since: null };
        s.breaks[seat] = (s.breaks[seat] || 0) + 1;
        s.interruption = { kind: 'match-break', clock: clock(p.matchBreak, 'match-break', now), matchRunning };
        return true;
      }
      case 'stance':
        if (!p.hold || !s.shot) return false;
        if (s.shot.status === 'held') return resume(s.shot, now);
        if (s.shot.status !== 'running' || Math.ceil(remaining(s.shot, now) / 1000) !== p.hold) return false;
        freeze(s.shot, now, 'held');
        s.shot.left = p.hold * 1000;
        return true;
      default:
        return false;
    }
  }

  function applyRun(s, p, action, now) {
    const r = s.run;
    switch (action.type) {
      case 'run-reset':
        if (r.phase === 'running' || r.phase === 'review') return false;
        s.run = { ...initial(action.seat ?? s.turn).run, duel: !!action.duel };
        return true;
      case 'run-select':
        if (r.phase === 'running' || r.phase === 'review') return false;
        if (r.duel && r.results[action.seat]) return false;
        Object.assign(r, { seat: action.seat, phase: 'ready', raw: 0, penalty: 0 });
        return true;
      case 'run-start':
        if (r.phase !== 'ready' || (r.duel && r.results[r.seat])) return false;
        Object.assign(r, { phase: 'running', since: now, raw: 0, penalty: 0 });
        return true;
      case 'run-finish':
        if (r.phase !== 'running') return false;
        Object.assign(r, { raw: runTime(r, now), since: null, phase: 'review' });
        return p.run === 'stopwatch' && !r.duel ? applyRun(s, p, { type: 'run-confirm' }, now) : true;
      case 'run-foul':
      case 'run-break-foul': {
        const penalty = action.type === 'run-foul' ? p.foul : p.breakFoul;
        if (!['running', 'review'].includes(r.phase) || !penalty) return false;
        r.penalty += penalty * 1000;
        return true;
      }
      case 'run-confirm':
      case 'run-invalid':
        if (r.phase !== 'review' && !(action.type === 'run-invalid' && r.phase === 'running')) return false;
        r.raw = runTime(r, now);
        r.since = null;
        const invalid = action.type === 'run-invalid';
        r.results[r.seat] = { raw: r.raw, penalty: r.penalty, invalid };
        if (!invalid) {
          r.best ||= {};
          r.best[r.seat] = Math.min(r.best[r.seat] ?? Infinity, runResult(r));
        }
        r.phase = 'done';
        return true;
      default:
        return false;
    }
  }
  function migrate(legacy, now) {
    const seat = Number.isInteger(legacy?.turn) ? legacy.turn : 0;
    const s = initial(seat);
    if (!legacy) return { settings: profile(), session: s };
    const settings = profile({ shot: legacy.seconds, extension: legacy.extension, extensions: legacy.extensions, extensionScope: 'match', warning: 'ten-five' });
    const left = legacy.deadline == null ? legacy.remaining : Math.max(0, legacy.deadline - now);
    s.shot = { ...clock(settings.shot, 'shot', now, false), left: Number.isFinite(left) ? left : settings.shot * 1000, status: left === 0 ? 'expired' : 'paused' };
    s.shot.started = left > 0;
    s.enabled = true;
    s.extensions = legacy.used || {};
    s.betweenRacks = false;
    return { settings, session: s };
  }
  function snapshot(s, now) {
    const value = copy(s);
    freeze(value.shot, now);
    value.match = { ...value.match, elapsed: elapsed(value.match, now), since: null };
    if (value.run.phase === 'running') {
      value.run.raw = runTime(value.run, now);
      value.run.since = null;
      value.run.phase = 'review';
    }
    return value;
  }

  return { defaults, presets, bounds, choices, profile, initial, apply, tick, remaining, elapsed, runTime, runResult, matchLeft, migrate, snapshot, copy };
});
