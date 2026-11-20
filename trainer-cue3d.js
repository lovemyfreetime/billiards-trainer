/* Cue presentation uses the same normalized tip contact and elevation as the shot engine. */
(function(root){
 'use strict';
 const METERS_PER_INCH=.0254, EYE_HEIGHT_INCHES={min:2.5,max:18};
 const LENGTH=58*METERS_PER_INCH,TIP_RADIUS=.01275/2,BUTT_RADIUS=.03175/2,PRE_ROLL=.72;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
 let finish='blackSilver';try{const saved=root.localStorage?.getItem('trainer.cueFinish.v1');if(['blackSilver','carbon','wood'].includes(saved))finish=saved;}catch{}
 function setFinish(value){if(!['blackSilver','carbon','wood'].includes(value))return false;finish=value;try{root.localStorage?.setItem('trainer.cueFinish.v1',value);}catch{}return true;}
 function pose(data,time,ball){
  if(!data)return null;const angle=data.elevation*Math.PI/180,co=Math.cos(angle),sn=Math.sin(angle),R=data.R;
  const forward=[data.dx*co,-sn,data.dy*co],back=forward.map(v=>-v),contact=[data.x+R*(data.dx*data.rear-data.dy*data.sideR),data.z+R*data.height,data.y+R*(data.dy*data.rear+data.dx*data.sideR)];
  const stroke=data.stroke||{backstroke:.13,followThrough:.12,followTime:.18,finishAt:.18,withdrawAt:2.18,hideAt:2.42,withdrawTime:.24};
  let gap=.008,phase='address',visible=true;
  if(data.blocked)gap=Math.max(.08,(2*R+.018-contact[1])/Math.max(.1,sn));
  if(Number.isFinite(time)){
   if(time<-.30){phase='backstroke';gap=.008+(stroke.backstroke-.008)*smooth((time+PRE_ROLL)/.42);}
   else if(time<-.23){phase='pause';gap=stroke.backstroke;}
   else if(time<0){phase='forward';gap=stroke.backstroke*(1-clamp((time+.23)/.23,0,1)**2);}
   else if(time<stroke.withdrawAt){phase=time<stroke.finishAt?'follow-through':'finish';gap=-stroke.followThrough*smooth(time/Math.max(.000001,stroke.finishAt));}
   else{phase='withdraw';gap=-stroke.followThrough+(stroke.followThrough+stroke.backstroke)*smooth((time-stroke.withdrawAt)/Math.max(.000001,stroke.withdrawTime));visible=visible&&time<stroke.hideAt;}
  }
  if(gap<0&&ball?.active){
   const delta=[ball.x-contact[0],ball.z-contact[1],ball.y-contact[2]],along=delta.reduce((n,v,i)=>n+v*forward[i],0),side2=delta.reduce((n,v)=>n+v*v,0)-along*along;
   if(side2<R*R){const available=Math.max(0,along-Math.sqrt(Math.max(0,R*R-side2))-.00015);gap=Math.max(gap,-available);}
  }
  return {contact,tip:contact.map((v,i)=>v+back[i]*gap),forward,back,gap,phase,visible,length:LENGTH,tipRadius:TIP_RADIUS,buttRadius:BUTT_RADIUS,elevation:data.elevation,blocked:!!data.blocked,stroke};
 }
 function advanceTime(previous,elapsed,speed,duration){
  const step=Math.max(0,elapsed)*speed;
  // Preserve a visible stroke on slow renderers and show the exact impact frame.
  if(previous<0)return Math.min(0,previous+Math.min(step,.05));
  return Math.min(duration,previous+(previous<.34?Math.min(step,.05):step));
 }
 function clampEyeHeight(meters){return clamp(Number(meters)||.12,EYE_HEIGHT_INCHES.min*METERS_PER_INCH,EYE_HEIGHT_INCHES.max*METERS_PER_INCH);}
 function playerCamera(data,settings={}){
  const p=pose(data),distance=settings.distance||.75,height=settings.approach?clamp(settings.height,.12,1.4):clampEyeHeight(settings.height),axis=p.back;
  const eye=[p.contact[0]+axis[0]*distance,p.contact[1]+axis[1]*distance+height,p.contact[2]+axis[2]*distance],target=[p.contact[0]+data.dx*.20,data.z,p.contact[2]+data.dy*.20];
  const dx=eye[0]-target[0],dy=eye[1]-target[1],dz=eye[2]-target[2],radius=Math.hypot(dx,dy,dz);
  return {eye,target,azimuth:Math.atan2(dx,dz),radius,elevation:Math.asin(dy/radius)};
 }
 function shadowProjection(tip,butt,light){
  const slopeX=light[0]/light[1],slopeZ=light[2]/light[1];
  const start=[tip[0]-tip[1]*slopeX,tip[2]-tip[1]*slopeZ];
  const x=butt[0]-butt[1]*slopeX-start[0],z=butt[2]-butt[1]*slopeZ-start[1];
  const length=Math.hypot(x,z);
  if(length<.0001)return null;
  const axis=[x/length,z/length];
  return {start,axis,length,widthScale:Math.hypot(1,axis[1]*slopeX-axis[0]*slopeZ)};
 }
 function clothShadow(material,light){
  const uniforms={
   cueShadowStart:{value:{x:0,y:0}},cueShadowAxis:{value:{x:1,y:0}},
   cueShadowLength:{value:1},cueShadowWidth:{value:1},cueShadowFade:{value:0}
  };
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vCueCloth;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvCueCloth = (modelMatrix * vec4(transformed, 1.0)).xz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec2 vCueCloth;
    uniform vec2 cueShadowStart, cueShadowAxis;
    uniform float cueShadowLength, cueShadowWidth, cueShadowFade;`)
    .replace('#include <opaque_fragment>',`
    if (cueShadowFade > 0.0) {
     vec2 offset = vCueCloth - cueShadowStart;
     float along = dot(offset, cueShadowAxis);
     float progress = clamp(along / cueShadowLength, 0.0, 1.0);
     float across = dot(offset, vec2(-cueShadowAxis.y, cueShadowAxis.x));
     float beyond = along - progress * cueShadowLength;
     float distanceToAxis = length(vec2(across, beyond));
     float radius = cueShadowWidth * mix(${TIP_RADIUS}, ${BUTT_RADIUS}, smoothstep(.22, .97, progress));
     float feather = max(.003, fwidth(distanceToAxis));
     float shade = 1.0 - smoothstep(max(0.0, radius - feather), radius + feather, distanceToAxis);
     outgoingLight *= 1.0 - .44 * cueShadowFade * shade;
    }
    #include <opaque_fragment>`);
  };
  return (tip,butt,opacity)=>{
   const projection=opacity>0?shadowProjection(tip,butt,light):null;
   uniforms.cueShadowFade.value=projection?opacity:0;
   if(!projection)return;
   [uniforms.cueShadowStart.value.x,uniforms.cueShadowStart.value.y]=projection.start;
   [uniforms.cueShadowAxis.value.x,uniforms.cueShadowAxis.value.y]=projection.axis;
   uniforms.cueShadowLength.value=projection.length;
   uniforms.cueShadowWidth.value=projection.widthScale;
  };
 }
 function create(T,scene,renderer,redraw,surfaceMaterial,light){
  const group=new T.Group();scene.add(group);let current=null,ready=false;
  // Shade actual cloth fragments, so the cue shadow stops at pocket openings.
  const updateShadow=clothShadow(surfaceMaterial,light.position.toArray()),butt=new T.Vector3();
  const source=document.createElement('canvas'),sourceCtx=source.getContext('2d',{willReadFrequently:true});
  const picture=new Image();picture.onload=()=>{source.width=picture.width;source.height=picture.height;sourceCtx.drawImage(picture,0,0);makeReferenceMap();ready=true;redraw();};picture.src='./icons/approved-full-cue.png';
  const reference=document.createElement('canvas');reference.width=128;reference.height=2048;
  const referenceMap=new T.CanvasTexture(reference);referenceMap.colorSpace=T.SRGBColorSpace;referenceMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  function makeReferenceMap(){
   const raw=sourceCtx.getImageData(0,0,source.width,source.height).data,c=reference.getContext('2d'),out=c.createImageData(reference.width,reference.height);
   for(let y=0;y<out.height;y++){
    const sx=Math.round(2140-y/(out.height-1)*(2140-27));let lo=399,hi=326;
    for(let v=326;v<=399;v++)if(raw[(v*source.width+sx)*4+3]>190){lo=Math.min(lo,v);hi=Math.max(hi,v);}
    if(hi<lo){lo=hi=362;}
    for(let x=0;x<out.width;x++){const sy=Math.round((lo+hi)/2+Math.sin(x/out.width*Math.PI*2)*(hi-lo)*.37),i=(sy*source.width+sx)*4,o=(y*out.width+x)*4;out.data.set([raw[i],raw[i+1],raw[i+2],255],o);}
   }
   c.putImageData(out,0,0);referenceMap.needsUpdate=true;
  }
  const carbon=document.createElement('canvas');carbon.width=carbon.height=128;const cc=carbon.getContext('2d'),pixels=cc.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,twill=(Math.floor(x/5)+Math.floor(y/5))%4<2,v=20+(twill?12:3)+(twill?x%5:y%5)*2;pixels.data.set([v,v+1,v+3,255],i);}cc.putImageData(pixels,0,0);
  const carbonMap=new T.CanvasTexture(carbon);carbonMap.colorSpace=T.SRGBColorSpace;carbonMap.wrapS=carbonMap.wrapT=1000;carbonMap.repeat.set(4,45);carbonMap.anisotropy=8;
  const woodCanvas=document.createElement('canvas');woodCanvas.width=woodCanvas.height=512;const woodPaint=woodCanvas.getContext('2d');woodPaint.fillStyle='#6f452a';woodPaint.fillRect(0,0,512,512);const walnut=new T.CanvasTexture(woodCanvas),woodPhoto=new Image();woodPhoto.onload=()=>{woodPaint.drawImage(woodPhoto,0,0,512,512);walnut.needsUpdate=true;redraw();};woodPhoto.src='./icons/table-materials/walnut-diff.jpg';walnut.colorSpace=T.SRGBColorSpace;walnut.wrapS=walnut.wrapT=1000;walnut.repeat.set(1,3);
  const original=new T.MeshStandardMaterial({map:referenceMap,color:0xe3e3e3,roughness:.27,metalness:.12,envMapIntensity:.85});
  const maple=new T.MeshStandardMaterial({map:referenceMap,color:0xfff5d5,roughness:.39,envMapIntensity:.45});
  const fiber=new T.MeshStandardMaterial({map:carbonMap,color:0xbfc5cd,roughness:.32,metalness:.22,envMapIntensity:.8});
  const wood=new T.MeshStandardMaterial({map:walnut,color:0xaf7950,roughness:.25,envMapIntensity:.85});
  const chrome=new T.MeshStandardMaterial({color:0xbfc9d5,metalness:.93,roughness:.17,envMapIntensity:1.1});
  const ferrule=new T.MeshStandardMaterial({color:0xf5f1dc,roughness:.35}),leather=new T.MeshStandardMaterial({color:0x265c83,roughness:.87}),rubber=new T.MeshStandardMaterial({color:0x131719,roughness:.9});
  const parts=[];
  function part(profile,material,kind){
   const vertices=[],uv=[],indices=[],segments=48;
   profile.forEach(([y,r],row)=>{for(let i=0;i<=segments;i++){const angle=i/segments*Math.PI*2;vertices.push(r*Math.sin(angle),y,r*Math.cos(angle));uv.push(i/segments,1-y/LENGTH);if(row&&i<segments){const a=(row-1)*(segments+1)+i,b=a+1,c=row*(segments+1)+i,d=c+1;indices.push(a,b,d,a,d,c);}}});
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
   const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.userData.cuePart=kind;parts.push(mesh);group.add(mesh);
  }
  part([[0,0],[.0006,.0038],[.002,.0059],[.003,.006375],[.006,.006375]],leather,'tip');
  part([[.006,TIP_RADIUS],[.025,TIP_RADIUS]],ferrule,'ferrule');
  part([[.025,TIP_RADIUS],[.33,TIP_RADIUS],[.50,.0074],[.718,.0105]],maple,'shaft');
  part([[.718,.0105],[.748,.0108]],chrome,'joint');
  part([[.748,.0108],[1.05,.0132],[1.43,BUTT_RADIUS]],original,'butt');
  part([[1.43,BUTT_RADIUS],[1.455,BUTT_RADIUS]],chrome,'cap');
  part([[1.455,BUTT_RADIUS],[1.469,.0154],[LENGTH,.012],[LENGTH,0]],rubber,'bumper');
  const up=new T.Vector3(0,1,0),direction=new T.Vector3();let lastFinish='',wasVisible=false,enteredAt=0,shown=0,updatedAt=0;
  return {
   update(f){
    const data=f.cuePose,p=pose(data,f.cueStrokeTime,f.balls.find(b=>b.id===data?.id));current=p;group.visible=!!(f.showRealCue&&p?.visible);
    const now=performance.now(),dt=Math.min(.08,Math.max(0,(now-updatedAt)/1000));updatedAt=now;
    if(group.visible&&!wasVisible){enteredAt=now;shown=0;}wasVisible=group.visible;
    if(!group.visible)updateShadow(null,null,0);
    if(!p)return false;
    const entering=group.visible&&!Number.isFinite(f.cueStrokeTime)&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const progress=entering?Math.min(1,(performance.now()-enteredAt)/2400):1;
    const approach=Number.isFinite(f.cueApproachProgress)?f.cueApproachProgress:1;
    const routine=Number.isFinite(f.cueRoutineProgress)?f.cueRoutineProgress:1;
    const routinePresence=routine<.2?1-smooth(routine/.2):routine<.38?0:smooth((routine-.38)/.62);
    const desired=Math.min(progress,routinePresence);
    shown=Number.isFinite(f.cueStrokeTime)||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:shown+clamp(desired-shown,-dt*1.8,dt*1.8);
    const ease=shown*shown*(3-2*shown),withdraw=(1-ease)*.22;
    if(lastFinish!==finish){lastFinish=finish;for(const part of parts){if(part.userData.cuePart==='shaft')part.material=finish==='carbon'?fiber:maple;if(part.userData.cuePart==='butt')part.material=finish==='carbon'?fiber:finish==='wood'?wood:original;}}
    for(const material of new Set(parts.map(part=>part.material))){material.transparent=ease<1;material.opacity=ease;}
    group.position.set(p.tip[0]-f.L/2+p.back[0]*withdraw,p.tip[1]+p.back[1]*withdraw+(1-ease)*.16,p.tip[2]-f.W/2+p.back[2]*withdraw);group.quaternion.setFromUnitVectors(up,direction.fromArray(p.back));
    group.rotateZ((1-ease)*.10);
    if(group.visible){
     butt.set(0,LENGTH,0).applyQuaternion(group.quaternion).add(group.position);
     updateShadow(group.position.toArray(),butt.toArray(),ease);
    }
    return group.visible&&(progress<1||approach<1||Math.abs(shown-desired)>.001);
   },
   status(){return current?{...current,visible:group.visible,presentation:{opacity:parts[0].material.opacity,tip:group.position.toArray()},finish,referenceReady:ready,reference:'icons/approved-full-cue.png'}:null;}
  };
 }
 const api={METERS_PER_INCH,EYE_HEIGHT_INCHES,clampEyeHeight,LENGTH,TIP_RADIUS,BUTT_RADIUS,PRE_ROLL,pose,advanceTime,playerCamera,shadowProjection,create,setFinish,getFinish:()=>finish};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsCue3D=api;
})(typeof window==='object'?window:globalThis);
