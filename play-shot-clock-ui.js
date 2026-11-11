(function() {
  'use strict';

  const M = window.BilliardsShotClock;
  const KEY = 'billiardsPlayShotClock-v1';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return null; }
  };
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(label, action, className) {
    const node = element('button', label, className);
    node.type = 'button';
    node.onclick = action;
    return node;
  }
  const symbols = {
    start: '<path d="m9 5 12 9-12 9z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M9 6v16M19 6v16" stroke-width="5"/>',
    stop: '<rect x="6" y="6" width="17" height="17" rx="3" fill="currentColor" stroke="none"/>',
    audio: '<path d="M4 11h5l7-6v19l-7-6H4z" fill="currentColor" stroke="none"/><path d="M20 9c4 3 4 9 0 12m4-16c7 6 7 15 0 20"/>',
    gear: '<path d="m11 3 1-2h4l1 2 3 1 2-1 3 3-1 3 1 3 3 1v4l-3 1-1 3 1 2-3 3-3-1-3 1-1 2h-4l-1-2-3-1-2 1-3-3 1-3-1-3-2-1v-4l2-1 1-3-1-2 3-3 3 1z" fill="currentColor" stroke="none"/><circle cx="14" cy="15" r="5" fill="#092638" stroke="none"/>',
    break: '<path d="M14 2 27 25H1z" stroke-width="2" stroke-linejoin="round"/>' +
      [0,1,2,3].flatMap(row=>Array.from({length:row+1},(_,col)=>'<circle cx="'+(14-row*2.8+col*5.6)+'" cy="'+(8+row*4.8)+'" r="1.8" fill="currentColor" stroke="none"/>')).join(''),
    clock: '<circle cx="14" cy="16" r="10"/><path d="M14 9v7l4 3M10 2h8m-4 0v4"/>',
    extension: '<path d="M14 5v18M5 14h18"/><path d="M5 4h-3v22h3m18-22h3v22h-3"/>',
    switch: '<path d="M3 9h22l-6-6M25 19H3l6 6" stroke-width="3" stroke-linejoin="round"/>',
    reset: '<path d="M5 9a10 10 0 1 1-1 10M5 2v7h7" stroke-width="3" stroke-linejoin="round"/>'
  };
  function symbol(name) {
    const node = element('span', null, 'sc-symbol');
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' + symbols[name] + '</svg>';
    return node;
  }
  function decorate(node, icon, label) {
    node.replaceChildren(symbol(icon), element('span', label, 'sc-control-label'));
    return node;
  }
  function time(ms, precision = false) {
    const total = precision ? Math.floor(ms / 10) : Math.ceil(ms / 1000) * 100;
    const seconds = Math.floor(total / 100);
    const head = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    return precision ? head + '.' + String(total % 100).padStart(2, '0') : head;
  }
  const labels = {
    'post-break': 'POST-BREAK', 'post-push': 'POST-PUSH-OUT', coaching: 'COACHING TIMEOUT',
    'match-break': 'MATCH BREAK', shot: 'SECONDS', shared: 'SHOOT'
  };
  const sections = [
    ['Timing defaults', [
      ['players', 'Players', { table: 'Table players', solo: 'Solo Practice' }],
      ['mode', 'Shot clock', { countdown: 'Countdown', advisory: 'Advisory', off: 'Off' }],
      ['shot', 'Standard shot (s)'], ['opening', 'First shot after break', { special: 'Post-break time', standard: 'Standard time', untimed: 'Untimed' }],
      ['postBreak', 'Post-break (s)'], ['postPush', 'Post-push-out (s), 0 = off']
    ]],
    ['Timeouts', [
      ['timeout', 'Coaching timeout (s)'], ['timeouts', 'Timeouts per player, 0 = off'],
      ['timeoutScope', 'Timeout allowance resets', { match: 'Per match', rack: 'Per rack' }],
      ['timeoutOwner', 'Timeout allowance', { player: 'Per player', shared: 'Shared' }],
      ['timeoutEnd', 'After coaching', { remaining: 'Resume remaining time', fresh: 'Start a fresh shot clock', shared: 'Share coaching and shot time' }],
      ['autoResume', 'Resume automatically at timeout expiry']
    ]],
    ['Extensions', [
      ['extension', 'Extension time (s)'], ['extensions', 'Extensions, 0 = off'],
      ['extensionScope', 'Extension allowance resets', { rack: 'Per rack', match: 'Per match' }],
      ['extensionOwner', 'Extension allowance', { player: 'Per player', shared: 'Shared' }],
      ['extensionWindow', 'Extension call window (s), 0 = anytime'], ['extensionCap', 'Remaining-time cap (s), 0 = none'],
      ['hillExtensions', 'Extra extensions when both are on the hill']
    ]],
    ['Audio alerts', [
      ['warning', 'Warning call', { ten: 'Ten seconds', time: 'Time at 10 seconds', 'ten-five': 'Ten and five seconds', off: 'Off' }],
      ['countdown', 'Spoken countdown starts at (0–10), 0 = off'], ['expiry', 'Announce shot expiry'],
      ['zero', 'Expiry call', { time: 'Time', zero: 'Zero' }]
    ]],
    ['Match and referee', [
      ['match', 'Match countdown (s), 0 = count up'], ['lateAt', 'Late phase starts with (s), 0 = off'],
      ['lateShot', 'Late-phase shot (s)'], ['matchEnd', 'At match expiry', { notice: 'Show match time expired', score: 'Compare games and balls', shootout: 'Offer shootout if tied' }],
      ['matchBreak', 'Between-rack break (s), 0 = off'], ['matchBreaks', 'Match breaks per player'], ['hold', 'Hold at warning (s), 0 = off']
    ]],
    ['Timed Run / Shootout', [
      ['run', 'Run format', { stopwatch: 'Stopwatch only', reds: '6-Reds Shootout', speed: 'Western BCA Speed Pool', custom: 'Custom' }],
      ['target', 'Target balls, 0 = none'], ['foul', 'Foul penalty (s)'], ['breakFoul', 'Break scratch penalty (s)'],
      ['shootout', 'Enable two-player shootout']
    ]]
  ];

  function mount(options) {
    const old = read();
    const migrated = M.migrate(options.legacy, Date.now());
    let settings = old?.settings ? M.profile(old.settings) : migrated.settings;
    let session = old?.session?.run ? old.session : migrated.session;
    let profiles = Array.isArray(old?.profiles) ? old.profiles : [];
    let audio = old?.audio === true, page = 'clock', undo = null, lastSecond = null, lastPhase = null;
    let matchExpiry = false, reopenCatalog = false, ownsAudio = false;
    const overlay = element('section', null, 'shot-clock-view');
    overlay.hidden = true;
    overlay.setAttribute('aria-label', 'Shot Clock');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const headline = element('h1', 'Shot Clock');
    const brand = element('img', null, 'sc-brand');
    brand.src = './icons/shot-clock-logo.svg';
    brand.alt = 'Shot Clock';
    const headerActions = element('div', null, 'sc-header-actions');
    const total = element('div', null, 'sc-total');
    const totalLabel = element('span', 'TOTAL TIME');
    const totalValue = element('strong', '00:00');
    total.append(totalLabel, totalValue);
    const inning = element('div', null, 'sc-inning');
    const inningValue = element('strong', '1');
    inning.append(element('span', 'INNING'), inningValue);
    const status = element('div', '', 'sc-status');
    status.setAttribute('role', 'status');
    const body = element('div', null, 'sc-body');
    const footer = element('footer', null, 'sc-footer');
    const back = button('Back to Table', close, 'sc-back');
    const gear = decorate(button('', () => show('settings'), 'sc-gear'), 'gear', 'Settings');
    gear.setAttribute('aria-label', 'Shot Clock Settings');
    const header = element('header', null, 'sc-header');
    const settingsActions = element('div', null, 'sc-settings-actions');
    headerActions.append(back, gear, settingsActions);
    header.append(brand, headline, total, inning, headerActions);
    overlay.append(header, status, body, footer);
    document.body.append(overlay);
    const now = () => Date.now();
    const names = () => {
      const players = options.table()?.players?.map(player => player.name) || ['Player 1', 'Player 2'];
      return settings.players === 'solo' ? [players[session.turn] || players[0] || 'Player 1'] : players;
    };
    const seats = () => settings.players === 'solo' ? [session.turn] : names().map((_, i) => i);
    const name = seat => settings.players === 'solo' ? names()[0] : names()[seat] || 'Player ' + (seat + 1);
    const nextSeat = () => seats()[(seats().indexOf(session.turn) + 1) % seats().length];
    function toggleAudio() {
      audio = !audio;
      if (audio) window.BilliardsAudio?.unlock().catch(() => {});
      else stopAudio();
      save();
      paint();
    }
    const audioButton = decorate(button('', toggleAudio, 'sc-audio'), 'audio', 'Audio');
    const headerAudio = decorate(button('', toggleAudio, 'sc-header-audio'), 'audio', 'Audio');
    headerActions.append(headerAudio);
    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ settings, session: M.snapshot(session, now()), profiles, audio }));
      } catch (_) { status.textContent = 'Clock settings could not be saved on this device.'; }
    }
    function stopAudio() { if (ownsAudio) window.BilliardsAudio.cancel(); }
    function cue(keys) {
      if (!audio || !window.BilliardsAudio?.available() || window.BilliardsNarration?.speaking()) return;
      if (!ownsAudio && window.BilliardsAudio.speaking()) return;
      stopAudio();
      ownsAudio = true;
      window.BilliardsAudio.speak(keys, () => { ownsAudio = false; }).catch(() => { ownsAudio = false; });
    }
    function toggleScreen(showing) {
      overlay.hidden = !showing;
      document.body.classList.toggle('play-shot-clock-open', showing);
      options.root.inert = showing;
    }
    function open(fromCatalog = false) {
      reopenCatalog = fromCatalog;
      toggleScreen(true);
      window.BilliardsDisplay?.enter(true);
      show('clock');
      back.focus({ preventScroll: true });
    }
    function close() {
      toggleScreen(false);
      options.close(reopenCatalog);
    }
    function show(view) {
      page = view;
      status.textContent = '';
      headline.textContent = { clock: 'Shot Clock', settings: 'Settings', run: 'Timed Run' }[view];
      overlay.setAttribute('data-page', view);
      headline.hidden = view === 'clock';
      gear.hidden = view === 'settings';
      body.replaceChildren();
      footer.replaceChildren();
      footer.hidden = view === 'settings';
      settingsActions.replaceChildren();
      if (page === 'settings') settingsPage();
      else if (page === 'run') runPage();
      else clockPage();
      paint();
    }
    function notify() {
      save();
      options.change();
      paint();
    }
    function dispatch(type, detail = {}) {
      const stamp = now();
      M.tick(session, settings, stamp);
      const previous = M.copy(session);
      if (type === 'clock-undo') {
        if (!undo) return false;
        const from = undo.at;
        session = undo.session;
        for (const timer of [session.shot, session.interruption?.clock]) {
          if (timer?.deadline != null) timer.deadline += stamp - from;
        }
        if (session.match.since !== null) session.match.since += stamp - from;
        undo = null;
      } else {
        if (!M.apply(session, settings, { type, ...detail }, stamp)) return false;
        if (['switch', 'next', 'break', 'post-push'].includes(type)) undo = { session: previous, at: stamp };
        else if (!type.startsWith('run-')) undo = null;
      }
      if (!type.startsWith('run-') && type !== 'extend') stopAudio();
      notify();
      if (!overlay.hidden && ((page === 'clock' && ['switch', 'sync', 'clock-undo'].includes(type)) ||
          (page === 'run' && ['run-reset', 'run-select'].includes(type)))) show(page);
      return true;
    }
    function command(type, detail) {
      if (!dispatch(type, detail)) status.textContent = 'That action is unavailable at the moment.';
      else status.textContent = '';
    }
    function rotate() { command('switch', { seat: nextSeat() }); }
    function dotAllowance(left, total, label) {
      return label + (total && total <= 5 ? '  ' + '●'.repeat(left) + '○'.repeat(total - left) : ' · ' + left);
    }
    const ui = {};
    function card(seat) {
      const panel = element('section', null, 'sc-player');
      const header = element('header', null, 'sc-player-header');
      panel.onclick = event => {
        if (seat !== session.turn && !event.target.closest('button')) command('switch', { seat });
      };
      const player = button(name(seat), () => command('switch', { seat }), 'sc-name');
      player.setAttribute('aria-label', 'Select ' + name(seat));
      const timeout = button('', () => command('timeout'), 'sc-timeout');
      timeout.setAttribute('aria-label', 'Coaching timeout for ' + name(seat));
      const timeoutTitle = element('span', 'T.O.', 'sc-timeout-title');
      const timeoutValue = element('strong', '', 'sc-timeout-value');
      const timeoutCaption = element('small', 'TIMEOUTS');
      const timeoutDots = element('span', '', 'sc-timeout-dots');
      timeout.replaceChildren(timeoutTitle, timeoutValue, timeoutCaption);
      const timeoutGroup = element('div', null, 'sc-timeout-group');
      timeoutGroup.append(timeout, timeoutDots);
      header.append(player, timeoutGroup);
      const ring = button('', () => {
        if (seat !== session.turn) return command('switch', { seat });
        if (session.interruption) return command('end-timeout');
        if (['running', 'untimed', 'expired'].includes(session.shot?.status)) return command('next');
        return command('start');
      }, 'sc-ring');
      ring.innerHTML = '<svg aria-hidden="true" viewBox="0 0 200 200"><defs><linearGradient id="sc-arc-' + seat +
        '" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="200" y2="100" gradientTransform="rotate(-130 100 100)">' +
        '<stop stop-color="#00f2fe"/><stop offset=".52" stop-color="#99fcf4"/><stop offset="1" stop-color="#ffff42"/>' +
        '</linearGradient></defs><circle class="sc-track" cx="100" cy="100" r="83" pathLength="100"/>' +
        '<circle class="sc-progress" cx="100" cy="100" r="83" pathLength="100"/></svg>';
      const ringText = element('span', null, 'sc-ring-text');
      const number = element('strong', '30');
      const caption = element('small', 'SECONDS');
      const hint = element('small', '', 'sc-ring-hint');
      ringText.append(number, caption, hint);
      ring.append(ringText);
      const extension = button('', () => command('extend', { hill: bothOnHill() }), 'sc-extension');
      extension.setAttribute('aria-label', 'Extend shot clock for ' + name(seat));
      const stats = element('p', '', 'sc-stats');
      const dial = element('div', null, 'sc-dial');
      dial.append(ring, extension);
      panel.append(header, dial, stats);
      return { seat, panel, player, timeout, timeoutValue, timeoutDots, timeoutGroup, ring, number, caption, hint, extension, stats, progress: ring.querySelector('.sc-progress') };
    }
    function clockPage() {
      const grid = element('div', null, 'sc-grid');
      const choices = seats();
      const shown = choices.length > 2 ? [session.turn, nextSeat()] : choices;
      const switcher = decorate(button('', rotate, 'sc-switch'), 'switch', 'Switch Player');
      switcher.setAttribute('aria-label', 'Switch Player');
      ui.cards = shown.map(card);
      grid.classList.toggle('sc-solo', shown.length === 1);
      grid.append(ui.cards[0].panel);
      if (shown.length === 2) grid.append(switcher, ui.cards[1].panel);
      body.append(grid);
      if (choices.length > 2) {
        const list = element('div', null, 'sc-seat-list');
        choices.forEach(seat => list.append(button(name(seat), () => command('switch', { seat }))));
        body.append(list);
      }
      ui.break = decorate(button('', () => command('break'), 'sc-start sc-break'), 'break', 'Break');
      ui.start = decorate(button('', () => command('start'), 'sc-start'), 'start', 'Start');
      ui.next = button('Next Shot', () => command('next'));
      ui.pause = decorate(button('', () => command('pause'), 'sc-pause'), 'pause', 'Pause');
      ui.stop = decorate(button('', () => command('stop'), 'sc-stop'), 'stop', 'Stop');
      ui.undo = button('Undo Clock', () => command('clock-undo'));
      ui.official = button('All Stop', () => command('all-stop'));
      ui.end = button('End Coaching', () => command('end-timeout'), 'sc-start');
      ui.stance = button('Hold at Warning', () => command('stance'));
      ui.matchBreak = button('Match Break', () => command('match-break'));
      ui.resumeMatch = button('Resume Match Clock', () => command('resume-match'));
      ui.push = button('Post-Push-Out', () => command('post-push'));
      ui.runButton = button('Timed Run', () => show('run'));
      ui.reset = decorate(button('', () => reset(), 'sc-reset'), 'reset', 'Reset');
      ui.shootoutButton = button('Start Shootout', () => {
        if (dispatch('run-reset', { seat: seats()[0], duel: true })) show('run');
      }, 'sc-start');
      const table = options.table();
      if (!table?.score && choices.length === 2 && settings.match && settings.matchEnd !== 'notice') {
        const scores = element('div', null, 'sc-score');
        for (const seat of choices) {
          for (const field of ['games', 'balls']) {
            const label = element('label', name(seat) + ' ' + field);
            const input = element('input');
            input.type = 'number';
            input.min = field === 'balls' ? -999 : 0;
            input.max = 999;
            input.value = session.scores?.[seat]?.[field] ?? 0;
            input.onchange = () => {
              if (!input.reportValidity() || !Number.isInteger(input.valueAsNumber)) return;
              session.scores ||= [];
              const values = session.scores[seat] ||= { games: 0, balls: 0 };
              values[field] = input.valueAsNumber;
              notify();
            };
            label.append(input);
            scores.append(label);
          }
        }
        body.append(scores);
      }
      footer.append(ui.break, ui.start, ui.next, ui.pause, ui.stop, ui.end, ui.undo, ui.official, ui.stance, ui.matchBreak, ui.resumeMatch, ui.push, ui.runButton, ui.shootoutButton, audioButton, ui.reset);
    }
    function bothOnHill() { return options.table()?.bothOnHill === true; }
    function setText(node, value) {
      const label = node.querySelector('.sc-control-label') || node;
      if (label.textContent !== value) label.textContent = value;
    }
    function scoreValues() {
      const table = options.table();
      if (table?.score?.length === 2) return table.score;
      if (seats().length !== 2 || !settings.match || settings.matchEnd === 'notice') return null;
      return seats().map(seat => session.scores?.[seat] || { games: 0, balls: 0 });
    }
    function comparison() {
      const scores = scoreValues();
      if (!scores) return null;
      return Math.sign(scores[0].games - scores[1].games || scores[0].balls - scores[1].balls);
    }
    function paintClock(stamp) {
      const shot = session.shot, interruption = session.interruption;
      const late = M.matchLeft(session, settings, stamp);
      const modeOff = settings.mode === 'off';
      for (const c of ui.cards) {
        const active = c.seat === session.turn;
        c.panel.classList.toggle('sc-active', active);
        c.player.disabled = active || !!interruption || !!session.held;
        c.ring.disabled = !!session.held || (!active && !!interruption) || active && shot?.status === 'held';
        const clock = active ? interruption?.clock || shot : null;
        const left = clock ? M.remaining(clock, stamp) : settings.shot * 1000;
        const seconds = Math.ceil(left / 1000);
        const warning = clock?.status === 'running' && !interruption && seconds <= 10;
        c.panel.classList.toggle('sc-warning', warning && seconds > 5);
        c.panel.classList.toggle('sc-danger', !!clock && (clock.status === 'expired' || warning && seconds <= 5));
        c.progress.style.stroke = active && !warning && clock?.status !== 'expired' ? 'url(#sc-arc-' + c.seat + ')' : '';
        c.progress.style.strokeDasharray = Math.min(78, 78 * left / (clock?.limit || settings.shot * 1000)) + ' 100';
        setText(c.number, interruption && active ? time(left) : modeOff || clock?.status === 'untimed' ? '—' : String(seconds));
        const caption = clock?.status === 'expired' ? (settings.mode === 'advisory' ? 'TIME GUIDELINE' : 'TIME EXPIRED') :
          clock?.status === 'armed' ? labels[clock.kind] + ' READY' : clock?.status === 'untimed' ? 'UNTIMED SHOT' :
          modeOff && !interruption ? 'SHOT CLOCK OFF' : labels[clock?.kind] || 'SECONDS';
        setText(c.caption, caption);
        const action = !active ? 'Select player' : interruption ? 'End ' + (interruption.kind === 'coaching' ? 'coaching' : 'break') :
          ['running', 'untimed', 'expired'].includes(clock?.status) ? 'Next Shot' : clock?.status === 'paused' || clock?.status === 'resume-ready' ? 'Resume' : 'Start';
        c.ring.setAttribute('aria-label', action + ' · ' + name(c.seat));
        setText(c.hint, !active ? '' : session.held ? 'ALL STOP' : interruption && shot?.started ? 'SHOT CLOCK PAUSED · ' + time(shot.left) :
          clock?.status === 'held' ? 'REFEREE HOLD' : clock?.status === 'armed' ? (clock.kind === 'post-push' ? 'Select the next shooter or Start' : 'Start after the break') : action);
        const timeoutKey = settings.timeoutOwner === 'shared' ? 'shared' : c.seat;
        const tos = Math.max(0, settings.timeouts - (session.timeouts[timeoutKey] || 0));
        c.timeoutGroup.hidden = !settings.timeouts;
        c.timeout.disabled = !active || !tos || !!interruption || !!session.held || shot?.status === 'armed' || settings.mode !== 'off' && ['expired', 'untimed'].includes(shot?.status);
        setText(c.timeoutValue, time(settings.timeout * 1000));
        setText(c.timeoutDots, dotAllowance(tos, settings.timeouts, '').trim());
        const extensionKey = settings.extensionOwner === 'shared' ? 'shared' : c.seat;
        const budget = settings.extensions + (bothOnHill() ? settings.hillExtensions : 0);
        const leftExtensions = Math.max(0, budget - (session.extensions[extensionKey] || 0));
        c.extension.hidden = !budget || modeOff;
        c.extension.disabled = !active || !leftExtensions || shot?.status !== 'running' || !!interruption || !!session.held;
        setText(c.extension, dotAllowance(leftExtensions, budget, '+' + settings.extension + 's'));
        const stats = session.stats[c.seat];
        setText(c.stats, 'Avg  ' + (stats?.shots ? (stats.total / stats.shots / 1000).toFixed(1) + 's' : '—') +
          '    |    Total  ' + time(stats?.total || 0));
      }
      const blocked = !!interruption || !!session.held;
      ui.break.disabled = blocked || shot?.status === 'armed';
      ui.start.disabled = blocked || ['running', 'untimed', 'held'].includes(shot?.status);
      setText(ui.start, ['paused', 'resume-ready'].includes(shot?.status) ? 'Resume' : 'Start');
      ui.next.disabled = blocked || !shot || ['armed', 'ready', 'held', 'paused', 'resume-ready'].includes(shot.status);
      ui.pause.disabled = blocked || shot?.status !== 'running';
      ui.stop.disabled = blocked || !shot;
      ui.undo.disabled = blocked || !undo;
      setText(ui.official, session.held ? 'Resume All' : 'All Stop');
      ui.end.hidden = !interruption;
      ui.end.disabled = !!session.held;
      setText(ui.end, interruption?.kind === 'match-break' ? 'End Match Break' : 'End Coaching');
      ui.stance.hidden = !settings.hold;
      ui.stance.disabled = blocked || !(shot?.status === 'held' || shot?.status === 'running' && Math.ceil(M.remaining(shot, stamp) / 1000) === settings.hold);
      setText(ui.stance, shot?.status === 'held' ? 'Release Hold' : 'Hold at Warning');
      ui.matchBreak.hidden = !settings.matchBreak;
      ui.matchBreak.disabled = blocked || !session.betweenRacks || (session.breaks[session.turn] || 0) >= settings.matchBreaks;
      ui.resumeMatch.hidden = !session.match.pending;
      ui.resumeMatch.disabled = blocked;
      ui.push.hidden = !settings.postPush;
      ui.push.disabled = blocked || shot?.status === 'armed';
      ui.runButton.disabled = blocked;
      const score = comparison();
      const tied = score === 0 || (score === null && options.table()?.tied);
      ui.shootoutButton.hidden = seats().length !== 2 || !((settings.shootout && options.table()?.tied) ||
        late === 0 && settings.matchEnd === 'shootout' && tied);
      ui.shootoutButton.disabled = blocked || ['running', 'review'].includes(session.run.phase);
      if (late === 0) {
        if (!matchExpiry) { matchExpiry = true; status.textContent = 'MATCH TIME EXPIRED'; }
        if (settings.matchEnd === 'score' && score !== null) {
          setText(status, score === 0 ? 'MATCH TIME EXPIRED · Next score lead wins' : 'MATCH TIME EXPIRED · ' + name(score > 0 ? 0 : 1) + ' leads · confirm result');
        }
      } else matchExpiry = false;
    }

    function runPage() {
      const panel = element('section', null, 'sc-run');
      const seatButtons = element('div', null, 'sc-seat-list');
      ui.runSeats = seats().map(seat => ({ seat, button: button(name(seat), () => command('run-select', { seat })) }));
      if (ui.runSeats.length > 1) seatButtons.append(...ui.runSeats.map(item => item.button));
      ui.runTime = element('strong', '00:00.00', 'sc-run-time');
      ui.runTime.setAttribute('role', 'timer');
      ui.runLabel = element('p');
      ui.runSummary = element('p');
      ui.runResults = element('p');
      panel.append(seatButtons, ui.runTime, ui.runLabel, ui.runSummary, ui.runResults);
      body.append(panel);
      ui.runMain = button('Start Run', () => {
        if (session.run.phase === 'done') return command('run-select', { seat: session.run.seat });
        command(session.run.phase === 'ready' ? 'run-start' : session.run.phase === 'running' ? 'run-finish' : 'run-confirm');
      }, 'sc-start');
      ui.foul = button('Add Foul', () => command('run-foul'));
      ui.breakFoul = button('Break Scratch', () => command('run-break-foul'));
      ui.invalid = button('Mark Incomplete', () => command('run-invalid'), 'sc-stop');
      ui.newDuel = button('New Shootout', () => command('run-reset', { seat: seats()[0], duel: true }));
      ui.exitDuel = button('Exit Shootout', () => command('run-reset', { seat: seats()[0], duel: false }));
      footer.append(button('Shot Clock', () => show('clock')), ui.runMain, ui.foul, ui.breakFoul, ui.invalid, ui.newDuel, ui.exitDuel, audioButton);
    }
    function paintRun(stamp) {
      const r = session.run, busy = ['running', 'review'].includes(r.phase);
      const raw = M.runTime(r, stamp);
      setText(ui.runTime, time(raw, true));
      setText(ui.runLabel, name(r.seat) + ' · ' + (r.duel ? 'Shootout' : 'Timed Run') +
        (settings.target ? ' · ' + settings.target + ' balls' : ''));
      const timeToBeat = Object.entries(r.results).find(([seat, result]) => +seat !== r.seat && !result.invalid)?.[1];
      const total = raw + r.penalty;
      const completed = Object.entries(r.results).filter(([, result]) => !result.invalid).sort(([, a], [, b]) => M.runResult(a) - M.runResult(b));
      const winner = r.duel && Object.keys(r.results).length === 2 && completed.length &&
        (completed.length === 1 || Math.floor(M.runResult(completed[0][1]) / 10) !== Math.floor(M.runResult(completed[1][1]) / 10)) ? name(+completed[0][0]) : '';
      setText(ui.runSummary, r.penalty ? 'Penalty  +' + time(r.penalty, true) + '    ·    Adjusted  ' + time(total, true) :
        r.phase === 'review' ? 'Review the run, then confirm the result.' : 'Start on the break. Finish when the final ball drops.');
      const results = r.duel ? Object.entries(r.results).map(([seat, result]) => name(+seat) + '  ' +
        (result.invalid ? 'Incomplete' : time(M.runResult(result), true))).join('    ·    ') : '';
      const best = r.best?.[r.seat];
      setText(ui.runResults, winner ? winner + ' wins  ·  ' + results : r.duel && Object.keys(r.results).length === 2 ?
        (completed.length ? 'Tied' : 'No completed run') + '  ·  ' + results : timeToBeat ? 'Time to beat  ' + time(M.runResult(timeToBeat), true) :
        results || (best !== undefined ? 'Personal best  ' + time(best, true) : ''));
      setText(ui.runMain, { ready: 'Start Run', running: 'Finish Run', review: 'Confirm Result', done: 'Next Run' }[r.phase]);
      ui.runMain.disabled = !!session.held || (r.duel && !!r.results[r.seat]);
      ui.foul.hidden = !settings.foul;
      ui.foul.disabled = !busy || !!session.held;
      setText(ui.foul, '+' + settings.foul + 's Foul');
      ui.breakFoul.hidden = !settings.breakFoul;
      ui.breakFoul.disabled = !busy || !!session.held;
      setText(ui.breakFoul, '+' + settings.breakFoul + 's Break Scratch');
      ui.invalid.disabled = !busy || !!session.held;
      ui.newDuel.hidden = settings.players === 'solo' || !settings.shootout || seats().length !== 2;
      ui.newDuel.disabled = busy || !!session.held;
      ui.exitDuel.hidden = !r.duel;
      ui.exitDuel.disabled = busy || !!session.held;
      for (const item of ui.runSeats) item.button.disabled = busy || item.seat === r.seat || !!(r.duel && r.results[item.seat]);
    }

    function settingsPage() {
      const form = element('form', null, 'sc-settings');
      const controls = new Map();
      const profileRow = element('div', null, 'sc-profile-row');
      const profileChoice = element('select');
      profileChoice.setAttribute('aria-label', 'Saved clock profiles');
      function refreshProfiles() {
        profileChoice.replaceChildren(new Option('Choose a saved profile', ''));
        profiles.forEach((item, index) => profileChoice.add(new Option(item.name, index)));
      }
      refreshProfiles();
      const profileName = element('input');
      profileName.placeholder = 'Profile name';
      profileName.setAttribute('aria-label', 'New profile name');
      profileName.maxLength = 48;
      profileRow.append(profileChoice, button('Load Profile', () => {
        const item = profiles[profileChoice.value];
        if (item) fill(item.settings);
      }), profileName, button('Save as Profile', () => {
        const title = profileName.value.trim();
        if (!title || !form.reportValidity()) return;
        if (profiles.some(item => item.name === title)) { status.textContent = 'That profile name is already in use.'; return; }
        profiles = [...profiles, { name: title, settings: values() }];
        refreshProfiles();
        save();
        status.textContent = 'Profile saved. Save Defaults to apply these settings.';
      }));
      for (const [title, fields] of sections) {
        const section = element('section', null, 'sc-settings-card');
        section.append(element('h2', title));
        for (const [key, label, choices] of fields) {
          const row = element('label', null, 'sc-setting');
          row.append(element('span', label));
          const input = element(choices ? 'select' : 'input');
          if (choices) Object.entries(choices).forEach(([value, caption]) => input.add(new Option(caption, value)));
          else if (typeof M.defaults[key] === 'boolean') input.type = 'checkbox';
          else {
            input.type = 'number';
            [input.min, input.max] = M.bounds[key];
            input.required = true;
          }
          input.name = key;
          row.append(input);
          section.append(row);
          controls.set(key, input);
        }
        form.append(section);
      }
      function values() {
        return M.profile(Object.fromEntries([...controls].map(([key, input]) =>
          [key, input.type === 'checkbox' ? input.checked : input.type === 'number' ? input.valueAsNumber : input.value])));
      }
      function fill(value) {
        for (const [key, input] of controls) {
          if (input.type === 'checkbox') input.checked = value[key];
          else input.value = value[key];
        }
      }
      controls.get('run').onchange = () => {
        const preset = M.presets[controls.get('run').value];
        if (preset) fill({ ...values(), ...preset });
      };
      const runOptions = ['target', 'foul', 'breakFoul'];
      for (const key of runOptions) controls.get(key).oninput = () => { controls.get('run').value = 'custom'; };
      const applySettings = button('Save Defaults', () => {
        if (!form.reportValidity()) return;
        const next = values();
        if (next.players === 'solo' && !session.run.duel && !['running', 'review'].includes(session.run.phase)) {
          M.apply(session, settings, { type: 'run-select', seat: session.turn }, now());
        }
        if (session.run.duel && next.players === 'solo') {
          if (['running', 'review'].includes(session.run.phase)) {
            status.textContent = 'Finish or mark the current shootout run incomplete before switching to Solo Practice.';
            return;
          }
          M.apply(session, settings, { type: 'run-reset', seat: session.turn }, now());
        }
        settings = next;
        if (!options.table()?.players?.[session.turn] && session.turn >= names().length) session.turn = 0;
        if (settings.mode === 'off' && session.shot && !session.interruption) {
          session.shot = { ...session.shot, status: 'untimed', deadline: null, left: 0 };
        } else if (settings.mode !== 'off' && session.shot?.status === 'untimed') session.shot = null;
        lastSecond = null;
        matchExpiry = false;
        notify();
        show('clock');
      }, 'sc-start');
      form.onsubmit = event => { event.preventDefault(); applySettings.click(); };
      fill(settings);
      body.append(profileRow, form);
      settingsActions.append(applySettings, button('Cancel', () => show('clock'), 'sc-pause'), button('Reset', () => fill(M.defaults), 'sc-stop'));
    }

    function paint() {
      const stamp = now();
      const expiry = M.tick(session, settings, stamp);
      const shot = session.shot;
      const inter = session.interruption;
      if (expiry) {
        if (settings.expiry) cue(expiry === 'shot' && settings.zero === 'zero' ? ['number-0'] : ['time']);
        save();
        options.change();
      }
      const live = session.shot?.status === 'running' && !session.interruption && !session.held;
      const seconds = live ? Math.ceil(M.remaining(session.shot, stamp) / 1000) : null;
      if (live && (session.shot !== lastPhase || seconds !== lastSecond)) {
        if (seconds === 10 && settings.warning === 'time') cue(['time']);
        else if (seconds > 0 && seconds <= settings.countdown) cue(['number-' + seconds]);
        else if ((seconds === 10 && ['ten', 'ten-five'].includes(settings.warning)) || (seconds === 5 && settings.warning === 'ten-five')) {
          cue(['number-' + seconds, 'seconds']);
        }
      }
      lastSecond = seconds;
      lastPhase = session.shot;
      options.compact(!!(inter || session.enabled && session.shot),
        inter ? labels[inter.kind] + ' · ' + time(M.remaining(inter.clock, stamp)) :
        shot ? 'Shot Clock · ' + (shot.status === 'armed' ? labels[shot.kind] + ' READY' : shot.status === 'untimed' ? 'Untimed' : time(M.remaining(shot, stamp))) : '');
      if (overlay.hidden) return;
      const left = M.matchLeft(session, settings, stamp);
      total.hidden = page === 'settings';
      inning.hidden = page !== 'clock' || settings.players === 'solo';
      setText(totalLabel, left === null ? 'TOTAL TIME' : 'MATCH TIME');
      setText(totalValue, time(left ?? M.elapsed(session.match, stamp)));
      setText(inningValue, session.inning);
      setText(audioButton, 'Audio');
      audioButton.setAttribute('aria-label', audio ? 'Mute clock audio' : 'Enable clock audio');
      headerAudio.setAttribute('aria-label', audio ? 'Mute clock audio' : 'Enable clock audio');
      headerAudio.setAttribute('aria-pressed', String(audio));
      audioButton.setAttribute('aria-pressed', String(audio));
      if (page === 'clock') paintClock(stamp);
      if (page === 'run') paintRun(stamp);
    }
    function reset(seat = 0) {
      stopAudio();
      session = M.initial(seat);
      undo = null;
      matchExpiry = false;
      lastSecond = null;
      lastPhase = null;
      notify();
      if (!overlay.hidden) show(page);
    }
    function sync(event, previous, next) {
      if (settings.players === 'solo' || !['ready', 'shot', 'next-hand', 'stand'].includes(event.type)) return;
      const record = event.type === 'shot' || event.type === 'stand';
      dispatch('sync', { seat: next.active, record, rackChanged: previous.rack !== next.rack,
        finished: next.phase === 'result', ready: next.phase === 'ready', breaking: next.phase === 'ready' && next.isBreak,
        afterBreak: record && previous.isBreak && !next.isBreak });
    }
    function syncUndo(seat) {
      if (settings.players === 'solo') return;
      session.turn = seat;
      session.shot = null;
      undo = null;
      notify();
    }
    function remote() {
      const shown = session.interruption?.clock || session.shot;
      if (!(session.enabled || session.interruption) || !shown || shown.status === 'untimed' || shown.status === 'armed') return null;
      return { turn: session.turn, remaining: shown.left, deadline: shown.deadline, expired: shown.status === 'expired', kind: shown.kind };
    }
    function input(type) {
      if (type === 'extend') return dispatch(type, { hill: bothOnHill() });
      if (type === 'switch') return seats().length > 1 && dispatch(type, { seat: nextSeat() });
      if (type === 'run-toggle') return page === 'run' && !overlay.hidden &&
        dispatch(session.run.phase === 'running' ? 'run-finish' : 'run-start');
      return dispatch(type);
    }
    document.addEventListener('keydown', event => {
      if (!overlay.hidden && event.key === 'Escape') {
        event.preventDefault();
        if (page !== 'clock') show('clock');
        else close();
      }
    });
    window.addEventListener('pagehide', save);
    setInterval(paint, 40);
    return { open, close, sync, syncUndo, reset, remote, input, visible: () => !overlay.hidden, editing: () => !overlay.hidden && page === 'settings' };
  }

  window.BilliardsShotClockUI = { mount };
})();
