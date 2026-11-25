const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/math-time-mission.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.ok(
  Buffer.byteLength(html, 'utf8') < 500 * 1024,
  'games/math-time-mission.html stays lightweight (< 500 KB) after externalizing inline media'
);

for (let stage = 1; stage <= 8; stage += 1) {
  assert.doesNotMatch(
    html,
    new RegExp(`<template id="stage-audio-${stage}">`),
    `stage ${stage} no longer embeds base64 narration inside HTML`
  );
  const relAudio = `games/audio/mission-time-stage-${stage}.mp3`;
  const source = fs.readFileSync(path.join(root, relAudio));
  assert.ok(source.length > 1000, `stage ${stage} MP3 clip is not empty`);
  assert.ok(
    source.subarray(0, 3).equals(Buffer.from('ID3')) || source[0] === 0xff,
    `stage ${stage} has a valid MP3 signature`
  );
  assert.ok(sw.includes(relAudio), `Service Worker lists ${relAudio} for offline caching`);
}

for (const artKey of ['sundial', 'waterclock', 'maragha']) {
  assert.doesNotMatch(
    html,
    new RegExp(`<template id="history-art-${artKey}">`),
    `history-art-${artKey} no longer embeds base64 JPEG inside HTML`
  );
  const imgPath = path.join(root, `assets/img/mission-time-history-${artKey}.jpg`);
  const img = fs.readFileSync(imgPath);
  assert.ok(img.length > 1000 && img[0] === 0xff && img[1] === 0xd8, `${artKey} JPEG is valid`);
}

assert.match(
  html,
  /function stageAudioSource\(index\)\{return index>=0&&index<8\?'audio\/mission-time-stage-'\+\(index\+1\)\+'\.mp3':'';\}/,
  'stage narration loads external MP3 files'
);
assert.match(
  html,
  /function historicalImageSource\(id\)\{return HISTORY_ART_PATHS\[id\]\|\|'';\}/,
  'historical artwork loads external JPEG files'
);

console.log('Time mission narration & artwork: all 8 MP3 clips and 3 historical JPEGs verified.');
