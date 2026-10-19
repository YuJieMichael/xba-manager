// 赛季颁奖（MVP、各项数据王、最佳阵容）与名人堂
(function (X) {
  var U = X.U, P = X.P, A = {};
  X.Awards = A;
  var W = function () { return X.World; };

  A.HOF_MAX = 50;
  var CATS = [
    { id: 'mvp', cn: 'MVP', unit: '综合', f: function (s) { return (s.pts + s.oreb + s.dreb + s.ast + s.stl + s.blk) / s.gp; } },
    { id: 'pts', cn: '得分王', unit: '分', f: function (s) { return s.pts / s.gp; } },
    { id: 'reb', cn: '篮板王', unit: '板', f: function (s) { return (s.oreb + s.dreb) / s.gp; } },
    { id: 'ast', cn: '助攻王', unit: '助', f: function (s) { return s.ast / s.gp; } },
    { id: 'stl', cn: '抢断王', unit: '断', f: function (s) { return s.stl / s.gp; } },
    { id: 'blk', cn: '盖帽王', unit: '帽', f: function (s) { return s.blk / s.gp; } }
  ];
  A.CATS = CATS;

  function entry(S, p, cat, val) {
    var t = S.teams[p.teamId];
    return { pid: p.id, name: p.name, pos: p.pos, team: t ? t.name : '', user: !!(t && t.isUser), award: cat, val: U.r1(val) };
  }

  function give(S, p, label) {
    p.awards = p.awards || [];
    p.awards.push(label);
    var t = S.teams[p.teamId];
    if (t && t.isUser) {
      W().msg(S, '🏅 ' + p.name + ' 获得 ' + label, 'player');
      S.user.trophies.push({ season: S.season, name: p.name + '：' + label });
    }
  }

  // 赛季末调用（球员统计归档之前）
  A.season = function (S) {
    var out = [];
    S.leagues.forEach(function (lg) {
      var ps = [];
      lg.teamIds.forEach(function (tid) { W().teamPlayers(S, S.teams[tid]).forEach(function (p) { if (p.stats.gp >= 13) ps.push(p); }); });
      if (!ps.length) return;
      var rec = { league: lg.name, level: lg.level, list: [], team: [] };
      CATS.forEach(function (c) {
        var best = null, bv = -1;
        ps.forEach(function (p) { var v = c.f(p.stats); if (v > bv) { bv = v; best = p; } });
        if (!best) return;
        rec.list.push(entry(S, best, c.cn, bv));
        give(S, best, '第' + S.season + '赛季 ' + lg.name + ' ' + c.cn);
        if (c.id === 'mvp') X.ATTRS.forEach(function (k) { best.m[k] = Math.min(X.ATTR_CAP, best.m[k] + U.rf(0, 1.2)); });
      });
      // 最佳阵容：每个位置 MVP 积分最高者
      var used = {};
      X.POS.forEach(function (pos) {
        var best = null, bv = -1;
        ps.forEach(function (p) { if (p.pos !== pos || used[p.id]) return; var v = CATS[0].f(p.stats); if (v > bv) { bv = v; best = p; } });
        if (!best) return;
        used[best.id] = 1;
        rec.team.push(entry(S, best, pos, bv));
        give(S, best, '第' + S.season + '赛季 ' + lg.name + ' 最佳阵容（' + X.POS_CN[pos] + '）');
      });
      out.push(rec);
    });
    S.awards = S.awards || {};
    S.awards[S.season] = out;
    // 记录巅峰综合
    Object.keys(S.players).forEach(function (id) { var p = S.players[id]; p.peak = Math.max(p.peak || 0, P.ovr(p)); });
  };

  // ===== 名人堂 =====
  function totals(p) {
    var t = { gp: 0, pts: 0, reb: 0, ast: 0, seasons: 0 };
    p.career.concat(p.stats && p.stats.gp ? [{ stats: p.stats }] : []).forEach(function (c) {
      if (!c.stats.gp) return;
      t.seasons++; t.gp += c.stats.gp; t.pts += c.stats.pts; t.reb += c.stats.oreb + c.stats.dreb; t.ast += c.stats.ast;
    });
    return t;
  }
  A.snapshot = function (S, p, team, why) {
    return {
      pid: p.id, kind: 'pro', name: p.name, pos: p.pos, h: p.h, age: p.age, star: p.star || 0, green: !!p.green,
      peak: U.r1(Math.max(p.peak || 0, P.ovr(p))), awards: (p.awards || []).slice(), tot: totals(p),
      team: team ? team.name : '', season: S.season, why: why || ''
    };
  };
  A.inHof = function (S, pid) { return (S.hof || []).some(function (h) { return h.pid === pid; }); };
  A.addHof = function (S, p, why) {
    S.hof = S.hof || [];
    var team = p.teamId && S.teams[p.teamId];
    if (team && team.kind === 'street') return '街球队员还没打过职业比赛，不能入选名人堂';
    var snap = A.snapshot(S, p, team, why);
    var i = S.hof.findIndex(function (h) { return h.pid === p.id; });
    if (i >= 0) { snap.why = S.hof[i].why || why; S.hof[i] = snap; return null; }
    if (S.hof.length >= A.HOF_MAX) return '名人堂已满（' + A.HOF_MAX + ' 人）';
    S.hof.push(snap);
    return null;
  };
  A.removeHof = function (S, pid) { S.hof = (S.hof || []).filter(function (h) { return h.pid !== pid; }); };

  // 退役时：本队获奖或效力 3 个赛季以上的球员自动入选
  A.onRetire = function (S, p, team) {
    if (!team || !team.isUser || team.kind !== 'pro') return;
    if (A.inHof(S, p.id)) { A.addHof(S, p); return; }
    var t = totals(p);
    if ((p.awards && p.awards.length) || t.seasons >= 3 || p.star >= 3) {
      if (!A.addHof(S, p, '退役自动入选')) W().msg(S, '🏛 ' + p.name + ' 退役，入选球队名人堂', 'player');
    }
  };
})(window.XBA);
