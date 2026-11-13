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

test('版本号：js/version.js 和 version.json 一致', function () {
  var X = require('./harness')(), fs = require('fs'), path = require('path');
  var j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8'));
  assert.strictEqual(j.version, X.VERSION);
  assert.strictEqual(X.Migrate.STEPS.length, X.SAVE_VER, '每个存档版本都要有一步升级');
});

test('旧存档逐级升级到最新版本，新游戏直接是最新版本', function () {
  var X = require('./harness')();
  var S = newWorld(X, 5);
  assert.strictEqual(S.saveVer, X.SAVE_VER);
  // 伪造一个 0 版本的旧存档：旧联赛名、旧荣誉
  var old = JSON.parse(JSON.stringify(S));
  delete old.saveVer;
  old.leagues[0].name = 'XBA 超级联赛';
  old.user.trophies.push({ season: 1, name: 'XBA 超级联赛 冠军' }, { season: 1, name: '第1赛季 XBA杯 冠军杯 冠军' });
  var up = X.Migrate.run(old);
  assert.strictEqual(up.saveVer, X.SAVE_VER);
  assert.strictEqual(up.leagues[0].name, '篮途超级联赛');
  assert.ok(up.user.trophies.some(function (t) { return t.name === '篮途超级联赛 冠军'; }), '旧冠军荣誉改成新名字');
  assert.ok(JSON.stringify(up).indexOf('XBA杯') < 0);
  // 新版本存档不会被旧页面改动
  var future = JSON.parse(JSON.stringify(S)); future.saveVer = X.SAVE_VER + 1;
  assert.ok(X.Migrate.tooNew(future));
  X.U.seed(null);
});

test('高难挑战：只在超级联赛前 5 天可选，词条生效，夺冠发奖励', function () {
  var X = require('./harness')(), W = X.World, CH = X.Challenge;
  var S = newWorld(X, 5), pro = W.userPro(S);
  assert.ok(CH.set(S, ['elite']), '不在超级联赛时不能开启');
  pro.level = 1;
  assert.ok(CH.set(S, ['elite2']), '没有前置词条不能选');
  assert.strictEqual(CH.set(S, ['elite', 'elite2', 'locker', 'injury']), null);
  assert.strictEqual(CH.cur(S).pts, 10);
  var lg = W.league(S, pro.leagueId), opp = S.teams[lg.teamIds.find(function (i) { return i !== pro.id; })];
  assert.ok(Math.abs(W.sideCfg(S, opp, 'league').status / W.lineupStatus(S, opp) - 1.25) < 1e-9, '对手 +25%');
  assert.strictEqual(W.sideCfg(S, opp, 'cup').status, W.lineupStatus(S, opp), '杯赛不受影响');
  assert.strictEqual(W.sideCfg(S, pro, 'league').injMul, 2.5);
  var c0 = S.user.coins, k0 = S.user.items.starcard || 0;
  CH.settle(S, 0);
  assert.strictEqual(S.user.coins - c0, 1500);
  assert.strictEqual((S.user.items.starcard || 0) - k0, 10);
  S.day = CH.OPEN_DAYS + 1;
  assert.ok(CH.set(S, []), '第 6 天以后锁定');
  X.U.seed(null);
});

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

test('AI 交易报价不再用替补 + 现金凑数换核心', function () {
  var X = require('./harness')(), TR = X.Trade, P = X.P, W = X.World;
  var S = newWorld(X, 11), n = 0;
  S.day = 1;
  for (var i = 0; i < 3000; i++) {
    S.tradeOffers = [];
    TR.daily(S);
    S.tradeOffers.forEach(function (o) {
      n++;
      var wantV = P.value(S.players[o.want]);
      var vals = o.give.map(function (id) { return P.value(S.players[id]); });
      assert.ok(Math.max.apply(null, vals) >= wantV * 0.45, '报价缺少核心球员');
      assert.ok(TR.pkgValue(vals) + o.money >= wantV * 0.999, '报价低于身价');
    });
  }
  assert.ok(n > 0, '一次报价都没有');
  // 反过来：拿两个最差的球员换对方最好的球员，AI 不该答应
  var pro = W.userPro(S), mine = W.teamPlayers(S, pro).sort(function (a, b) { return P.value(a) - P.value(b); });
  var lg = S.leagues.find(function (l) { return l.teamIds.indexOf(pro.id) >= 0; });
  var other = S.teams[lg.teamIds.find(function (id) { return id !== pro.id; })];
  var star = W.teamPlayers(S, other).sort(function (a, b) { return P.value(b) - P.value(a); })[0];
  var two = [mine[0], mine[1]], money = Math.max(0, Math.round(TR.aiValue(S, other, star, false) * 1.08 - U2(two)));
  function U2(ps) { return ps.reduce(function (a, p) { return a + TR.aiValue(S, other, p, true); }, 0); }
  S.user.money = 1e9;
  var ev = TR.evaluate(S, other.id, two.map(function (p) { return p.id; }), [star.id], money);
  if (!ev.err) assert.ok(!ev.ok, '两个替补 + 按总身价补足的现金就能换走球星');
  console.log('   ' + n + ' 次报价全部合格');
  X.U.seed(null);
});

