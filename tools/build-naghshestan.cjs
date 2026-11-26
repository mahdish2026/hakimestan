// Produces one portable HTML with the real Hakim core, local font and accessibility tools.
// No generated export is committed. Run: node tools/build-naghshestan.cjs
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('games/math-geometry.html');
const font=fs.readFileSync(path.join(root,'assets/fonts/vazirmatn-100-900.woff2')).toString('base64');
html=html.replace('<link rel="stylesheet" href="../css/a11y.css">',`<style id="hakim-a11y-css">${read('css/a11y.css')}</style>`);
html=html.replace('<link rel="stylesheet" href="math-geometry/style.css">',`<style>${read('games/math-geometry/style.css').replace("url('../../assets/fonts/vazirmatn-100-900.woff2')",`url('data:font/woff2;base64,${font}')`)}</style>`);
html=html.replace('<link rel="stylesheet" href="math-geometry/studio.css">',`<style>${read('games/math-geometry/studio.css')}</style>`);
html=html.replace('<link rel="stylesheet" href="math-geometry/layout.css">',`<style>${read('games/math-geometry/layout.css')}</style>`);
html=html.replace('<link rel="icon" href="../icon.svg" type="image/svg+xml">','<link rel="icon" href="data:image/svg+xml;base64,'+Buffer.from(read('icon.svg')).toString('base64')+'">');
html=html.replaceAll('href="../math-learning.html"','href="https://hakimistan.ir/math-learning.html"');
html=html.replace('<script src="../js/hakim-sw-register.js"></script>','<!-- Portable edition: no service worker registration from file://. -->');
for(const [src,file] of [['../hakim-core.js','hakim-core.js'],['math-geometry/data.js','games/math-geometry/data.js'],['math-geometry/studio.js','games/math-geometry/studio.js'],['math-geometry/tools.js','games/math-geometry/tools.js'],['math-geometry/practice.js','games/math-geometry/practice.js'],['math-geometry/skills.js','games/math-geometry/skills.js'],['math-geometry/app.js','games/math-geometry/app.js'],['math-geometry/narration.js','games/math-geometry/narration.js'],['../js/hakim-security.js','js/hakim-security.js'],['../js/hakim-a11y.js','js/hakim-a11y.js']]){
 html=html.replace(`<script src="${src}"></script>`,`<script>\n${read(file).replace(/<\/script/gi,'<\\/script')}\n</script>`);
}
const clips=['symmetry','angles','quadrilaterals','mirror','center','rotation',...Array.from({length:7},(_,i)=>'tool-'+i)];
html=html.replace('<body>','<body>'+clips.map(key=>`<template id="geometry-audio-${key}">${fs.readFileSync(path.join(root,`games/math-geometry/audio/${key}.mp3`)).toString('base64')}</template>`).join('\n'));
html=html.replace('<link rel="stylesheet" href="../css/hakim-cert.css">',()=>`<style>${read('css/hakim-cert.css')}</style>`);for(const n of ['hakim-logo','hakim-cert','hakim-map-motion'])html=html.replace(`<script src="../js/${n}.js"></script>`,()=>`<script>\n${read('js/'+n+'.js').replace(/<\/script/gi,'<\\/script')}\n</script>`);fs.mkdirSync(path.join(root,'exports'),{recursive:true});const out=path.join(root,'exports/naghshestan.html');fs.writeFileSync(out,html);console.log(out,fs.statSync(out).size+' bytes');
