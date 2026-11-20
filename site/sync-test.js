/*
 * Tests der Zeitsynchronisierung (site/sync.js). Ausführen: node --test site/sync-test.js
 * Wird nicht auf der Webseite veröffentlicht. Nutzt nur Node-Bordmittel.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('./sync.js');

const occ = (id, start, end, precision = 'Ungefähr') => ({ id, startSeconds: start, endSeconds: end, precision });
const claim = (id, ...occurrences) => ({ id, occurrences });

/* Nachbildung typischer Fälle aus aussagen.json: Überlappung, Wiederholung, Punktmarke. */
const CLAIMS = [
  claim('A', occ('O1', 0, 2)),
  claim('B', occ('O2', 1, 5)),                       // überlappt mit A
  claim('C', occ('O3', 100, 110), occ('O4', 30, 36)), // Wiederholung, Reihenfolge in den Daten nicht chronologisch
  claim('D', occ('O5', 60, 60, 'Kontrolliert'))       // Punktmarke, genau
];

test('Zeitleiste: jede Fundstelle ein Eintrag, chronologisch sortiert', () => {
  const tl = S.buildTimeline(CLAIMS);
  assert.deepEqual(tl.entries.map(e => e.key), ['O1', 'O2', 'O4', 'O5', 'O3']);
  const rep = tl.entries.filter(e => e.claimId === 'C');
  assert.deepEqual(rep.map(e => [e.index, e.count]), [[2, 2], [1, 2]]);
  assert.equal(tl.untimed.length, 0);
});

test('Zeitleiste: Zeiten werden nicht verändert oder erfunden', () => {
  const tl = S.buildTimeline(CLAIMS);
  const o4 = tl.entries.find(e => e.key === 'O4');
  assert.equal(o4.start, 30); assert.equal(o4.end, 36); assert.equal(o4.precision, 'Ungefähr');
});

test('Ungültige oder unklare Zeitmarken werden sichtbar markiert', () => {
  const tl = S.buildTimeline([
    claim('X', occ('N1', null, 10), occ('N2', 'abc', 10), occ('N3', -5, 3)),
    claim('Y', occ('E1', 50, null), occ('E2', 80, 70), occ('E3', 9999, 10000), occ('E4', 5, 6, 'Irgendwas'))
  ], { durationSeconds: 1000 });
  assert.deepEqual(tl.untimed.map(e => e.key), ['N1', 'N2', 'N3']);
  tl.untimed.forEach(e => assert.deepEqual(e.issues, ['ohne-zeitmarke']));
  const by = Object.fromEntries(tl.entries.map(e => [e.key, e]));
  assert.deepEqual(by.E1.issues, ['ohne-ende']); assert.equal(by.E1.end, 50);
  assert.deepEqual(by.E2.issues, ['ende-vor-start']); assert.equal(by.E2.end, 80);
  assert.deepEqual(by.E3.issues, ['ausserhalb-laufzeit']);
  assert.deepEqual(by.E4.issues, ['unbekannte-praezision']); assert.equal(by.E4.tolerance, 5);
  for (const k of Object.keys(S.ISSUE_TEXT)) assert.ok(S.ISSUE_TEXT[k].length > 10);
  for (const k of ['dauer', 'dauer-unbekannt', 'anfang']) assert.ok(S.BASIS_REASON[k].length > 10);
});

test('Synchronisation: genaue Treffer innerhalb des Bereichs', () => {
  const tl = S.buildTimeline(CLAIMS);
  const at = t => S.matchAt(tl, t).filter(m => m.match === 'genau').map(m => m.entry.key);
  assert.deepEqual(at(0), ['O1']);
  assert.deepEqual(at(1.5), ['O1', 'O2']); // Überlappung: beide gleichzeitig
  assert.deepEqual(at(2), ['O2']);         // Ende exklusiv
  assert.deepEqual(at(33), ['O4']);
  assert.deepEqual(at(60.5), ['O5']);      // Punktmarke gilt eine Sekunde
  assert.deepEqual(at(105), ['O3']);       // zweites Vorkommen derselben Aussage
});

