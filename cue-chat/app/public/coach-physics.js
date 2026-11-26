/* Plans a near-straight draw shot using the Trainer's own simulation callbacks. */
((root) => {
  'use strict';
  const NUMBERS = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,half:.5};
  const NUM = '(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|half)';
  const DRAW = /\b(draw|backspin|go back|come back|bring (?:it|the cue ball) back|pull (?:it|the cue ball) back)\b/i;
  const SPEED = /\b(speed|hard|power|diamonds?)\b/i;

  function goal(current, previous = '') {
    if (!SPEED.test(current) && !DRAW.test(current)) return null;
    function parse(text) {
      if (!DRAW.test(text)) return null;
      const match = text.match(new RegExp('(?:\\bback\\b|\\bdraw\\b)(?:\\s+(?:the|cue|ball|it|back|by|for|about|roughly|around|approximately|another|a)){0,8}'+
        '\\s+' + NUM + '\\s+diamonds?\\b', 'i'));
      if (!match) return null;
      const diamonds = NUMBERS[match[1].toLowerCase()] ?? Number(match[1]);
      if (!(diamonds > 0 && diamonds <= 8)) return null;
      return {diamonds, origin:/\b(from|past) (?:my |the |its |where (?:i|it) )?(?:start(?:ed|ing)?|original)/i.test(text)
        ? 'start' : 'contact'};
    }
    return parse(current) || (!DRAW.test(current) && /\b(how (?:hard|many|much)|power|diamond speed)\b/i.test(current)
      ? parse(previous) : null);
  }

  function sameLayout(a, b) {
    const key = (file) => {
      const l = file?.layout;
      const s = file?.state;
      return l && JSON.stringify([l.tableL,l.tableW,l.ballR,l.freeAim,
        l.balls.map(q=>[q.id,q.x,q.y,q.active,q.marker]),
        s?.speed,s?.follow,s?.sideSpin,s?.cueElevationDeg,s?.activeShot,s?.muRoll,s?.muSlide,s?.railRest]);
    };
    return Boolean(a && b && key(a) && key(a) === key(b));
  }

  async function solveDraw(query, position, engine, yieldStep = () => new Promise(resolve => setTimeout(resolve, 0))) {
    const unit = position.length / 8;
    const follow = position.follow <= -.2 ? Math.max(-.75, position.follow) : -.5;
    const common = {goal:query.diamonds,origin:query.origin,follow, elevation:position.elevation};
    if (!(query.diamonds > 0 && query.diamonds <= 8 && unit > .02))
      return {status:'unavailable', reason:'That draw request is outside this pilot’s range.'};
    let expected = null, best = null, tries = 0;
    async function trial(speed) {
      tries++;
      if (tries % 3 === 0) await yieldStep();
      const result = engine.simulate(speed, follow);
      const c = result.firstBallContact;
      if (!c || !Number.isFinite(c.cutAngle) || c.cutAngle > Math.PI / 15 ||
          result.railEvents.some(e => e.id === 0) ||
          result.pocketEvents.some(e => e.id === 0) || !result.restIds?.includes(0)) return;
      const pot = result.pocketEvents.find(e=>e.id===c.objId);
      if (!pot) return;
      if (!expected) expected = {id:c.objId,pocket:pot.pocket};
      if (c.objId !== expected.id || pot.pocket !== expected.pocket) return;
      if (result.collisionEvents?.filter(e => e.ids.includes(0)).length > 1) return;
      const rest=result.finalBalls.find(b=>b.id===0&&b.active);
      if (!rest) return;
      const ref=query.origin==='start'?position.cue:c.cuePos;
      const dx=ref.x-rest.x, dy=ref.y-rest.y;
      const draw=(dx*c.incoming.x+dy*c.incoming.y)/unit;
      const lateral=Math.abs(dx*c.incoming.y-dy*c.incoming.x)/unit;
      if (!Number.isFinite(draw) || !Number.isFinite(lateral) || draw <= 0 || lateral > .35) return;
      const error=Math.abs(draw-query.diamonds);
      if (!best||error<best.error) best={speed,draw,lateral,error,ball:c.objId,pocket:pot.pocket};
    }
    for (let i=0;i<=22;i++) await trial(.5+i*.25);
    if (best) {
      const center=best.speed;
      for (const offset of [-.15,-.08,.08,.15]) {
        const speed=center+offset;
        if (speed>=.5 && speed<=6) await trial(speed);
      }
    }
    if (!best) return {status:'unavailable', reason:'No near-straight draw candidate potted the aimed ball and stopped safely. Check your aim and try again.'};
    const speedDiamonds=engine.diamonds(best.speed);
    if (!Number.isFinite(speedDiamonds)) return {status:'unavailable', reason:'The Trainer speed scale could not be read.'};
    return {status:best.error<=.25?'match':'closest',...common,...best,speedDiamonds,tries};
  }

  const api={goal,sameLayout,solveDraw};
  if (typeof module !== 'undefined'&&module.exports) module.exports=api;
  else root.CueChatCoachPhysics=api;
})(globalThis);
