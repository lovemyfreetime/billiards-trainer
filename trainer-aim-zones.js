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
        if (!capture || !request.mouth) return null;
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
        if (request.safety) return request.contact - signed(shot, request.radius);
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
        if (!seed && !request.safety && !request.rail) {
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
            for (let i = 1; i <= 14; i++) {
                const outside = await trial(seed.angle + direction * stride * i);
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
            sample.offset = targetOffset(sample.shot, request);
            if (sample.offset == null) continue;
            if (sample.offset < (leftSample?.offset ?? 0)) leftSample = sample;
            if (sample.offset > (rightSample?.offset ?? 0)) rightSample = sample;
        }
        const layers = request.safety && request.id != null ? [0, request.id] : [0];
        return {
            lo, hi, tested:samples.size, bounded:[left.bounded,right.bounded],
            left:leftSample, right:rightSample,
            bands:layers.map(id => makeBands(ordered, id, radius)),
            layers
        };
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

    function makeBands(samples, id, radius) {
        const bands = [];
        const tracks = samples.map(sample => {
            const timeline = events(sample.shot), points = path(sample.shot, id);
            const signature = timeline.map(event => event.key).join('|');
            const end = points.at(-1)?.t || 0;
            const times = [0, ...timeline.filter(e => e.ids.includes(id)).map(e => Math.min(end, e.t)), end];
            return {signature, times, points, rest:resting(sample.shot, id)};
        });
        for (let i = 1; i < tracks.length; i++) {
            const a = tracks[i - 1], b = tracks[i];
            const left = samples[i - 1], right = samples[i];
            if (left.offset == null || right.offset == null ||
                a.signature !== b.signature || !a.points.length || !b.points.length) continue;
            const rest = a.rest && b.rest && distance(a.rest, b.rest) <= radius * 3 ? [a.rest, b.rest] : null;
            const quads = [];
            for (let leg = 1; leg < a.times.length; leg++) {
                const a0 = a.times[leg - 1], b0 = b.times[leg - 1];
                const ad = a.times[leg] - a0, bd = b.times[leg] - b0;
                const segments = Math.max(1, Math.min(18, Math.ceil(Math.max(ad, bd) / .08)));
                let lastA = pointAt(a.points, a0), lastB = pointAt(b.points, b0);
                for (let j = 1; j <= segments; j++) {
                    const nextA = pointAt(a.points, a0 + ad * j / segments);
                    const nextB = pointAt(b.points, b0 + bd * j / segments);
                    const width = Math.max(distance(lastA, lastB), distance(nextA, nextB));
                    const step = Math.max(distance(lastA, nextA), distance(lastB, nextB));
                    if (width <= radius * 2.5 && step <= radius * 8 && width * step > 1e-7)
                        quads.push([lastA, nextA, nextB, lastB]);
                    lastA = nextA;
                    lastB = nextB;
                }
            }
            bands.push({offset:(left.offset + right.offset) / 2, rest, quads});
        }
        return bands;
    }

    function tone(fraction) {
        const values = [[118,186,255],[117,237,153],[255,175,102]];
        const pos = Math.max(0, Math.min(2, fraction * 2));
        const i = Math.min(1, Math.floor(pos)), t = pos - i;
        return 'rgb(' + values[i].map((n, j) => Math.round(n + (values[i + 1][j] - n) * t)).join(',') + ')';
    }

    function paint(ctx, project, state, flags, cloth) {
        if (!state?.current) return;
        const {current, references, ids} = state;
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
        ctx.save();
        ctx.lineCap = ctx.lineJoin = 'round';
        if (references && (flags.path || flags.rest)) {
            ctx.save();
            if (cloth.every(p => visible(project(p)))) {
                trace(cloth, true);
                ctx.clip();
            }
            references.bands.forEach((bands, index) => {
                for (const band of bands) {
                    const edge = band.offset < 0 ? references.left : references.right;
                    const color = tone(.5 + (edge ? .5 * band.offset / Math.abs(edge.offset) : 0));
                    if (flags.path) {
                        ctx.fillStyle = color;
                        ctx.globalAlpha = index ? .026 : .052;
                        for (const quad of band.quads) {
                            if (!quad.every(p => visible(project(p)))) continue;
                            trace(quad, true);
                            ctx.fill();
                        }
                    }
                    if (flags.rest && band.rest) {
                        ctx.strokeStyle = color;
                        ctx.globalAlpha = index ? .22 : .35;
                        ctx.lineWidth = index ? 1.8 : 3.2;
                        trace(band.rest);
                        ctx.stroke();
                    }
                }
            });
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
                if (flags.path) {
                    ctx.shadowBlur = primary ? 4 : 2;
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
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, primary ? 2.7 : 2.2, 0, 2 * Math.PI);
                        ctx.lineWidth = 1.1;
                        if (primary) ctx.fill();
                        else ctx.stroke();
                    }
                }
                const end = flags.rest && resting(shot, id);
                if (end) {
                    const p = project(end);
                    if (!visible(p)) continue;
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
