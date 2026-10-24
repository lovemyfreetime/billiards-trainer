/* Optional 3D view with camera controls and projected Trainer editing. */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).has('projector')||new URLSearchParams(location.search).get('zen')==='1')return;
 const stage=document.getElementById('stageWrap'),source=document.getElementById('canvas');
 if(!stage||!source)return;
 const button=document.createElement('button');button.type='button';button.id='table3DToggle';button.textContent='3D View';button.setAttribute('aria-pressed','false');
 const status=document.createElement('span');status.id='table3DStatus';status.setAttribute('role','status');
 const views=document.createElement('nav');views.id='table3DViews';views.setAttribute('aria-label','Table viewpoints');views.append(button);stage.append(views,status);
 const tools=document.createElement('nav');tools.id='table3DTools';tools.hidden=true;tools.setAttribute('aria-label','3D camera controls');
 const action=(label,title,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',title);b.title=title;b.onclick=fn;tools.append(b);return b;};
 action('↶','Rotate camera left',()=>orbit(-Math.PI/12,0));
 action('↷','Rotate camera right',()=>orbit(Math.PI/12,0));
 const tiltLabel=document.createElement('label');tiltLabel.textContent='Tilt';const tilt=document.createElement('input');tilt.type='range';tilt.min='2';tilt.max='88';tilt.step='1';tilt.setAttribute('aria-label','3D camera tilt');tiltLabel.append(tilt);tools.append(tiltLabel);
 tilt.oninput=()=>{cameraState.elevation=Number(tilt.value)*Math.PI/180;requestRender();};
 const standingButton=action('Standing','Standing perspective from beside the table',()=>standing());
 const alongButton=action('Along shot','Look along the active cue-ball shot line',()=>alongShot());
 action('−','Zoom camera out',()=>zoom(1.15));action('+','Zoom camera in',()=>zoom(1/1.15));
 const viewLock=action('Lock view','Lock view for ball placement and aiming',()=>setViewLocked(!viewLocked));viewLock.id='table3DLock';viewLock.setAttribute('aria-pressed','false');views.append(standingButton,alongButton,viewLock);stage.append(tools);for(const b of [standingButton,alongButton,viewLock])b.hidden=true;
 const panButton=action('','Move table: drag to slide the view',()=>setPanEnabled(!panEnabled));panButton.id='table3DPan';panButton.setAttribute('aria-pressed','false');panButton.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" aria-hidden=true><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 6-6 6h-1c-2 0-3-1-4-2l-4-5c-1-2 1-3 2-2l3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';panButton.title='Move table: drag with one finger or mouse. Two fingers always slide and pinch.';
 let active=false,viewLocked=false,panEnabled=false,loading=false,lastFrame=null,engine=null,scheduled=0;
 const cameraState={azimuth:Math.PI/4,elevation:.5,radius:3,target:null};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function positionToggle(){
  if(document.body.classList.contains('phone-focus'))return;
  const zoom=document.getElementById('tableZoom');if(!zoom)return;
  const left=Number.parseFloat(zoom.style.left)||0,top=Number.parseFloat(zoom.style.top)||0;
  views.style.left=clamp(left,4,Math.max(4,stage.clientWidth-views.offsetWidth-4))+'px';
  views.style.top=clamp(top+42,4,Math.max(4,stage.clientHeight-views.offsetHeight-4))+'px';
 }
 function dock(){const shelf=document.getElementById('phoneToolShelf');if(document.body.classList.contains('phone-focus')&&document.body.classList.contains('phone-controls-open')&&shelf)shelf.append(views,status);else{stage.append(views,status);positionToggle();}if(document.body.classList.contains('zen-mode'))disable();}
 new MutationObserver(dock).observe(document.body,{attributes:true,attributeFilter:['class']});dock();
 function setPanEnabled(value){
  engine?.cancelInput();panEnabled=!!value;if(panEnabled&&viewLocked)setViewLocked(false);
  document.getElementById('table3DCanvas')?.style.removeProperty('cursor');document.body.classList.toggle('table-3d-pan',active&&panEnabled);panButton.setAttribute('aria-pressed',String(panEnabled));
 }
 function setViewLocked(value){
  engine?.cancelInput();document.getElementById('table3DCanvas')?.style.removeProperty('cursor');viewLocked=!!value;if(viewLocked)setPanEnabled(false);document.body.classList.toggle('table-3d-locked',active&&viewLocked);
  viewLock.innerHTML='<svg width="12" height="14" viewBox="0 0 16 18" aria-hidden="true"><path d="M4 8V5a4 4 0 0 1 8 0'+(viewLocked?'v3':'')+'M3 8h10v8H3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span>'+(viewLocked?'Locked':'Lock')+'</span>';viewLock.setAttribute('aria-pressed',String(viewLocked));viewLock.setAttribute('aria-label',viewLocked?'Unlock view to rotate the table':'Lock view for ball placement and aiming');viewLock.title=viewLock.getAttribute('aria-label');
  document.getElementById('table3DCanvas')?.setAttribute('aria-label',viewLocked?'3D table editing. Drag a ball to move it. Tap the cloth to aim.':'3D table camera. Drag to rotate and tilt. Pinch to zoom. Double-tap a ball for a close view. Lock view to edit.');
 }
 for(const id of ['teachingCompassToggle','bankToolToggle','kickToolToggle'])document.getElementById(id)?.addEventListener('click',()=>{if(!active)return;setViewLocked(true);if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls').click();});
 function requestRender(){if(!active||!engine||scheduled)return;scheduled=requestAnimationFrame(()=>{scheduled=0;if(active)engine.render();});}
 function orbit(dx,dy){cameraState.azimuth+=dx;cameraState.elevation=clamp(cameraState.elevation+dy,2*Math.PI/180,88*Math.PI/180);requestRender();}
 function zoom(factor){if(!lastFrame)return;cameraState.radius=clamp(cameraState.radius*factor,Math.max(lastFrame.R*5,lastFrame.L*.06),lastFrame.L*8);requestRender();}
 // Keep the longer screen dimension at a natural 58° field of view.
 function viewTangent(aspect){return Math.tan(29*Math.PI/180)/Math.max(1,aspect);}
 function standing(){
  if(!lastFrame)return;
  const rect=(active?document.getElementById('table3DCanvas'):stage).getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height),L=lastFrame.L,W=lastFrame.W;
  cameraState.target={x:0,y:0,z:0};cameraState.azimuth=Math.PI/4;
  // Fit every cushion corner while keeping the eye 87 cm above the bed
  // (about 1.65 m above the floor), rather than fitting an arbitrary camera height.
  let radius=Math.max(.94,L*.65),elevation;
  for(let step=0;step<70;step++){
   elevation=Math.asin(Math.min(.95,.87/radius));const sn=Math.sin(elevation),cs=Math.cos(elevation),side=Math.SQRT1_2,tan=viewTangent(aspect);let fits=true;
   for(const x of [-L*.548,L*.548])for(const z of [-W*.595,W*.595]){
    const depth=radius-side*cs*(x+z),horizontal=side*(x-z)/(depth*tan*aspect),vertical=-side*sn*(x+z)/(depth*tan);
    if(depth<.2||Math.abs(horizontal)>(document.body.classList.contains('phone-focus')?.80:.90)||Math.abs(vertical)>.72)fits=false;
   }
   if(fits)break;radius*=1.035;
  }
  cameraState.radius=radius;cameraState.elevation=elevation;requestRender();
 }
 function alongShot(){const a=lastFrame?.aim;if(!a)return;const length=Math.hypot(a.target.x-a.cue.x,a.target.y-a.cue.y);if(length<1e-5)return;const dx=(a.target.x-a.cue.x)/length,dz=(a.target.y-a.cue.y)/length;
  const focus=clamp(length*.18,.05,.22),setback=.48;
  cameraState.target={x:a.cue.x+dx*focus-lastFrame.L/2,y:lastFrame.R,z:a.cue.y+dz*focus-lastFrame.W/2};
  const x=a.cue.x-dx*setback-lastFrame.L/2-cameraState.target.x,z=a.cue.y-dz*setback-lastFrame.W/2-cameraState.target.z,y=.10-cameraState.target.y;
  cameraState.azimuth=Math.atan2(x,z);cameraState.radius=Math.hypot(x,y,z);cameraState.elevation=Math.asin(y/cameraState.radius);requestRender();
 }
 function disable(){if(!active)return;active=false;document.body.classList.remove('table-3d','table-3d-locked','table-3d-pan');button.setAttribute('aria-pressed','false');button.textContent='3D View';tools.hidden=true;for(const b of [standingButton,alongButton,viewLock])b.hidden=true;engine?.stop();window.dispatchEvent(new Event('resize'));}
 button.onclick=async()=>{
  if(active){disable();return;}if(loading)return;loading=true;button.disabled=true;status.textContent='';
  try{if(!engine){const three=await import('./vendor/three/three-renderer.js?v=4');engine=createEngine(three);}if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
   active=true;document.body.classList.add('table-3d');button.setAttribute('aria-pressed','true');button.textContent='2D View';tools.hidden=false;for(const b of [standingButton,alongButton,viewLock])b.hidden=false;positionToggle();
   if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls').click();
   window.dispatchEvent(new Event('resize'));standing();setViewLocked(viewLocked);setPanEnabled(panEnabled);requestRender();
  }catch(error){disable();status.textContent='3D view is unavailable on this device. The top-down table is ready.';console.warn('3D camera unavailable:',error.message);}
  finally{loading=false;button.disabled=false;}
 };
 window.Billiards3D={get active(){return active;},get locked(){return active&&viewLocked;},get panning(){return active&&panEnabled;},project(point,height=0){return engine?.project(point,height)||null;},update(frame){lastFrame=frame;if(active){engine?.update(frame);requestRender();}},disable,
  camera(){return {azimuth:cameraState.azimuth,elevation:cameraState.elevation,radius:cameraState.radius,target:{...cameraState.target},...engine?.projection()};},renderedBalls(){return engine?.ballViews()||[];},pocketGeometry(){return engine?.pocketViews()||[];},railGeometry(){return engine?.railViews()||[];}};
 window.addEventListener('resize',()=>{positionToggle();requestRender();});new MutationObserver(positionToggle).observe(document.getElementById('tableZoom'),{attributes:true,attributeFilter:['style']});document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
 function createEngine(T){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x080d13);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.style.removeProperty('display');canvas.id='table3DCanvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','3D table. Drag to rotate and tilt. Use Lock view for ball placement and aiming.');canvas.setAttribute('role','img');stage.append(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.01,100),table=new T.Group(),balls=new T.Group();scene.add(table,balls);scene.fog=new T.Fog(0x080d13,7,25);
  scene.add(new T.HemisphereLight(0xf2f5f4,0x303941,.75));
  const light=new T.DirectionalLight(0xfff8ed,1.8);light.position.set(-3,5,2);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.2,far:14});light.shadow.normalBias=.002;light.shadow.bias=-.00015;scene.add(light);
  // A quiet room reflection gives polished resin a soft overhead sheen.
  const roomCanvas=document.createElement('canvas');roomCanvas.width=512;roomCanvas.height=256;
  const roomCtx=roomCanvas.getContext('2d'),roomGradient=roomCtx.createLinearGradient(0,0,0,256);
  roomGradient.addColorStop(0,'#a0aaad');roomGradient.addColorStop(.5,'#505c62');roomGradient.addColorStop(1,'#192126');roomCtx.fillStyle=roomGradient;roomCtx.fillRect(0,0,512,256);
  roomCtx.filter='blur(8px)';roomCtx.fillStyle='#f4f2e8';roomCtx.fillRect(55,35,130,25);roomCtx.fillRect(300,35,140,25);
  const room=new T.CanvasTexture(roomCanvas);room.mapping=T.EquirectangularReflectionMapping;room.colorSpace=T.SRGBColorSpace;scene.environment=room;scene.environmentIntensity=.55;
  const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x131b21,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.82;floor.receiveShadow=true;scene.add(floor);
  const textureCanvas=document.createElement('canvas'),textureCtx=textureCanvas.getContext('2d'),texture=new T.CanvasTexture(textureCanvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const surfaceMaterial=new T.MeshStandardMaterial({map:texture,color:0xcbd4cf,roughness:.98,envMapIntensity:.15}),bodyMaterial=new T.MeshStandardMaterial({color:0x252b30,roughness:.64}),legMaterial=new T.MeshStandardMaterial({color:0x20272c,roughness:.6});
  const sphere=new T.SphereGeometry(1,40,28),ballMeshes=new Map(),materials=new Map(),contacts=new Map(),contactGroup=new T.Group();scene.add(contactGroup);let dimensions='',dirty=true,lastSize='',frame=null,pocketSpecs=[];const rollStep=new T.Quaternion(),rollAxis=new T.Vector3();
  const palette=['#fbfbf4','#f4cd22','#1763bd','#d12e2f','#7135ad','#f07a22','#198952','#a52132','#171b20'];
  function ballMaterial(id){
   if(materials.has(id))return materials.get(id);
   const options={roughness:.3,metalness:0,envMapIntensity:.7};
   if(id===0){
    // A standard practice-ball pattern makes cue-ball rotation visible as well.
    const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#f5f3e9';x.fillRect(0,0,512,256);x.fillStyle='#bd5149';
    for(const u of [0,.25,.5,.75,1]){x.beginPath();x.arc(u*512,128,7,0,Math.PI*2);x.fill();}x.fillRect(0,0,512,6);x.fillRect(0,250,512,6);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;options.map=map;
   }
   else{
    // The number panels are part of the spherical texture, never floating labels.
    // Two opposite panels and an equatorial stripe match a physical pool ball.
    const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d'),color=palette[id>8?id-8:id]||palette[0];
    x.fillStyle=id>8?'#f5f3e9':color;x.fillRect(0,0,512,256);
    if(id>8){x.fillStyle=color;x.fillRect(0,78,512,100);}
    for(const u of [.25,.75]){x.fillStyle='#faf8ee';x.beginPath();x.arc(c.width*u,128,37,0,Math.PI*2);x.fill();x.fillStyle='#161c20';x.font='700 43px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(String(id),c.width*u,130);}
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;options.map=map;
   }
   const material=new T.MeshStandardMaterial(options);materials.set(id,material);return material;
  }
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const contactCtx=contactCanvas.getContext('2d'),contactGradient=contactCtx.createRadialGradient(32,32,2,32,32,30);
  contactGradient.addColorStop(0,'rgba(0,0,0,.24)');contactGradient.addColorStop(.45,'rgba(0,0,0,.13)');contactGradient.addColorStop(1,'rgba(0,0,0,0)');contactCtx.fillStyle=contactGradient;contactCtx.fillRect(0,0,64,64);
  const contactTexture=new T.CanvasTexture(contactCanvas),contactGeometry=new T.PlaneGeometry(1,1);contactGeometry.rotateX(-Math.PI/2);
  function box(w,h,d,x,y,z,material){const mesh=new T.Mesh(new T.RoundedBoxGeometry(w,h,d,2,Math.min(.014,h*.2,w*.1,d*.1)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;table.add(mesh);}
  const pocketLiner=new T.MeshStandardMaterial({color:0x070a0c,roughness:.94,side:T.BackSide,envMapIntensity:.08});
  const woodMaterial=new T.MeshStandardMaterial({color:0x4b3023,roughness:.42,envMapIntensity:.4});
  const cushionMaterial=new T.MeshStandardMaterial({color:0x28687b,roughness:.94,envMapIntensity:.12});
  const sightMaterial=new T.MeshStandardMaterial({color:0xe3dbc6,roughness:.4});
  const pocketLeather=new T.MeshStandardMaterial({color:0x24292b,roughness:.78,side:T.DoubleSide,envMapIntensity:.25});
  function tableKey(f){return [f.L,f.W,f.R,JSON.stringify(f.G||{}),f.showDiamonds].join(':');}
  function makePockets(f){
   const G=f.G||{cornerMouth:.110,cornerLeg:.110/Math.SQRT2,cornerJawOut:.043,cornerThroatInset:.014,sideMouth:.120,sideThroat:.096,sideJawOut:.026};
   return [[1,-1,-1],[2,0,-1],[3,1,-1],[4,1,1],[5,0,1],[6,-1,1]].map(([id,sx,sz])=>{
    const corner=sx!==0,nx=corner?sx*Math.SQRT1_2:0,nz=corner?sz*Math.SQRT1_2:sz,tx=-nz,tz=nx;
    const cx=sx*f.L/2,cz=sz*f.W/2,front=corner?-G.cornerLeg/Math.SQRT2:0,half=(corner?G.cornerMouth:G.sideMouth)/2;
    const throat=corner?(G.cornerJawOut-G.cornerThroatInset)/Math.SQRT2:G.sideJawOut,neck=corner?(G.cornerJawOut+G.cornerThroatInset)/Math.SQRT2:G.sideThroat/2,rear=corner?.100:.098;
    const at=(n,t,y=0)=>new T.Vector3(cx+nx*n+tx*t,y,cz+nz*n+tz*t);
    const shape=new T.Shape(),move=(n,t)=>{const p=at(n,t);shape.moveTo(p.x,-p.z);},line=(n,t)=>{const p=at(n,t);shape.lineTo(p.x,-p.z);},curve=(cn,ct,n,t)=>{const c=at(cn,ct),p=at(n,t);shape.quadraticCurveTo(c.x,-c.z,p.x,-p.z);};
    move(front,-half);line(front,half);line(throat,neck);curve(rear,neck,rear,0);curve(rear,-neck,throat,-neck);line(front,-half);shape.closePath();
    // The back and jaw cuff is open at the mouth, like a real drop pocket.
    const samples=[[front,half],[throat,neck]];
    const quadratic=(a,b,c,t)=>a*(1-t)*(1-t)+2*b*t*(1-t)+c*t*t;
    for(let i=1;i<=16;i++){const t=i/16;samples.push([quadratic(throat,rear,rear,t),quadratic(neck,neck,0,t)]);}
    for(let i=1;i<=16;i++){const t=i/16;samples.push([quadratic(rear,rear,throat,t),quadratic(0,-neck,-neck,t)]);}samples.push([front,-half]);
    return {id,shape,at,samples,probe:at((throat+rear)/2,0),back:at(rear+.014,0),wood:at(rear+.045,0),nx,nz,tx,tz};
   });
  }
  function addPocket(p){
   // Back-facing extrusion leaves the mouth open and exposes walls and a bottom
   // 7.5 inches below the cloth, instead of painting a black disk on the bed.
   const well=new T.Mesh(new T.ExtrudeGeometry(p.shape,{depth:.19,steps:1,curveSegments:24,bevelEnabled:false}),pocketLiner);
   well.rotation.x=-Math.PI/2;well.position.y=-.19;well.receiveShadow=true;table.add(well);
   const positions=[],indices=[],rim=[],woodPositions=[],woodIndices=[];
   p.samples.forEach(([n,t],i)=>{
    const a=p.samples[Math.max(0,i-1)],b=p.samples[Math.min(p.samples.length-1,i+1)],dn=b[0]-a[0],dt=b[1]-a[1],length=Math.hypot(dn,dt)||1;
    const on=-dt/length,ot=dn/length,inner=p.at(n,t),outer=p.at(n+on*.028,t+ot*.028);
    positions.push(inner.x,-.02,inner.z,inner.x,.026,inner.z,outer.x,.026,outer.z,outer.x,-.04,outer.z);
    rim.push(p.at(n+on*.014,t+ot*.014,.026));
    // Carry the wooden cap around the entire raised leather back.
    for(const [offset,y] of [[.028,-.055],[.028,.035],[.060,.035],[.060,-.055]]){const v=p.at(n+on*offset,t+ot*offset,y);woodPositions.push(v.x,v.y,v.z);}
    if(i){const prev=(i-1)*4,next=i*4;for(let face=0;face<3;face++){const a=prev+face,b=next+face;woodIndices.push(a,a+1,b,b,a+1,b+1);}}
    if(i){const prev=(i-1)*4,next=i*4;for(let face=0;face<3;face++){const a=prev+face,b=next+face;indices.push(a,b,a+1,b,b+1,a+1);}}
   });
   const capGeometry=new T.BufferGeometry();capGeometry.setAttribute('position',new T.Float32BufferAttribute(woodPositions,3));capGeometry.setIndex(woodIndices);capGeometry.computeVertexNormals();const cap=new T.Mesh(capGeometry,woodMaterial);cap.castShadow=true;cap.receiveShadow=true;table.add(cap);
   const cuffGeometry=new T.BufferGeometry();cuffGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));cuffGeometry.setIndex(indices);cuffGeometry.computeVertexNormals();
   const cuff=new T.Mesh(cuffGeometry,pocketLeather);cuff.castShadow=true;cuff.receiveShadow=true;table.add(cuff);
   const lip=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim),72,.012,10,false),pocketLeather);lip.castShadow=true;lip.receiveShadow=true;table.add(lip);
   const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#e8dec9';x.font='600 45px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.id,32,34);
   const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});material.userData.pocketOwned=true;
   const label=new T.Mesh(new T.PlaneGeometry(.025,.025),material);label.position.copy(p.back);label.position.y=.040;label.rotation.set(-Math.PI/2,0,-Math.atan2(p.nx,p.nz));table.add(label);
  }
  function rebuild(f){
   for(const child of [...table.children]){table.remove(child);child.geometry.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material])if(m.userData.pocketOwned){m.map?.dispose();m.dispose();}}
   const px=f.L*109/2312,pz=f.W*110/1160,w=f.L+px*2,d=f.W+pz*2;
   pocketSpecs=makePockets(f);
   const outline=new T.Shape();outline.moveTo(-w/2,-d/2);outline.lineTo(w/2,-d/2);outline.lineTo(w/2,d/2);outline.lineTo(-w/2,d/2);outline.closePath();for(const p of pocketSpecs)outline.holes.push(p.shape);
   const geometry=new T.ShapeGeometry(outline,24);geometry.rotateX(-Math.PI/2);const uv=geometry.attributes.uv,positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+w/2)/w,(d/2-positions.getZ(i))/d);
   const bed=new T.Mesh(geometry,surfaceMaterial);bed.receiveShadow=true;table.add(bed);
   // The case has the same six openings, so no hidden solid slab blocks the wells.
   const caseGeometry=new T.ExtrudeGeometry(outline,{depth:.255,steps:1,curveSegments:24,bevelEnabled:true,bevelSegments:2,bevelThickness:.003,bevelSize:.003});caseGeometry.rotateX(-Math.PI/2);
   const body=new T.Mesh(caseGeometry,bodyMaterial);body.position.y=-.26;body.castShadow=true;body.receiveShadow=true;table.add(body);
   function rail(width,depth,x,z){box(width,.075,depth,x,-.0025,z,woodMaterial);}
   const G=f.G||{cornerLeg:.110/Math.SQRT2,sideMouth:.120},cl=G.cornerLeg,sm=G.sideMouth/2,segment=f.L/2-cl-sm;
   for(const sign of [-1,1]){
    rail(px-.032,f.W-cl*2,sign*(f.L+px+.032)/2,0);
    box(.032,.035,f.W-cl*2,sign*(f.L+.032)/2,.0175,0,cushionMaterial);
    for(const side of [-1,1]){
     const x=side*(f.L/4-(cl-sm)/2);rail(segment,pz-.032,x,sign*(f.W+pz+.032)/2);
     box(segment,.035,.032,x,.0175,sign*(f.W+.032)/2,cushionMaterial);
    }
   }
   // Real-size inlaid sights sit on the wood cap, beyond the cloth cushion.
   if(f.showDiamonds!==false){
    function sight(x,z){const mesh=new T.Mesh(new T.PlaneGeometry(.006,.010),sightMaterial);mesh.rotation.set(-Math.PI/2,0,Math.PI/4);mesh.position.set(x,.0352,z);mesh.userData.sight=true;table.add(mesh);}
    for(const i of [1,2,3,5,6,7])for(const sign of [-1,1])sight(f.L*(i/8-.5),sign*(f.W/2+pz*.65));
    for(const j of [1,2,3])for(const sign of [-1,1])sight(sign*(f.L/2+px*.65),f.W*(j/4-.5));
   }
   for(const p of pocketSpecs)addPocket(p);
   for(const x of [-w*.36,w*.36])for(const z of [-d*.31,d*.31])box(.12,.54,.12,x,-.54,z,legMaterial);
   dimensions=tableKey(f);renderer.shadowMap.needsUpdate=true;
  }
  const pointers=new Map();let edit=null,lastTap=null;
  // Screen-space panning translates camera and target together, preserving the
  // current tilt and shot-line angle even when looking nearly across the cloth.
  function pan(dx,dy){
   const r=canvas.getBoundingClientRect(),scale=2*cameraState.radius*Math.tan(camera.fov*Math.PI/360)/Math.max(1,r.height);
   const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),shift=right.multiplyScalar(-dx*scale).addScaledVector(up,dy*scale);
   const target=cameraState.target||(cameraState.target={x:0,y:0,z:0});target.x+=shift.x;target.y+=shift.y;target.z+=shift.z;requestRender();
  }
  function overControls(e){return [...document.querySelectorAll('#phoneAimRail,#phoneSpeedRail,#phoneActions,.aimControlRow.activeAim,.tableSpeedControl.activeSpeed,.bottomSpinGroup.activeSpin,.phoneTipControl')].some(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&e.clientX>=r.left-5&&e.clientX<=r.right+5&&e.clientY>=r.top-5&&e.clientY<=r.bottom+5;});}
  const inputRay=new T.Raycaster();
  function cast(e){const r=canvas.getBoundingClientRect();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);inputRay.setFromCamera({x:2*(e.clientX-r.left)/r.width-1,y:1-2*(e.clientY-r.top)/r.height},camera);}
  function planePoint(height=0){const direction=inputRay.ray.direction;if(Math.abs(direction.y)<1e-6)return null;const distance=(height-inputRay.ray.origin.y)/direction.y;if(distance<0)return null;return inputRay.ray.at(distance,new T.Vector3());}
  function logical(p){const f=frame||lastFrame;return p&&f?{x:p.x+f.L/2,y:p.z+f.W/2}:null;}
  function pick(e){
   const f=frame||lastFrame;if(!f||f.animating)return null;cast(e);
   const obstruction=inputRay.intersectObjects(table.children,true).find(hit=>!hit.object.material?.userData?.pocketOwned);
   const hit=inputRay.intersectObjects([...ballMeshes.values()].filter(g=>g.visible),true)[0];
   if(hit&&(!obstruction||hit.distance<obstruction.distance+.00001)){
    const group=hit.object.parent,point=planePoint(f.R);if(!point)return null;
    return {point:logical(group.position),height:f.R,offset:{x:point.x-group.position.x,z:point.z-group.position.z}};
   }
   const point=obstruction?.point||planePoint();if(!point)return null;
   const q=logical(point);if(q.x<-.3||q.x>f.L+.3||q.y<-.3||q.y>f.W+.3)return null;
   return {point:q,height:0,offset:{x:0,z:0}};
  }
  function forward(type,point,e){return window.billiards3DTableInput?.(type,point,{buttons:e.buttons??0,pointerId:e.pointerId||1,pointerType:e.pointerType||'mouse',shiftKey:!!e.shiftKey,altKey:!!e.altKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,deltaY:e.deltaY||0,deltaX:e.deltaX||0,deltaMode:e.deltaMode||0});}
  function cancelInput(){if(edit){forward('pointercancel',edit.last,{pointerId:edit.id,pointerType:edit.pointerType});edit=null;}pointers.clear();}
  canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0||overControls(e))return;e.preventDefault();e.stopPropagation();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
   if(viewLocked){if(edit)return;const hit=pick(e);if(!hit)return;edit={id:e.pointerId,pointerType:e.pointerType,height:hit.height,offset:hit.offset,last:hit.point};if(!forward('pointerdown',hit.point,e))edit=null;return;}
   pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,multi:pointers.size>0});if(pointers.size>1){for(const p of pointers.values())p.multi=true;lastTap=null;}
  });
  canvas.addEventListener('pointermove',e=>{
   if(viewLocked){if(!edit){cast(e);const q=logical(planePoint());if(q)forward('pointermove',q,e);canvas.style.cursor=source.style.cursor||'crosshair';return;}if(edit.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();cast(e);const p=planePoint(edit.height);if(!p)return;const q=logical(new T.Vector3(p.x-edit.offset.x,0,p.z-edit.offset.z));edit.last=q;forward('pointermove',q,e);return;}
   const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();e.stopPropagation();if(pointers.size===2){const q=[...pointers].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(p.x-q.x,p.y-q.y),after=Math.hypot(e.clientX-q.x,e.clientY-q.y);pan((e.clientX-p.x)/2,(e.clientY-p.y)/2);if(before>8&&after>8)zoom(before/after);}else if(!p.multi){if(panEnabled)pan(e.clientX-p.x,e.clientY-p.y);else orbit(-(e.clientX-p.x)*.008,(e.clientY-p.y)*.006);}pointers.set(e.pointerId,{...p,x:e.clientX,y:e.clientY});
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
   if(edit?.id===e.pointerId){const current=edit;edit=null;forward(type==='pointerup'?'pointerup':'pointercancel',current.last,e);}
   const point=pointers.get(e.pointerId);
   if(!viewLocked&&type==='pointerup'&&pointers.size===1&&point&&!point.multi&&!panEnabled&&Math.hypot(e.clientX-point.sx,e.clientY-point.sy)<6){const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<20){focusBall(e);lastTap=null;}else lastTap={time:now,x:e.clientX,y:e.clientY};}else if(type!=='lostpointercapture')lastTap=null;
   pointers.delete(e.pointerId);e.stopPropagation();
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(viewLocked){cast(e);const p=logical(planePoint());if(p)forward('wheel',p,e);}else zoom(Math.exp(clamp(e.deltaY,-120,120)*.002));},{passive:false});
  function focusBall(e){cast(e);const hit=inputRay.intersectObjects([...ballMeshes.values()].filter(g=>g.visible),true)[0];if(!hit)return;const p=hit.object.parent.position;cameraState.target={x:p.x,y:p.y,z:p.z};cameraState.radius=.55;cameraState.elevation=8*Math.PI/180;requestRender();}
  canvas.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>orbit(-.08,0),ArrowRight:()=>orbit(.08,0),ArrowUp:()=>orbit(0,.06),ArrowDown:()=>orbit(0,-.06),'+':()=>zoom(.9),'-':()=>zoom(1.1),Escape:disable};if(actions[e.key]){e.preventDefault();e.stopPropagation();actions[e.key]();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disable();status.textContent='3D graphics paused. The top-down table is ready.';});
  return {cancelInput,pan,railViews(){return table.children.filter(m=>m.userData.sight).map(m=>({x:m.position.x,y:m.position.y,z:m.position.z,width:.006,length:.010}));},project(point,height=0){const f=frame||lastFrame;if(!f)return null;camera.updateMatrixWorld(true);const v=new T.Vector3(point.x-f.L/2,height,point.y-f.W/2).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,visible:v.z>=-1&&v.z<=1};},ballViews(){return [...ballMeshes].filter(([,g])=>g.visible).map(([id,g])=>({id,x:g.position.x,y:g.position.y,z:g.position.z,rotation:g.children[0].quaternion.toArray()}));},pocketViews(){scene.updateMatrixWorld(true);const ray=new T.Raycaster();return pocketSpecs.map(p=>{const height=v=>{ray.set(new T.Vector3(v.x,1,v.z),new T.Vector3(0,-1,0));return ray.intersectObjects(table.children,true).find(hit=>!hit.object.material?.userData?.pocketOwned)?.point.y;};return {id:p.id,floorHeight:height(p.probe),backHeight:height(p.back),woodHeight:height(p.wood)};});},projection(){return {verticalFov:camera.fov,horizontalFov:2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)*180/Math.PI};},stop(){cancelInput();},update(f){if(f.animating&&edit)cancelInput();frame=f;dirty=true;renderer.shadowMap.needsUpdate=true;},render(){
   const f=frame||lastFrame;if(!f)return;const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
   const size=rect.width+':'+rect.height;if(size!==lastSize){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.fov=2*Math.atan(viewTangent(camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();lastSize=size;}
   if(dimensions!==tableKey(f))rebuild(f);
   if(dirty){const px=f.L*109/2312,pz=f.W*110/1160,a=f.map({x:-px,y:-pz}),b=f.map({x:f.L+px,y:f.W+pz}),ratio=source.width/source.clientWidth,w=Math.max(1,Math.round((b.x-a.x)*ratio)),h=Math.max(1,Math.round((b.y-a.y)*ratio));if(textureCanvas.width!==w||textureCanvas.height!==h){textureCanvas.width=w;textureCanvas.height=h;}textureCtx.clearRect(0,0,w,h);textureCtx.drawImage(source,a.x*ratio,a.y*ratio,w,h,0,0,w,h);texture.needsUpdate=true;dirty=false;}
   const target=cameraState.target||{x:0,y:0,z:0},horizontal=cameraState.radius*Math.cos(cameraState.elevation);camera.position.set(target.x+Math.sin(cameraState.azimuth)*horizontal,target.y+cameraState.radius*Math.sin(cameraState.elevation),target.z+Math.cos(cameraState.azimuth)*horizontal);camera.lookAt(target.x,target.y,target.z);tilt.value=String(Math.round(cameraState.elevation*180/Math.PI));
   const visible=new Set();
   for(const b of f.balls){
    if(!b.active||b.marker)continue;visible.add(b.id);let group=ballMeshes.get(b.id);
    if(!group){group=new T.Group();const mesh=new T.Mesh(sphere,ballMaterial(b.id==='CB2'?0:b.id));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);balls.add(group);ballMeshes.set(b.id,group);
     const contact=new T.Mesh(contactGeometry,new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));contactGroup.add(contact);contacts.set(b.id,contact);
    }
    const centerHeight=Number.isFinite(b.z)?Math.max(f.R,b.z):f.R,oldPosition=group.position.clone();
    group.visible=true;group.position.set(b.x-f.L/2,centerHeight,b.y-f.W/2);group.scale.setScalar(f.R);
    const viewKey=[cameraState.azimuth,cameraState.elevation,cameraState.radius,target.x,target.y,target.z].join(':');
    if(!f.animating&&(group.userData.viewKey!==viewKey||(!group.userData.animating&&oldPosition.distanceTo(group.position)>.00001))){
     const dir=camera.position.clone().sub(group.position).normalize();group.children[0].quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);group.children[0].rotateZ(((Number(b.id)||0)%5-2)*.06);
    }
    if(f.animating&&Number.isFinite(b.t)){
     const reset=!group.userData.animating||b.t<(group.userData.lastTime||0),elapsed=Math.max(0,b.t-(reset?0:group.userData.lastTime));
     // Table coordinates use Z-up; the display uses Y-up, so angular velocity
     // transforms as a pseudovector. These are the simulator's actual spin rates.
     rollAxis.set(-(b.wx||0),-(b.wz||0),-(b.wy||0));
     if(!reset&&group.userData.omega)rollAxis.add(group.userData.omega).multiplyScalar(.5);
     const speed=rollAxis.length();if(speed>1e-8&&elapsed>0)group.children[0].quaternion.premultiply(rollStep.setFromAxisAngle(rollAxis.multiplyScalar(1/speed),speed*elapsed));
     group.userData.omega=new T.Vector3(-(b.wx||0),-(b.wz||0),-(b.wy||0));group.userData.lastTime=b.t;
    }
    group.userData.animating=!!f.animating;group.userData.viewKey=viewKey;
    const contact=contacts.get(b.id),height=Math.max(0,centerHeight-f.R);contact.visible=true;contact.position.set(group.position.x+f.R*.12,.001,group.position.z+f.R*.2);contact.scale.setScalar(f.R*2.8*(1+height));contact.material.opacity=1/(1+height*18);
   }
   for(const [id,group]of ballMeshes)if(!visible.has(id)){group.visible=false;contacts.get(id).visible=false;}

   renderer.render(scene,camera);
  }};
 }
})();
