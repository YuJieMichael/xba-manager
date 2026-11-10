// 战术平衡矩阵：每格 = 我方进攻战术 对 对方防守战术 的胜率
// 双方用同一级别 AI 球队轮流对位、主客互换；对方进攻固定为整体进攻，我方防守固定为盯人
// node tests/tactics.js [每格场数=200] [种子=1]
var X = require('./harness')();
var W = X.World, E = X.Engine;
module.exports = function (N, seed) {
  X.U.seed(seed || 1);
  var S = W.newGame('t', { difficulty: 'normal' });
  var lg = S.leagues.find(function (l) { return l.level === 2; });
  var T = lg.teamIds.map(function (id) { return S.teams[id]; });
  function cfg(t, off, def) {
    var c = W.sideCfg(S, t, 'league');
    c.presets = c.presets.map(function (p) { return Object.assign({}, p, { off: off, def: def }); });
    return c;
  }
  function rest() { Object.keys(S.players).forEach(function (id) { S.players[id].st = 100; }); }
  var offs = X.OFF_TACTICS.map(function (t) { return t.id; }), defs = X.DEF_TACTICS.map(function (t) { return t.id; });
  var M = {};
  offs.forEach(function (o) {
    M[o] = {};
    defs.forEach(function (d) {
      var w = 0, n = 0;
      for (var i = 0; i < N; i++) {
        var a = T[i % T.length], b = T[(i * 5 + 1 + Math.floor(i / T.length)) % T.length];
        if (a === b) continue;
        var me = cfg(a, o, 'man'), op = cfg(b, 'motion', d), home = i % 2 === 0;
        var r = home ? E.play(me, op, {}) : E.play(op, me, {});
        var mine = home ? r.hs : r.as, theirs = home ? r.as : r.hs;
        w += mine > theirs ? 1 : 0; n++; rest();
      }
      M[o][d] = w / n;
    });
  });
  X.U.seed(null);
  return { offs: offs, defs: defs, M: M };
};
if (require.main === module) {
  var r = module.exports(+process.argv[2] || 200, +process.argv[3] || 1);
  console.log('进攻\\防守\t' + r.defs.join('\t') + '\t平均');
  r.offs.forEach(function (o) {
    var row = r.defs.map(function (d) { return r.M[o][d]; });
    console.log(o + '\t' + row.map(function (v) { return Math.round(v * 100) + '%'; }).join('\t') + '\t' + Math.round(row.reduce(function (a, b) { return a + b; }) / row.length * 100) + '%');
  });
}