test('Ungenaue Zeitmarken: Toleranzbereich nur als „nahe“, je nach Präzision', () => {
  const tl = S.buildTimeline(CLAIMS);
  const m = t => S.matchAt(tl, t).map(x => x.entry.key + ':' + x.match);
  assert.deepEqual(m(26), ['O4:nahe']);   // 4 s vor ungefährem Beginn
  assert.deepEqual(m(24.9), []);          // außerhalb ±5 s
  assert.deepEqual(m(40.5), ['O4:nahe']); // kurz nach Ende
  assert.deepEqual(m(41), []);
  assert.deepEqual(m(59.2), ['O5:nahe']); // kontrolliert: nur ±1 s
  assert.deepEqual(m(58.9), []);
  assert.deepEqual(m(6), ['O1:nahe', 'O2:nahe']);
  // genaue Treffer stehen vor nahen
  assert.deepEqual(m(3), ['O2:genau', 'O1:nahe']);
});

test('Keine Zuordnung: leere Liste und nächste Fundstelle', () => {
  const tl = S.buildTimeline(CLAIMS);
  assert.deepEqual(S.matchAt(tl, 80), []);
  assert.equal(S.nextAfter(tl, 80).key, 'O3');
  assert.equal(S.nextAfter(tl, 200), null);
  assert.deepEqual(S.matchAt(tl, NaN), []);
  assert.deepEqual(S.matchAt(tl, -1), []);
});

/* Gesteuerte Uhr, Timer und Player für den Controller. Hauptvideo: 200 s. */
function harness(claims = CLAIMS, opts = {}) {
  const tl = S.buildTimeline(claims);
  const env = { t: 0, now: 0, rate: 1, dur: 200, timers: new Map(), nextId: 1, updates: [] };
  const ctl = new S.SyncController(tl, Object.assign({
    getTime: () => env.t,
    getRate: () => env.rate,
    getDuration: () => env.dur,
    expectedDuration: 200,
    now: () => env.now,
    setInterval: (f, ms) => { const id = env.nextId++; env.timers.set(id, { f, ms }); return id; },
    clearInterval: id => env.timers.delete(id),
    onUpdate: i => env.updates.push(i)
  }, opts));
  env.advance = (ms, playing = true) => {
    // simuliert verstrichene Zeit und lässt den aktiven Timer feuern
    env.now += ms; if (playing) env.t += ms / 1000 * env.rate;
    for (const { f } of env.timers.values()) f();
  };
  // mehrere Abfragen im 250-ms-Takt
  env.play = (ms, playing = true) => { for (let i = 0; i < ms / 250; i++) env.advance(250, playing); };
  env.last = () => env.updates[env.updates.length - 1];
  env.keys = () => env.last().matches.filter(m => m.match === 'genau').map(m => m.entry.key);
  env.interval = () => [...env.timers.values()].map(x => x.ms);
  return { ctl, env };
}

test('Wiedergabe: fortlaufende Aktualisierung, Änderung nur beim Wechsel', () => {
  const { ctl, env } = harness();
  env.t = 28; ctl.setState('playing');
  assert.deepEqual(env.interval(), [250]);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.last().matches.map(m => m.entry.key + ':' + m.match), ['O4:nahe']);
  env.advance(250);
  assert.equal(env.last().changed, false);
  assert.equal(env.last().seeked, false);
  env.play(2000); // jetzt 30.25 s
  assert.deepEqual(env.keys(), ['O4']);
  assert.ok(env.updates.some(u => u.changed && u.matches[0]?.match === 'genau'));
});

test('Pause: langsamere Abfrage, keine Seek-Fehlmeldung, Zeit bleibt', () => {
  const { ctl, env } = harness();
  env.t = 31; ctl.setState('playing');
  env.advance(250);
  ctl.setState('paused');
  assert.deepEqual(env.interval(), [1000]);
  assert.equal(env.last().state, 'paused');
  assert.equal(env.last().changed, true); // Zustandswechsel
  env.advance(5000, false);
  assert.equal(env.last().seeked, false);
  assert.equal(env.last().changed, false);
  assert.equal(env.last().time, 31.25);
  assert.equal(env.last().basis, 'ok');
});

