/* Optional camera-only view. Physics, shot editing and saved layouts remain in the Trainer. */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).has('projector')||new URLSearchParams(location.search).get('zen')==='1')return;
 const stage=document.getElementById('stageWrap'),source=document.getElementById('canvas');
 if(!stage||!source)return;
 const button=document.createElement('button');button.type='button';button.id='table3DToggle';button.textContent='3D View';button.setAttribute('aria-pressed','false');
 const status=document.createElement('span');status.id='table3DStatus';status.setAttribute('role','status');
 stage.append(button,status);
 const tools=document.createElement('nav');tools.id='table3DTools';tools.hidden=true;tools.setAttribute('aria-label','3D camera controls');
 const action=(label,title,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',title);b.title=title;b.onclick=fn;tools.append(b);return b;};
 action('↶','Rotate camera left',()=>orbit(-Math.PI/12,0));
 action('↷','Rotate camera right',()=>orbit(Math.PI/12,0));
 const tiltLabel=document.createElement('label');tiltLabel.textContent='Tilt';const tilt=document.createElement('input');tilt.type='range';tilt.min='8';tilt.max='88';tilt.step='1';tilt.setAttribute('aria-label','3D camera tilt');tiltLabel.append(tilt);tools.append(tiltLabel);
 tilt.oninput=()=>{cameraState.elevation=Number(tilt.value)*Math.PI/180;requestRender();};
 action('Standing','Standing perspective from beside the table',()=>standing());
 action('Along shot','Look along the active cue-ball shot line',()=>alongShot());
 action('−','Zoom camera out',()=>zoom(1.15));action('+','Zoom camera in',()=>zoom(1/1.15));
 const shotAim=document.createElement('span');shotAim.className='table3DAim';shotAim.textContent='Shot aim';
 for(const [sign,label]of [[-1,'‹'],[1,'›']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label','Adjust shot aim '+(sign<0?'left':'right'));window.billiardsBindHoldAdjust(b,()=>document.querySelector('.aimControlRow.activeAim [data-aim-step="'+sign+'"]')?.click());shotAim.append(b);}tools.append(shotAim);
 action('2D','Return to the top-down table',()=>disable());
 const hint=document.createElement('span');hint.className='table3DHint';hint.textContent='Drag to rotate and tilt · Pinch to zoom';tools.append(hint);stage.append(tools);
 let active=false,loading=false,lastFrame=null,engine=null,scheduled=0;
 const cameraState={azimuth:Math.PI/4,elevation:.5,radius:3,target:null};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function dock(){const shelf=document.getElementById('phoneToolShelf');if(document.body.classList.contains('phone-focus')&&shelf)shelf.append(button,status);else stage.append(button,status);if(document.body.classList.contains('zen-mode'))disable();}
 new MutationObserver(dock).observe(document.body,{attributes:true,attributeFilter:['class']});dock();
 function requestRender(){if(!active||!engine||scheduled)return;scheduled=requestAnimationFrame(()=>{scheduled=0;if(active)engine.render();});}
 function orbit(dx,dy){cameraState.azimuth+=dx;cameraState.elevation=clamp(cameraState.elevation+dy,8*Math.PI/180,88*Math.PI/180);requestRender();}
 function zoom(factor){if(!lastFrame)return;cameraState.radius=clamp(cameraState.radius*factor,lastFrame.L*.65,lastFrame.L*8);requestRender();}
 // Keep the longer screen dimension at a natural 58° field of view.
 function viewTangent(aspect){return Math.tan(29*Math.PI/180)/Math.max(1,aspect);}
 function standing(){
  if(!lastFrame)return;
  const rect=stage.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height),L=lastFrame.L,W=lastFrame.W;
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
  const focus=clamp(length*.55,.1,lastFrame.L*.65),setback=Math.max(1.8,lastFrame.L*.8);
  cameraState.target={x:a.cue.x+dx*focus-lastFrame.L/2,y:lastFrame.R,z:a.cue.y+dz*focus-lastFrame.W/2};
  const x=a.cue.x-dx*setback-lastFrame.L/2-cameraState.target.x,z=a.cue.y-dz*setback-lastFrame.W/2-cameraState.target.z,y=.87-cameraState.target.y;
  cameraState.azimuth=Math.atan2(x,z);cameraState.radius=Math.hypot(x,y,z);cameraState.elevation=Math.asin(y/cameraState.radius);requestRender();
 }
 function disable(){if(!active)return;active=false;document.body.classList.remove('table-3d');button.setAttribute('aria-pressed','false');button.textContent='3D View';tools.hidden=true;engine?.stop();window.dispatchEvent(new Event('resize'));}
 button.onclick=async()=>{
  if(active){disable();return;}if(loading)return;loading=true;button.disabled=true;status.textContent='';
  try{if(!engine){const three=await import('./vendor/three/three-renderer.js?v=2');engine=createEngine(three);}if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
   active=true;document.body.classList.add('table-3d');button.setAttribute('aria-pressed','true');button.textContent='2D View';tools.hidden=false;
   if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls').click();
   window.dispatchEvent(new Event('resize'));standing();requestRender();
  }catch(error){disable();status.textContent='3D view is unavailable on this device. The top-down table is ready.';console.warn('3D camera unavailable:',error.message);}
  finally{loading=false;button.disabled=false;}
 };
 window.Billiards3D={get active(){return active;},update(frame){lastFrame=frame;if(active){engine?.update(frame);requestRender();}},disable,
  camera(){return {azimuth:cameraState.azimuth,elevation:cameraState.elevation,radius:cameraState.radius,target:{...cameraState.target},...engine?.projection()};}};
 window.addEventListener('resize',requestRender);document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
 function createEngine(T){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x080d13);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.style.removeProperty('display');canvas.id='table3DCanvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','3D table. Drag to rotate and tilt. Pinch or use the camera buttons to zoom. Use 2D to place balls.');canvas.setAttribute('role','img');stage.append(canvas);
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
  const sphere=new T.SphereGeometry(1,40,28),ballMeshes=new Map(),materials=new Map(),contacts=new Map(),contactGroup=new T.Group();scene.add(contactGroup);let dimensions='',dirty=true,lastSize='',frame=null;
  const palette=['#fbfbf4','#f4cd22','#1763bd','#d12e2f','#7135ad','#f07a22','#198952','#a52132','#171b20'];
  function ballMaterial(id){
   if(materials.has(id))return materials.get(id);
   const options={roughness:.3,metalness:0,envMapIntensity:.7};
   if(id===0)options.color=0xf5f3e9;
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
  function rebuild(f){for(const child of [...table.children]){table.remove(child);child.geometry.dispose();}const px=f.L*109/2312,pz=f.W*110/1160,w=f.L+px*2,d=f.W+pz*2;
   // The existing artwork supplies the cloth, cushion sights, pockets and exact guides.
   // Its camera projection shares the same metre coordinates as the spherical balls.
   const plane=new T.Mesh(new T.PlaneGeometry(w,d),surfaceMaterial);plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;table.add(plane);
   function rail(width,depth,x,z){const geometry=new T.RoundedBoxGeometry(width,.035,depth,2,.007),positions=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+x+w/2)/w,(d/2-positions.getZ(i)-z)/d);const mesh=new T.Mesh(geometry,[bodyMaterial,bodyMaterial,surfaceMaterial,bodyMaterial,bodyMaterial,bodyMaterial]);mesh.position.set(x,.0175,z);mesh.castShadow=true;mesh.receiveShadow=true;table.add(mesh);}
   const gap=f.R*2.7,segment=f.L/2-gap*2;
   for(const sign of [-1,1]){rail(px,f.W-gap*2,sign*(f.L+px)/2,0);for(const side of [-1,1])rail(segment,pz,side*f.L/4,sign*(f.W+pz)/2);}
   box(w,.15,d,0,-.085,0,bodyMaterial);box(w*.93,.12,d*.89,0,-.21,0,bodyMaterial);
   for(const x of [-w*.36,w*.36])for(const z of [-d*.31,d*.31])box(.12,.54,.12,x,-.54,z,legMaterial);
   dimensions=[f.L,f.W,f.R].join(':');
  }
  const pointers=new Map();
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();e.stopPropagation();if(pointers.size===2){const q=[...pointers].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(p.x-q.x,p.y-q.y),after=Math.hypot(e.clientX-q.x,e.clientY-q.y);if(before>8&&after>8)zoom(before/after);}else orbit(-(e.clientX-p.x)*.008,(e.clientY-p.y)*.006);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);e.stopPropagation();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();zoom(Math.exp(clamp(e.deltaY,-120,120)*.002));},{passive:false});
  canvas.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>orbit(-.08,0),ArrowRight:()=>orbit(.08,0),ArrowUp:()=>orbit(0,.06),ArrowDown:()=>orbit(0,-.06),'+':()=>zoom(.9),'-':()=>zoom(1.1),Escape:disable};if(actions[e.key]){e.preventDefault();e.stopPropagation();actions[e.key]();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disable();status.textContent='3D graphics paused. The top-down table is ready.';});
  return {projection(){return {verticalFov:camera.fov,horizontalFov:2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)*180/Math.PI};},stop(){pointers.clear();},update(f){frame=f;dirty=true;renderer.shadowMap.needsUpdate=true;},render(){
   const f=frame||lastFrame;if(!f)return;const rect=stage.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
   const size=rect.width+':'+rect.height;if(size!==lastSize){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.fov=2*Math.atan(viewTangent(camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();lastSize=size;}
   if(dimensions!==[f.L,f.W,f.R].join(':'))rebuild(f);
   if(dirty){const px=f.L*109/2312,pz=f.W*110/1160,a=f.map({x:-px,y:-pz}),b=f.map({x:f.L+px,y:f.W+pz}),ratio=source.width/source.clientWidth,w=Math.max(1,Math.round((b.x-a.x)*ratio)),h=Math.max(1,Math.round((b.y-a.y)*ratio));if(textureCanvas.width!==w||textureCanvas.height!==h){textureCanvas.width=w;textureCanvas.height=h;}textureCtx.clearRect(0,0,w,h);textureCtx.drawImage(source,a.x*ratio,a.y*ratio,w,h,0,0,w,h);texture.needsUpdate=true;dirty=false;}
   const target=cameraState.target||{x:0,y:0,z:0},horizontal=cameraState.radius*Math.cos(cameraState.elevation);camera.position.set(target.x+Math.sin(cameraState.azimuth)*horizontal,target.y+cameraState.radius*Math.sin(cameraState.elevation),target.z+Math.cos(cameraState.azimuth)*horizontal);camera.lookAt(target.x,target.y,target.z);tilt.value=String(Math.round(cameraState.elevation*180/Math.PI));
   const visible=new Set();
   for(const b of f.balls){
    if(!b.active||b.marker)continue;visible.add(b.id);let group=ballMeshes.get(b.id);
    if(!group){group=new T.Group();const mesh=new T.Mesh(sphere,ballMaterial(b.id==='CB2'?0:b.id));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);balls.add(group);ballMeshes.set(b.id,group);
     const contact=new T.Mesh(contactGeometry,new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));contactGroup.add(contact);contacts.set(b.id,contact);
    }
    group.visible=true;group.position.set(b.x-f.L/2,f.R+(b.z||0),b.y-f.W/2);group.scale.setScalar(f.R);
    // Keep the identifier readable at inspection angles, on the curved surface.
    const dir=camera.position.clone().sub(group.position).normalize();group.children[0].quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);group.children[0].rotateZ(((Number(b.id)||0)%5-2)*.06);
    const contact=contacts.get(b.id),height=Math.max(0,b.z||0);contact.visible=true;contact.position.set(group.position.x+f.R*.12,.001,group.position.z+f.R*.2);contact.scale.setScalar(f.R*2.8*(1+height));contact.material.opacity=1/(1+height*18);
   }
   for(const [id,group]of ballMeshes)if(!visible.has(id)){group.visible=false;contacts.get(id).visible=false;}

   renderer.render(scene,camera);
  }};
 }
})();
