(() => {
  'use strict';
  const dialog = $('private-coach');
  const thread = $('coach-thread');
  const panel = $('coach-panel');
  const input = $('coach-input');
  const audio = $('coach-audio');
  let active = null;
  let sourceTrainer = null;
  let recognizer = null;
  const states = new Map();
  const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let audioVersion = 0;
  let loadedAudio = null;
  let micStartTimer;
  const visible = () => dialog.open || !thread.hidden;
  const voiceKey = key => 'cuechat-coach-voice-v1:' + key;
  function voicePreferences(owner) {
    try { return JSON.parse(localStorage.getItem(voiceKey(owner)) || '{}') || {}; }
    catch { return {}; }
  }
  function saveVoicePreferences() {
    try {
      localStorage.setItem(voiceKey(S.profile.id), JSON.stringify({readAloud:active.readAloud,autoSend:active.autoSend}));
    } catch { /* This session still has both voice preferences. */ }
  }

  function activeState() {
    const owner = S.profile?.id;
    if (!owner) return null;
    if (!states.has(owner)) {
      const preferences = voicePreferences(owner);
      states.set(owner, {
        text: '', table: null, pending: null, busy: false, turns: [], loaded: false, version: 0,
        mode: '', count: null, error: '', calculating: false,
        readAloud: preferences.readAloud === true, autoSend: preferences.autoSend === true,
        voice: null, voiceFeedback: '', audioPending: false
      });
    }
    return states.get(owner);
  }

  function render() {
    if (!active || active !== activeState()) return;
    const list = $('coach-messages');
    list.replaceChildren();
    if (!active.turns.length) {
      list.append(node('p', {class:'coach-example', text: active.loaded
        ? 'Ask about a miss, a runout, speed control, position play, or a rule.'
        : 'Opening your private conversation…'}));
    }
    for (const item of active.turns) {
      const question = node('article', {class:'coach-turn coach-player'},
        node('strong', {text:'You'}), node('p', {text:item.question}));
      if (item.table_name) question.append(node('small', {text:'Table used · '+item.table_name}));
      const answer = node('article', {class:'coach-turn'},
        node('strong', {text:'Chase'}), node('p', {text:item.reply}));
      if (item.references?.length) answer.append(node('small', {
        text:'Related practice · '+item.references.slice(0, 2).map((ref) => ref.title).join(' · ')
      }));
      list.append(question, answer);
    }
    if (active.busy) list.append(node('p', {class:'coach-example',text:active.calculating
      ? 'Running the Trainer physics…' : 'Chase is thinking…'}));
    list.scrollTop = list.scrollHeight;
    const ready = Boolean(sourceTrainer && sourceTrainer === S.trainer);
    $('coach-table-use').hidden = !ready;
    $('coach-draw-example').hidden = !dialog.open || Boolean(S.trainer);
    $('coach-table-use').disabled = active.busy;
    const attachment = active.table;
    $('coach-table-chip').hidden = !attachment;
    $('coach-table-name').textContent = attachment
      ? 'Table attached · '+(attachment.layout.name || attachment.name || 'Current table') : '';
    $('coach-table-remove').disabled = active.busy;
    $('coach-status').textContent = !active.mode ? 'Private to your player profile' :
      (active.mode === 'local-ollama' ? 'Local Ollama' : active.mode==='openai'
        ? 'OpenAI · questions are sent for processing' : 'Preview replies · no live AI') +
        ' · '+active.count+' local coaching references';
    $('coach-error').textContent = active.error;
    $('coach-error').hidden = !active.error;
    input.disabled = active.busy;
    $('coach-send').disabled = active.busy;
    $('coach-mic').disabled = !Recognition || active.busy;
    $('coach-mic').textContent = recognizer ? 'Stop mic' : '🎙 Mic';
    $('coach-mic').setAttribute?.('aria-pressed',String(!!recognizer));
    $('coach-mic').title = Recognition ? 'Dictate your question' : 'Use the microphone on your keyboard if your browser has one.';
    $('coach-voice-speechify').hidden = !active.voice;
    $('coach-voice-read').disabled = !active.voice;
    $('coach-voice-read').checked = active.readAloud;
    $('coach-voice-play').disabled = !active.voice || !active.turns.length || Boolean(recognizer) || active.audioPending;
    $('coach-voice-stop').hidden = !(active.audioPending || loadedAudio?.owner === active && !audio.paused);
    $('coach-voice-status').textContent = active.voiceFeedback ||
      (active.voice ? 'Speechify · '+active.voice.name : active.loaded ? 'Read-aloud is off. Speechify not connected.' : '');
    $('coach-voice-send').disabled = !Recognition;
    $('coach-voice-send').checked = active.autoSend;
  }

  async function open(fromTrainer) {
    active = activeState();
    if (!active) return;
    const selected = active;
    sourceTrainer = fromTrainer ? S.trainer : null;
    $('coach-back').textContent = fromTrainer ? 'Back to Shared Table' : 'Conversations';
    input.value = selected.text;
    if (fromTrainer) {
      if (panel.parentNode !== dialog) dialog.append(panel);
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) {
        abortDictation();
        stopAudio();
        dialog.close();
      }
      if (panel.parentNode !== thread) thread.append(panel);
      $('app').hidden = false;
      $('room-thread').hidden = true;
      thread.hidden = false;
      $('sidebar').classList.remove('open');
      renderRooms();
    }
    render();
    if (fromTrainer && !selected.busy) input.focus();
    const version = selected.version;
    try {
      const data = await api('/api/private-coach');
      if (activeState() !== selected) return;
      if (version === selected.version) selected.turns = data.turns;
      selected.mode = data.mode;
      selected.count = data.library_count;
      selected.voice = data.voice || null;
      selected.loaded = true;
    } catch (error) {
      if (activeState() !== selected) return;
      selected.error = error.message;
    }
    if (active === selected && visible()) render();
  }

  $('trainer-coach').onclick = () => open(true);
  $('coach-draw-example').onclick = () => {
    if (S.trainer) return;
    dialog.close();
    const name = 'Two-diamond draw example';
    openTrainer({privatePractice:true,layout:{format:'billiards-trainer',version:1,kind:'session',name,
      layout:{name,tableL:2.24,tableW:1.12,ballR:.028575,setupMode:'custom',freeAim:{x:1.12,y:0},
        balls:[{id:0,n:'CB',x:1.12,y:.70,active:true},{id:1,n:'1',x:1.12,y:.42,active:true}]},
      state:{speed:1.8,follow:-.5,sideSpin:0}}});
  };
  function abortDictation() {
    const mic = recognizer;
    recognizer = null;
    clearTimeout(micStartTimer);
    try { mic?.abort(); } catch { /* Provider already ended the session. */ }
  }
  function closeThread() {
    if (thread.hidden) return;
    thread.hidden = true;
    $('room-thread').hidden = false;
    abortDictation();
    stopAudio();
    sourceTrainer = null;
  }
  window.CueChatPrivate = {open, closeThread, isOpen:() => !thread.hidden};
  $('coach-back').onclick = () => {
    if (dialog.open) dialog.close();
    else $('sidebar').classList.add('open');
  };
  dialog.addEventListener('close', () => {
    if (!thread.hidden && panel.parentNode === thread) return;
    abortDictation();
    stopAudio();
    const fromTrainer = sourceTrainer;
    sourceTrainer = null;
    if (fromTrainer === S.trainer && fromTrainer) $('trainer-coach').focus();
  });
  $('coach-table-use').onclick = () => {
    if (!active || sourceTrainer !== S.trainer) return;
    try {
      active.table = sourceTrainer.frame.contentWindow.CueChatTrainerBridge.snapshot();
      active.pending = null;
      active.error = '';
    } catch (error) {
      active.error = error.message || 'Trainer is still opening. Try again in a moment.';
    }
    render();
  };
  $('coach-table-remove').onclick = () => {
    active.table = null;
    active.pending = null;
    render();
  };
  input.oninput = () => {
    if (active) {
      active.text = input.value;
      active.pending = null;
    }
  };
  function stopAudio() {
    audioVersion++;
    if (active) active.audioPending = false;
    audio.pause();
    if (loadedAudio) {
      URL.revokeObjectURL(loadedAudio.url);
      loadedAudio = null;
      audio.removeAttribute('src');
      audio.load();
    }
  }
  async function playReply(turn, selected) {
    if (!selected?.voice || !turn || recognizer || !visible() || selected !== activeState()) return;
    if (loadedAudio?.owner === selected && loadedAudio.id === turn.id) {
      try {
        audio.currentTime = 0;
        await audio.play();
        selected.voiceFeedback = '';
      } catch {
        selected.voiceFeedback = 'This device couldn’t play the Speechify audio.';
      }
      if (active === selected && visible()) render();
      return;
    }
    stopAudio();
    const version = audioVersion;
    const current = () => version === audioVersion && visible() && selected === activeState();
    selected.audioPending = true;
    selected.voiceFeedback = 'Preparing the Speechify reply…';
    render();
    try {
      const blob = await api('/api/private-coach/audio', {request_id:turn.id}, true);
      if (!current()) return;
      if (blob.type !== 'audio/mpeg') throw new Error('Speechify didn’t return playable audio.');
      const url = URL.createObjectURL(blob);
      loadedAudio = {owner:selected, id:turn.id, url};
      audio.src = url;
      audio.playbackRate = 1;
      audio.load();
      try {
        await audio.play();
        if (current()) selected.voiceFeedback = '';
      } catch {
        if (current()) selected.voiceFeedback = 'The audio is ready. Tap Play reply to listen.';
      }
    } catch (error) {
      if (current()) selected.voiceFeedback = error.message;
    } finally {
      if (current()) {
        selected.audioPending = false;
        render();
      }
    }
  }
  audio.addEventListener('ended', () => { if (visible()) render(); });
  $('coach-voice-play').onclick = () => playReply(active?.turns.at(-1),active);
  $('coach-voice-stop').onclick = () => {
    stopAudio();
    if (active) active.voiceFeedback = '';
    render();
  };
  $('coach-voice-read').onchange = () => {
    if (!active?.voice) return;
    active.readAloud = $('coach-voice-read').checked;
    saveVoicePreferences();
    if (!active.readAloud) stopAudio();
    active.voiceFeedback = active.readAloud ? 'Speechify will read the next reply.' : '';
    render();
  };
  $('coach-voice-send').onchange = () => {
    if (active) {
      active.autoSend = $('coach-voice-send').checked;
      saveVoicePreferences();
    }
  };
  $('coach-mic').onclick = () => {
    const selected = active;
    if (!Recognition || !selected || selected.busy) return;
    if (recognizer) {
      const mic = recognizer;
      try { mic.stop(); } catch { abortDictation(); }
      if (recognizer === mic) abortDictation();
      render();
      return;
    }
    stopAudio();
    selected.voiceFeedback = '';
    const mic = new Recognition();
    mic.lang = 'en-US';
    mic.continuous = false;
    mic.interimResults = false;
    let transcript = '';
    mic.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++)
        if (event.results[i].isFinal) transcript += ' ' + (event.results[i][0]?.transcript || '');
    };
    mic.onerror = () => {
      if (recognizer === mic && active === selected) {
        abortDictation();
        selected.error = 'Couldn’t use the microphone. Check permissions or use your keyboard mic.';
        render();
      }
    };
    mic.onend = () => {
      if (recognizer !== mic) return;
      recognizer = null;
      clearTimeout(micStartTimer);
      if (!visible() || active !== selected || activeState() !== selected) return;
      const voiceText = transcript.trim();
      if (voiceText) {
        const hadDraft = Boolean(selected.text.trim());
        input.value = (selected.text.trim() + ' ' + voiceText).trim().slice(0,1800);
        input.oninput();
        selected.error = '';
        if (selected.autoSend && !hadDraft) $('coach-form').requestSubmit();
      }
      render();
    };
    try {
      selected.error = '';
      recognizer = mic;
      mic.onaudiostart = () => clearTimeout(micStartTimer);
      micStartTimer = setTimeout(() => {
        if (recognizer !== mic) return;
        abortDictation();
        selected.error = 'The microphone did not start. Try your keyboard mic.';
        render();
      }, 9000);
      mic.start();
    } catch (_) {
      recognizer = null;
      selected.error = 'Microphone access could not start.';
    }
    render();
  };
  $('coach-form').onsubmit = async (event) => {
    event.preventDefault();
    const selected = active;
    if (!selected || selected !== activeState() || selected.busy || !selected.text.trim()) return;
    const pending = selected.pending || {
      question: selected.text.trim(), table: selected.table, request_id: crypto.randomUUID()
    };
    selected.pending = pending;
    selected.busy = true;
    selected.error = '';
    render();
    try {
      if (!Object.hasOwn(pending,'physics') && pending.table && sourceTrainer && sourceTrainer===S.trainer) {
        const plan = globalThis.CueChatCoachPhysics?.goal(pending.question,selected.turns.at(-1)?.question);
        if (plan) {
          selected.calculating = true;
          render();
          pending.physics = await sourceTrainer.frame.contentWindow.CueChatTrainerBridge.coachDraw(plan,pending.table) || null;
          selected.calculating = false;
          render();
        }
      }
      if (activeState() !== selected) return;
      const turn = await api('/api/private-coach', pending);
      selected.version++;
      if (!selected.turns.some((item) => item.id === turn.id)) selected.turns.push(turn);
      selected.text = '';
      selected.table = null;
      selected.pending = null;
      if (active === selected) input.value = '';
      if (active === selected && visible() && selected.readAloud) void playReply(turn, selected);
    } catch (error) {
      selected.error = error.message;
    } finally {
      selected.calculating = false;
      selected.busy = false;
      if (active === selected) {
        render();
        if (visible() && !selected.readAloud) input.focus();
      }
    }
  };
})();
