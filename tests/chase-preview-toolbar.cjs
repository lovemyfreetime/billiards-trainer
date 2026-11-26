const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const java = fs.readFileSync(process.argv[2], 'utf8');
function source(name) {
    const literal = java.match(new RegExp(name + ' =\\s*([\\s\\S]*?)\\n\\n'))[1];
    return Array.from(literal.matchAll(/"(?:\\.|[^"\\])*"/g), m => JSON.parse(m[0])).join('');
}
class Element {
    constructor(id = '', left = 0, width = 0, top = 8, height = 44) {
        this.id = id;
        this.children = [];
        this.dataset = {};
        this.style = {};
        this.rect = {left, width, top, height, right:left+width, bottom:top+height};
    }
    append(el) {
        if(el.parentNode) el.parentNode.children = el.parentNode.children.filter(x=>x!==el);
        el.parentNode = this;
        this.children.push(el);
    }
    get lastElementChild() { return this.label ||= new Element(); }
    getBoundingClientRect() { return this.rect; }
    setAttribute(key, value) { this[key] = value; }
    getAttribute(key) { return this[key]; }
    removeAttribute(key) { delete this[key]; }
    addEventListener(key, fn) { this[key] = fn; }
}
const messages = [];
const body = new Element();
const frame = new Element();
const ids = {
    workspaceTools:new Element('workspaceTools', 10, 960),
    workspaceTopActions:new Element('workspaceTopActions', 830, 140),
    appDisplayControl:new Element('appDisplayControl', 920, 40),
    appCloseControl:new Element('appCloseControl', 960, 40)
};
ids.workspaceTools.append(new Element('workspace-picker', 80, 66));
ids.workspaceTools.append(ids.workspaceTopActions);
let play, playModal, playNav, oldWordmark;
body.classList = new Set(['trainer-workspace']);
body.classList.contains = body.classList.has;
const document = {
    body,
    getElementById(id) { return ids[id]; },
    querySelector(selector) {
        if (selector === '.play-home-companion') return play;
        if (selector.includes('#playDialog')) return playModal;
        if (selector === '.play-footer nav') return playNav;
        if (selector === '#panel .btg-pool-title h1') return oldWordmark;
        assert.fail(selector);
    },
    createElement(tag) { assert.ok(tag === 'button' || tag === 'div'); return new Element(); },
    addEventListener(key, fn) { frame[key] = fn; }
};
const window = {
    TrainerChasePreview:{postMessage(s) {messages.push(s);}},
    requestAnimationFrame(fn) { fn(); },
    addEventListener(key, fn) { frame[key] = fn; }
};
class MutationObserver { observe() {} }
const run = () => vm.runInNewContext(source('ENTRY_SCRIPT'), {
    document, window, MutationObserver, innerWidth:1000, getComputedStyle:()=>({})
});
run();
const [button, wordmark] = body.children;
assert.equal(button.id, 'cue-chat-launch');
assert.equal(button['aria-label'], 'Cue Chat');
assert.match(button.innerHTML, /data:image\/webp;base64,.*<span>Cue Chat/);
assert.equal(button.style.left, '678px');
assert.equal(button.lastElementChild.hidden, false);
ids.panel = new Element('panel', 710, 290);
frame.resize();
assert.equal(button.style.left, '558px');
ids.panel = new Element('panel', 625, 375);
frame.resize();
assert.equal(button.style.left, '473px');
delete ids.panel;
oldWordmark = new Element();
ids.stageWrap = new Element('stageWrap', 60, 880, 52, 400);
frame.resize();
assert.equal(wordmark.style.left, '388px');
assert.equal(wordmark.style.display,'block');
assert.equal(oldWordmark.hidden,true);
assert.ok(parseFloat(button.style.left) >= 595);
ids.panel = new Element('panel', 720, 280, 30, 500);
frame.resize();
assert.equal(wordmark.style.left, '278px');
delete ids.stageWrap;
delete ids.panel;
body.classList.add('table-3d');
frame.resize();
assert.equal(button.style.left, '678px');
ids.workspaceTopActions.rect.left = 240;
frame.resize();
assert.equal(button.lastElementChild.hidden, true);
assert.equal(button.style.width, '44px');
body.classList.add('zen-mode');
ids.zenModeMenu = new Element('zenModeMenu');
ids.zenModeBtn = new Element('zenModeBtn');
ids.zenModeBtn.setAttribute('aria-expanded','true');
ids.zenModeBtn.click = () => ids.zenModeBtn.setAttribute('aria-expanded','false');
frame.resize();
assert.equal(button.parentNode, ids.zenModeMenu);
assert.equal(ids.zenModeMenu.style.width, '222px');
assert.equal(button.style.width, '48px');
assert.equal(button.lastElementChild.hidden, true);
assert.equal(wordmark.style.display,'none');
button.click();
assert.equal(ids.zenModeBtn.getAttribute('aria-expanded'),'false');
body.classList.add('play-mode');
playModal = new Element();
play = new Element();
play.href = './companion.html';
frame.resize();
assert.equal(button.style.display, 'none');
assert.equal(play.href, undefined);
assert.match(play.innerHTML, /46px\)\/1\.1 Georgia,serif">Cue Chat/);
assert.doesNotMatch(play.innerHTML,/Chat with Chase/);
assert.equal(play.style.justifyContent,'center');
play.click = () => play.onclick({preventDefault(){}});
play.onkeydown({key:'Enter', preventDefault(){}});
play = null;
frame.resize();
assert.equal(button.parentNode, playModal);
assert.equal(button.style.display, 'inline-flex');
playModal = null;
playNav = new Element();
frame.resize();
assert.equal(button.parentNode, playNav);
assert.equal(button.style.position, 'static');
run();
assert.equal(body.children.length, 1);
assert.deepEqual(messages, ['open','open']);
console.log('Cue Chat placements passed for 2D, open sidebar, 3D, compact, Zen, and Play.');

