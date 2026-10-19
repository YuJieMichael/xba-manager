// 助理教练：研究对手常用战术，按风格自动排阵（阵容、攻防战术、进攻核心、主防、轮换、领先/落后战术）
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, C = {};
  X.Coach = C;
  var W = function () { return X.World; };

  C.STYLES = {
    balance: { cn: '均衡', desc: '哪套最克对手用哪套', off: {}, def: {} },
    inside: { cn: '内线为王', desc: '多打强打内线、中锋策应', off: { inside: 0.3, post: 0.15 }, def: { z23: 0.03, m_in: 0.03 } },
    three: { cn: '三分雨', desc: '外线投篮为主', off: { outside: 0.35, pnr: 0.05 }, def: {} },
    run: { cn: '跑轰', desc: '快速进攻，靠速度打乱对手', off: { fast: 0.4 }, def: { man: 0.03 } },
    team: { cn: '团队篮球', desc: '整体进攻、挡拆配合', off: { motion: 0.3, pnr: 0.2 }, def: { z212: 0.03 } },
    defense: { cn: '铁血防守', desc: '优先选最克对手的防守', off: {}, def: {}, defFocus: true }
  };

  // 对手画像：赛季中最常用的进攻/防守战术，以及头号得分手所在的场上位置
  C.profile = function (S, opp) {
    var cnt = { off: {}, def: {} }, games = 0;
    S.leagues.forEach(function (lg) {
      lg.results.forEach(function (round) {
        (round || []).forEach(function (r) {
          if (!r.tac) return;
          if (r.h === opp.id) { inc(cnt.off, r.tac[0]); inc(cnt.def, r.tac[1]); games++; }
          else if (r.a === opp.id) { inc(cnt.off, r.tac[2]); inc(cnt.def, r.tac[3]); games++; }
        });
      });
    });
    var pr = opp.boards && (opp.boards.league || opp.boards.cup).presets[0];
    var off = top(cnt.off) || (pr ? pr.off : 'motion'), def = top(cnt.def) || (pr ? pr.def : 'man');
    var star = null, sv = -1, starSlot = -1;
    if (pr) pr.lineup.forEach(function (id, s) {
      var p = S.players[id]; if (!p) return;
      var v = p.stats.gp ? p.stats.pts / p.stats.gp : P.ovr(p) / 3;
      if (v > sv) { sv = v; star = p; starSlot = s; }
    });
    return { off: off, def: def, games: games, star: star, starSlot: starSlot };
  };
  function inc(o, k) { if (k) o[k] = (o[k] || 0) + 1; }
  function top(o) { var b = null, bv = 0; for (var k in o) if (o[k] > bv) { bv = o[k]; b = k; } return b; }

  function pickOff(players, lineup, oppDef, style) {
    var sc = E.offScores(players, lineup, 'pro'), best = null, bv = -1;
    for (var t in sc) {
      var v = sc[t] * (1 + (style.off[t] || 0)) * (1 - E.counter(t, oppDef));
      if (v > bv) { bv = v; best = t; }
    }
    return best;
  }
  function pickDef(players, lineup, oppOff, style) {
    var court = lineup.map(function (id) { return players.find(function (p) { return p.id === id; }); }).filter(Boolean);
    var teamIQ = U.avg(court.map(function (p) { return p.iq.team; })), defIQ = U.avg(court.map(function (p) { return p.iq.def; }));
    var best = null, bv = -99;
    X.DEF_TACTICS.forEach(function (t) {
      var v = E.counter(oppOff, t.id) * (style.defFocus ? 1.6 : 1) + (style.def[t.id] || 0) + ((t.zone ? teamIQ : defIQ) - 40) / 600;
      if (v > bv) { bv = v; best = t.id; }
    });
    return best;
  }
  function coreSlot(S, lineup) {
    var best = -1, bv = -1;
    lineup.forEach(function (id, s) { var p = S.players[id]; if (!p) return; var v = P.ovr(p) * (0.6 + p.lead / 150); if (v > bv) { bv = v; best = s; } });
    return best;
  }

  // 为某个战术板排阵；oppId 为空时按均衡阵容排
  C.prepare = function (S, boardKey, oppId) {
    var team = W().userPro(S);
    var style = C.STYLES[(S.user.coach && S.user.coach.style) || 'balance'];
    var ps = W().teamPlayers(S, team).filter(function (p) { return p.inj <= 0; });
    if (ps.length < 5) return null;
    var opp = oppId && S.teams[oppId];
    var prof = opp ? C.profile(S, opp) : { off: 'motion', def: 'man', starSlot: -1 };
    var lu0 = E.autoLineup(ps, 'pro');
    var starters = lu0.map(function (id) { return S.players[id]; }).filter(Boolean);
    var tired = starters.slice().sort(function (a, b) { return (a.st + a.a.sta * 0.3) - (b.st + b.a.sta * 0.3); }).slice(0, 3).map(function (p) { return p.id; });
    var lu1 = E.autoLineup(ps, 'pro', tired);
    var off0 = pickOff(ps, lu0, prof.def, style), off1 = pickOff(ps, lu1, prof.def, style);
    var def0 = pickDef(ps, lu0, prof.off, style), def1 = pickDef(ps, lu1, prof.off, style);
    var sc = E.offScores(ps, lu0, 'pro');
    var chase = sc.outside * (1 - E.counter('outside', prof.def)) >= sc.fast * (1 - E.counter('fast', prof.def)) ? 'outside' : 'fast';
    var mark = prof.starSlot;
    var board = {
      presets: [
        { name: '主力阵容', lineup: lu0, off: off0, def: def0, core: coreSlot(S, lu0), mark: mark },
        { name: '轮换阵容', lineup: lu1, off: off1, def: def1, core: coreSlot(S, lu1), mark: mark },
        { name: '领先保守', lineup: lu1.slice(), off: 'motion', def: def1, core: -1, mark: mark },
        { name: '落后追分', lineup: lu0.slice(), off: chase, def: 'man', core: coreSlot(S, lu0), mark: mark }
      ],
      config: { q: [0, 1, 0, 0], ot: 0, lead: 2, trail: 3 }
    };
    team.boards[boardKey] = board;
    var rep = {
      board: boardKey, opp: opp ? opp.name : '', oppOff: prof.off, oppDef: prof.def, games: prof.games || 0,
      off: off0, def: def0, style: style.cn, star: prof.star ? prof.star.name : '', mark: mark,
      core: S.players[lu0[board.presets[0].core]] ? S.players[lu0[board.presets[0].core]].name : '', season: S.season, day: S.day
    };
    S.user.lastCoach = rep;
    return rep;
  };

  // 下一场联赛的对手
  C.nextLeagueOpp = function (S) {
    var pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var r = W().roundOfDay(S.day);
    for (var i = (r || lg.results.length + 1) - 1; i < lg.schedule.length; i++) {
      var g = (lg.schedule[i] || []).find(function (x) { return x[0] === pro.id || x[1] === pro.id; });
      if (g) return g[0] === pro.id ? g[1] : g[0];
    }
    return null;
  };

  C.autoOn = function (S) { return !!(S.user.coach && S.user.coach.auto); };

  // 街球一键排阵
  C.prepareStreet = function (S) {
    var team = W().userStreet(S), ps = W().teamPlayers(S, team).filter(function (p) { return p.inj <= 0; });
    if (ps.length < 3) return;
    var lu = E.autoLineup(ps, 'street');
    var starters = lu.map(function (id) { return S.players[id]; }).filter(Boolean);
    var tired = starters.slice().sort(function (a, b) { return a.st - b.st; }).slice(0, 1).map(function (p) { return p.id; });
    var lu2 = E.autoLineup(ps, 'street', tired);
    var off = E.suggestOff(ps, lu, 'street');
    team.presets = [
      { name: '先发', lineup: lu, off: off, def: 'man', intensity: 2 },
      { name: '领先', lineup: lu2, off: 'motion', def: 'z212', intensity: 1 },
      { name: '落后', lineup: lu.slice(), off: 'outside', def: 'man', intensity: 3 }
    ];
    team.config = { start: 0, lead5: -1, lead10: 1, trail5: -1, trail10: 2 };
  };
})(window.XBA);