test('Seek über die YouTube-Bedienung: kurz geprüft, dann übernommen (vor, zurück, groß, pausiert)', () => {
  const { ctl, env } = harness();
  env.t = 10; ctl.setState('playing'); env.advance(250);
  env.t = 103; env.advance(250, false);          // großer Sprung nach vorn
  assert.equal(env.last().basis, 'pruefung');
  assert.equal(env.last().time, 10.25);          // Anzeige bleibt zunächst
  env.play(1000);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O3']);
  assert.ok(env.updates.some(u => u.seeked));
  env.t = 32; env.advance(250, false);           // zurück
  env.play(1250);
  assert.deepEqual(env.keys(), ['O4']);
  ctl.setState('paused');
  env.t = 150; env.advance(1000, false);         // Ziehen im Pausenzustand
  assert.equal(env.last().basis, 'pruefung');
  env.advance(1000, false);
  assert.equal(env.last().basis, 'ok');
  assert.equal(env.last().time, 150);
});

test('Seek durch Klick in der Liste: sofort übernommen, auch an den Anfang', () => {
  const { ctl, env } = harness();
  env.t = 100; ctl.setState('playing');
  ctl.markSeek(60);
  assert.equal(env.last().time, 60);
  assert.equal(env.last().seeked, true);
  assert.deepEqual(env.keys(), ['O5']);
  ctl.markSeek(0);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O1']);
});

test('Werbung mit eigenem Zähler und eigener Dauer: Anzeige hält, danach Fortsetzung', () => {
  const { ctl, env } = harness();
  env.t = 30; ctl.setState('playing'); env.play(1000); // 31 s, O4 aktiv
  assert.deepEqual(env.keys(), ['O4']);
  const changesBefore = env.updates.filter(u => u.changed).length;
  env.t = 0; env.dur = 15;                         // Werbung beginnt bei 0, Dauer 15 s
  env.play(15000);                                 // Zähler läuft 15 s durch
  const during = env.updates.slice(-60);
  assert.ok(during.every(u => u.basis === 'unklar' && u.reason === 'dauer'));
  assert.ok(during.every(u => u.time === 31));     // keine wechselnden Faktenchecks
  assert.ok(env.updates.filter(u => u.changed).length - changesBefore <= 1);
  env.t = 31; env.dur = 200;                       // Hauptvideo geht an alter Stelle weiter
  env.advance(250);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O4']);
  env.play(5000);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), []);
});

test('Werbung ohne abweichende Dauer, Zähler ab 0: kein automatisches Übernehmen', () => {
  const { ctl, env } = harness();
  env.t = 103; ctl.setState('playing'); env.play(500);
  env.t = 0;                                       // Zähler springt auf 0, Dauer bleibt 200
  env.play(20000);                                 // läuft 20 s weiter
  assert.equal(env.last().basis, 'unklar');
  assert.equal(env.last().reason, 'anfang');
  assert.ok(env.last().time > 103 && env.last().time < 104);
  env.t = 103.6; env.advance(250);                 // Hauptvideo zurück an alter Stelle
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O3']);
});

test('Werbung, nach der YouTube an anderer Stelle fortsetzt: Prüfung, dann Übernahme', () => {
  const { ctl, env } = harness();
  env.t = 31; ctl.setState('playing'); env.play(500);
  env.t = 0; env.dur = 20; env.play(5000);
  assert.equal(env.last().basis, 'unklar');
  env.t = 100; env.dur = 200; env.advance(250, false);
  assert.equal(env.last().basis, 'pruefung');
  env.play(1250);
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O3']);
});

