// 本地静态服务器（可选）：node serve.js 然后打开 http://localhost:8638
// 直接双击 index.html 也能玩。
var http = require('http'), fs = require('fs'), path = require('path');
var root = __dirname, port = +process.env.PORT || 8638;
var types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  var f = path.join(root, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (f.indexOf(root) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (err, data) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, function () { console.log('XBA 已启动：http://localhost:' + port); });
