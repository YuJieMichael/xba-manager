// 回归测试：node tests/run.js        （完整，约 1 分钟）
//           node tests/run.js quick  （跳过战术矩阵）
// 不依赖任何 npm 包。
var assert = require('assert');
var quick = process.argv[2] === 'quick';
var fails = 0;
function test(name, fn) {
  var t0 = Date.now();
  try { fn(); console.log('✔ ' + name + '  (' + (Date.now() - t0) + 'ms)'); }
  catch (e) { fails++; console.log('✘ ' + name + '\n   ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n   ')); }
}

function newWorld(X, seed) {
  X.U.seed(seed);
  var W = X.World, S = W.newGame('测试', { difficulty: 'normal' });
  W.finishOnboard(S, { manager: '测试', teamName: '测试队', color: '#c8102e', pro: S.onboard.pro.slice(0, 8), street: S.onboard.street.slice(0, 4) });
  return S;
}
function playSeason(X, S) { var se = S.season, n = 0; while (S.season === se && n < 60) { X.World.advance(S); n++; } return n; }
function saved(S) { return JSON.stringify(S, function (k, v) { return typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v; }); }

test('同一种子两次模拟结果完全一致', function () {
  var X = require('./harness')(), E = X.Engine, W = X.World;
  function once() {
    var S = newWorld(X, 42), lg = S.leagues.find(function (l) { return l.level === 3; });
    var a = S.teams[lg.teamIds[0]], b = S.teams[lg.teamIds[1]];
    var r = E.play(W.sideCfg(S, a, 'league', { home: true }), W.sideCfg(S, b, 'league'), { kind: 'pro' });
    return r.hs + ':' + r.as;
  }
  assert.strictEqual(once(), once());
  X.U.seed(null);
});

test('模拟一个完整赛季不报错，并进入第 2 赛季', function () {
  var X = require('./harness')();
  var S = newWorld(X, 7), days = playSeason(X, S);
  assert.strictEqual(S.season, 2);
  assert.ok(days >= 28 && days <= 45, '赛季天数 ' + days); // 26 轮 + 休息日 + 季后赛
  X.U.seed(null);
});

test('存档每赛季增长不超过 350KB', function () {
  var X = require('./harness')();
  var S = newWorld(X, 7);
  playSeason(X, S); var s1 = saved(S).length;
  playSeason(X, S); playSeason(X, S); var s3 = saved(S).length;
  var per = (s3 - s1) / 2 / 1024;
  console.log('   第 2 赛季存档 ' + Math.round(s1 / 1024) + 'KB，之后每赛季 +' + Math.round(per) + 'KB');
  assert.ok(per < 350, '每赛季增长 ' + Math.round(per) + 'KB');
  X.U.seed(null);
});

test('孤儿球员会被清理，被引用的球员保留', function () {
  var X = require('./harness')(), W = X.World;
  var S = newWorld(X, 3);
  var P = X.P, orphan = P.gen(S, { age: 20, ovr: 20 }), kept = P.gen(S, { age: 20, ovr: 20 });
  S.user.watch.push(kept.id);
  W.gcPlayers(S);
  assert.ok(!S.players[orphan.id], '孤儿没删');
  assert.ok(S.players[kept.id], '关注列表里的球员被误删');
  X.U.seed(null);
});

test('累进所得税', function () {
  var X = require('./harness')(), W = X.World;
  assert.strictEqual(W.incomeTax(800000, true), 200000);
  assert.strictEqual(W.incomeTax(2000000, true), 250000 + 350000);
  assert.strictEqual(W.incomeTax(20000000, true), 250000 + 3150000 + 4500000);
  assert.strictEqual(W.incomeTax(1000000, false), 300000);
});

