// 工具函数：随机数、格式化、数学
(function (X) {
  var U = {};
  X.U = U;

  U.rand = Math.random;
  U.ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  U.rf = function (a, b) { return a + Math.random() * (b - a); };
  U.chance = function (p) { return Math.random() < p; };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.gauss = function () {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.r1 = function (v) { return Math.round(v * 10) / 10; };
  U.sum = function (arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; };
  U.avg = function (arr) { return arr.length ? U.sum(arr) / arr.length : 0; };
  U.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  // 按权重抽取下标
  U.wpick = function (weights) {
    var tot = 0, i;
    for (i = 0; i < weights.length; i++) tot += Math.max(0, weights[i]);
    if (tot <= 0) return Math.floor(Math.random() * weights.length);
    var r = Math.random() * tot;
    for (i = 0; i < weights.length; i++) { r -= Math.max(0, weights[i]); if (r <= 0) return i; }
    return weights.length - 1;
  };
  U.money = function (v) {
    v = Math.round(v);
    var neg = v < 0; v = Math.abs(v);
    var s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  };
  U.wan = function (v) {
    if (Math.abs(v) >= 100000000) return U.r1(v / 100000000) + '亿';
    if (Math.abs(v) >= 10000) return U.r1(v / 10000) + '万';
    return String(Math.round(v));
  };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.uid = function (S, prefix) { S.nextId = (S.nextId || 1) + 1; return (prefix || '') + S.nextId; };
  U.fmtTime = function (sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };
})(window.XBA);
