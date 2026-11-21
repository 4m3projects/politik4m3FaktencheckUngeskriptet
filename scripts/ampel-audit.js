#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { audit } = require('../site/pruefstand.js');

function report(root) {
  const base = path.join(root, 'faktenchecks');
  if (!fs.existsSync(base)) return [];
  const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  return fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory() && /^[A-Za-z0-9_-]{11}$/.test(e.name)).map(e => {
    const dir = path.join(base, e.name);
    const video = read(path.join(dir, 'video.json'));
    const data = read(path.join(dir, 'strukturiert', 'aussagen.json'));
    const a = audit(data, video);
    return { id: e.name, title: video?.title || e.name, ampel: a.rating.key, reliable: a.rating.reliable,
      reason: a.rating.reason, blockers: a.blockers, pending: a.pending.map(c => ({ id: c.id, status: c.status,
        attribution: c.attribution?.creatorStance || null, nextSteps: c.openQuestions || [] })) };
  });
}
if (require.main === module) {
  const rows = report(path.join(__dirname, '..'));
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log(`${rows.length} Videos: ${rows.filter(r => r.reliable).length} farbige Ampeln, ${rows.filter(r => !r.reliable).length} grau.`);
    for (const r of rows) {
      console.log(`${r.id} · ${r.ampel} · ${r.pending.length} erfasste offene Einzelprüfungen`);
      for (const b of r.blockers) console.log(`  ${b.text}`);
    }
  }
}
module.exports = { report };