test('AI 进攻战术不再一边倒（单一战术占比 < 65%）', function () {
  var X = require('./harness')(), W = X.World;
  X.U.seed(5);
  var S = W.newGame('t', {}), c = {}, n = 0;
  Object.keys(S.teams).forEach(function (id) {
    var t = S.teams[id];
    if (t.kind !== 'pro' || t.isUser || !t.boards) return;
    t.boards.league.presets.slice(0, 2).forEach(function (p) { c[p.off] = (c[p.off] || 0) + 1; n++; });
  });
  var top = Math.max.apply(null, Object.keys(c).map(function (k) { return c[k]; }));
  console.log('   ' + JSON.stringify(c));
  assert.ok(top / n < 0.65, '最多的战术占 ' + Math.round(top / n * 100) + '%');
  assert.ok(Object.keys(c).length >= 4, '只用了 ' + Object.keys(c).length + ' 种战术');
  X.U.seed(null);
});

test('每日悬念：几乎每天都有揭晓或预告', function () {
  var X = require('./harness')(), W = X.World, ST = X.Story;
  var S = newWorld(X, 21), days = 0, withReveal = 0, withTease = 0;
  ST.buyAtmo(S, 'mascot'); ST.buyAtmo(S, 'food');
  for (var d = 0; d < 40; d++) {
    var out = W.advance(S); days++;
    if ((out.reveals || []).length) withReveal++;
    if (ST.teasers(S).length >= 2) withTease++;
    S.story.asks.slice().forEach(function (a) { ST.choose(S, a.id, 0); });
  }
  console.log('   ' + days + ' 天里 ' + withReveal + ' 天有揭晓，' + withTease + ' 天有 2 条以上预告');
  assert.ok(withReveal / days >= 0.8, '有揭晓的天数太少');
  assert.ok(withTease / days >= 0.7, '有预告的天数太少');
  X.U.seed(null);
});

test('新秀卡进入选秀池，球员退役会问要不要留队当名宿，传承点能结算和加点', function () {
  var X = require('./harness')(), W = X.World, ST = X.Story;
  var S = newWorld(X, 8), pro = W.userPro(S);
  var cls = ST.prospects(S).map(function (p) { return p.id; });
  assert.strictEqual(cls.length, 30);
  // 让一名队员赛季末退役
  var old = W.teamPlayers(S, pro)[0]; old.age = 40; old.retireAge = 38;
  playSeason(X, S);
  assert.ok(S.draft, '没有选秀');
  var inPool = S.draft.done ? cls.filter(function (id) { return S.players[id] && S.players[id].teamId; }).length : cls.filter(function (id) { return S.draft.pool.indexOf(id) >= 0; }).length;
  assert.ok(inPool > 0, '新秀卡没进选秀池');
  var ask = S.story.asks.find(function (a) { return a.kind === 'alumni'; });
  assert.ok(ask, '退役没有询问名宿');
  assert.strictEqual(ST.choose(S, ask.id, 0), null);
  assert.strictEqual(S.user.alumni.length, 1);
  var H = S.user.heritage;
  assert.ok(H.total >= 2, '传承点没结算');
  H.pts = 10; var m0 = S.user.money;
  assert.strictEqual(ST.buy(S, 'seed'), null);
  assert.strictEqual(S.user.money - m0, 300000);
  var S2 = W.rebirth(S, null, 'money');
  assert.strictEqual(S2.user.heritage.tree.seed, 1, '重生丢了传承');
  assert.strictEqual(S2.user.alumni.length, 1, '重生丢了名宿');
  X.U.seed(null);
});

if (!quick) test('战术平衡：没有万金油，每套进攻都有克星', function () {
  var r = require('./tactics')(150, 1);
  var bad = [];
  r.offs.forEach(function (o) {
    var row = r.defs.map(function (d) { return r.M[o][d]; });
    var avg = row.reduce(function (a, b) { return a + b; }) / row.length, min = Math.min.apply(null, row);
    console.log('   ' + o + '  平均 ' + Math.round(avg * 100) + '%  最差 ' + Math.round(min * 100) + '%');
    // 每格 150 场，标准误约 4%，阈值留了余量
    if (avg > 0.62) bad.push(o + ' 平均胜率 ' + Math.round(avg * 100) + '%');
    if (min > 0.53) bad.push(o + ' 没有能克制它的防守（最差 ' + Math.round(min * 100) + '%）');
  });
  assert.deepStrictEqual(bad, []);
});

console.log(fails ? '\n' + fails + ' 项失败' : '\n全部通过');
process.exit(fails ? 1 : 0);
