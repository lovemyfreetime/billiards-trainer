/* Ordered aim samples and their verified projections. Shoot supplies the solver. */
(function (root, make) {
    const api = make();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.BilliardsAimZones = api;
})(globalThis, function () {
    'use strict';

    const COLORS = ['#76baff', '#75ed99', '#ffaf66'];
    const SAFETY_WINDOW = .10;
    const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
    const bearing = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const pot = (shot, id) => shot?.pocketEvents?.find(event => event.id === id);
    const signed = (shot, radius) => shot.firstBallContact.signedOffset / (2 * radius);

    function firstTargetRail(shot) {
        const rail = shot.railEvents.find(event => event.id === 0);
        return rail && rail.t <= (shot.firstBallContact?.t ?? Infinity) ? rail : null;
    }

    function railPosition(contact) {
        switch (contact.rail) {
            case 'top rail': return contact.x;
            case 'bottom rail': return -contact.x;
            case 'left rail': return -contact.y;
            case 'right rail': return contact.y;
        }
    }

    function pocketPosition(shot, request) {
        const capture = pot(shot, request.id);
        if (!capture || !request.mouth || (request.mouth.name && capture.pocket !== request.mouth.name)) return null;
        const {center, outside} = request.mouth;
        const scale = Math.hypot(outside.x, outside.y);
        const depth = p => outside.x * (p.x - center.x) + outside.y * (p.y - center.y);
        const side = p => (outside.x * (p.y - center.y) - outside.y * (p.x - center.x)) / scale;
        const points = shot.paths[request.id] || [];
        // Use the last inward crossing of the mouth. A jaw can send the
        // ball out and back in, or move it across the center after entry.
        for (let i = points.length - 1; i > 0; i--) {
            const a = points[i - 1], b = points[i], da = depth(a), db = depth(b);
            if (da > 0 || db < 0 || db === da) continue;
            const offset = (db * side(a) - da * side(b)) / (db - da);
            return Math.sign(offset) === Math.sign(side(capture)) ? offset : null;
        }
        return null;
    }

    function targetOffset(shot, request) {
        if (request.rail) {
            const rail = firstTargetRail(shot);
            return rail?.rail === request.rail.rail ? railPosition(rail) - railPosition(request.rail) : null;
        }
        if (shot.firstBallContact?.objId !== request.id) return null;
        if (request.safety) return signed(shot, request.radius) - request.contact;
        return pocketPosition(shot, request);
    }

    function sampleShot(angle, shot, request, ids) {
        const offset = targetOffset(shot, request);
        const matches = request.id == null || shot.firstBallContact?.objId === request.id;
        const captured = pot(shot, request.id)?.pocket;
        const accepted = request.safety || request.rail
            ? (matches || !request.safety) && offset != null && Math.abs(offset) <= request.window
            : matches && captured === request.pocket;
        const timeline = [
            ...(shot.collisionEvents || []).map(e => ({time:e.t, ids:e.ids, key:'ball:' + [...e.ids].sort().join(',')})),
            ...shot.railEvents.map(e => ({time:e.t, ids:[e.id], key:'rail:' + e.rail})),
            ...(shot.jawEvents || []).map(e => ({time:e.t, ids:[e.id], key:'jaw:' + e.jaw})),
            ...(shot.airborne?.landings || []).map(e => ({time:e.t, ids:[e.id ?? 0], key:'bed'})),
            ...shot.pocketEvents.map(e => ({time:e.t, ids:[e.id], key:'pot:' + e.pocket}))
        ].sort((a,b) => a.time - b.time);
        const balls = new Map(ids.map(id => {
            const end = shot.finalBalls.find(ball => ball.id === id);
            const events = timeline.filter(event => event.ids.includes(id));
            const pocket = pot(shot, id)?.pocket;
            const rest = end?.active && shot.restIds?.includes(id) ? end : null;
            const outcome = pocket ? 'pocket' : rest ? 'rest' : end?.active ? 'unsettled' : 'off';
            return [id, {
                rest, pocket, outcome, events, route:events.map(event => event.key).join('|'),
                cushion:shot.railEvents.find(e => e.id === id && (request.rail || e.t >= (shot.firstBallContact?.t ?? 0)))
            }];
        }));
        return {angle, shot, offset, accepted, matches, captured, balls};
    }

    function pocketSeed({cue, object, mouth, radius, squirt, angle}) {
        if (!mouth || !object) return angle;
        const direction = bearing(object, mouth.center);
        const ghost = {x:object.x - 2 * radius * Math.cos(direction), y:object.y - 2 * radius * Math.sin(direction)};
        return angle + angleDelta(bearing(cue, ghost) - squirt, angle);
    }

    function closeToChord(a, middle, b, tolerance) {
        const dx = b.x - a.x, dy = b.y - a.y, dz = (b.z || 0) - (a.z || 0);
        const squared = dx*dx + dy*dy + dz*dz;
        const fraction = squared ? ((middle.x-a.x)*dx + (middle.y-a.y)*dy + ((middle.z||0)-(a.z||0))*dz) / squared : .5;
        const t = Math.max(.15, Math.min(.85, fraction));
        return distance(middle, {x:a.x+t*dx, y:a.y+t*dy, z:(a.z||0)+t*dz}) <= tolerance;
    }

    async function search(request, simulate, cancelled = () => false) {
        const {angle, radius, safety, current} = request;
        const ids = safety && request.id != null ? [0,request.id] : [0];
        const anchor = sampleShot(angle, current, request, ids);
        const samples = new Map([[angle,anchor]]);
        const limit = safety ? 152 : 190;
        let incomplete = false;
        async function trial(at) {
            if (samples.has(at)) return samples.get(at);
            if (cancelled() || samples.size >= limit) { incomplete = true; return null; }
            const shot = await simulate(at);
            if (!shot || cancelled()) { incomplete = true; return null; }
            const sample = sampleShot(at, shot, request, ids);
            samples.set(at,sample);
            return sample;
        }
        const apparent = Math.asin(Math.min(.95, 2 * radius / distance(request.cue, request.rail || request.object)));
        const zones = safety ? await traceSafety(anchor, ids, apparent, radius, trial)
            : await traceNormal(anchor, request, apparent, trial);
        const ordered = [...samples.values()].sort((a,b) => a.angle - b.angle);
        return {...zones, request, ids, anchor, samples:ordered, tested:samples.size, incomplete};
    }

    async function traceSafety(anchor, ids, apparent, radius, trial) {
        const minimum = Math.max(1e-7, apparent / 16384);
        const tolerance = radius / 6;
        const maxLink = radius * .9;
        const sides = [-1,1].map(sign => ({
            sign, previous:anchor, step:minimum*8,
            ids:ids.filter(id => anchor.balls.get(id).rest),
            runs:new Map(ids.map(id => [id,[anchor]]))
        }));
        // Spend work next to the live stops first, alternating aim sides.
        // An interrupted search still has a valid prefix through the anchor.
        for (let i=0; i<78 && sides.some(side => side.ids.length); i++) {
            for (const side of sides) {
                if (!side.ids.length) continue;
                const {previous, step, sign} = side;
                const next = await trial(previous.angle + step*sign);
                if (!next) return safetyRuns(sides, ids);
                const checks = side.ids.map(id => {
                    const a = previous.balls.get(id), b = next.balls.get(id);
                    const length = next.accepted && b.rest && a.route === b.route ? distance(a.rest,b.rest) : Infinity;
                    return {id,a,b,length,valid:length<=maxLink};
                });
                let middle = null;
                if ((step<=minimum || checks.every(check=>check.valid)) &&
                    checks.some(check=>check.valid&&check.length>tolerance)) {
                    middle = await trial((previous.angle+next.angle)/2);
                    if (!middle) return safetyRuns(sides, ids);
                    for (const check of checks) {
                        if (!check.valid) continue;
                        const m = middle.balls.get(check.id);
                        check.valid = !!(middle.accepted && m.rest && m.route===check.a.route &&
                            closeToChord(check.a.rest,m.rest,check.b.rest,tolerance) &&
                            distance(check.a.rest,m.rest)<=maxLink && distance(m.rest,check.b.rest)<=maxLink);
                    }
                }
                if (checks.some(check => !check.valid) && step>minimum) {
                    side.step = Math.max(minimum,step/2);
                    continue;
                }
                side.ids = checks.filter(check => check.valid).map(check => check.id);
                for (const id of side.ids) {
                    if (middle) side.runs.get(id).push(middle);
                    side.runs.get(id).push(next);
                }
                side.previous = next;
                side.step = Math.min(apparent*.055,step*1.5);
            }
        }
        return safetyRuns(sides, ids);
    }

    function safetyRuns([negative,positive], ids) {
        const runs = ids.map(id => [...negative.runs.get(id)].reverse().concat(positive.runs.get(id).slice(1)));
        return {runs, lo:Math.min(...runs.map(run=>run[0].angle)), hi:Math.max(...runs.map(run=>run.at(-1).angle))};
    }

    async function traceNormal(anchor, request, apparent, trial) {
        const {rail, radius, extend} = request;
        const stride = Math.max(.00006, apparent * (rail ? .13 : .027));
        let seed = anchor.accepted ? anchor : null;
        if (!seed && !rail) {
            const guessed = pocketSeed(request);
            for (const offset of [0,-1,1,-2,2,-4,4,-8,8,-16,16]) {
                const sample = await trial(guessed + stride*offset);
                if (!sample || sample.accepted) { seed = sample; break; }
            }
        }
        if (!seed) return {core:[], tails:[], lo:anchor.angle, hi:anchor.angle};

        const sides = [-1,1].map(sign => ({sign, nodes:[seed], misses:0, done:false}));
        for (let i=1; i<=48 && sides.some(side=>!side.done); i++) {
            for (const side of sides) {
                if (side.done) continue;
                const sample = await trial(seed.angle + side.sign*stride*(i + Math.max(0,i-22)));
                if (!sample) { side.done = true; continue; }
                side.nodes.push(sample);
                side.misses = sample.accepted ? 0 : side.misses+1;
                side.done = side.misses >= (rail ? 1 : 3);
            }
        }
        for (const side of sides) {
            const refined = [seed];
            for (let i=1; i<side.nodes.length; i++) {
                let a = side.nodes[i-1], b = side.nodes[i];
                if (a.accepted!==b.accepted) {
                    const boundary = [];
                    for (let j=0; j<6; j++) {
                        const middle = await trial((a.angle+b.angle)/2);
                        if (!middle) break;
                        boundary.push(middle);
                        if (a.accepted===middle.accepted) a=middle;
                        else b=middle;
                    }
                    refined.push(...boundary.sort((x,y)=>side.sign*(x.angle-y.angle)));
                }
                refined.push(side.nodes[i]);
            }
            side.nodes = refined;
        }
        const sweep = [...sides[0].nodes].reverse().concat(sides[1].nodes.slice(1));
        const lo = sweep.findIndex(s=>s.accepted), hi = sweep.findLastIndex(s=>s.accepted);
        const core = await refineNormal(sweep.slice(lo,hi+1), seed, radius, trial);
        const tails = [[],[]];
        if (extend && !rail) {
            const length = segments(core,0).reduce((sum,{a,b,gap})=>sum+(gap?0:distance(a.balls.get(0).rest,b.balls.get(0).rest)),0);
            if (length>0) {
                const edges = [core[0],core.at(-1)];
                const wings = edges.map((edge,i)=>traceTail(edge,sides[i].sign,stride,length,request,trial));
                let done = [false,false];
                while (done.some(finished=>!finished)) {
                    for (let i=0; i<2; i++) {
                        if (done[i]) continue;
                        const next = await wings[i].next();
                        done[i] = next.done;
                        if (next.value) tails[i].push(next.value);
                    }
                }
            }
        }
        return {core,tails,lo:core[0].angle,hi:core.at(-1).angle};
    }

    async function refineNormal(nodes, seed, radius, trial) {
        // Record actual intermediate stops for both changes of route and
        // sparsely spaced neighbors. Ignore events involving only other balls.
        const tolerance = radius/6;
        const breaks = new Set();
        async function refine(a,b,depth) {
            const left = a.balls.get(0), right = b.balls.get(0);
            if (!a.matches || !b.matches || !left.rest || !right.rest) return [b];
            if (distance(left.rest,right.rest)<=tolerance) return [b];
            const middle = depth<5 && await trial((a.angle+b.angle)/2);
            if (!middle) { breaks.add(b); return [b]; }
            const center = middle.balls.get(0);
            if (a.accepted===middle.accepted && b.accepted===middle.accepted && center.rest && middle.matches &&
                distance(left.rest,center.rest)<=radius*1.5 && distance(center.rest,right.rest)<=radius*1.5 &&
                closeToChord(left.rest,center.rest,right.rest,tolerance)) return [middle,b];
            if (!center.rest && !a.accepted && !b.accepted) return [middle,b];
            return (await refine(a,middle,depth+1)).concat(await refine(middle,b,depth+1));
        }
        const center = nodes.indexOf(seed);
        const pieces = [];
        for (let offset=0; offset<nodes.length; offset++) {
            const left=center-offset, right=center+offset+1;
            if (left>0) pieces[left-1]=await refine(nodes[left-1],nodes[left],0);
            if (right<nodes.length) pieces[right-1]=await refine(nodes[right-1],nodes[right],0);
            if (left<=0 && right>=nodes.length) break;
        }
        // Keep rejected joins in the aim order as explicit breaks.
        return [nodes[0],...pieces.flat()].flatMap(sample=>breaks.has(sample)?[null,sample]:[sample]);
    }

    async function* traceTail(edge, sign, stride, length, request, trial) {
        const tolerance = request.radius/6;
        let a=edge, step=stride;
        const isMiss=sample=>sample?.matches && sample.captured!==request.pocket;
        for (let i=0; i<56 && length>.0001; i++) {
            const b=await trial(a.angle+sign*step);
            if (!isMiss(b)) break;
            const left=a.balls.get(0).rest, right=b.balls.get(0).rest;
            const span=left&&right?distance(left,right):Infinity;
            let verified=span<=tolerance;
            if (!verified && span<=request.radius*2) {
                const middle=await trial((a.angle+b.angle)/2);
                const center=middle?.balls.get(0).rest;
                verified=isMiss(middle)&&center&&closeToChord(left,center,right,tolerance);
            }
            if (!verified) {
                step/=2;
                if (step>=stride/32 && left && right) { yield; continue; }
                // Resume on the far side without drawing a dotted chord across a
                // scratch or a large change in where the ball actually stops.
                const resumed=await trial(a.angle+sign*stride);
                if (!isMiss(resumed)) break;
                a=resumed;step=stride;
                yield;
                continue;
            }
            const part=span>length?length/span:1;
            yield {a,b,part};
            length-=span*part;
            a=b;step=Math.min(stride*3,step*1.45);
        }
    }

    function segments(run,id) {
        const result = [];
        for (let i=1; i<run.length; i++) {
            const a=run[i-1], b=run[i];
            if (a?.balls.get(id).rest && b?.balls.get(id).rest)
                result.push({a,b,gap:!a.accepted||!b.accepted});
        }
        return result;
    }

    function reanchor(run, current, id, radius) {
        const exact = current.balls.get(id).rest;
        if (!exact) return [];
        const index = run.findIndex(s=>s.angle>=current.angle-1e-12);
        if (index<0) return [current];
        const b = run[index];
        if (Math.abs(b.angle-current.angle)<1e-12) return run.map((s,i)=>i===index?current:s);
        const a = run[index-1];
        if (!a) return [current];
        const route = current.balls.get(id).route;
        if (a.balls.get(id).route!==route || b.balls.get(id).route!==route ||
            !closeToChord(a.balls.get(id).rest,exact,b.balls.get(id).rest,radius/6)) return [current];
        return [...run.slice(0,index),current,...run.slice(index)];
    }

    function colorTone(offset, left, right) {
        const span = offset<0 ? -left : right;
        return span>0 ? .5 + .5*Math.max(-1,Math.min(1,offset/span)) : .5;
    }

    function pocketTone(sample, known, left, right) {
        if (sample.offset!=null) return colorTone(sample.offset,left,right);
        const index=known.findIndex(s=>s.angle>sample.angle);
        const b=known[index], a=known[index<0?known.length-1:Math.max(0,index-1)];
        if (!a) return .5;
        const value=b && b!==a ? a.offset+(b.offset-a.offset)*(sample.angle-a.angle)/(b.angle-a.angle) : a.offset;
        return colorTone(value,left,right);
    }

    function bumper(sample,id,index,{L,W,cornerLeg,sideMouth}) {
        const contact=sample.balls.get(id).cushion;
        if (!contact) return null;
        const horizontal=contact.rail==='top rail'||contact.rail==='bottom rail';
        const position=horizontal?contact.x:contact.y;
        const secondHalf=horizontal&&position>L/2;
        const start=secondHalf?L/2+sideMouth/2:cornerLeg;
        const end=horizontal&&!secondHalf?L/2-sideMouth/2:(horizontal?L:W)-cornerLeg;
        if (position<start || position>end) return null;
        const inset=index?.023:.010;
        const point=horizontal ? {x:position,y:contact.rail==='top rail'?-inset:W+inset}
            : {x:contact.rail==='left rail'?-inset:L+inset,y:position};
        return {sample, position, point:{...point,guideHeight:.0355}, key:contact.rail+':'+secondHalf};
    }

    function cushionRanges(run,id,index,request,tone) {
        if (!request.table) return [];
        const result=[];
        let previous=null, active=null, direction=0;
        for (const sample of run) {
            const stop=bumper(sample,id,index,request.table);
            const sign=stop&&previous?Math.sign(stop.position-previous.position):0;
            if (!stop || !previous || stop.key!==previous.key) { active=null; direction=0; }
            else if (sign) {
                if (!active || sign!==direction) {
                    active={id,stops:[previous]};
                    result.push(active);
                    direction=sign;
                }
                active.stops.push(stop);
            }
            if (stop) stop.tone=tone(sample);
            previous=stop;
        }
        return result;
    }

    function resolve(data, currentShot, angle) {
        if (!data) return null;
        const {request,ids,anchor}=data;
        const {radius,safety,rail}=request;
        const live=sampleShot(anchor.angle+angleDelta(angle,anchor.angle),currentShot,request,ids);
        const core=(data.core||[]).filter(Boolean);
        const known=core.filter(s=>s.accepted&&s.offset!=null);
        const samples=safety?[...new Set(data.runs.flat())]:known;
        const low=samples.reduce((best,s)=>s.offset<(best?.offset??0)?s:best,null);
        const high=samples.reduce((best,s)=>s.offset>(best?.offset??0)?s:best,null);
        const center=(safety||rail) ? live.offset??0 : 0;
        const tone=s=>s===live&&(safety||rail) ? .5
            : safety||rail ? colorTone(s.offset-center,(low?.offset??0)-center,(high?.offset??0)-center)
            : pocketTone(s,known,low?.offset??0,high?.offset??0);
        const runs=safety?data.runs.map((run,i)=>reanchor(run,live,ids[i],radius)):[data.core];
        const rests=runs.map((run,i)=>segments(run,ids[i]).map(({a,b,gap})=>({
            points:[a.balls.get(ids[i]).rest,b.balls.get(ids[i]).rest], tones:[tone(a),tone(b)], samples:[a,b],gap
        })));
        const cushionLines=safety?runs.flatMap((run,i)=>cushionRanges(run,ids[i],i,request,tone)):[];
        const potLandings=core.filter(s=>s.accepted&&s.balls.get(0).rest).sort((a,b)=>tone(a)-tone(b));
        const restEdges=potLandings.length>1?[potLandings[0],potLandings.at(-1)]:null;
        const tails=(data.tails||[]).map((links,i)=>({tone:tone(i?core.at(-1):core[0])<.5?0:1,lines:tailLines(links)}));
        const pocketSamples=safety?[...new Set(runs.flat())].map(sample=>({
            at:pocketPosition(sample.shot,request),fraction:tone(sample)
        })):known.map(sample=>({at:sample.offset,fraction:tone(sample)}));
        return {live, rests, runs, tails, restEdges, cushionLines, pocketSamples,
            left:low && low.offset<center?low:null, right:high && high.offset>center?high:null,
            bands:safety?[]:pathBands(data.core,tone,radius)};
    }

    function tailLines(links) {
        const lines=[];
        let previous=null, line=null;
        for (const {a,b,part} of links) {
            const left=a.balls.get(0).rest,right=b.balls.get(0).rest;
            if (a!==previous) {
                line=[left];
                lines.push(line);
            }
            line.push(part===1?right:{x:left.x+(right.x-left.x)*part,y:left.y+(right.y-left.y)*part,z:left.z});
            previous=b;
        }
        return lines;
    }

    function path(shot, id) {
        const points=shot.paths[id]||[];
        const rest=shot.restIds?.includes(id)&&shot.finalBalls.find(ball=>ball.id===id&&ball.active);
        if (!rest || !points.length || distance(points.at(-1),rest)<1e-7) return points;
        return [...points,{...rest,t:shot.endTime??points.at(-1).t}];
    }

    function pointAt(points,time) {
        let lo=0, hi=points.length-1;
        while (hi-lo>1) {
            const mid=(hi+lo)>>1;
            if (points[mid].t<=time) lo=mid;
            else hi=mid;
        }
        const a=points[lo],b=points[hi];
        const t=b.t>a.t?Math.max(0,Math.min(1,(time-a.t)/(b.t-a.t))):0;
        return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z||0)+((b.z||0)-(a.z||0))*t};
    }

    function pathBands(core,tone,radius) {
        const bands=[];
        for (let i=1; i<core.length; i++) {
            const a=core[i-1], b=core[i];
            if (!a?.accepted || !b?.accepted || a.balls.get(0).route!==b.balls.get(0).route) continue;
            const traces=[a,b].map(sample=>{
                const points=path(sample.shot,0), end=points.at(-1)?.t||0;
                return {points,times:[0,...sample.balls.get(0).events.map(e=>Math.min(end,e.time)),end]};
            });
            if (traces.some(t=>!t.points.length)) continue;
            const quads=[];
            for (let leg=1; leg<traces[0].times.length; leg++) {
                const spans=traces.map(({times})=>times[leg]-times[leg-1]);
                const count=Math.max(1,Math.min(18,Math.ceil(Math.max(...spans)/.08)));
                const pair=t=>traces.map(({points,times},j)=>pointAt(points,times[leg-1]+spans[j]*t));
                let [a0,b0]=pair(0);
                for (let k=1; k<=count; k++) {
                    const [a1,b1]=pair(k/count);
                    const width=Math.max(distance(a0,b0),distance(a1,b1));
                    if (width>1e-6 && width<=radius*2.5) quads.push([a0,a1,b1,b0]);
                    a0=a1; b0=b1;
                }
            }
            if (quads.length) bands.push({tone:(tone(a)+tone(b))/2,quads});
        }
        return bands;
    }

    function tone(fraction) {
        const values=[[118,186,255],[117,237,153],[255,175,102]];
        const pos=Math.max(0,Math.min(2,fraction*2)), i=Math.min(1,Math.floor(pos)), t=pos-i;
        return 'rgb('+values[i].map((n,j)=>Math.round(n+(values[i+1][j]-n)*t)).join(',')+')';
    }

    function paint(ctx, project, state, flags, cloth) {
        if (!state?.current) return;
        const {current, zones, ids, mouth} = state;
        const showPaths=flags.path||flags.safety, showRest=flags.rest||flags.safety;
        const visible=p=>p&&p.visible!==false&&Number.isFinite(p.x)&&Number.isFinite(p.y);
        const trace=(points,closed=false)=>{
            ctx.beginPath();
            let open=false;
            for (const point of points) {
                const p=project(point);
                if (!visible(p)) { open=false; continue; }
                if (open) ctx.lineTo(p.x,p.y);
                else { ctx.moveTo(p.x,p.y); open=true; }
            }
            if (closed) ctx.closePath();
        };
        const edgeLine=(points,stops,width,alpha)=>{
            const [a,b]=points.map(project);
            if (!visible(a)||!visible(b)||(a.x===b.x&&a.y===b.y)) return;
            const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
            for (const [offset,color] of stops) gradient.addColorStop(offset,color);
            ctx.strokeStyle=gradient;ctx.lineWidth=width;ctx.globalAlpha=alpha;
            trace(points);ctx.stroke();
        };
        ctx.save();
        ctx.lineCap=ctx.lineJoin='round';
        if (showRest&&mouth) {
            const {a,b,outside}=mouth;
            const increasing=outside.x*(b.y-a.y)-outside.y*(b.x-a.x)>0;
            const width=distance(a,b), stops=[[0,COLORS[0]]];
            const samples=(zones?.pocketSamples||[]).filter(s=>s.at!=null&&Math.abs(s.at)<width/2).sort((x,y)=>x.at-y.at);
            let last=.0;
            for (const sample of samples) {
                const at=.5+sample.at/width;
                if (at-last<.005) continue;
                stops.push([at,tone(sample.fraction)]);last=at;
            }
            if (stops.length===1) stops.push([.5,COLORS[1]]);
            stops.push([1,COLORS[2]]);
            edgeLine(increasing?[a,b]:[b,a],stops,1.5,.26);
        }
        for (const {id,stops} of zones?.cushionLines||[]) {
            const first=stops[0],last=stops.at(-1), span=last.position-first.position;
            edgeLine([first.point,last.point],stops.map(s=>[(s.position-first.position)/span,tone(s.tone)]),
                id===0?2.6:2.1,id===0?.76:.65);
        }
        if (zones) {
            ctx.save();
            if (cloth.every(p=>visible(project(p)))) {trace(cloth,true);ctx.clip();}
            if (flags.path&&!flags.safety) {
                ctx.globalAlpha=.045;
                for (const band of zones.bands) {
                    ctx.fillStyle=tone(band.tone);
                    for (const quad of band.quads) {
                        if (!quad.every(point=>visible(project(point)))) continue;
                        trace(quad,true);ctx.fill();
                    }
                }
            }
            if (showRest) {
                ctx.save();
                ctx.lineWidth=2.25;ctx.globalAlpha=.55;ctx.setLineDash([.5,5]);
                for (const tail of zones.tails) {
                    ctx.strokeStyle=tone(tail.tone);
                    for (const points of tail.lines) { trace(points);ctx.stroke(); }
                }
                ctx.restore();
                ctx.strokeStyle=COLORS[1];ctx.lineWidth=flags.safety?7:10;ctx.globalAlpha=.15;
                ctx.beginPath();
                for (const layer of zones.rests) {
                    let last=null;
                    for (const {points:[from,to],gap} of layer) {
                        const a=project(from),b=project(to);
                        if (gap||!visible(a)||!visible(b)) {last=null;continue;}
                        if (from!==last) ctx.moveTo(a.x,a.y);
                        ctx.lineTo(b.x,b.y);last=to;
                    }
                }
                ctx.stroke();
                for (const [i,layer] of zones.rests.entries()) {
                    for (const {points,tones,gap} of layer)
                        edgeLine(points,[[0,tone(tones[0])],[1,tone(tones[1])]],i?2.1:3.4,gap?.23:i?.73:.92);
                }
            }
            ctx.restore();
        }
        const outcomes=[zones?.left?.shot,current,zones?.right?.shot];
        for (const i of flags.safety?[1]:[0,2,1]) {
            const shot=outcomes[i];
            if (!shot) continue;
            for (const id of ids) {
                const primary=id===0;
                if (showPaths) {
                    ctx.strokeStyle=COLORS[i];ctx.lineWidth=primary?1.65:1.05;
                    ctx.globalAlpha=primary?(showRest?.27:.72):(showRest?.2:.55);
                    trace(path(shot,id));ctx.stroke();
                }
                if (flags.rail) {
                    for (const contact of shot.railEvents.filter(e=>e.id===id)) {
                        const p=project(contact);
                        if (!visible(p)) continue;
                        const haloRadius=primary?9:7;
                        const halo=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,haloRadius);
                        halo.addColorStop(0,COLORS[i]);halo.addColorStop(1,'transparent');
                        ctx.globalAlpha=primary?.52:.38;ctx.fillStyle=halo;
                        ctx.beginPath();ctx.arc(p.x,p.y,haloRadius,0,2*Math.PI);ctx.fill();
                        ctx.globalAlpha=primary?.95:.79;ctx.fillStyle=COLORS[i];
                        ctx.beginPath();ctx.arc(p.x,p.y,primary?3.4:2.6,0,2*Math.PI);ctx.fill();
                    }
                }
            }
        }
        if (showRest) {
            const edges=zones?.restEdges, shots=edges?[edges[0].shot,current,edges[1].shot]:outcomes;
            for (const i of flags.safety?[1]:[0,2,1]) {
                const shot=shots[i];
                for (const id of ids) {
                    const primary=id===0;
                    const end=shot?.restIds?.includes(id)&&shot.finalBalls.find(ball=>ball.id===id&&ball.active);
                    if (!end) continue;
                    const p=project(end);
                    if (!visible(p)) continue;
                    ctx.strokeStyle=ctx.fillStyle=ctx.shadowColor=COLORS[i];
                    ctx.shadowBlur=primary?9:6;ctx.globalAlpha=primary?.92:.74;
                    ctx.lineWidth=1.15;ctx.beginPath();ctx.arc(p.x,p.y,primary?4.3:3.4,0,2*Math.PI);ctx.stroke();
                    if (primary) {ctx.beginPath();ctx.arc(p.x,p.y,1.6,0,2*Math.PI);ctx.fill();}
                }
            }
        }
        ctx.restore();
    }

    return {SAFETY_WINDOW, angleDelta, firstTargetRail, railPosition, pot, signed, search, resolve, paint};
});
