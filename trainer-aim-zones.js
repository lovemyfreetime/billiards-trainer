/* Aim-to-position reference shots. The caller supplies the live physics solver. */
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
        const points = shot.paths[request.id];
        // Use the last inward crossing of the mouth. A jaw can send the
        // ball out and back in, or move it across the center after entry.
        for (let i = points.length - 1; i > 0; i--) {
            const a = points[i - 1], b = points[i], da = depth(a), db = depth(b);
            if (da >= 0 || db < 0) continue;
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
        if (request.safety) return signed(shot, request.radius) - request.contact;
        return pocketPosition(shot, request);
    }

    function accepts(shot, request) {
        if (!shot) return false;
        if (request.rail) {
            if (request.safety && request.id != null && shot.firstBallContact?.objId !== request.id) return false;
            const offset = targetOffset(shot, request);
            return offset !== null && Math.abs(offset) <= request.window;
        }
        if (shot?.firstBallContact?.objId !== request.id) return false;
        if (request.safety) return Math.abs(signed(shot, request.radius) - request.contact) <= request.window;
        return pot(shot, request.id)?.pocket === request.pocket;
    }

    function pocketSeed(request) {
        const { cue, object, mouth, radius, squirt } = request;
        if (!mouth) return request.angle;
        const direction = bearing(object, mouth.center);
        const ghost = {x:object.x - 2 * radius * Math.cos(direction), y:object.y - 2 * radius * Math.sin(direction)};
        return request.angle + angleDelta(bearing(cue, ghost) - squirt, request.angle);
    }

    async function search(request, simulate, cancelled = () => false) {
        const { angle, cue, object, radius } = request;
        const pocketSearch = !request.rail && !request.safety;
        const apparent = Math.asin(Math.min(.95, 2 * radius / distance(cue, request.rail || object)));
        const stride = Math.max(.00018, apparent * (request.rail ? .1 : request.safety ? .035 : .025));
        const samples = new Map();
        const first = {angle, shot:request.current};
        samples.set(angle, first);
        async function trial(at) {
            if (cancelled()) return null;
            if (samples.has(at)) return samples.get(at);
            const shot = await simulate(at);
            if (!shot || cancelled()) return null;
            const sample = {angle:at, shot};
            samples.set(at, sample);
            return sample;
        }
        let seed = accepts(first.shot, request) ? first : null;
        if (!seed && pocketSearch) {
            const guessed = pocketSeed(request);
            const guesses = [guessed];
            for (const center of [angle, guessed]) {
                for (const offset of [1, -1, 2, -2, 4, -4, 8, -8]) guesses.push(center + stride * offset);
            }
            for (const aim of guesses) {
                const sample = await trial(aim);
                if (!sample) return null;
                if (accepts(sample.shot, request)) { seed = sample; break; }
            }
        }
        if (!seed || cancelled()) return null;

        async function edge(direction) {
            const accepted = [];
            let inside = seed;
            const span = pocketSearch ? 38 : request.safety ? 28 : 14;
            const angleAt = i => seed.angle + direction * stride * (i + Math.max(0, i - 14));
            for (let i = 1; i <= span; i++) {
                const outside = await trial(angleAt(i));
                if (!outside) return null;
                if (accepts(outside.shot, request)) {
                    inside = outside;
                    accepted.push(outside);
                    continue;
                }
                let limit = outside.angle;
                for (let refinement = 0; refinement < 5; refinement++) {
                    const next = await trial((inside.angle + limit) / 2);
                    if (!next) return null;
                    if (accepts(next.shot, request)) inside = next;
                    else limit = next.angle;
                }
                if (inside !== seed && inside !== accepted.at(-1)) accepted.push(inside);
                if (pocketSearch) {
                    // A jaw rebound can interrupt the pot window before another
                    // nearby aim drops. Preserve the miss as a gap in the zone.
                    let resumed = false;
                    for (let j = i + 1; j <= Math.min(i + 2, span); j++) {
                        const next = await trial(angleAt(j));
                        if (!next) return null;
                        if (!accepts(next.shot, request)) continue;
                        accepted.push({angle:outside.angle}, next);
                        inside = next;
                        i = j;
                        resumed = true;
                        break;
                    }
                    if (resumed) continue;
                }
                return {accepted, bounded:true};
            }
            return {accepted, bounded:false};
        }

        const left = await edge(-1);
        if (!left) return null;
        const right = await edge(1);
        if (!right) return null;
        const ordered = [...left.accepted.reverse(), seed, ...right.accepted];
        const lo = ordered[0].angle, hi = ordered.at(-1).angle;
        if (hi - lo < .000025) return null;
        let leftSample = null, rightSample = null;
        for (const sample of ordered) {
            if (!sample.shot) continue;
            sample.offset = targetOffset(sample.shot, request);
            if (sample.offset == null) continue;
            if (sample.offset < (leftSample?.offset ?? 0)) leftSample = sample;
            if (sample.offset > (rightSample?.offset ?? 0)) rightSample = sample;
        }
        const layers = request.safety && request.id != null ? [0, request.id] : [0];
        const start = ordered.indexOf(leftSample || seed), end = ordered.indexOf(rightSample || seed);
        const bandRange = [Math.min(start, end), Math.max(start, end)];
        let restEdges = null;
        if (pocketSearch) {
            // Pocket entry references describe where the object ball crossed the
            // mouth. The landing range needs every successful aim, including
            // confirmed pots whose jaw route makes mouth-side identity ambiguous.
            const first = ordered[0], last = ordered.at(-1);
            const increasing = leftSample && rightSample
                ? leftSample.angle < rightSample.angle
                : signed(first.shot, radius) < signed(last.shot, radius);
            const firstRest = ordered.find(sample => resting(sample.shot, 0));
            const lastRest = ordered.findLast(sample => resting(sample.shot, 0));
            if (firstRest) restEdges = increasing ? [firstRest, lastRest] : [lastRest, firstRest];
            const [blue, orange] = restEdges || (increasing ? [first, last] : [last, first]);
            for (const sample of ordered) {
                sample.restTone = blue === orange ? .5 : (sample.angle - blue.angle) / (orange.angle - blue.angle);
            }
        }
        const comparisons = request.safety
            ? (await safetyRests(ordered.slice(bandRange[0], bandRange[1] + 1), layers, request, trial))
                .map(rests => ({bands:[], rests}))
            : layers.map(id => makeBands(ordered, id, radius, bandRange));
        const coreLength = comparisons[0].rests.reduce((length, segment) =>
            length + (segment.gap ? 0 : distance(...segment.points)), 0);
        const tails = [];
        if (request.extend && restEdges && coreLength > 0) {
            const step = Math.max(stride, (hi - lo) / 18);
            const blueDirection = restEdges[0].angle < restEdges[1].angle ? -1 : 1;
            for (const [index, edge] of restEdges.entries()) {
                const direction = index ? -blueDirection : blueDirection;
                tails.push(await missTail(edge, direction < 0 ? lo : hi, direction, step, coreLength, request, trial));
            }
        }
        const cushionLines = request.safety && request.table
            ? layers.flatMap((id, index) => cushionRanges(ordered, id, index, request))
            : [];
        return {
            lo, hi, tested:samples.size, bounded:[left.bounded,right.bounded],
            left:leftSample, right:rightSample, restEdges, tails, cushionLines,
            pocketStops:makePocketStops(ordered, request, leftSample, rightSample),
            bands:comparisons.map(comparison => comparison.bands),
            rests:comparisons.map(comparison => comparison.rests)
        };
    }

    async function missTail(edge, boundary, direction, step, target, request, trial) {
        let previous = resting(edge.shot, 0), remaining = target;
        let route = cueRoute(edge.shot);
        const lines = [];
        let line = null;
        for (let i = 1; i <= 24 && remaining > .0001; i++) {
            const aim = boundary + direction * step * (i + Math.max(0, i - 12));
            const sample = await trial(aim);
            if (!sample || sample.shot.firstBallContact?.objId !== request.id || pot(sample.shot, request.id)) break;
            const rest = resting(sample.shot, 0);
            const nextRoute = cueRoute(sample.shot);
            if (!rest || nextRoute !== route || !previous || distance(previous, rest) > 3 * request.radius) line = null;
            if (rest && previous && nextRoute === route) {
                const length = distance(previous, rest);
                if (length > 1e-7 && length <= 3 * request.radius) {
                    if (!line) { line = [previous]; lines.push(line); }
                    const part = Math.min(1, remaining / length);
                    line.push(part === 1 ? rest : {
                        x:previous.x + (rest.x - previous.x) * part,
                        y:previous.y + (rest.y - previous.y) * part,
                        z:previous.z == null ? rest.z : previous.z + ((rest.z ?? previous.z) - previous.z) * part
                    });
                    remaining -= length * part;
                }
            }
            previous = rest;
            route = nextRoute;
        }
        return lines;
    }

    function cueRoute(shot) {
        return events(shot).filter(event => event.ids.includes(0)).map(event => event.key).join('|');
    }

    function cushionRanges(samples, id, index, request) {
        const {L, W, cornerLeg, sideMouth} = request.table;
        const groups = new Map();
        for (const sample of samples) {
            if (sample.offset == null) continue;
            const hitTime = sample.shot.firstBallContact?.t ?? 0;
            const contact = sample.shot.railEvents.find(e => e.id === id && (request.rail || e.t >= hitTime));
            if (!contact) continue;
            const horizontal = contact.rail === 'top rail' || contact.rail === 'bottom rail';
            const along = horizontal ? contact.x : contact.y;
            const secondHalf = horizontal && along > L / 2;
            const start = secondHalf ? L / 2 + sideMouth / 2 : cornerLeg;
            const end = horizontal && !secondHalf ? L / 2 - sideMouth / 2 : (horizontal ? L : W) - cornerLeg;
            const key = contact.rail + ':' + secondHalf;
            const group = groups.get(key) || [];
            groups.set(key, group);
            const position = Math.max(start, Math.min(end, along));
            const inset = index ? .023 : .010;
            const p = horizontal
                ? {x:position, y:contact.rail === 'top rail' ? -inset : W + inset}
                : {x:contact.rail === 'left rail' ? -inset : L + inset, y:position};
            group.push({position, point:{...p, guideHeight:.0355}, offset:sample.offset});
        }
        const lines = [];
        for (const group of groups.values()) {
            group.sort((a, b) => a.position - b.position);
            const stops = group.filter((stop, i) => !i || stop.position - group[i - 1].position > .00025);
            if (stops.length > 1) lines.push({id, stops});
        }
        return lines;
    }

    function makePocketStops(samples, request, left, right) {
        const {mouth} = request;
        if (!mouth?.a) return null;
        const width = distance(mouth.a, mouth.b);
        const stops = [];
        for (const sample of samples) {
            if (!sample.shot) continue;
            const position = pocketPosition(sample.shot, request);
            if (position == null || Math.abs(position) >= width / 2) continue;
            const fraction = sample.restTone ?? offsetTone(sample.offset, left, right);
            stops.push({at:.5 + position / width, fraction});
        }
        stops.sort((a, b) => a.at - b.at);
        // Jaw routes can fold entry positions back on themselves. Keep the
        // physical left-to-right legend monotonic where those routes overlap.
        const ordered = [{at:0, fraction:0}];
        for (const stop of stops) {
            if (stop.at - ordered.at(-1).at > .01 && stop.fraction >= ordered.at(-1).fraction && stop.fraction <= 1)
                ordered.push(stop);
        }
        ordered.push({at:1, fraction:1});
        return {name:mouth.name, stops:ordered.length > 2 ? ordered : null};
    }

    function path(shot, id) {
        const points = shot?.paths?.[id] || [];
        const rest = resting(shot, id);
        if (!rest || !points.length || distance(points.at(-1), rest) < 1e-7) return points;
        return [...points, {...rest, t:shot.endTime ?? points.at(-1).t}];
    }

    function resting(shot, id) {
        return shot?.finalBalls?.find(ball => ball.id === id && ball.active && (!shot.restIds || shot.restIds.includes(id)));
    }

    function events(shot) {
        return [
            ...(shot.collisionEvents || []).map(e => ({t:e.t, key:'ball:' + e.ids.join(','), ids:e.ids})),
            ...shot.railEvents.map(e => ({t:e.t, key:'rail:' + e.id + ':' + e.rail, ids:[e.id]})),
            ...(shot.jawEvents || []).map(e => ({t:e.t, key:'jaw:' + e.id + ':' + e.jaw, ids:[e.id]})),
            ...(shot.airborne?.landings || []).map(e => ({t:e.t, key:'bed:' + (e.id ?? 0), ids:[e.id ?? 0]})),
            ...shot.pocketEvents.map(e => ({t:e.t, key:'pot:' + e.id + ':' + e.pocket, ids:[e.id]})),
            ...shot.finalBalls.filter(b => !b.active && !pot(shot, b.id)).map(b => ({t:Infinity, key:'off:' + b.id, ids:[b.id]}))
        ].sort((a, b) => a.t - b.t);
    }

    async function safetyRests(samples, layers, request, trial) {
        const track = sample => {
            const shot = sample.shot;
            const timeline = shot ? events(shot) : [];
            return {
                angle:sample.angle,
                offset:sample.offset,
                balls:layers.map(id => ({
                    rest:resting(shot, id),
                    route:timeline.filter(event => event.ids.includes(id)).map(event => event.key).join('|')
                }))
            };
        };
        const canJoin = (a, b, depth) => a.rest && b.rest && distance(a.rest, b.rest) <=
            (a.route === b.route ? request.radius * 3 : depth >= 3 ? request.radius / 3 : 0);
        const tolerance = request.radius / 6;
        const followsChord = (a, middle, b) => {
            if (!a.rest || !middle.rest || !b.rest) return false;
            const from = a.rest, to = b.rest, stop = middle.rest;
            const x = to.x - from.x, y = to.y - from.y, z = (to.z || 0) - (from.z || 0);
            const squared = x*x + y*y + z*z;
            // Even aim steps needn't produce evenly spaced landings. But a
            // midpoint clustered at an endpoint can indicate a sudden jump.
            const fraction = squared
                ? ((stop.x - from.x)*x + (stop.y - from.y)*y + ((stop.z || 0) - (from.z || 0))*z) / squared
                : .5;
            const t = Math.max(.25, Math.min(.75, fraction));
            return distance(stop, {x:from.x + t*x, y:from.y + t*y, z:(from.z || 0) + t*z}) <= tolerance;
        };
        // An unverified interval may only span less than the landing tolerance.
        // Matching event sequences alone don't establish a continuous stop curve.
        const drawable = (a, b, depth, checked) => canJoin(a, b, depth) &&
            (checked || (a.route === b.route && distance(a.rest, b.rest) <= tolerance));
        const nodes = samples.map(track);
        let intervals = nodes.slice(1).map((b, i) => {
            const a = nodes[i];
            const suspect = a.balls.some((ball, j) => ball.rest && b.balls[j].rest &&
                !canJoin(ball, b.balls[j], 0));
            return {a,b,depth:0,minimumDepth:suspect ? 3 : 1,checked:[]};
        });
        // Give every interval a midpoint probe, then spend the remaining
        // previews near unresolved joins. Keep verified spans on timeout.
        let budget = 224;
        for (let level = 0; level < 10 && budget; level++) {
            let inserted = false;
            const next = [];
            for (const interval of intervals) {
                const {a, b, depth, minimumDepth, checked} = interval;
                const needsProbe = depth < minimumDepth || a.balls.some((ball, i) => {
                    const other = b.balls[i];
                    if (ball.rest && other.rest) return !drawable(ball, other, depth, checked[i]);
                    return depth < 4 && (ball.rest || other.rest);
                });
                if (!budget || !needsProbe) { next.push(interval); continue; }
                const aim = (a.angle + b.angle) / 2;
                const sample = await trial(aim);
                if (!sample) { budget = 0; next.push(interval); continue; }
                budget--;
                const middle = track(accepts(sample.shot, request)
                    ? {...sample, offset:targetOffset(sample.shot, request)} : {angle:aim});
                const verified = a.balls.map((ball, i) => followsChord(ball, middle.balls[i], b.balls[i]));
                next.push({a,b:middle,depth:depth+1,minimumDepth,checked:verified},
                    {a:middle,b,depth:depth+1,minimumDepth,checked:verified});
                inserted = true;
            }
            intervals = next;
            if (!inserted) break;
        }
        return layers.map((_, i) => intervals.flatMap(({a, b, depth, checked}) =>
            drawable(a.balls[i], b.balls[i], depth, checked[i])
                ? [{points:[a.balls[i].rest,b.balls[i].rest], offsets:[a.offset,b.offset], gap:false}]
                : []));
    }

    function pointAt(points, time) {
        let lo = 0, hi = points.length - 1;
        while (hi - lo > 1) {
            const mid = (hi + lo) >> 1;
            if (points[mid].t <= time) lo = mid;
            else hi = mid;
        }
        const a = points[lo], b = points[hi];
        const t = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
        return {x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t, z:(a.z || 0) + ((b.z || 0) - (a.z || 0)) * t};
    }

    function makeBands(samples, id, radius, [bandStart, bandEnd]) {
        const bands = [], rests = [];
        let previousRest = null;
        const tracks = samples.map(sample => {
            if (!sample.shot) return null;
            const timeline = events(sample.shot), rest = resting(sample.shot, id);
            const signature = timeline.map(event => event.key).join('|');
            const points = path(sample.shot, id);
            const end = points.at(-1)?.t || 0;
            const times = [0, ...timeline.filter(e => e.ids.includes(id)).map(e => Math.min(end, e.t)), end];
            return {signature, times, points, rest};
        });
        for (let i = 0; i < tracks.length; i++) {
            const b = tracks[i], right = samples[i];
            if (b?.rest && (right.restTone != null || (i >= bandStart && i <= bandEnd && right.offset != null))) {
                if (previousRest) {
                    const {track, sample, index} = previousRest;
                    const gap = index !== i - 1 || track.signature !== b.signature || distance(track.rest, b.rest) > radius * 3;
                    rests.push({points:[track.rest, b.rest], offsets:[sample.offset, right.offset],
                        tones:right.restTone == null ? null : [sample.restTone, right.restTone], gap});
                }
                previousRest = {track:b, sample:right, index:i};
            }
            if (i <= bandStart || i > bandEnd) continue;
            const a = tracks[i - 1], left = samples[i - 1];
            if (!a || !b) continue;
            const sameRoute = a.signature === b.signature;
            if (left.offset == null || right.offset == null ||
                !sameRoute || !a.points.length || !b.points.length) continue;
            const quads = [];
            const aTimes = a.times, bTimes = b.times;
            for (let leg = 1; leg < aTimes.length; leg++) {
                const a0 = aTimes[leg - 1], b0 = bTimes[leg - 1];
                const ad = aTimes[leg] - a0, bd = bTimes[leg] - b0;
                const segments = Math.max(1, Math.min(18, Math.ceil(Math.max(ad, bd) / .08)));
                let lastA = pointAt(a.points, a0), lastB = pointAt(b.points, b0);
                for (let j = 1; j <= segments; j++) {
                    const nextA = pointAt(a.points, a0 + ad * j / segments);
                    const nextB = pointAt(b.points, b0 + bd * j / segments);
                    const width = Math.max(distance(lastA, lastB), distance(nextA, nextB));
                    const step = Math.max(distance(lastA, nextA), distance(lastB, nextB));
                    if (width * step > 1e-7 && width <= radius * 2.5 && step <= radius * 8)
                        quads.push([lastA, nextA, nextB, lastB]);
                    lastA = nextA;
                    lastB = nextB;
                }
            }
            bands.push({offset:(left.offset + right.offset) / 2, quads});
        }
        return {bands, rests};
    }

    function tone(fraction) {
        const values = [[118,186,255],[117,237,153],[255,175,102]];
        const pos = Math.max(0, Math.min(2, fraction * 2));
        const i = Math.min(1, Math.floor(pos)), t = pos - i;
        return 'rgb(' + values[i].map((n, j) => Math.round(n + (values[i + 1][j] - n) * t)).join(',') + ')';
    }

    function offsetTone(offset, left, right) {
        const edge = offset < 0 ? left : right;
        return .5 + (edge ? .5 * offset / Math.abs(edge.offset) : 0);
    }

    function paint(ctx, project, state, flags, cloth) {
        if (!state?.current) return;
        const {current, references, ids, mouth} = state;
        const showPaths = flags.path || flags.safety, showRest = flags.rest || flags.safety;
        const visible = p => p && p.visible !== false && Number.isFinite(p.x) && Number.isFinite(p.y);
        const trace = (points, closed = false) => {
            ctx.beginPath();
            let open = false;
            for (const point of points) {
                const p = project(point);
                if (!visible(p)) { open = false; continue; }
                if (open) ctx.lineTo(p.x, p.y);
                else { ctx.moveTo(p.x, p.y); open = true; }
            }
            if (closed) ctx.closePath();
        };
        const colorAt = offset => tone(offsetTone(offset, references?.left, references?.right));
        const edgeLine = (points, stops, width, alpha) => {
            const [a, b] = points.map(project);
            if (!visible(a) || !visible(b) || (a.x === b.x && a.y === b.y)) return;
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            for (const [position, color] of stops) gradient.addColorStop(position, color);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = width;
            ctx.globalAlpha = alpha;
            trace(points);
            ctx.stroke();
        };
        ctx.save();
        ctx.lineCap = ctx.lineJoin = 'round';
        if (showRest && mouth) {
            const {a, b, outside} = mouth;
            const increasing = outside.x * (b.y - a.y) - outside.y * (b.x - a.x) > 0;
            const stops = references?.pocketStops?.name === mouth.name ? references.pocketStops.stops : null;
            edgeLine(increasing ? [a, b] : [b, a],
                stops?.map(stop => [stop.at, tone(stop.fraction)]) || COLORS.map((color, i) => [i / 2, color]), 1.5, .28);
        }
        if (flags.safety && references?.cushionLines) {
            for (const {id, stops} of references.cushionLines) {
                const a = stops[0], b = stops.at(-1), span = b.position - a.position;
                edgeLine([a.point, b.point], stops.map(stop => [(stop.position - a.position) / span, colorAt(stop.offset)]),
                    id === 0 ? 2.6 : 2.1, id === 0 ? .76 : .65);
            }
        }
        if (references && (showPaths || showRest)) {
            ctx.save();
            if (cloth.every(p => visible(project(p)))) {
                trace(cloth, true);
                ctx.clip();
            }
            const fillQuads = (quads, alpha) => {
                ctx.globalAlpha = alpha;
                for (const quad of quads) {
                    if (!quad.every(point => visible(project(point)))) continue;
                    trace(quad, true);
                    ctx.fill();
                }
            };
            if (flags.path && !flags.safety) {
                references.bands.forEach((bands, index) => {
                    for (const band of bands) {
                        ctx.fillStyle = colorAt(band.offset);
                        fillQuads(band.quads, index ? .026 : .052);
                    }
                });
            }
            if (showRest) {
                if (!flags.safety && references.tails?.length) {
                    ctx.save();
                    ctx.lineWidth = 2.25;
                    ctx.globalAlpha = .57;
                    ctx.setLineDash([.5, 5]);
                    for (const [index, lines] of references.tails.entries()) {
                        ctx.strokeStyle = COLORS[index ? 2 : 0];
                        for (const points of lines) {
                            trace(points);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }
                if (flags.safety) {
                    // Stroke a shared halo once. Round caps from individual
                    // samples would otherwise stack at joins and crossings.
                    ctx.strokeStyle = COLORS[1];
                    ctx.lineWidth = 7;
                    ctx.globalAlpha = .16;
                    ctx.beginPath();
                    for (const rests of references.rests) {
                        let last = null;
                        for (const {points:[from, to]} of rests) {
                            const a = project(from), b = project(to);
                            if (!visible(a) || !visible(b)) { last = null; continue; }
                            if (from !== last) ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            last = to;
                        }
                    }
                    ctx.stroke();
                }
                references.rests.forEach((rests, index) => {
                    for (const rest of rests) {
                        const [a, b] = rest.points.map(project);
                        if (!visible(a) || !visible(b) || (a.x === b.x && a.y === b.y)) continue;
                        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
                        const colors = rest.tones ? rest.tones.map(tone) : rest.offsets.map(colorAt);
                        gradient.addColorStop(0, colors[0]);
                        gradient.addColorStop(1, colors[1]);
                        ctx.strokeStyle = gradient;
                        trace(rest.points);
                        if (!flags.safety) {
                            ctx.lineWidth = index ? 9 : 14;
                            ctx.globalAlpha = rest.gap ? .035 : .11;
                            ctx.stroke();
                            ctx.lineWidth = index ? 5.5 : 8;
                            ctx.globalAlpha = rest.gap ? .085 : .23;
                            ctx.stroke();
                        }
                        ctx.lineWidth = flags.safety ? (index ? 2 : 2.8) : (index ? 2.6 : 4.2);
                        ctx.globalAlpha = flags.safety ? (index ? .76 : .9)
                            : rest.gap ? (index ? .26 : .40) : (index ? .64 : .96);
                        ctx.stroke();
                    }
                });
            }
            ctx.restore();
        }

        const outcomes = [references?.left?.shot, current, references?.right?.shot];
        for (const i of [0, 2, 1]) {
            const shot = outcomes[i];
            if (!shot) continue;
            ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = COLORS[i];
            for (const id of ids) {
                const primary = id === 0;
                ctx.globalAlpha = primary ? (i === 1 ? .88 : .58) : (i === 1 ? .55 : .37);
                if (showPaths && (!flags.safety || i === 1)) {
                    if (showRest) ctx.globalAlpha *= .34;
                    ctx.shadowBlur = showRest ? 0 : primary ? 4 : 2;
                    ctx.lineWidth = primary ? (i === 1 ? 2.1 : 1.5) : 1.05;
                    trace(path(shot, id));
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                if (flags.rail) {
                    for (const contact of shot.railEvents) {
                        if (contact.id !== id) continue;
                        const p = project(contact);
                        if (!visible(p)) continue;
                        const haloRadius = primary ? 9 : 7;
                        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                        halo.addColorStop(0, COLORS[i]);
                        halo.addColorStop(1, 'transparent');
                        ctx.globalAlpha = primary ? .52 : .38;
                        ctx.fillStyle = halo;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, haloRadius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.globalAlpha = primary ? .95 : .79;
                        ctx.fillStyle = COLORS[i];
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, primary ? 3.4 : 2.6, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
        if (showRest) {
            const edges = references?.restEdges;
            const landings = edges ? [edges[0].shot, current, edges[1].shot] : outcomes;
            for (const i of flags.safety ? [1] : [0, 2, 1]) {
                const shot = landings[i];
                if (!shot) continue;
                ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = COLORS[i];
                for (const id of ids) {
                    const primary = id === 0;
                    const end = resting(shot, id);
                    if (!end) continue;
                    const p = project(end);
                    if (!visible(p)) continue;
                    ctx.shadowBlur = primary ? 10 : 6;
                    ctx.globalAlpha = primary ? .92 : .65;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, primary ? 4.3 : 3.4, 0, 2 * Math.PI);
                    ctx.lineWidth = 1.15;
                    ctx.stroke();
                    if (primary) {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 1.6, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
        ctx.restore();
    }

    return {SAFETY_WINDOW, angleDelta, accepts, firstTargetRail, railPosition, pot, signed, search, paint};
});
