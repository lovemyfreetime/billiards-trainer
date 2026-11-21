/* Equal-mass sphere contacts. The velocities and impulses use unit mass. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.BilliardsBallContacts = api;
})(globalThis, function () {
    'use strict';
    const distanceTolerance = 1e-9; // metres, contact membership at a single instant
    const closingTolerance = 1e-9; // m/s, suppress roundoff at a resting contact

    // Balls are at the end of their drift. Larger rewinds are earlier hits.
    // A free-flight height chord is accurate to g*dt²/8 for each sphere.
    function firstContact(a, b, diameter, remaining) {
        const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
        const vx=b.vx-a.vx, vy=b.vy-a.vy, vz=b.driftVz-a.driftVz;
        const free=a.freeDrift && b.freeDrift;
        const limit=free ? remaining : 0;
        if (Math.abs(dx)>diameter+Math.abs(vx)*limit+distanceTolerance ||
            Math.abs(dy)>diameter+Math.abs(vy)*limit+distanceTolerance ||
            Math.abs(dz)>diameter+Math.abs(vz)*limit+distanceTolerance) return -1;
        const dot=dx*vx+dy*vy+dz*vz, speed2=vx*vx+vy*vy+vz*vz;
        const penetration=diameter*diameter-dx*dx-dy*dy-dz*dz;
        if (limit>0 && speed2>closingTolerance*closingTolerance && (dot>0 || penetration>0)) {
            const cx=dy*vz-dz*vy, cy=dz*vx-dx*vz, cz=dx*vy-dy*vx;
            const discr=speed2*diameter*diameter-cx*cx-cy*cy-cz*cz;
            if (discr>0) {
                const root=Math.sqrt(discr);
                const rewind=dot<0 ? penetration/(root-dot) : (dot+root)/speed2;
                if (root>closingTolerance*diameter && rewind>=0 && rewind<=limit+1e-12)
                    return Math.min(rewind,limit);
            }
        }
        if (penetration>2*diameter*distanceTolerance ||
            (penetration>=-2*diameter*distanceTolerance && dot < -closingTolerance*diameter)) return 0;
        return -1;
    }

    function contactAt(a,b,rewind,diameter) {
        const dx=b.x-a.x-(b.vx-a.vx)*rewind, dy=b.y-a.y-(b.vy-a.vy)*rewind;
        const dz=b.z-a.z-(b.driftVz-a.driftVz)*rewind;
        const max=diameter+distanceTolerance;
        if (Math.abs(dx)>max || Math.abs(dy)>max || Math.abs(dz)>max) return null;
        const distance=Math.hypot(dx,dy,dz);
        if (distance>max || distance===0) return null; // placement repairs coincident centres
        return {a,b,nx:dx/distance,ny:dy/distance,nz:dz/distance,depth:Math.max(0,diameter-distance),
            normal:0,tx:0,ty:0,tz:0};
    }

    function surfaceSpeed(c,radius) {
        const {a,b,nx,ny,nz}=c;
        const wx=a.wx+b.wx, wy=a.wy+b.wy, wz=a.wz+b.wz;
        const vx=b.vx-a.vx, vy=b.vy-a.vy, vz=b.vz-a.vz;
        const normal=vx*nx+vy*ny+vz*nz;
        return {normal,x:vx-normal*nx-radius*(wy*nz-wz*ny),
            y:vy-normal*ny-radius*(wz*nx-wx*nz),z:vz-normal*nz-radius*(wx*ny-wy*nx)};
    }

    // Project accumulated contact impulses onto unilateral normal and Coulomb
    // friction constraints. Every contact reads the same iteration's velocities.
    // A single contact reduces to the familiar /2 normal and /7 tangent law.
    function solveGroup(contacts, radius, restitution, friction, airborne) {
        const degree=new Map();
        for (const c of contacts) {
            const speed=surfaceSpeed(c,radius);
            c.target=-restitution*Math.min(0,speed.normal);
            c.mu=friction(Math.hypot(speed.x,speed.y,speed.z));
            for (const b of [c.a,c.b]) degree.set(b,(degree.get(b)||0)+1);
        }
        const relaxation=1/Math.max(...degree.values());
        const maxIterations=contacts.length===1 ? 1 : 500;
        for (let iter=0;iter<maxIterations;iter++) {
            let maxChange=0;
            for (const c of contacts) {
                const u=surfaceSpeed(c,radius);
                const normal=Math.max(0,c.normal+(c.target-u.normal)/2);
                let tx=c.tx-u.x/7, ty=c.ty-u.y/7, tz=c.tz-u.z/7;
                const length=Math.hypot(tx,ty,tz), limit=c.mu*normal;
                if (length>limit) { const k=limit/length; tx*=k; ty*=k; tz*=k; }
                c.dn=(normal-c.normal)*relaxation;
                c.dx=(tx-c.tx)*relaxation; c.dy=(ty-c.ty)*relaxation; c.dz=(tz-c.tz)*relaxation;
                maxChange=Math.max(maxChange,Math.abs(c.dn),Math.abs(c.dx),Math.abs(c.dy),Math.abs(c.dz));
                c.normal+=c.dn; c.tx+=c.dx; c.ty+=c.dy; c.tz+=c.dz;
            }
            for (const c of contacts) {
                const {a,b,nx,ny,nz,dn,dx,dy,dz}=c;
                const jx=dn*nx+dx, jy=dn*ny+dy, jz=dn*nz+dz;
                a.vx-=jx; a.vy-=jy; a.vz-=jz;
                b.vx+=jx; b.vy+=jy; b.vz+=jz;
                const k=-2.5/radius;
                const wx=k*(ny*dz-nz*dy), wy=k*(nz*dx-nx*dz), wz=k*(nx*dy-ny*dx);
                a.wx+=wx; a.wy+=wy; a.wz+=wz;
                b.wx+=wx; b.wy+=wy; b.wz+=wz;
            }
            if (maxChange<1e-12*relaxation) break;
        }
        if (!airborne) for (const ball of degree.keys()) ball.vz=0;
    }

    function resolveStep(balls,dt,config) {
        const {radius,gravity,airborne,restitution,friction,before,after,land}=config;
        const diameter=2*radius;
        let remaining=dt;
        // Resolve distinct event times in order. Frozen neighbours join the
        // impact group even when their relative speed was zero before impact.
        for (let event=0;event<64;event++) {
            let rewind=-1;
            for (let i=0;i<balls.length;i++) {
                const a=balls[i]; if (!a.active) continue;
                for (let j=i+1;j<balls.length;j++) {
                    const b=balls[j]; if (b.active) rewind=Math.max(rewind,firstContact(a,b,diameter,remaining));
                }
            }
            if (rewind<0) break;
            const touching=[], involved=new Set();
            for (let i=0;i<balls.length;i++) {
                const a=balls[i]; if (!a.active || (rewind>0 && !a.freeDrift)) continue;
                for (let j=i+1;j<balls.length;j++) {
                    const b=balls[j]; if (!b.active || (rewind>0 && !b.freeDrift)) continue;
                    const c=contactAt(a,b,rewind,diameter);
                    if (!c) continue;
                    touching.push(c);
                    const vz=b.vz-a.vz+(b.driftGravity-a.driftGravity)*rewind;
                    if ((b.vx-a.vx)*c.nx+(b.vy-a.vy)*c.ny+vz*c.nz < -closingTolerance || c.depth>distanceTolerance) {
                        involved.add(a); involved.add(b);
                    }
                }
            }
            if (!involved.size) break;
            let count;
            do {
                count=involved.size;
                for (const c of touching) if (involved.has(c.a)||involved.has(c.b)) {
                    involved.add(c.a); involved.add(c.b);
                }
            } while (involved.size>count);
            const contacts=touching.filter(c=>involved.has(c.a));
            for (const b of involved) {
                b.x-=b.vx*rewind; b.y-=b.vy*rewind; b.z-=b.driftVz*rewind;
                b.vz+=b.driftGravity*rewind;
                b.travel-=Math.hypot(b.vx,b.vy)*rewind;
            }
            for (const c of contacts) {
                // Position correction changes no velocity or momentum.
                const correction=c.depth*.5;
                c.a.x-=c.nx*correction; c.a.y-=c.ny*correction; c.a.z=Math.max(radius,c.a.z-c.nz*correction);
                c.b.x+=c.nx*correction; c.b.y+=c.ny*correction; c.b.z=Math.max(radius,c.b.z+c.nz*correction);
            }
            const at=dt-rewind;
            before(contacts,at);
            solveGroup(contacts,radius,restitution,friction,airborne);
            after(contacts,at);
            if (rewind<=0) break;
            for (const b of involved) {
                b.x+=b.vx*rewind; b.y+=b.vy*rewind; b.travel+=Math.hypot(b.vx,b.vy)*rewind;
                const flying=airborne && (b.z>radius || b.vz>0);
                b.driftGravity=flying?gravity:0;
                b.driftVz=flying?b.vz-.5*gravity*rewind:0;
                b.z+=b.driftVz*rewind; b.vz-=b.driftGravity*rewind;
                if (flying && b.z<=radius && b.vz<0) { b.z=radius; b.freeDrift=false; land(b); }
            }
            remaining=rewind;
        }
    }
    return {resolveStep,solveGroup};
});
