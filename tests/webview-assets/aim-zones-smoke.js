(async () => {
    const result = window.__aimZonesNativeSmoke = {status:'running', checks:[]};
    const assert = (ok, message) => { if (!ok) throw new Error(message); };
    const waitFor = async (predicate, label, timeout = 18000) => {
        const end = performance.now() + timeout;
        do {
            if (predicate()) return;
            await new Promise(resolve => setTimeout(resolve, 50));
        } while (performance.now() < end);
        throw new Error('Timed out: ' + label);
    };

    try {
        const bridge = window.billiardsTourBridge;
        const zones = window.BilliardsAimZones;
        assert(bridge && zones?.view, 'v2 Trainer bridge is missing');
        assert(!Billiards3D.active, 'Trainer did not start in 2D');
        const controls = ['aimZoneRail','aimZoneRest','aimZonePath','aimZoneSafety'];
        assert(controls.every(id => document.getElementById(id)?.type === 'checkbox'), 'v2 options are missing');
        const load = async (cue, object, angle, speed, follow = 0, safety = false) => {
            const snapshot = bridge.capture();
            const balls = [{id:0,n:'CB',...cue,active:true}];
            if (object) balls.push({id:1,n:'1',...object,active:true});
            Object.assign(snapshot.state,{
                tableL:2.24,tableW:1.12,speed,follow,sideSpin:0,cueElevationDeg:3,airbornePhysics:false,
                showPaths:true,shot2Enabled:false,activeShot:1,aimZones:{rail:true,rest:true,path:true,safety},
                balls,freeAim:{x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)}
            });
            bridge.restore(snapshot);
            await waitFor(() => zones.diagnostics()?.pending === false, 'reference calculation');
            const view = zones.view(), refs = view?.references;
            assert(refs?.left && refs?.right && view.current, 'three shot references are required');
            return [refs.left.shot, view.current, refs.right.shot];
        };

        for (const mode of ['2D','3D']) {
            if (mode === '3D') {
                document.getElementById('table3DToggle').click();
                await waitFor(() => Billiards3D.active, 'native 3D mode');
            }
            const pots = (await load({x:1.2,y:.8},{x:.6,y:.4},Math.atan2(-.4,-.6),2.2,-.5))
                .map(shot => shot.pocketEvents.find(event => event.id === 1));
            assert(pots.every(pot => pot?.pocket === 'TL'), 'each corner reference must pot the ball');
            assert(pots[0].x < pots[0].y && pots[2].x > pots[2].y, 'corner capture must be blue left and orange right');
            result.checks.push(mode + ' corner pocket');

            const rails = (await load({x:1.45,y:.56},null,0,1.8))
                .map(shot => shot.railEvents.find(event => event.id === 0));
            assert(rails.every(event => event?.rail === 'right rail'), 'each rail reference must reach the right cushion');
            assert(rails[0].y < rails[1].y && rails[1].y < rails[2].y, 'rail positions must be ordered blue, green, orange');
            result.checks.push(mode + ' direct rail');

            const safety = await load({x:.55,y:.4},{x:1.15,y:.4},.015,1.2,0,true);
            assert(safety.every(shot => shot.pocketEvents.length === 0 && shot.firstBallContact?.objId === 1),
                'safety must hit the intended first ball without a pot');
            assert(zones.view().ids.join(',') === '0,1', 'safety must compare both balls');
            const offsets = safety.map(shot => shot.firstBallContact.signedOffset);
            assert(offsets[0] > offsets[1] && offsets[1] > offsets[2], 'safety must be ordered blue, green, orange');
            result.checks.push(mode + ' defensive safety');
        }
        await waitFor(() => {
            const overlay = document.getElementById('aimZone3DOverlay');
            if (overlay?.style.display !== 'block') return false;
            const {width,height} = overlay;
            return overlay.getContext('2d').getImageData(0,0,width,height).data.some((value,index) => index % 4 === 3 && value);
        }, 'visible 3D overlay');
        result.checks.push('3D overlay rendered');
        result.status = 'passed';
    } catch (error) {
        result.status = 'failed';
        result.error = String(error);
    }
})();
