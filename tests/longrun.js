// 长期平衡测试：一个「会自动经营」的玩家连打 N 个赛季，看胜率、资金、实力差距有没有失控
// 用法：node tests/longrun.js [赛季数=6] [种子=1]
// 自动经营：助理教练自动排阵、训练点全部按位置加点、能升星就升（升星卡不够就用游戏币买）、资金超过 500 万做意识特训
var X = require('./harness')(), W = X.World, P = X.P, U = X.U;
var N = +process.argv[2] || 6, seed = +process.argv[3] || 1;
U.seed(seed);
var S = W.newGame('测试', { difficulty: 'normal' });
W.finishOnboard(S, { manager: '测试', teamName: '测试队', color: '#c8102e', pro: S.onboard.pro.slice(0, 8), street: S.onboard.street.slice(0, 4) });
S.user.coach = { auto: true, style: 'balance' };

function train(p) {
  var tr = W.userPro(S).staff.trainer, ranks = X.POS_ATTR_RANK[p.pos];
  for (var n = 0; n < 400; n++) {
    var c = X.ATTRS.map(function (k, i) { return { k: k, r: ranks[i] }; }).filter(function (o) { return p.m[o.k] - p.a[o.k] > 0.05; });
    if (!c.length) return;
    var o = c[U.wpick(c.map(function (x) { return Math.pow(12 - x.r, 2) * (p.m[x.k] - p.a[x.k]); }))];
    var r = P.proTrainClick(S, p, o.k, tr);
    if (!r.gain && r.cost === 0) return;
  }
}
function manage() {
  var pro = W.userPro(S), ps = W.teamPlayers(S, pro);
  ps.forEach(train);
  ps.forEach(function (p) {
    if (!P.starReady(p) || (p.star || 0) >= X.STAR_MAX) return;
    var need = P.starCost(p) - (S.user.items.starcard || 0);
    if (need > 0 && S.user.coins >= need * 50) { S.user.coins -= need * 50; S.user.items.starcard = (S.user.items.starcard || 0) + need; }
    P.starUp(S, p);
  });
  // 钱够多（> 500 万）就给前 8 人做意识特训，每次练最低的那项
  if (S.user.money > 5e6) ps.sort(function (a, b) { return P.ovr(b) - P.ovr(a); }).slice(0, 8).forEach(function (p) {
    var k = ['off', 'def', 'team'].sort(function (a, b) { return p.iq[a] - p.iq[b]; })[0];
    if (S.user.money - P.iqCampCost(p, k) > 5e6) P.iqCamp(S, p, k);
  });
}
function top8(t) { return U.avg(W.teamPlayers(S, t).map(function (p) { return P.ovr(p); }).sort(function (a, b) { return b - a; }).slice(0, 8)); }

console.log('赛季 | 联赛 | 战绩 | 资金(万) | 游戏币 | 升星卡 | 我方前8均值 | 联赛前8均值(最强AI) | 阵容状态 | 意识均值');
for (var s = 0; s < N; s++) {
  var se = S.season, pro = W.userPro(S), lvl = pro.level, guard = 0, w0 = 0, l0 = 0, rec = null;
  while (S.season === se && guard++ < 70) {
    manage();
    rec = { w: pro.rec.w, l: pro.rec.l, level: pro.level, lg: W.league(S, pro.leagueId) };
    var ai = rec.lg.teamIds.map(function (id) { return S.teams[id]; }).filter(function (t) { return !t.isUser; });
    rec.aiAvg = U.avg(ai.map(top8)); rec.aiBest = Math.max.apply(null, ai.map(top8));
    rec.status = W.lineupStatus(S, pro);
    W.advance(S);
  }
  var ps = W.teamPlayers(S, W.userPro(S));
  console.log([se, rec.lg.name, rec.w + '-' + rec.l, Math.round(S.user.money / 1e4), S.user.coins, S.user.items.starcard || 0,
    top8(W.userPro(S)).toFixed(1), rec.aiAvg.toFixed(1) + '(' + rec.aiBest.toFixed(1) + ')', Math.round(rec.status * 100) + '%',
    U.avg(ps.map(function (p) { return (p.iq.off + p.iq.def + p.iq.team) / 3; })).toFixed(1)].join(' | '));
}
