// 全明星周末（赛季中休息日）：你所在联赛的全明星赛 + 三分大赛 + 扣篮大赛
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, AS = {};
  X.AllStar = AS;
  var W = function () { return X.World; };

  function score(p) { var s = p.stats; return s.gp ? (s.pts + s.oreb + s.dreb + s.ast + s.stl + s.blk) / s.gp : P.ovr(p) / 3; }
  function leaguePlayers(S, lg) {
    var out = [];
    lg.teamIds.forEach(function (tid) { W().teamPlayers(S, S.teams[tid]).forEach(function (p) { if (p.inj <= 0) out.push(p); }); });
    return out;
  }
  function isMine(S, p) { var t = p.teamId && S.teams[p.teamId]; return !!(t && t.isUser); }
  function tn(S, p) { var t = S.teams[p.teamId]; return t ? t.name : ''; }

  // 每边 10 人：按位置各选 2 人，再按 MVP 积分补满
  function pickSide(pool, used) {
    var side = [];
    X.POS.forEach(function (pos) {
      pool.filter(function (p) { return p.pos === pos && !used[p.id]; }).sort(function (a, b) { return score(b) - score(a); }).slice(0, 2).forEach(function (p) { used[p.id] = 1; side.push(p); });
    });
    pool.filter(function (p) { return !used[p.id]; }).sort(function (a, b) { return score(b) - score(a); }).slice(0, 10 - side.length).forEach(function (p) { used[p.id] = 1; side.push(p); });
    return side;
  }

  function threeContest(S, players) {
    var cands = players.slice().sort(function (a, b) { return (b.a.thr * 0.8 + b.a.sht * 0.2) - (a.a.thr * 0.8 + a.a.sht * 0.2); }).slice(0, 8);
    function shoot(p) {
      var pct = U.clamp(0.22 + p.a.thr * 0.0058 + (P.hasTrait(p, 'sniper') ? 0.05 : 0), 0.15, 0.88), pts = 0, racks = [];
      for (var r = 0; r < 5; r++) { var row = ''; for (var b = 0; b < 5; b++) { var made = Math.random() < pct; if (made) pts += b === 4 ? 2 : 1; row += made ? (b === 4 ? '★' : '●') : '○'; } racks.push(row); }
      return { pid: p.id, name: p.name, team: tn(S, p), mine: isMine(S, p), pts: pts, racks: racks.join(' ') };
    }
    var r1 = cands.map(shoot).sort(function (a, b) { return b.pts - a.pts; });
    var fin = r1.slice(0, 3).map(function (x) { return shoot(S.players[x.pid]); }).sort(function (a, b) { return b.pts - a.pts; });
    return { r1: r1, fin: fin, winner: fin[0] };
  }

  var DUNKS = ['胯下换手暴扣', '360 度转身扣篮', '罚球线起跳扣篮', '背后换手扣篮', '风车灌篮', '空中接力双手暴扣', '飞跃队友扣篮', '战斧式劈扣', '单手大风车', '反身倒扣'];
  function dunkContest(S, players) {
    var dv = function (p) { return p.a.jmp * 0.6 + p.a.spd * 0.25 + Math.max(0, p.h - 185) * 0.6 + (P.hasTrait(p, 'dunker') ? 10 : 0) + p.iq.off * 0.1; };
    var cands = players.slice().sort(function (a, b) { return dv(b) - dv(a); }).slice(0, 4);
    function dunk(p) {
      var base = dv(p), tries = [];
      for (var i = 0; i < 2; i++) {
        var s = U.clamp(Math.round(30 + (base - 40) * 0.35 + U.gauss() * 4), 30, 50);
        if (Math.random() < 0.12) s = Math.max(30, s - 12); // 失误
        tries.push({ move: U.pick(DUNKS), score: s });
      }
      return { pid: p.id, name: p.name, team: tn(S, p), mine: isMine(S, p), tries: tries, pts: tries[0].score + tries[1].score };
    }
    var r1 = cands.map(dunk).sort(function (a, b) { return b.pts - a.pts; });
    var fin = r1.slice(0, 2).map(function (x) { return dunk(S.players[x.pid]); }).sort(function (a, b) { return b.pts - a.pts; });
    return { r1: r1, fin: fin, winner: fin[0] };
  }

  function reward(S, pid, title, fans) {
    var p = S.players[pid]; if (!p) return;
    p.awards = p.awards || []; p.awards.push('第' + S.season + '赛季 ' + title);
    if (isMine(S, p)) {
      var pro = W().userPro(S);
      pro.fans += fans; S.user.coins += 50; p.support = Math.min(100, p.support + 10);
      S.user.trophies.push({ season: S.season, name: p.name + '：' + title });
      W().msg(S, '⭐ ' + p.name + ' 获得 ' + title + '！球迷 +' + fans + '，奖励 50 游戏币', 'cup');
    }
  }

  AS.run = function (S, out) {
    var pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var pool = leaguePlayers(S, lg);
    if (pool.length < 20) return;
    var half = Math.ceil(lg.teamIds.length / 2);
    var eastIds = lg.teamIds.slice(0, half);
    var used = {};
    var east = pickSide(pool.filter(function (p) { return eastIds.indexOf(p.teamId) >= 0; }), used);
    var west = pickSide(pool.filter(function (p) { return eastIds.indexOf(p.teamId) < 0; }), used);
    var mk = function (name, color, ps) {
      var lu = E.autoLineup(ps, 'pro'), lu2 = E.autoLineup(ps, 'pro', lu);
      return { id: 'as-' + name, name: name, color: color, players: ps, prof: { off: {}, def: {} }, status: 1,
        presets: [{ lineup: lu, off: 'motion', def: 'man', core: -1, mark: -1 }, { lineup: lu2, off: 'fast', def: 'man', core: -1, mark: -1 }],
        config: { q: [0, 1, 0, 1], ot: 0, lead: -1, trail: -1 } };
    };
    var E1 = mk('东部全明星', '#1d428a', east), W1 = mk('西部全明星', '#c8102e', west);
    var res = E.play(Object.assign({ home: true }, E1), W1, { kind: 'pro', log: true, injuries: false, noStamina: true });
    var mid = W().saveMatch(S, 'allstar', res, E1, W1, 'pro', { cup: lg.name + ' 第' + S.season + '赛季全明星赛' });
    var best = null, bv = -99;
    res.box.h.concat(res.box.a).forEach(function (b) { if (b.eff > bv) { bv = b.eff; best = b.pid; } });
    var mine = east.concat(west).filter(function (p) { return isMine(S, p); });
    mine.forEach(function (p) {
      pro.fans += 300; p.support = Math.min(100, p.support + 5);
      p.awards = p.awards || []; p.awards.push('第' + S.season + '赛季 全明星');
    });
    if (mine.length) W().msg(S, '⭐ 你的 ' + mine.map(function (p) { return p.name; }).join('、') + ' 入选全明星！球迷 +' + mine.length * 300, 'cup');
    reward(S, best, '全明星赛 MVP', 800);
    var three = threeContest(S, pool), dunk = dunkContest(S, pool);
    reward(S, three.winner.pid, '三分大赛冠军', 500);
    reward(S, dunk.winner.pid, '扣篮大赛冠军', 500);
    S.allstar = S.allstar || {};
    S.allstar[S.season] = {
      league: lg.name, mid: mid, mvp: best, mvpName: S.players[best] ? S.players[best].name : '',
      east: east.map(function (p) { return { pid: p.id, name: p.name, pos: p.pos, team: tn(S, p), mine: isMine(S, p) }; }),
      west: west.map(function (p) { return { pid: p.id, name: p.name, pos: p.pos, team: tn(S, p), mine: isMine(S, p) }; }),
      three: three, dunk: dunk
    };
    out.allstar = S.season;
  };
})(window.XBA);
