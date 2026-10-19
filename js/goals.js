// 赛季目标、成就、数据记录（数据中心用）
(function (X) {
  var U = X.U, P = X.P, G = {};
  X.Goals = G;
  var W = function () { return X.World; };

  function proPlayers(S) { return W().teamPlayers(S, W().userPro(S)); }
  function allMine(S) { return proPlayers(S).concat(W().teamPlayers(S, W().userStreet(S))); }
  function hasTrophy(S, re) { return S.user.trophies.some(function (t) { return re.test(t.name); }); }
  function userLeagueRank(S) { var pro = W().userPro(S); return W().standings(S, W().league(S, pro.leagueId)).indexOf(pro) + 1; }
  function bestStreak(S) {
    var pro = W().userPro(S), lg = W().league(S, pro.leagueId), cur = 0, best = 0;
    lg.results.forEach(function (round) {
      var r = (round || []).find(function (x) { return x.h === pro.id || x.a === pro.id; });
      if (!r) return;
      var won = (r.h === pro.id) === (r.hs > r.as);
      cur = won ? cur + 1 : 0; best = Math.max(best, cur);
    });
    return best;
  }

  // ===== 赛季目标 =====
  var MONEY = { 1: 5000000, 2: 2000000, 3: 600000, 4: 200000 };
  G.newSeason = function (S) {
    var pro = W().userPro(S), lv = pro.level, last = S.user.lastRank;
    // 同级别：比上赛季名次再进 2 名；换了级别（升降级）：中游目标
    var n = last && S.user.lastLevel === lv ? U.clamp(last - 2, 2, 8) : (lv === 4 ? 6 : 8);
    var list = [{ id: 'rank', cn: '联赛排名进入前 ' + n, n: n, reward: { money: MONEY[lv], coins: 50 } }];
    if (S.xcup && S.xcup.user && S.xcup.season === S.season) list.push({ id: 'xcup', cn: 'XBA杯从分组预赛出线', reward: { coins: 100 } });
    list.push({ id: 'street', cn: '赢得 1 次街球杯赛冠军', reward: { starcard: 1, coins: 30 } });
    list.push({ id: 'grow', cn: '培养一名职业球员综合提升 5', reward: { starcard: 1 } });
    var base = {};
    proPlayers(S).forEach(function (p) { base[p.id] = P.ovr(p); });
    S.user.goals = { season: S.season, list: list, base: base, trophyCount: S.user.trophies.length };
  };

  function goalDone(S, g) {
    var gs = S.user.goals;
    switch (g.id) {
      case 'xcup': return !!(S.xcup && S.xcup.fin && X.XCup.groupOf(S.xcup.fin, S.user.proId) >= 0);
      case 'street': return S.user.trophies.slice(gs.trophyCount).some(function (t) { return /(新人杯|小杯赛|大杯赛).* 冠军$/.test(t.name); });
      case 'grow': return proPlayers(S).some(function (p) { return gs.base[p.id] != null && P.ovr(p) - gs.base[p.id] >= 5; });
      case 'rank': return false; // 赛季末判定
    }
    return false;
  }
  function grant(S, g) {
    var r = g.reward, parts = [];
    if (r.money) { W().earn(S, r.money, '赛季目标：' + g.cn); parts.push(U.money(r.money) + ' 资金'); }
    if (r.coins) { S.user.coins += r.coins; parts.push(r.coins + ' 游戏币'); }
    if (r.starcard) { S.user.items.starcard = (S.user.items.starcard || 0) + r.starcard; parts.push(r.starcard + ' 张升星卡'); }
    W().msg(S, '🎯 完成赛季目标【' + g.cn + '】，奖励 ' + parts.join('、') + '，经理经验 +80', 'sys');
    X.Manager.xp(S, 80);
  }
  G.rewardText = function (r) {
    var parts = [];
    if (r.money) parts.push(U.wan(r.money) + ' 资金');
    if (r.coins) parts.push(r.coins + ' 游戏币');
    if (r.starcard) parts.push(r.starcard + ' 升星卡');
    return parts.join(' + ');
  };
  // 每日检查；final=true 时在赛季末判定排名目标
  G.checkGoals = function (S, final) {
    var gs = S.user.goals;
    if (!gs || gs.season !== S.season) return;
    gs.list.forEach(function (g) {
      if (g.done || g.failed) return;
      var ok = g.id === 'rank' ? (final && userLeagueRank(S) <= g.n) : goalDone(S, g);
      if (ok) { g.done = true; grant(S, g); }
      else if (final) g.failed = true;
    });
    if (final) { S.user.lastRank = userLeagueRank(S); S.user.lastLevel = W().userPro(S).level; }
  };
  G.progress = function (S, g) {
    var gs = S.user.goals;
    if (g.id === 'rank') return '当前第 ' + userLeagueRank(S) + ' 名';
    if (g.id === 'grow') { var best = 0; proPlayers(S).forEach(function (p) { if (gs.base[p.id] != null) best = Math.max(best, P.ovr(p) - gs.base[p.id]); }); return '最多已提升 ' + best.toFixed(1); }
    if (g.id === 'xcup') return S.xcup ? X.XCup.stageName(S.xcup) : '';
    return '';
  };

  // ===== 成就 =====
  G.ACH = [
    { id: 'win1', cn: '开门红', desc: '赢得第一场职业联赛', coins: 10, ok: function (S) { return W().userPro(S).rec.w >= 1 || S.user.lastRank; } },
    { id: 'streak5', cn: '五连胜', desc: '职业联赛连胜 5 场', coins: 30, ok: function (S) { return bestStreak(S) >= 5; } },
    { id: 'streak10', cn: '势不可挡', desc: '职业联赛连胜 10 场', coins: 80, ok: function (S) { return bestStreak(S) >= 10; } },
    { id: 'lv3', cn: '更上一层楼', desc: '升级到 3 级联赛', coins: 50, ok: function (S) { return W().userPro(S).level <= 3; } },
    { id: 'lv2', cn: '强队之列', desc: '升级到 2 级联赛', coins: 100, ok: function (S) { return W().userPro(S).level <= 2; } },
    { id: 'lv1', cn: '超级联赛', desc: '打进 XBA 超级联赛', coins: 200, ok: function (S) { return W().userPro(S).level === 1; } },
    { id: 'champ', cn: '联赛冠军', desc: '拿到任意一个联赛的冠军', coins: 80, ok: function (S) { return hasTrophy(S, /联赛.* 冠军$/); } },
    { id: 'xba', cn: 'XBA 总冠军', desc: '拿到 XBA 超级联赛冠军', coins: 500, ok: function (S) { return hasTrophy(S, /XBA 超级联赛 冠军/); } },
    { id: 'xcup', cn: '冠军杯之王', desc: '拿到 XBA杯冠军杯冠军', coins: 300, ok: function (S) { return hasTrophy(S, /冠军杯 冠军/); } },
    { id: 'wk9', cn: '胜者为王', desc: '胜者为王九连胜', coins: 100, ok: function (S) { return hasTrophy(S, /九连胜/); } },
    { id: 'scup', cn: '街头霸主', desc: '赢得一次街球杯赛冠军', coins: 20, ok: function (S) { return hasTrophy(S, /(新人杯|小杯赛|大杯赛).* 冠军$/); } },
    { id: 'big', cn: '大杯赛冠军', desc: '赢得街球大杯赛冠军', coins: 80, ok: function (S) { return hasTrophy(S, /大杯赛.* 冠军$/); } },
    { id: 'o60', cn: '绿色球员', desc: '拥有一名综合 60 的球员', coins: 20, ok: function (S) { return allMine(S).some(function (p) { return P.ovr(p) >= 60; }); } },
    { id: 'o70', cn: '蓝色球员', desc: '拥有一名综合 70 的球员', coins: 40, ok: function (S) { return allMine(S).some(function (p) { return P.ovr(p) >= 70; }); } },
    { id: 'o80', cn: '紫色球员', desc: '拥有一名综合 80 的球员', coins: 80, ok: function (S) { return allMine(S).some(function (p) { return P.ovr(p) >= 80; }); } },
    { id: 'o90', cn: '橙色球员', desc: '拥有一名综合 90 的球员', coins: 150, ok: function (S) { return allMine(S).some(function (p) { return P.ovr(p) >= 90; }); } },
    { id: 'o100', cn: '百分球星', desc: '拥有一名综合 100 的球员', coins: 300, ok: function (S) { return allMine(S).some(function (p) { return P.ovr(p) >= 100; }); } },
    { id: 'star1', cn: '初次升星', desc: '第一次给球员升星', coins: 20, ok: function (S) { return allMine(S).some(function (p) { return p.star >= 1; }); } },
    { id: 'star5', cn: '五星传奇', desc: '培养出一名 5 星球员', coins: 200, ok: function (S) { return allMine(S).some(function (p) { return p.star >= 5; }); } },
    { id: 'red', cn: '慧眼识珠', desc: '球探签下一名红色天才', coins: 30, ok: function (S) { return allMine(S).some(function (p) { return p.scoutGrade === 3; }); } },
    { id: 'green', cn: '本土培养', desc: '用选拔卡提拔第一名绿名球员', coins: 20, ok: function (S) { return proPlayers(S).some(function (p) { return p.green; }); } },
    { id: 'trait', cn: '特长初现', desc: '你的球员解锁第一个特长', coins: 20, ok: function (S) { return allMine(S).some(function (p) { return P.traits(p).length >= 1; }); } },
    { id: 'trait4', cn: '全能战士', desc: '一名球员同时拥有 4 个特长', coins: 80, ok: function (S) { return allMine(S).some(function (p) { return P.traits(p).length >= 4; }); } },
    { id: 'mvp', cn: '最有价值球员', desc: '你的球员获得赛季 MVP', coins: 80, ok: function (S) { return allMine(S).some(function (p) { return (p.awards || []).some(function (a) { return /MVP$/.test(a); }); }); } },
    { id: 'fans1', cn: '小有名气', desc: '球迷达到 1 万', coins: 30, ok: function (S) { return W().userPro(S).fans >= 10000; } },
    { id: 'fans5', cn: '万人迷', desc: '球迷达到 5 万', coins: 100, ok: function (S) { return W().userPro(S).fans >= 50000; } },
    { id: 'm10', cn: '千万富翁', desc: '球队资金达到 1000 万', coins: 50, ok: function (S) { return S.user.money >= 10000000; } },
    { id: 'm100', cn: '亿万豪门', desc: '球队资金达到 1 亿', coins: 200, ok: function (S) { return S.user.money >= 100000000; } },
    { id: 'arena5', cn: '现代球馆', desc: '球场升级到 5 级', coins: 50, ok: function (S) { return W().userPro(S).arena.lv >= 5; } },
    { id: 'slv5', cn: '街球名人', desc: '街球等级达到 5 级', coins: 50, ok: function (S) { return S.user.streetLevel >= 5; } },
    { id: 'hof5', cn: '名人堂', desc: '名人堂收录 5 名球员', coins: 50, ok: function (S) { return (S.hof || []).length >= 5; } }
  ];
  G.checkAch = function (S) {
    S.user.ach = S.user.ach || {};
    G.ACH.forEach(function (a) {
      if (S.user.ach[a.id]) return;
      var ok = false;
      try { ok = a.ok(S); } catch (e) { ok = false; }
      if (!ok) return;
      S.user.ach[a.id] = { season: S.season, day: S.day };
      S.user.coins += a.coins;
      X.Manager.xp(S, 40);
      W().msg(S, '🏅 达成成就【' + a.cn + '】：' + a.desc + '，奖励 ' + a.coins + ' 游戏币', 'sys');
    });
  };

  // ===== 数据记录 =====
  G.snapshot = function (S) {
    var pro = W().userPro(S), st = W().userStreet(S);
    var top8 = proPlayers(S).map(function (p) { return P.ovr(p); }).sort(function (a, b) { return b - a; }).slice(0, 8);
    var top3 = W().teamPlayers(S, st).map(function (p) { return P.ovr(p); }).sort(function (a, b) { return b - a; }).slice(0, 3);
    var h = S.user.hist = S.user.hist || [];
    h.push({ n: S.dayNo, s: S.season, d: S.day, rank: userLeagueRank(S), lv: pro.level, money: Math.round(S.user.money), fans: pro.fans, ovr: U.r1(U.avg(top8)), st: U.r1(U.avg(top3)), w: pro.rec.w, l: pro.rec.l });
    if (h.length > 800) h.splice(0, h.length - 800);
    allMine(S).forEach(function (p) {
      p.oh = p.oh || [];
      p.oh.push([S.dayNo, U.r1(P.ovr(p))]);
      if (p.oh.length > 400) p.oh.splice(0, p.oh.length - 400);
    });
  };
  // 赛季结束时记一行总结（在战绩清零前调用）
  G.seasonRecord = function (S) {
    var pro = W().userPro(S), L = S.user.ledger[S.season] || { inc: 0, exp: 0 };
    S.user.seasons = S.user.seasons || [];
    S.user.seasons.push({ s: S.season, lv: pro.level, league: W().league(S, pro.leagueId).name, rank: userLeagueRank(S), w: pro.rec.w, l: pro.rec.l, pf: pro.rec.pf, pa: pro.rec.pa, net: L.inc - L.exp, fans: pro.fans, xcup: S.xcup && S.xcup.season === S.season ? (S.xcup.result || (S.xcup.user ? '参赛' : '')) : '' });
  };
})(window.XBA);
