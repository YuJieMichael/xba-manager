// 王朝纪录：全联盟历史纪录榜（单场、单赛季、连胜、冠军、连冠）
(function (X) {
  var U = X.U, P = X.P, RC = {};
  X.Records = RC;
  var W = function () { return X.World; };

  RC.DEFS = [
    { id: 'game_pts', cn: '单场得分', unit: '分', who: 'player' },
    { id: 'game_reb', cn: '单场篮板', unit: '个', who: 'player' },
    { id: 'game_ast', cn: '单场助攻', unit: '次', who: 'player' },
    { id: 'game_blk', cn: '单场盖帽', unit: '个', who: 'player' },
    { id: 'game_3pm', cn: '单场三分命中', unit: '个', who: 'player' },
    { id: 'team_pts', cn: '球队单场得分', unit: '分', who: 'team' },
    { id: 'margin', cn: '最大分差胜利', unit: '分', who: 'team' },
    { id: 'streak', cn: '联赛最长连胜', unit: '场', who: 'team' },
    { id: 'season_w', cn: '常规赛单季胜场', unit: '胜', who: 'team' },
    { id: 'season_ppg', cn: '单赛季场均得分', unit: '分', who: 'player' },
    { id: 'titles', cn: '超级联赛总冠军次数', unit: '次', who: 'team' },
    { id: 'dynasty', cn: '超级联赛连冠', unit: '连冠', who: 'team' }
  ];

  function rec(S) { return S.records = S.records || {}; }
  function set(S, id, val, who, team, isUser) {
    var R = rec(S), cur = R[id];
    if (cur && val <= cur.val) return;
    var def = RC.DEFS.find(function (d) { return d.id === id; });
    R[id] = { val: val, who: who, team: team, season: S.season, user: !!isUser };
    if (isUser && S.dayNo > 2) {
      W().msg(S, '📜 打破联盟纪录！' + def.cn + '：' + (who ? who + '（' + team + '）' : team) + ' ' + val + def.unit, 'sys');
      if (!cur || !cur.user) S.user.trophies.push({ season: S.season, name: '联盟纪录·' + def.cn + ' ' + val + def.unit });
      X.Manager.xp(S, 30);
    }
  }

  // 每场联赛/季后赛后调用
  RC.game = function (S, res, h, a) {
    [[h, res.box.h, res.hs, res.as], [a, res.box.a, res.as, res.hs]].forEach(function (x) {
      var team = x[0];
      x[1].forEach(function (b) {
        var p = S.players[b.pid]; if (!p) return;
        var pts = [['game_pts', b.pts], ['game_reb', b.oreb + b.dreb], ['game_ast', b.ast], ['game_blk', b.blk], ['game_3pm', b.tpm]];
        pts.forEach(function (r) { var cur = rec(S)[r[0]]; if (!cur || r[1] > cur.val) set(S, r[0], r[1], p.name, team.name, team.isUser); });
      });
      if (!rec(S).team_pts || x[2] > rec(S).team_pts.val) set(S, 'team_pts', x[2], '', team.name, team.isUser);
      var margin = x[2] - x[3];
      if (margin > 0 && (!rec(S).margin || margin > rec(S).margin.val)) set(S, 'margin', margin, '', team.name, team.isUser);
    });
  };
  RC.leagueGame = function (S, res, h, a) {
    RC.game(S, res, h, a);
    var w = res.hs > res.as ? h : a, l = w === h ? a : h;
    w.streak = (w.streak || 0) + 1; l.streak = 0;
    if (!rec(S).streak || w.streak > rec(S).streak.val) set(S, 'streak', w.streak, '', w.name, w.isUser);
  };

  // 赛季末（战绩清零之前）
  RC.season = function (S, champName, champIsUser) {
    Object.keys(S.teams).forEach(function (id) {
      var t = S.teams[id];
      if (t.kind !== 'pro') return;
      if (!rec(S).season_w || t.rec.w > rec(S).season_w.val) set(S, 'season_w', t.rec.w, '', t.name, t.isUser);
      t.streak = 0;
      W().teamPlayers(S, t).forEach(function (p) {
        var s = p.stats; if (s.gp < 13) return;
        var ppg = U.r1(s.pts / s.gp);
        if (!rec(S).season_ppg || ppg > rec(S).season_ppg.val) set(S, 'season_ppg', ppg, p.name, t.name, t.isUser);
      });
    });
    if (champName) {
      S.titleCount = S.titleCount || {};
      S.titleCount[champName] = (S.titleCount[champName] || 0) + 1;
      if (!rec(S).titles || S.titleCount[champName] > rec(S).titles.val) set(S, 'titles', S.titleCount[champName], '', champName, champIsUser);
      var d = S.dynastyRun = S.dynastyRun && S.dynastyRun.team === champName ? { team: champName, n: S.dynastyRun.n + 1 } : { team: champName, n: 1 };
      if (d.n >= 2 && (!rec(S).dynasty || d.n > rec(S).dynasty.val)) set(S, 'dynasty', d.n, '', champName, champIsUser);
    }
  };
})(window.XBA);