test('属性练满后也会体能轮换，不是五个主力打满全场', function () {
  var X = require('./harness')(), W = X.World, E = X.Engine;
  X.U.seed(3);
  var S = W.newGame('测试', { difficulty: 'normal' });
  W.finishOnboard(S, { manager: '测试', teamName: '测试队', color: '#c8102e', pro: S.onboard.pro.slice(0, 10), street: S.onboard.street.slice(0, 4) });
  var pro = W.userPro(S), ps = W.teamPlayers(S, pro);
  ps.forEach(function (p) { X.ATTRS.forEach(function (k) { p.a[k] = p.m[k] = 99; }); });
  X.Coach.prepare(S, 'league', null);
  var lg = S.leagues.find(function (l) { return l.teamIds.indexOf(pro.id) >= 0; }), mins = {}, N = 20;
  for (var g = 0; g < N; g++) {
    ps.forEach(function (p) { p.st = 100; });
    var r = E.play(W.sideCfg(S, pro, 'league', { home: true }), W.sideCfg(S, S.teams[lg.teamIds[1 + g % 13]], 'league'), { kind: 'pro' });
    for (var k in r.box.h) mins[r.box.h[k].pid] = (mins[r.box.h[k].pid] || 0) + r.box.h[k].min / N;
  }
  var m = Object.keys(mins).map(function (id) { return mins[id]; }).sort(function (a, b) { return b - a; });
  console.log('   场均上场时间：' + m.map(function (x) { return x.toFixed(0); }).join(' / '));
  assert.ok(m[0] <= 42, '主力场均 ' + m[0].toFixed(1) + ' 分钟，几乎打满');
  assert.ok(m.filter(function (x) { return x >= 10; }).length >= 7, '上场 10 分钟以上的不到 7 人');
  X.U.seed(null);
});

test('微波炉替补：从板凳上场后得分效率更高', function () {
  var X = require('./harness')(), W = X.World, E = X.Engine;
  function run(per) {
    X.U.seed(9);
    var S = W.newGame('测试', { difficulty: 'normal' });
    W.finishOnboard(S, { manager: '测试', teamName: '测试队', color: '#c8102e', pro: S.onboard.pro.slice(0, 10), street: S.onboard.street.slice(0, 4) });
    var pro = W.userPro(S), ps = W.teamPlayers(S, pro);
    ps.forEach(function (p) { p.persona = 'calm'; });
    X.Coach.prepare(S, 'league', null);
    var pr = pro.boards.league.presets, bench = pr[1].lineup.filter(function (id) { return pr[0].lineup.indexOf(id) < 0; });
    bench.forEach(function (id) { S.players[id].persona = per; });
    var lg = S.leagues.find(function (l) { return l.teamIds.indexOf(pro.id) >= 0; }), pts = 0, min = 0;
    for (var g = 0; g < 30; g++) {
      ps.forEach(function (p) { p.st = 100; });
      var r = E.play(W.sideCfg(S, pro, 'league', { home: true }), W.sideCfg(S, S.teams[lg.teamIds[1 + g % 13]], 'league'), { kind: 'pro' });
      for (var k in r.box.h) { var b = r.box.h[k]; if (bench.indexOf(b.pid) >= 0) { pts += b.pts; min += b.min; } }
    }
    return pts / min * 36;
  }
  var calm = run('calm'), mw = run('microwave');
  console.log('   替补每 36 分钟得分：平常心 ' + calm.toFixed(1) + '，微波炉 ' + mw.toFixed(1));
  assert.ok(mw > calm * 1.08, '微波炉没有明显多得分');
  X.U.seed(null);
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
