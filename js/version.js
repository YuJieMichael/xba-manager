// 版本号：发布新版本时同时改这里和根目录的 version.json（tests/run.js 会检查两者一致）
var XBA = window.XBA || {};
window.XBA = XBA;
XBA.VERSION = '1.0.0';
// 存档结构版本：改了存档结构就 +1，并在 js/migrate.js 里加一步升级
XBA.SAVE_VER = 2;