const speech = {
    'private-coach': new Element(),
    'coach-input': new Element(),
    'coach-mic': new Element(),
    'coach-voice-send': new Element(),
    'coach-voice-status': new Element()
};
speech['private-coach'].open = true;
const input = speech['coach-input'], mic = speech['coach-mic'], send = speech['coach-voice-send'];
let submits = 0, events = 0;
input.value = 'APA';
input.maxLength = 1800;
input.form = {requestSubmit() { submits++; }};
input.dispatchEvent = () => events++;
mic.disabled = send.disabled = true;
window.CueChatDictation = {postMessage(s) {messages.push(s);}};
vm.runInNewContext(source('DICTATION_SCRIPT'), {document:{getElementById:id=>speech[id]},window,MutationObserver,Event});
assert.equal(mic.disabled, false);
assert.equal(send.disabled, false);
const click = isTrusted => mic.click({isTrusted, preventDefault(){}, stopImmediatePropagation(){}});
click(false);
assert.equal(messages.length, 2);
click(true);
click(true);
assert.equal(messages.length, 3);
window.cueChatDictationResult('  8-ball  ', false);
assert.equal(input.value, 'APA 8-ball');
assert.equal(submits, 0);
send.checked = true;
input.value = '';
click(true);
window.cueChatDictationResult('APA 8-ball rules', false);
assert.equal(submits, 1);
assert.equal(events, 2);
click(true);
speech['private-coach'].open = false;
window.cueChatDictationResult('stale', false);
assert.equal(input.value, 'APA 8-ball rules');
assert.equal(submits, 1);
speech['private-coach'].open = true;
click(true);
window.cueChatDictationResult('', true);
assert.match(speech['coach-voice-status'].textContent, /keyboard mic/);
console.log('Android dictation script passed for draft, opt-in auto-send, hidden dialog, and keyboard fallback.');

