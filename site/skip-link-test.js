/* Aufruf: node --test site/skip-link-test.js. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const route = '#/video/testvideo01/bericht/README.md';

function load({ hasContent = true } = {}) {
  const calls = [];
  const linker = new EventTarget();
  const container = {
    focus: options => calls.push(['focus', options.preventScroll]),
    scrollIntoView: options => calls.push(['scroll', options.block])
  };
  const location = { hash: route };
  const context = {
    window: new EventTarget(),
    location,
    document: Object.assign(new EventTarget(), {
      querySelector: selector => selector === 'a.skip[href="#inhalt"]' ? linker : null,
      getElementById: id => id === 'inhalt' && hasContent ? container : null
    })
  };
  vm.runInNewContext(source, context, { filename: 'app.js' });
  return { calls, linker, location };
}

test('Sprunglink und fokussierbares Ziel bleiben als HTML-Fallback erhalten', () => {
  assert.match(html, /<a class="skip" href="#inhalt">/);
  assert.match(html, /<main id="inhalt" tabindex="-1">/);
});

test('Aktivieren fokussiert und scrollt den Hauptinhalt ohne Routennavigation', () => {
  const { calls, linker, location } = load();
  const event = Object.assign(new Event('click', { cancelable: true }), { button: 0 });
  if (linker.dispatchEvent(event)) location.hash = '#inhalt';
  assert.equal(event.defaultPrevented, true);
  assert.equal(location.hash, route);
  assert.deepEqual(calls, [['focus', true], ['scroll', 'start']]);
});

test('Modifizierter Klick und fehlendes Ziel erhalten die Standardaktion', () => {
  for (const [options, eventOptions] of [[{}, { ctrlKey: true }], [{ hasContent: false }, {}]]) {
    const { linker, calls } = load(options);
    const event = Object.assign(new Event('click', { cancelable: true }), { button: 0 }, eventOptions);
    assert.equal(linker.dispatchEvent(event), true);
    assert.deepEqual(calls, []);
  }
});
