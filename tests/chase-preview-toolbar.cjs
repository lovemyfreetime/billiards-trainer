const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const java = fs.readFileSync(process.argv[2], 'utf8');
const source = java.match(/ENTRY_SCRIPT =\s*([\s\S]*?)\n\n/)[1];
const launcher = Array.from(source.matchAll(/"(?:\\.|[^"\\])*"/g), m => JSON.parse(m[0])).join('');
const messages = [];
let trainer = true;
let hasBar = true;
let button;
const bar = {append(el) { button = el; }};
const document = {
    body: {classList: {contains(name) { return trainer && name === 'trainer-workspace'; }}},
    getElementById(id) { return id === 'workspaceTools' ? (hasBar ? bar : null) : button; },
    createElement(tag) {
        assert.equal(tag, 'button');
        return {style:{}, setAttribute(k,v) { this[k] = v; }, addEventListener(k,fn) { this[k] = fn; }};
    }
};
const run = () => vm.runInNewContext(launcher, {document, window: {TrainerChasePreview: {postMessage(s) {messages.push(s); }}}});
trainer = false;
run();
assert.equal(button, undefined);
trainer = true;
hasBar = false;
run();
assert.equal(button, undefined);
hasBar = true;
run();
assert.equal(button.id, 'chase-preview-launch');
assert.match(button['aria-label'], /under construction/);
const first = button;
run();
assert.equal(button, first);
button.click();
assert.deepEqual(messages, ['open']);
console.log('6 toolbar checks passed: scope, missing toolbar, placement, label, no duplicate, and click.');