{
const pickerSource = source('TRAINER_PICKER_SCRIPT');
let viewport = 1280;
const index = new Map();
const recorded = [];
const shortcuts = new Map();
let nextUrl = 0;
let photoFile;
const listeners = {};
class DOM {
    constructor(tag) {
        this.tagName = tag;
        this.style = {};
        this.attrs = {};
        this.events = {};
        this.children = [];
        this.flags = new Set();
        this.classList = {contains:name=>this.flags.has(name)};
        this.disabled = false;
        this.open = false;
    }
    set id(v) { this._id = v; index.set(v,this); }
    get id() { return this._id; }
    get nextElementSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]; }
    append(...elements) { elements.forEach(el=>{el.remove();el.parentNode=this;this.children.push(el);}); }
    after(el) { el.remove(); el.parentNode=this.parentNode; this.parentNode.children.splice(this.parentNode.children.indexOf(this)+1,0,el); }
    remove() { if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(el=>el!==this);this.parentNode=null;} }
    querySelector(s) { if(s.includes('summary'))return this.children.find(el=>el.tagName==='summary');return this.children.find(el=>el.className==='sectionToggle'); }
    contains(el) { return this===el || this.children.some(c=>c.contains(el)); }
    closest() { return this.parentNode; }
    setAttribute(k,v) { this.attrs[k]=v; }
    removeAttribute(k) { delete this.attrs[k];delete this[k]; }
    addEventListener(k,fn) { (this.events[k] ||= []).push(fn); }
    fire(k,event={}) { for(const fn of this.events[k]||[]) fn(event); }
    click() { if(this.disabled)return;this.fire('click');if(this.tagName==='summary'){this.parentNode.open=!this.parentNode.open;this.parentNode.fire('toggle');} }
    dispatchEvent(event) { this.fire(event.type,event); }
    focus() { this.focused=true; }
    showModal() { this.open=true; }
    close() { this.open=false;this.fire('close'); }
    scrollIntoView() { this.scrolled=true; }
    pause() { this.paused=true; }
    load() {}
    getBoundingClientRect() {
        if(this.parentNode?.id==='cue-trainer-picker') {
            const start = anchor.getBoundingClientRect().right+6+parseFloat(this.parentNode.style.marginInlineStart||'0');
            return {left:start,right:start+anchor.rect.width,width:anchor.rect.width,top:8};
        }
        return this.rect;
    }
}
const doc = {body:new DOM('body'),head:new DOM('head'),getElementById:k=>index.get(k),createElement(tag){
    const el=new DOM(tag);
    if(tag==='canvas'){
        el.getContext=()=>({drawImage(...args){recorded.push(['frame',...args.slice(1)]);}});
        el.toBlob=fn=>fn(new Blob(['frame'],{type:'image/png'}));
    }
    return el;
},addEventListener:(k,v)=>(listeners[k] ||= []).push(v)};
const nav = new DOM('nav'), mode = new DOM('button'), original = new DOM('details'), anchor = new DOM('summary');
nav.id='workspaceTools';mode.id='table3DToggle';original.id='workspace-picker';
mode.rect={right:106};anchor.rect={left:162,right:208,width:46,top:8};
doc.body.append(nav);nav.append(mode,original);original.append(anchor);
for(const id of ['quickLayoutRecall','analyzePhotoBtn','photoFileInput','phoneControls','captureSection','trainerClipTools','trainerClipArm']){
    const el=new DOM('button');el.id=id;shortcuts.set(id,el);
    el.addEventListener('click',()=>recorded.push([id]));
}
const capture=shortcuts.get('captureSection'),captureToggle=new DOM('button'),recordView=new DOM('details');
captureToggle.className='sectionToggle';
captureToggle.addEventListener('click',()=>capture.flags.add('open'));
capture.append(captureToggle,recordView);
recordView.append(shortcuts.get('trainerClipArm'));
shortcuts.get('photoFileInput').addEventListener('change',()=>{photoFile=shortcuts.get('photoFileInput').files[0];});
doc.body.flags.add('phone-layout');
const window={};
const env={window,document:doc,get innerWidth(){return viewport;},getComputedStyle:()=>({columnGap:'6px'}),
    requestAnimationFrame:fn=>fn(),Blob,File,Event,
    URL:{createObjectURL:()=>('blob:test'+(++nextUrl)),revokeObjectURL:url=>recorded.push(['revoke',url])},
    DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)};}}
};
vm.runInNewContext(pickerSource,env);
const install=()=>window.installCueTrainerPicker(nav);
install();
const picker=index.get('cue-trainer-picker'),summary=picker.children[0],fan=index.get('cue-trainer-fan');
assert.equal(original.nextElementSibling,picker);
assert.equal(summary.attrs['aria-label'],'Send to Trainer');
assert.equal(+parseFloat(picker.style.marginInlineStart)+6, anchor.rect.left-mode.rect.right);
install();
assert.equal(nav.children.filter(e=>e.id===picker.id).length,1);
const px = value => parseFloat(value);
const checkSpace = () => {
    const oldFanRight = (anchor.rect.left+anchor.rect.right)/2+(anchor.rect.width+6)+anchor.rect.width/2;
    assert.ok(summary.getBoundingClientRect().left>=oldFanRight+4);
    assert.ok(px(fan.style.left)>=anchor.rect.right+4);
    assert.ok(px(fan.style.left)+px(fan.style.width)<=viewport);
    const boxes=fan.children.map(el=>({x:px(el.style.left),y:px(el.style.top),w:px(el.style.width)}));
    boxes.forEach((a,i)=>boxes.slice(i+1).forEach(b=>{
        assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.w+1e-6,'menu targets overlap');
    }));
};
anchor.click();
assert.equal(original.open,true);
summary.click();
assert.equal(original.open,false);
assert.equal(picker.open,true);
checkSpace();
anchor.click();
assert.equal(original.open,true);
assert.equal(picker.open,false);
summary.click();
for(const width of [1280,844,700,600,390,320]){
    viewport=width;
    if(width===320){mode.rect={right:92};anchor.rect={left:142,right:182,width:40,top:8};}
    install();
    checkSpace();
}
listeners.keydown[0]({key:'Escape',preventDefault(){}});
assert.equal(picker.open,false);assert.equal(summary.focused,true);
summary.click();
listeners.pointerdown[0]({target:mode});
assert.equal(picker.open,false);
const choose = i => { if(!picker.open)summary.click(); fan.children[i].click();assert.equal(picker.open,false); };
choose(0);choose(1);choose(3);
assert.deepEqual(recorded.slice(0,3),[['quickLayoutRecall'],['analyzePhotoBtn'],['phoneControls']]);
assert.equal(capture.flags.has('open'),true);
assert.equal(recordView.open,true);
assert.equal(shortcuts.get('trainerClipTools').scrolled,true);
assert.equal(recorded.some(e=>e[0]==='trainerClipArm'),false);
choose(2);
const clip = doc.body.children.find(el=>el.tagName==='dialog');
const file = clip.children.find(el=>el.tagName==='input'), video=clip.children.find(el=>el.tagName==='video');
const use=clip.children.at(-1).children[1];
assert.equal(file.accept,'video/*');
assert.equal(use.disabled,true);
file.files=[new File(['test-video'],'pool.mp4',{type:'video/mp4'})];file.fire('change');
video.readyState=2;video.videoWidth=3840;video.videoHeight=2160;video.fire('loadeddata');
assert.equal(use.disabled,false);
video.seeking=true;video.fire('seeking');assert.equal(use.disabled,true);
video.seeking=false;video.fire('seeked');use.click();
assert.equal(photoFile.name,'video-frame.png');
assert.equal(photoFile.type,'image/png');
assert.deepEqual(recorded.find(e=>e[0]==='frame'),['frame',0,0,2048,1152]);
assert.equal(clip.open,false);
assert.deepEqual(recorded.filter(e=>e[0]==='revoke'),[['revoke','blob:test1']]);
console.log('Trainer picker passed: equal gap, no covered launchers or options at six widths, one picker at a time, keyboard/dismiss behavior, and all four actions.');
}