test('Vorab-Werbung vor dem Hauptvideo: Hauptvideo wird erkannt, sobald die Dauer passt', () => {
  const { ctl, env } = harness();
  env.dur = 12; env.t = 0; ctl.setState('playing');
  env.play(12000);
  assert.equal(env.last().basis, 'unklar');
  env.t = 0; env.dur = 200; env.advance(250, false);
  assert.equal(env.last().basis, 'ok');
  env.play(1000);
  assert.deepEqual(env.keys(), ['O1', 'O2']);
});

test('Unbekannte Dauer: unerklärter Sprung bleibt unklar, Nutzer kann übernehmen', () => {
  const { ctl, env } = harness();
  env.dur = NaN; env.t = 30; ctl.setState('playing'); env.play(500);
  assert.equal(env.last().basis, 'ok');
  env.t = 100; env.play(5000);
  assert.equal(env.last().basis, 'unklar');
  assert.equal(env.last().reason, 'dauer-unbekannt');
  assert.equal(env.last().time, 30.5);
  ctl.acceptCurrent();
  assert.equal(env.last().basis, 'ok');
  assert.deepEqual(env.keys(), ['O3']);
});

test('Synchronisierung manuell anhalten und fortsetzen', () => {
  const { ctl, env } = harness();
  env.t = 31; ctl.setState('playing'); env.play(500);
  ctl.setHold(true);
  assert.equal(env.last().basis, 'angehalten');
  env.t = 100; env.play(3000);
  assert.ok(env.updates.slice(-12).every(u => u.basis === 'angehalten' && u.time === 31.5));
  ctl.setHold(false);                               // Fortsetzen übernimmt die aktuelle Zeit
  assert.equal(env.last().basis, 'ok');
  assert.ok(env.last().time >= 103);
  // Fortsetzen während abweichender Dauer bleibt unklar
  ctl.setHold(true); env.dur = 15; env.t = 2; ctl.setHold(false);
  assert.equal(env.last().basis, 'unklar');
  // Klick in der Liste wirkt auch im angehaltenen Zustand
  ctl.setHold(true); env.dur = 200; ctl.markSeek(60);
  assert.deepEqual(env.keys(), ['O5']);
});

test('Pufferung und doppelte Geschwindigkeit lösen keinen falschen Sprung aus', () => {
  const { ctl, env } = harness();
  env.t = 10; ctl.setState('playing');
  env.advance(250);
  env.advance(3000, false); // Zeit bleibt stehen (Puffer), Uhr läuft weiter
  assert.equal(env.last().basis, 'ok');
  assert.equal(env.last().seeked, false);
  env.rate = 2; env.play(2000);
  assert.equal(env.last().basis, 'ok');
  assert.equal(env.last().seeked, false);
  assert.ok(Math.abs(env.last().time - 14.25) < 0.01);
});

test('Videoende und Fehler beenden die Abfrage; destroy räumt auf', () => {
  const { ctl, env } = harness();
  env.t = 5; ctl.setState('playing');
  ctl.setState('ended');
  assert.deepEqual(env.interval(), []);
  assert.equal(env.last().state, 'ended');
  ctl.setState('playing');
  assert.deepEqual(env.interval(), [250]);
  ctl.setState('error');
  assert.deepEqual(env.interval(), []);
  ctl.setState('playing');
  ctl.destroy();
  assert.deepEqual(env.interval(), []);
  const n = env.updates.length;
  ctl.setState('playing'); ctl.tick(); ctl.markSeek(3); ctl.setHold(true); ctl.acceptCurrent();
  assert.equal(env.updates.length, n);
});

test('Ungültige Playerzeit fällt auf die letzte bestätigte Zeit zurück', () => {
  const { ctl, env } = harness();
  env.t = 33; ctl.setState('paused');
  env.t = NaN; env.advance(1000, false);
  assert.equal(env.last().time, 33);
  assert.equal(env.last().basis, 'ok');
});

test('Ohne Laufzeitangabe in den Daten bleibt die Synchronisierung nutzbar', () => {
  const { ctl, env } = harness(CLAIMS, { expectedDuration: null });
  env.t = 30; ctl.setState('playing'); env.play(500);
  assert.deepEqual(env.keys(), ['O4']);
  ctl.markSeek(100);
  assert.deepEqual(env.keys(), ['O3']);
});

