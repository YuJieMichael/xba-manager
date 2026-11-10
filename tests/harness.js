// 测试用：在 Node 里加载游戏逻辑（不含界面），返回 XBA 全局对象
// 用法：var X = require('./harness')();
var fs = require('fs'), vm = require('vm'), path = require('path');
module.exports = function () {
  var root = path.join(__dirname, '..');
  var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  var files = [];
  html.replace(/src="(js\/[^"]+)"/g, function (_, f) { if (!/ui_|main|save/.test(f)) files.push(f); });
  var ctx = { console: console, setTimeout: setTimeout, performance: { now: Date.now } };
  ctx.window = ctx; ctx.XBA = {};
  vm.createContext(ctx);
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
  // vm 上下文有自己的 Math，U.seed 改的是它
  return ctx.XBA;
};
