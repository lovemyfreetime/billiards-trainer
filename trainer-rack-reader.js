(() => {
  'use strict';

  const guides = {
    "rack3": {
      "file": "three-ball",
      "paragraphs": [
        "Play three rounds. Each player takes a fresh rack. Count every stroke, including the break. A foul adds one penalty stroke. Spot the balls pocketed on a foul. Cap each attempt at six strokes. The lowest total after three rounds wins."
      ],
      "source": null
    },
    "rack6": {
      "file": "six-ball",
      "paragraphs": [
        "Strike the lowest numbered ball first. After contact, pocket a ball or send a ball to a cushion. A legal pot keeps the turn. An ordinary foul gives the opponent ball in hand.",
        "This short rotation rack uses one at the apex and six in the back row. Use nine-ball scoring with six as the winning ball. Agree on the break rules and when to spot the winning ball before the game."
      ],
      "source": "https://www.billiardsforum.com/pool-rules/6-ball-rules"
    },
    "rack7": {
      "file": "seven-ball",
      "paragraphs": [
        "Strike the lowest numbered ball first. After contact, pocket a ball or send a ball to a cushion. A legal pot keeps the turn. An ordinary foul gives the opponent ball in hand.",
        "Rack one through six clockwise around seven. After a legal break, the incoming player chooses one long side for their winning seven. The breaker has the other side. A seven on a legal break wins. An illegal seven or a foul when on the seven loses. Illegally pocketed lower balls are spotted."
      ],
      "source": "https://www.billiardsforum.com/file/unofficial-rules/rules-for-7-ball-billy-aardds-club.pdf"
    },
    "rack8": {
      "file": "eight-ball",
      "paragraphs": [
        "On an open table, establish solids or stripes with a legal called shot after the break. Clear your group, then call and pocket the eight. An early eight, the wrong pocket for the eight, or a foul while pocketing it loses the rack.",
        "An eight on a legal break gives the breaker the choice of returning it to the foot spot or racking the balls again. Ordinary foul pots stay down."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "rack9": {
      "file": "nine-ball",
      "paragraphs": [
        "Strike the lowest numbered ball first. After contact, pocket a ball or send a ball to a cushion. A legal pot keeps the turn. An ordinary foul gives the opponent ball in hand.",
        "Legally pocketing the nine wins, including by combination. A nine pocketed on a foul or push-out, or driven off the table, returns to the foot spot. Other object balls stay down. After a legal break the next shooter may declare a push-out."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "rack10": {
      "file": "ten-ball",
      "paragraphs": [
        "Strike the lowest numbered ball first. After contact, pocket a ball or send a ball to a cushion. A legal pot keeps the turn. An ordinary foul gives the opponent ball in hand.",
        "Call the ball and pocket. The ten wins only as the last object ball on a legal called shot. Spot an early ten, including one made on the break. An unintended pot can give the incoming player the option to return the shot."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "ultimate8": {
      "file": "ultimate-eight-ball",
      "paragraphs": [
        "The Trainer uses a fixed fifteen-ball pattern with the eight on the foot spot. Use the following eight-ball practice rules unless your event specifies a different code.",
        "On an open table, establish solids or stripes with a legal called shot after the break. Clear your group, then call and pocket the eight. An early eight, the wrong pocket for the eight, or a foul while pocketing it loses the rack.",
        "The linked World Pool Billiard Association rules describe the standard game. This setup changes the rack."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "straight14": {
      "file": "straight-pool",
      "paragraphs": [
        "Call a ball and pocket. Any object ball can be first. Each legally pocketed ball scores one point. After fourteen are cleared, rack them with the apex vacant and play position on the break ball to open the next rack. This preset starts with those fourteen balls.",
        "Foul, safety and uncalled pots require spotting under the applicable rule. A normal foul costs one point. The official rulebook covers opening breaks, three successive fouls and cases where the cue ball or fifteenth ball interferes with the rack."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "carom3": {
      "file": "three-cushion",
      "paragraphs": [
        "Use your own cue ball and contact the red first on the opening stroke. A scoring carom earns one point and continues your visit. A miss or foul ends the visit. Play to the agreed points total.",
        "Contact both object balls. Your cue ball must make at least three cushion contacts before reaching the second object ball. Repeated contacts with one cushion count. No balls are pocketed. The UMB appendix maps the designated spots for touching balls and balls off the table."
      ],
      "source": "https://files.umb-carom.org/Public/Rules/CAROM%20BILLIARD%20RULES.pdf"
    },
    "caromStraight": {
      "file": "straight-rail",
      "paragraphs": [
        "Use your own cue ball and contact the red first on the opening stroke. A scoring carom earns one point and continues your visit. A miss or foul ends the visit. Play to the agreed points total.",
        "Contact both object balls in one stroke. No cushion is required. In a restricted corner area the free-game rule limits repeated scores with both object balls inside. The next required escape stroke must drive at least one object ball out."
      ],
      "source": "https://files.umb-carom.org/Public/Rules/CAROM%20BILLIARD%20RULES.pdf"
    },
    "caromSmall": {
      "file": "straight-rail-small-table",
      "paragraphs": [
        "Use your own cue ball and contact the red first on the opening stroke. A scoring carom earns one point and continues your visit. A miss or foul ends the visit. Play to the agreed points total.",
        "Contact both object balls in one stroke. No cushion is required. In a restricted corner area the free-game rule limits repeated scores with both object balls inside. The next required escape stroke must drive at least one object ball out."
      ],
      "source": "https://files.umb-carom.org/Public/Rules/CAROM%20BILLIARD%20RULES.pdf"
    },
    "caromHalf": {
      "file": "one-cushion-half-match",
      "paragraphs": [
        "Use your own cue ball and contact the red first on the opening stroke. A scoring carom earns one point and continues your visit. A miss or foul ends the visit. Play to the agreed points total.",
        "Before contacting the second object ball, the cue ball must touch at least one cushion. It may touch that cushion before or after contacting the first ball. This preset uses the half-match table."
      ],
      "source": "https://files.umb-carom.org/Public/Rules/CAROM%20BILLIARD%20RULES.pdf"
    },
    "carom4": {
      "file": "four-ball-carom",
      "paragraphs": [
        "Play with two reds and a cue ball for each player. Contact both reds with your cue ball in one stroke to score. Avoid the opponent’s cue ball. A successful stroke continues the visit. Agree the target score and local penalty and finishing rules before play."
      ],
      "source": "https://cuerepublic.com/games/four-ball.html"
    },
    "snooker15": {
      "file": "fifteen-red-snooker",
      "paragraphs": [
        "Reds score one each. Play a red, then nominate a colour. Yellow, green, brown, blue, pink and black score two through seven. While alternating reds and colours, put each scoring colour back on its spot. Do this for the colour after the final red, too. Then clear the colours in value order.",
        "A colour returns to its own spot first. If occupied, use the highest available colour spot. If every spot is occupied, place it as close as possible toward the top cushion without touching another ball. On a foul, colours pocketed during clearance also return. An ordinary potted red stays down.",
        "A miss ends the break. A foul awards the opponent at least four points, up to seven depending on the balls involved. Higher score wins the frame. If scores are tied after the final black, put the black back on its spot, draw for choice of turn and play from in hand in the D."
      ],
      "source": "https://wpbsa.com/rules/"
    },
    "snooker6": {
      "file": "six-red-snooker",
      "paragraphs": [
        "Use six reds and six colours.",
        "Reds score one each. Play a red, then nominate a colour. Yellow, green, brown, blue, pink and black score two through seven. While alternating reds and colours, put each scoring colour back on its spot. Do this for the colour after the final red, too. Then clear the colours in value order.",
        "A colour returns to its own spot first. If occupied, use the highest available colour spot. If every spot is occupied, place it as close as possible toward the top cushion without touching another ball. On a foul, colours pocketed during clearance also return. An ordinary potted red stays down.",
        "The six-red code limits consecutive foul-and-miss calls from the restored position to five. After potting a red, the striker must not leave the opponent snookered behind the nominated colour. The rulebook gives the warning procedure and options after the fifth call."
      ],
      "source": "https://wpbsa.com/rules/"
    },
    "snookerPlus": {
      "file": "snooker-plus",
      "paragraphs": [
        "Reds score one each. Play a red, then nominate a colour. Yellow, green, brown, blue, pink and black score two through seven. While alternating reds and colours, put each scoring colour back on its spot. Do this for the colour after the final red, too. Then clear the colours in value order.",
        "Add orange, worth eight, between blue and pink, and purple, worth ten, between brown and blue. Both are available as colours after a red. Clear orange and purple after black during the final sequence.",
        "A colour returns to its own spot first. If occupied, use the highest available colour spot. If every spot is occupied, place it as close as possible toward the top cushion without touching another ball. On a foul, colours pocketed during clearance also return. An ordinary potted red stays down."
      ],
      "source": "https://allaboutsnooker.info/snooker-plus/"
    },
    "englishBilliards": {
      "file": "english-billiards",
      "paragraphs": [
        "Each player has a cue ball. The red starts on the top spot and the opponent’s cue ball enters when they first play. A cannon scores two. Potting the opponent’s ball or an in-off from it scores two. Potting red or an in-off from red scores three. Scores can combine in one stroke.",
        "Replace a potted red on the top spot, then try the pyramid spot and centre if blocked. If you pot the red twice in a row from the top or pyramid spot, with no other score on either stroke, the red goes to the centre spot. The opponent’s potted cue ball stays out until their next turn. Play in hand from the D."
      ],
      "source": "https://wpbsa.com/rules/"
    },
    "blackballRY": {
      "file": "blackball-red-yellow",
      "paragraphs": [
        "Pocket your group, then the black. The table remains open after the break. A legal ordinary shot potting balls of one group establishes groups. A foul gives the incoming player a free shot. Potting the black on the break means the balls must be racked again. An early black otherwise loses. Object balls knocked off the table are spotted on the long string.",
        "The two groups in this set are reds and yellows."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "blackballBY": {
      "file": "blackball-blue-yellow",
      "paragraphs": [
        "Pocket your group, then the black. The table remains open after the break. A legal ordinary shot potting balls of one group establishes groups. A foul gives the incoming player a free shot. Potting the black on the break means the balls must be racked again. An early black otherwise loses. Object balls knocked off the table are spotted on the long string.",
        "Blue replaces red in this set. The two sets share the same rules."
      ],
      "source": "https://wpapool.com/rules/"
    },
    "pyramid15": {
      "file": "combined-pyramid",
      "paragraphs": [
        "This setup uses a permanent coloured cue ball and fifteen ivory object balls. In Combined Pyramid, reach eight points first. You can pot an object ball. You can also score an in-off by potting your cue ball after it contacts an object ball. For an in-off, choose an object ball to remove and play the coloured ball in hand from baulk.",
        "Following a foul, return illegally pocketed and jumped balls before the opponent selects a penalty ball to remove. Use the tray to spot a ball and the ball-position controls for referee choices. See the linked rules for legal baulk play and scoring."
      ],
      "source": "https://abpf.us/rules/combined-pyramid/"
    }
  };
  const picker = document.getElementById('fullRackSelect');
  const listen = document.getElementById('rackRulePlay');
  const text = document.getElementById('rackRuleText');
  let player = null;

  function guide() {
    return guides[picker.value.startsWith('rack3-') ? 'rack3' : picker.value];
  }

  function updateButton() {
    const available = Boolean(window.TrainerRackRecordings[guide()?.file]);
    listen.disabled = !available;
    listen.textContent = player ? '■ Stop' : available ? '🔊 Chase' : 'Chase audio pending';
    listen.setAttribute('aria-label', player ? 'Stop narration' : available ? 'Play Chase narration' : 'Chase narration pending');
  }

  function stop() {
    if (player) {
      player.onended = null;
      player.onerror = null;
      player.pause();
      player = null;
    }
    updateButton();
  }

  function showRules() {
    stop();
    text.replaceChildren();
    const selected = guide();
    if (!selected) return;
    for (const paragraph of selected.paragraphs) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      text.append(p);
    }
    if (selected.source) {
      const link = document.createElement('a');
      link.href = selected.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Read the source rules';
      text.append(link);
    }
  }

  listen.addEventListener('click', async () => {
    if (player) { stop(); return; }
    const src = window.TrainerRackRecordings[guide()?.file];
    if (!src) return;
    const clip = new Audio(src);
    player = clip;
    updateButton();
    function failed() {
      if (player !== clip) return;
      stop();
      listen.textContent = 'Retry Chase audio';
      listen.setAttribute('aria-label', listen.textContent);
    }
    clip.onerror = failed;
    clip.onended = () => { if (player === clip) stop(); };
    try { await clip.play(); } catch { failed(); }
  });

  picker.addEventListener('change', showRules);
  document.getElementById('startFullRack').addEventListener('click', showRules);
  window.addEventListener('pagehide', stop);
  showRules();
})();
