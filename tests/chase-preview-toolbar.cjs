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
assert.equal(button.style.left, '534.5px');
assert.equal(button.lastElementChild.hidden, false);
ids.panel = new Element('panel', 710, 290);
frame.resize();
assert.equal(button.style.left, '534.5px');
ids.panel = new Element('panel', 625, 375);
frame.resize();
assert.equal(button.style.left, '506px');
delete ids.panel;
oldWordmark = new Element();
ids.stageWrap = new Element('stageWrap', 60, 880, 52, 400);
frame.resize();
assert.equal(wordmark.style.left, '413px');
assert.equal(wordmark.style.display,'block');
assert.equal(oldWordmark.hidden,true);
assert.ok(parseFloat(button.style.left) >= 595);
ids.panel = new Element('panel', 720, 280, 30, 500);
frame.resize();
assert.equal(wordmark.style.left, '303px');
delete ids.stageWrap;
delete ids.panel;
body.classList.add('table-3d');
frame.resize();
assert.equal(button.style.left, '579.5px');
ids.workspaceTopActions.rect.left = 240;
frame.resize();
assert.equal(button.lastElementChild.hidden, true);
assert.equal(button.style.width, '44px');
body.classList.add('zen-mode');
frame.resize();
assert.equal(button.style.right, '85px');
assert.equal(button.style.width, '44px');
assert.equal(button.lastElementChild.hidden, true);
assert.equal(wordmark.style.display,'none');
button.click();
body.classList.add('play-mode');
playModal = new Element();
play = new Element();
play.href = './companion.html';
frame.resize();
assert.equal(button.style.display, 'none');
assert.equal(play.href, undefined);
assert.match(play.innerHTML, /<span>Cue Chat/);
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
