// 传奇挑战赛：赛季末休息日，你的职业队挑战“名人堂全明星队”（130 起，每赢一次 +5，最高 150）
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, LG = {};
  X.Legend = LG;
  var W = function () { return X.World; };

  var LEGEND_NAMES = ['M.Jordan', 'K.Bryant', 'L.James', 'S.O\'Neal', 'T.Duncan', 'H.Olajuwon', 'M.Johnson', 'L.Bird', 'K.Abdul-Jabbar', 'W.Chamberlain', 'B.Russell', 'S.Curry', 'K.Durant', 'D.Nowitzki', 'A.Iverson', 'Y.Ming', 'K.Garnett', 'C.Barkley', 'J.Stockton', 'K.Malone'];

  LG.tier = function (S) { return S.legendTier || 0; };
  LG.level = function (S) { return Math.min(150, 130 + 5 * LG.tier(S)); };
  // 解锁条件：职业队前 8 人平均综合 ≥ 85，或者已经打进超级联赛
  LG.unlocked = function (S) {
    var pro = W().userPro(S);
    var top8 = W().teamPlayers(S, pro).map(function (p) { return P.ovr(p); }).sort(function (a, b) { return b - a; }).slice(0, 8);
    return pro.level === 1 || U.avg(top8) >= 85;
  };

  function legendTeam(S, ovr) {
    var hof = (S.hof || []).slice().sort(function (a, b) { return b.peak - a.peak; }).map(function (h) { return { name: h.name, pos: h.pos, h: h.h }; });
    var names = U.shuffle(LEGEND_NAMES.slice());
    var pos = ['C', 'C', 'PF', 'PF', 'SF', 'SF', 'SG', 'SG', 'PG', 'PG'];
    var ps = pos.map(function (ps1, i) {
      var src = hof.find(function (h) { return h.pos === ps1 && !h.used; });
      if (src) src.used = true;
      var p = P.gen(S, { pos: ps1, age: 30, ovr: ovr + U.gauss() * 2, gap: 0, h: src ? src.h : undefined });
      delete S.players[p.id];
      var o = P.ovr(p), k;
      if (o > 0) for (k in p.a) { p.a[k] = Math.min(X.ATTR_CAP, p.a[k] * (ovr / o)); p.m[k] = p.a[k]; }
      p.iq = { off: 80, def: 80, team: 80 }; p.lead = 90; p.will = 90; p.st = 100;
      p.name = '传奇·' + (src ? src.name : names[i % names.length]);
      return p;
    });
    var lu = E.autoLineup(ps, 'pro'), lu2 = E.autoLineup(ps, 'pro', lu);
    return {
      id: 'legend', name: '名人堂全明星队', color: '#d6a400', players: ps, prof: { off: { motion: 200 }, def: { man: 200 } }, status: 1,
      presets: [{ name: '传奇首发', lineup: lu, off: E.suggestOff(ps, lu, 'pro'), def: 'man', core: -1, mark: -1 }, { name: '传奇替补', lineup: lu2, off: 'motion', def: 'z212', core: -1, mark: -1 }],
      config: { q: [0, 1, 0, 0], ot: 0, lead: -1, trail: -1 }
    };
  }

  // 赛季末休息日自动进行
  LG.run = function (S, out) {
    if (!LG.unlocked(S)) return;
    var lvl = LG.level(S), opp = legendTeam(S, lvl), pro = W().userPro(S);
    if (X.Coach.autoOn(S)) X.Coach.prepare(S, 'other', null);
    var res = E.play(W().sideCfg(S, pro, 'other', { home: true, status: 1 }), opp, { kind: 'pro', log: true, injuries: false, noStamina: true });
    var mid = W().saveMatch(S, 'legend', res, pro, opp, 'pro', { cup: '第' + S.season + '赛季 传奇挑战赛（' + lvl + ' 级）' });
    W().applyMatch(S, res, { noStamina: true });
    var won = res.hs > res.as;
    S.legends = S.legends || [];
    S.legends.unshift({ season: S.season, level: lvl, hs: res.hs, as: res.as, won: won, mid: mid });
    if (won) {
      S.legendTier = LG.tier(S) + 1;
      S.user.coins += 500;
      S.user.trophies.push({ season: S.season, name: '传奇挑战赛 胜利（' + lvl + ' 级）' });
      W().msg(S, '🏆 传奇挑战赛：' + res.hs + ':' + res.as + ' 击败名人堂全明星队（' + lvl + ' 级）！奖励 500 游戏币，下次对手升到 ' + LG.level(S) + ' 级', 'cup');
      X.Manager.xp(S, 150);
    } else {
      W().msg(S, '传奇挑战赛：' + res.hs + ':' + res.as + ' 不敌名人堂全明星队（' + lvl + ' 级），明年再来', 'cup');
      X.Manager.xp(S, 40);
    }
    out.legend = mid;
  };
})(window.XBA);
