// Dependency-free local preview server. Not intended for production hosting.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = fs.realpathSync(path.resolve(__dirname, '..'));
const port = Number(process.argv[2] || 8080);
const host = process.argv[3] || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: node tools/serve.cjs [port] [host]');
  process.exit(1);
}
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.cjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.gif':'image/gif', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2',
  '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.mp4':'video/mp4',
  '.webm':'video/webm', '.pdf':'application/pdf', '.txt':'text/plain; charset=utf-8'
};
function fail(res, status, message, headers = {}) {
  res.writeHead(status, { 'Content-Type':'text/plain; charset=utf-8', ...headers });
  res.end(message);
}
http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return fail(res, 405, 'Method not allowed', { Allow:'GET, HEAD' });
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return fail(res, 400, 'Bad request'); }
  const parts = pathname.split('/');
  if (pathname.includes('\\') || pathname.includes('\0') || parts.some(p => p.startsWith('.'))) {
    return fail(res, 404, 'Not found');
  }
  try {
    let file = path.join(root, pathname);
    let stat = await fs.promises.stat(file);
    if (stat.isDirectory()) {
      file = path.join(file, 'index.html');
      stat = await fs.promises.stat(file);
    }
    const actual = await fs.promises.realpath(file);
    if (!actual.startsWith(root + path.sep) || !stat.isFile()) return fail(res, 404, 'Not found');
    const headers = {
      'Content-Type': types[path.extname(actual).toLowerCase()] || 'application/octet-stream',
      'Cache-Control':'no-cache', 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff'
    };
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2]) || !stat.size) {
        return fail(res, 416, 'Range not satisfiable', { 'Content-Range':`bytes */${stat.size}` });
      }
      if (!match[1]) { start = Math.max(0, stat.size - Number(match[2])); }
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
        return fail(res, 416, 'Range not satisfiable', { 'Content-Range':`bytes */${stat.size}` });
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || !stat.size) return res.end();
    const stream = fs.createReadStream(actual, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'EACCES') return fail(res, 404, 'Not found');
    console.error(err);
    if (!res.headersSent) return fail(res, 500, 'Server error');
    res.destroy();
  }
}).listen(port, host, () => console.log(`Local preview: http://${host}:${port}/`));