test('Hilfsfunktionen: Zustände, Fehlertexte, Video-ID', () => {
  assert.equal(S.stateName(1), 'playing');
  assert.equal(S.stateName(0), 'ended');
  assert.equal(S.stateName(2), 'paused');
  assert.equal(S.stateName(-1), 'unstarted');
  assert.equal(S.stateName(99), 'unstarted');
  assert.match(S.errorText(150), /Einbettung/);
  assert.match(S.errorText(101), /Einbettung/);
  assert.match(S.errorText(100), /nicht gefunden/);
  assert.equal(S.youtubeId('https://www.youtube.com/watch?v=mlxFA9T88I0'), 'mlxFA9T88I0');
  assert.equal(S.youtubeId('https://youtu.be/mlxFA9T88I0?t=3'), 'mlxFA9T88I0');
  assert.equal(S.youtubeId('https://www.youtube.com/watch?feature=x&v=mlxFA9T88I0'), 'mlxFA9T88I0');
  assert.equal(S.youtubeId('http://www.youtube.com/watch?v=mlxFA9T88I0'), null);
  assert.equal(S.youtubeId('https://evil.example/watch?v=mlxFA9T88I0'), null);
  assert.equal(S.youtubeId('https://www.youtube.com/watch?v=mlxFA9T88I0"><script>'), null);
  assert.equal(S.youtubeId('https://www.youtube.com/watch?v=short'), null);
  // YouTube Shorts (docs/SHORTS.md)
  assert.equal(S.youtubeId('https://www.youtube.com/shorts/gVQeb83GHDQ'), 'gVQeb83GHDQ');
  assert.equal(S.youtubeId('https://youtube.com/shorts/gVQeb83GHDQ?si=abc'), 'gVQeb83GHDQ');
  assert.equal(S.youtubeId('https://m.youtube.com/shorts/gVQeb83GHDQ/'), 'gVQeb83GHDQ');
  assert.equal(S.youtubeId('http://www.youtube.com/shorts/gVQeb83GHDQ'), null);
  assert.equal(S.youtubeId('https://www.youtube.com/shorts/gVQeb83GHDQx'), null);
  assert.equal(S.youtubeId('https://evil.example/shorts/gVQeb83GHDQ'), null);
});

test('Echte Projektdaten: alle Fundstellen synchronisierbar, Überlappung und Wiederholung vorhanden', () => {
  const dir = path.join(__dirname, '..', 'faktenchecks');
  const ids = fs.readdirSync(dir).filter(id => fs.existsSync(path.join(dir, id, 'strukturiert', 'aussagen.json')));
  assert.ok(ids.length > 0);
  for (const id of ids) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, id, 'strukturiert', 'aussagen.json'), 'utf8'));
    const tl = S.buildTimeline(d.claims, { durationSeconds: d.scope.durationSeconds });
    const occCount = d.claims.reduce((n, c) => n + c.occurrences.length, 0);
    assert.equal(tl.entries.length + tl.untimed.length, occCount, id);
    assert.equal(tl.untimed.length, 0, id + ': Fundstellen ohne Zeitmarke');
    for (const e of tl.entries) assert.deepEqual(e.issues, [], id + ' ' + e.key);
    assert.equal(S.youtubeId(d.scope.videoUrl), d.scope.videoId, id);
    if (id === 'mlxFA9T88I0') {
      const at = t => S.matchAt(tl, t).filter(m => m.match === 'genau').map(m => m.entry.claimId.slice(-5));
      assert.deepEqual(at(1.5), ['A0011', 'A0012']); // überlappende Aussagen im Auftakt
      const rep = tl.entries.filter(e => e.claimId.endsWith('A0007'));
      assert.equal(rep.length, 2);                    // Teaser und Hauptstelle
      assert.deepEqual(at(32), ['A0007']);
    }
  }
});
