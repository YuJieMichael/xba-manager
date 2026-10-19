// 季后赛：常规赛前 8 名，三局两胜（1/4 决赛 → 半决赛 → 总决赛），高种子打第 1、3 场主场
(function (X) {
  var U = X.U, E = X.Engine, PO = {};
  X.Playoffs = PO;
  var W = function () { return X.World; };

  PO.START = 27;            // 第 27 天起（常规赛第 26 轮之后）
  PO.END = 35;              // 共 9 天：每轮最多 3 场
  X.SEASON_END = 36;        // 赛季末休息日
  PO.STAGES = ['1/4决赛', '半决赛', '总决赛'];

  PO.isDay = function (d) { return d >= PO.START && d <= PO.END; };
  PO.stageOf = function (d) { return Math.floor((d - PO.START) / 3); };
  PO.gameOf = function (d) { return (d - PO.START) % 3 + 1; };
  PO.label = function (d) { return '季后赛 ' + PO.STAGES[PO.stageOf(d)] + ' 第' + PO.gameOf(d) + '场'; };

  function series(a, b, sa, sb) { return { a: a, b: b, sa: sa, sb: sb, wa: 0, wb: 0, games: [], w: null }; }

  PO.setup = function (S) {
    S.playoffs = { season: S.season, leagues: {} };
    S.leagues.forEach(function (lg) {
      var st = W().standings(S, lg).slice(0, 8);
      var seed = st.map(function (t) { return t.id; });
      // 1v8、4v5、2v7、3v6（半区对位）
      S.playoffs.leagues[lg.id] = { rounds: [[series(seed[0], seed[7], 1, 8), series(seed[3], seed[4], 4, 5), series(seed[1], seed[6], 2, 7), series(seed[2], seed[5], 3, 6)]], champion: null };
    });
    var pro = W().userPro(S), mine = S.playoffs.leagues[pro.leagueId];
    var inIt = mine.rounds[0].some(function (s) { return s.a === pro.id || s.b === pro.id; });
    W().msg(S, inIt ? '🏀 你的球队打进季后赛！1/4 决赛三局两胜，常规赛排名高的一方先打主场。' : '你的球队没能进入季后赛（常规赛前 8 名才有资格）', 'cup');
  };

  function playGame(S, lg, s, gameNo, out) {
    var home = gameNo === 2 ? s.b : s.a, away = home === s.a ? s.b : s.a;
    var h = S.teams[home], a = S.teams[away];
    if (!h || !a) { s.w = h ? home : away; return; }
    var isUser = h.isUser || a.isUser;
    if (isUser && X.Coach.autoOn(S)) X.Coach.prepare(S, 'league', h.isUser ? a.id : h.id);
    var res = W().preResult(S, h, a) || E.play(W().sideCfg(S, h, 'league', { home: true }), W().sideCfg(S, a, 'league'), { kind: 'pro', log: isUser, injuries: true });
    W().applyMatch(S, res, { support: true });
    var g = { h: home, a: away, hs: res.hs, as: res.as };
    if (isUser) {
      var stage = PO.STAGES[s.stage || 0];
      g.mid = W().saveMatch(S, 'playoff', res, h, a, 'pro', { league: lg.name, cup: lg.name + ' 季后赛' + stage + ' 第' + gameNo + '场', proTP: W().earnProTP(S, res, h.isUser) });
      W().userGameFinance(S, h.isUser ? h : a, h.isUser, res, h.isUser ? a.id : h.id);
      if (X.Rivals) X.Rivals.afterGame(S, h.isUser ? a.id : h.id, h.isUser ? res.hs - res.as : res.as - res.hs, 'playoff');
      out.userGame = g.mid;
      X.Manager.xp(S, (h.isUser ? res.hs > res.as : res.as > res.hs) ? 20 : 6);
    }
    s.games.push(g);
    var winner = res.hs > res.as ? home : away;
    if (winner === s.a) s.wa++; else s.wb++;
    if (s.wa === 2 || s.wb === 2) {
      s.w = s.wa === 2 ? s.a : s.b;
      var pro = W().userPro(S);
      if (s.a === pro.id || s.b === pro.id) W().msg(S, (s.w === pro.id ? '✅ 季后赛' + PO.STAGES[s.stage || 0] + '晋级！' : '❌ 季后赛' + PO.STAGES[s.stage || 0] + '被淘汰') + '（系列赛 ' + Math.max(s.wa, s.wb) + ':' + Math.min(s.wa, s.wb) + '）', 'cup');
    }
  }

  // 生成当天要打的对阵（可重复调用）
  PO.prepareDay = function (S) {
    if (!S.playoffs || S.playoffs.season !== S.season) PO.setup(S);
    var stage = PO.stageOf(S.day), gameNo = PO.gameOf(S.day);
    if (gameNo !== 1 || stage === 0) return;
    S.leagues.forEach(function (lg) {
      var L = S.playoffs.leagues[lg.id];
      if (!L || L.champion || L.rounds.length !== stage) return;
      var prev = L.rounds[stage - 1], next = [];
      for (var i = 0; i < prev.length; i += 2) {
        var x = prev[i], y = prev[i + 1];
        var sx = x.w === x.a ? x.sa : x.sb, sy = y.w === y.a ? y.sa : y.sb;
        next.push(sx <= sy ? series(x.w, y.w, sx, sy) : series(y.w, x.w, sy, sx));
      }
      L.rounds.push(next);
    });
  };
  PO.playDay = function (S, out) {
    PO.prepareDay(S);
    var stage = PO.stageOf(S.day), gameNo = PO.gameOf(S.day);
    S.leagues.forEach(function (lg) {
      var L = S.playoffs.leagues[lg.id];
      if (!L || L.champion) return;
      var round = L.rounds[stage];
      if (!round) return;
      round.forEach(function (s) { s.stage = stage; if (!s.w) playGame(S, lg, s, gameNo, out); });
      if (stage === 2 && round[0].w) L.champion = round[0].w;
    });
  };

  // 赛季末：按季后赛结果发奖（冠军、亚军、四强）
  PO.results = function (S, lg) {
    var L = S.playoffs && S.playoffs.season === S.season && S.playoffs.leagues[lg.id];
    if (!L || !L.champion || L.rounds.length < 3) return null;
    var f = L.rounds[2][0], semis = L.rounds[1];
    return {
      champion: f.w, runner: f.w === f.a ? f.b : f.a,
      semis: semis.map(function (s) { return s.w === s.a ? s.b : s.a; })
    };
  };
})(window.XBA);
