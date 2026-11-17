const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/math-time-mission.html'), 'utf8');

for (let stage = 1; stage <= 8; stage += 1) {
  const match = html.match(new RegExp(`<template id="stage-audio-${stage}">([A-Za-z0-9+/=]+)</template>`));
  assert.ok(match, `stage ${stage} has an embedded narration clip`);
  const embedded = Buffer.from(match[1], 'base64');
  const source = fs.readFileSync(path.join(root, `games/audio/mission-time-stage-${stage}.mp3`));
  assert.deepEqual(embedded, source, `stage ${stage} embedded clip matches its MP3 source`);
  assert.ok(embedded.length > 1000, `stage ${stage} clip is not empty`);
  assert.ok(embedded.subarray(0, 3).equals(Buffer.from('ID3')) || embedded[0] === 0xff,
    `stage ${stage} has an MP3 signature`);
}

assert.match(html, /function stageAudioSource\(index\)[\s\S]*stage-audio-/,
  'stage narration reads from the embedded stage templates');
console.log('Time mission narration: all 8 embedded MP3 clips match their source files.');
