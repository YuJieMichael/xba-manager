// 世界：联赛金字塔、赛程、AI 球队、每日推进、赛季更替、财政
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, W = {};
  function UIS() { return X.UI && X.UI.S; }
  X.World = W;

  var FANS_BASE = { 1: 35000, 2: 15000, 3: 7000, 4: 3000 };
  var TICKET_REF = { 1: 95, 2: 65, 3: 45, 4: 30 };
  var BRANDS = ['耐克', '阿迪达斯', '李宁', '安踏', '匹克', '特步', '361°', '可口可乐', '百事可乐', '红牛', '佳得乐', '王老吉', '蒙牛', '伊利', '青岛啤酒', '雪花啤酒', '中国移动', '联想', '海尔', '格力', '美的', '长虹', '康师傅', '统一', '娃哈哈', '农夫山泉', '肯德基', '麦当劳', '必胜客', '腾讯QQ', '网易', '新浪', '盛大', '九城', '巨人网络', '金山', '步步高', '诺基亚', '摩托罗拉', '三星', '索尼', '飞利浦'];

  W.levelInfo = function (lv) { return X.LEVELS[lv - 1]; };
  W.userPro = function (S) { return S.teams[S.user.proId]; };
  W.userStreet = function (S) { return S.teams[S.user.streetId]; };
  W.teamPlayers = function (S, t) { return t.playerIds.map(function (id) { return S.players[id]; }).filter(Boolean); };
  W.league = function (S, id) { return S.leagues.find(function (l) { return l.id === id; }); };
  W.roundOfDay = function (d) { return d < 13 ? d + 1 : d === 13 ? 0 : d < 27 ? d : 0; };
  W.dayLabel = function (S) {
    var r = W.roundOfDay(S.day);
    if (r) return '第 ' + S.season + ' 赛季 第 ' + r + ' 轮';
    if (X.Playoffs && X.Playoffs.isDay(S.day)) return '第 ' + S.season + ' 赛季 ' + X.Playoffs.label(S.day);
    return '第 ' + S.season + ' 赛季 ' + (S.day === 13 ? '赛季中休息日' : '赛季末休息日');
  };

  W.msg = function (S, txt, type) {
    S.msgs.unshift({ id: U.uid(S, 'm'), season: S.season, day: S.day, txt: txt, type: type || 'sys', read: false });
    if (S.msgs.length > 300) S.msgs.length = 300;
  };

  // ===== 资金 =====
  function ledger(S) {
    var L = S.user.ledger[S.season];
    if (!L) L = S.user.ledger[S.season] = { days: {}, inc: 0, exp: 0 };
    return L;
  }
  W.earn = function (S, v, label) {
    v = Math.round(v); if (!v) return;
    S.user.money += v;
    var L = ledger(S); (L.days[S.day] = L.days[S.day] || []).push({ t: label, v: v }); L.inc += v;
  };
  W.spend = function (S, v, label) {
    v = Math.round(v); if (!v) return;
    S.user.money -= v;
    var L = ledger(S); (L.days[S.day] = L.days[S.day] || []).push({ t: label, v: -v }); L.exp += v;
  };

  // ===== 球队生成 =====
  var usedNames = {};
  function teamName(S) {
    for (var i = 0; i < 200; i++) {
      var n = U.pick(X.TEAM_CITY) + U.pick(X.TEAM_NICK);
      if (!S.usedNames[n]) { S.usedNames[n] = 1; return n; }
    }
    return '球队' + U.ri(1000, 9999);
  }

  W.assignNumber = function (S, team, p) {
    var used = {};
    W.teamPlayers(S, team).forEach(function (x) { if (x !== p) used[x.num] = 1; });
    var prefer = [p.num, U.ri(0, 55)];
    for (var i = 0; i < prefer.length; i++) if (prefer[i] && !used[prefer[i]] && prefer[i] <= 55) { p.num = prefer[i]; return; }
    for (var n = 1; n <= 99; n++) if (!used[n]) { p.num = n; return; }
  };

  W.addToTeam = function (S, team, p) {
    if (p.teamId && S.teams[p.teamId]) W.removeFromTeam(S, S.teams[p.teamId], p);
    p.teamId = team.id;
    p.joined = S.dayNo;
    team.playerIds.push(p.id);
    W.assignNumber(S, team, p);
    if (team.kind === 'pro' && !p.salary) { p.salary = P.salaryFor(p); p.contract = 26; }
  };
  W.removeFromTeam = function (S, team, p) {
    team.playerIds = team.playerIds.filter(function (id) { return id !== p.id; });
    p.teamId = null;
    // 从战术预设中移除
    W.allPresets(team).forEach(function (pr) { pr.lineup = pr.lineup.map(function (id) { return id === p.id ? null : id; }); });
  };
  W.deletePlayer = function (S, p) {
    if (p.teamId && S.teams[p.teamId]) W.removeFromTeam(S, S.teams[p.teamId], p);
    delete S.players[p.id];
  };

  W.allPresets = function (team) {
    if (team.boards) {
      var all = [];
      for (var b in team.boards) all = all.concat(team.boards[b].presets);
      return all;
    }
    return team.presets || [];
  };

  function proPresetDefaults(S, team) {
    var ps = W.teamPlayers(S, team);
    var lu = E.autoLineup(ps, 'pro');
    var starters = lu.map(function (id) { return S.players[id]; }).filter(Boolean);
    var tired = starters.slice().sort(function (a, b) { return a.a.sta - b.a.sta; }).slice(0, 3).map(function (p) { return p.id; });
    var lu2 = E.autoLineup(ps, 'pro', tired);
    var off = E.suggestOff(ps, lu, 'pro');
    var def = U.pick(['man', 'man', 'z23', 'z212', 'm_in', 'm_out', 'z32']);
    return [
      { name: '主力阵容', lineup: lu, off: off, def: def, core: -1, mark: -1 },
      { name: '轮换阵容', lineup: lu2, off: E.suggestOff(ps, lu2, 'pro'), def: def, core: -1, mark: -1 },
      { name: '内线阵容', lineup: lu.slice(), off: 'inside', def: 'z23', core: 0, mark: -1 },
      { name: '外线阵容', lineup: lu.slice(), off: 'outside', def: 'z32', core: 3, mark: -1 }
    ];
  }
  W.defaultProBoard = function (S, team) {
    return { presets: proPresetDefaults(S, team), config: { q: [0, 1, 0, 0], ot: 0, lead: -1, trail: -1 } };
  };
  W.defaultStreetTactics = function (S, team) {
    var ps = W.teamPlayers(S, team);
    var lu = E.autoLineup(ps, 'street');
    var off = E.suggestOff(ps, lu, 'street');
    return {
      presets: [
        { name: '先发', lineup: lu, off: off, def: 'man', intensity: 2 },
        { name: '领先', lineup: lu.slice(), off: off, def: 'z212', intensity: 1 },
        { name: '落后', lineup: lu.slice(), off: 'outside', def: 'man', intensity: 3 }
      ],
      config: { start: 0, lead5: -1, lead10: 1, trail5: -1, trail10: 2 }
    };
  };

  W.refreshAITactics = function (S, team) {
    team.boards = { league: W.defaultProBoard(S, team) };
  };

  function genAIPlayers(S, team, level, strength) {
    var avg = W.levelInfo(level).avg + strength;
    var pos = ['C', 'C', 'PF', 'PF', 'SF', 'SF', 'SG', 'SG', 'PG', 'PG', U.pick(X.POS)];
    pos.forEach(function (ps, i) {
      var starter = i % 2 === 0;
      var p = P.gen(S, { pos: ps, age: U.ri(20, 33), ovr: Math.max(12, avg + (starter ? 3 : -4) + U.gauss() * 3.5) });
      W.addToTeam(S, team, p);
      p.joined = -99;
    });
  }

  W.genAITeam = function (S, level, leagueId) {
    var t = {
      id: U.uid(S, 't'), name: teamName(S), color: U.pick(X.JERSEY_COLORS).c, kind: 'pro', isUser: false,
      leagueId: leagueId, level: level, playerIds: [], prof: { off: {}, def: {} },
      fans: Math.round(FANS_BASE[level] * U.rf(0.7, 1.3)), staff: { trainer: null, nutri: null, doctor: null },
      rec: { w: 0, l: 0, pf: 0, pa: 0 }, reg: S.nextId, strength: U.gauss() * 2.5
    };
    S.teams[t.id] = t;
    genAIPlayers(S, t, level, t.strength);
    W.refreshAITactics(S, t);
    return t;
  };

  // 双循环赛程（圆圈法）
  W.genSchedule = function (ids) {
    var n = ids.length, arr = U.shuffle(ids.slice()), rounds = [];
    for (var r = 0; r < n - 1; r++) {
      var games = [];
      for (var i = 0; i < n / 2; i++) {
        var a = arr[i], b = arr[n - 1 - i];
        games.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      rounds.push(games);
      arr.splice(1, 0, arr.pop());
    }
    var second = rounds.map(function (g) { return g.map(function (x) { return [x[1], x[0]]; }); });
    return rounds.concat(second);
  };

  W.standings = function (S, lg) {
    return lg.teamIds.map(function (id) { return S.teams[id]; }).sort(function (a, b) {
      return (b.rec.w - a.rec.w) || ((b.rec.pf - b.rec.pa) - (a.rec.pf - a.rec.pa)) || (a.reg - b.reg);
    });
  };

  // ===== 新游戏 =====
  W.newGame = function (manager) {
    var S = {
      version: 1, nextId: 1, dayNo: 0, season: 1, day: 0, players: {}, teams: {}, leagues: [], usedNames: {},
      msgs: [], market: [], staffPool: [], cups: [], matches: {}, myMatches: [], draft: null, history: [], adOffers: [], awards: {}, hof: [], xcup: null, xcupInvites: null,
      user: {
        manager: manager || '经理', proId: null, streetId: null, money: 500000, coins: 50, streetLevel: 1, streetPts: 0,
        items: { double: 1, physio: 2, scout: 1, reset: 0, hidden: 3, newbie: 20, fund: 0 }, selectCards: 0, proSeasons: 0,
        watch: [], proTP: 0, doubleUntil: 0, doubleAuto: false, wk: null, wkDay: -1, wkPts: 0, ledger: {}, trophies: [], onboarded: false, member: true
      }
    };
    // 联赛金字塔
    X.LEVELS.forEach(function (L) {
      for (var i = 0; i < L.leagues; i++) {
        var lg = { id: 'L' + L.level + '-' + (i + 1), level: L.level, idx: i, name: L.level === 1 ? 'XBA 超级联赛' : L.level + '级联赛 ' + (i + 1) + ' 区', teamIds: [], schedule: [], results: [] };
        S.leagues.push(lg);
      }
    });
    S.leagues.forEach(function (lg) {
      var n = (lg.level === 4 && lg.idx === 0) ? X.LEAGUE_TEAMS - 1 : X.LEAGUE_TEAMS;
      for (var i = 0; i < n; i++) lg.teamIds.push(W.genAITeam(S, lg.level, lg.id).id);
    });
    // 用户球队（新手学堂里命名、选人）
    var lg4 = S.leagues.find(function (l) { return l.level === 4 && l.idx === 0; });
    var pro = {
      id: U.uid(S, 't'), name: '我的球队', color: '#c8102e', kind: 'pro', isUser: true, leagueId: lg4.id, level: 4, playerIds: [],
      prof: { off: {}, def: {} }, fans: 3000, staff: { trainer: null, nutri: null, doctor: null }, rec: { w: 0, l: 0, pf: 0, pa: 0 }, reg: S.nextId,
      arena: { lv: 1, build: null }, ticket: 30, ads: [], morale: 1, bonus: 0
    };
    var street = {
      id: U.uid(S, 't'), name: '我的街球队', color: '#c8102e', kind: 'street', isUser: true, playerIds: [], prof: { off: {}, def: {} },
      staff: { trainer: null, nutri: null, doctor: null }
    };
    S.teams[pro.id] = pro; S.teams[street.id] = street;
    S.user.proId = pro.id; S.user.streetId = street.id;
    lg4.teamIds.push(pro.id);
    S.leagues.forEach(function (lg) { lg.schedule = W.genSchedule(lg.teamIds); lg.results = []; });
    X.Staff.refreshPool(S);
    // 新手选人候选
    var cand = { pro: [], street: [], proBudget: 1600000, streetBudget: 600000 };
    var pos = ['C', 'C', 'C', 'PF', 'PF', 'PF', 'PF', 'SF', 'SF', 'SF', 'SF', 'SG', 'SG', 'SG', 'SG', 'PG', 'PG', 'PG', 'PG', 'C', 'PF', 'SF', 'SG', 'PG'];
    pos.forEach(function (ps) {
      var p = P.gen(S, { pos: ps, age: U.ri(19, 31), ovr: U.rf(28, 40) });
      p.price = Math.round(P.value(p) * 0.55 / 1000) * 1000;
      cand.pro.push(p.id);
    });
    for (var i = 0; i < 14; i++) {
      var sp = P.gen(S, { pos: X.POS[i % 5], age: U.ri(15, 19), ovr: U.rf(16, 26), street: true });
      sp.price = Math.round(P.value(sp) * 0.5 / 1000) * 1000;
      cand.street.push(sp.id);
    }
    S.onboard = cand;
    X.Market.daily(S);
    W.genAdOffers(S);
    return S;
  };

  W.finishOnboard = function (S, info) {
    var pro = W.userPro(S), st = W.userStreet(S);
    pro.name = info.teamName; pro.color = info.color;
    st.name = info.streetName || (info.teamName + '街球队'); st.color = info.color;
    S.user.manager = info.manager || S.user.manager;
    info.pro.forEach(function (id) { var p = S.players[id]; W.addToTeam(S, pro, p); p.salary = P.salaryFor(p); p.contract = U.ri(26, 52); p.joined = -1; });
    info.street.forEach(function (id) { var p = S.players[id]; W.addToTeam(S, st, p); p.tp = 20; p.joined = -1; });
    // 系统赠送的街球员（一般较差）凑满 4 人
    while (st.playerIds.length < 4) { var g = P.gen(S, { age: U.ri(15, 18), ovr: U.rf(12, 18), street: true }); W.addToTeam(S, st, g); }
    // 删除没选中的候选
    S.onboard.pro.concat(S.onboard.street).forEach(function (id) { var p = S.players[id]; if (p && !p.teamId) delete S.players[id]; });
    S.onboard = null;
    pro.boards = { league: W.defaultProBoard(S, pro), cup: W.defaultProBoard(S, pro), other: W.defaultProBoard(S, pro) };
    var stt = W.defaultStreetTactics(S, st);
    st.presets = stt.presets; st.config = stt.config;
    S.user.onboarded = true;
    X.XCup.setup(S, true);
    X.Alliance.init(S);
    X.Goals.newSeason(S);
    X.Cups.daily(S);
    var lg = W.league(S, pro.leagueId);
    S.usedNames[pro.name] = 1;
    W.msg(S, '欢迎来到 XBA 篮球经理！你的球队 ' + pro.name + ' 已加入 ' + lg.name + '。系统赠送启动资金 50 万、20 张新人杯邀请函。', 'sys');
    W.msg(S, '新手提示：先去「职员管理」招募训练师、营养师、队医；街球队靠打「训练赛」和「新人杯」获得训练点来训练球员。', 'sys');
  };

  // ===== 阵容状态（与主力工资超出工资帽的多少有关）=====
  W.payroll = function (S, team) { return U.sum(W.teamPlayers(S, team).map(function (p) { return p.salary || 0; })); };
  W.cap = function (team) { return W.levelInfo(team.level).cap; };
  W.lineupStatus = function (S, team) {
    var main = W.teamPlayers(S, team).map(function (p) { return p.salary; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    var tot = U.sum(main), cap = W.cap(team);
    if (tot <= cap) return 1;
    return Math.max(0.7, 1 - (tot - cap) / cap * 0.6);
  };

  // 引擎参数
  W.sideCfg = function (S, team, board, extra) {
    var ps = W.teamPlayers(S, team);
    var cfg = { id: team.id, name: team.name, color: team.color, players: ps, prof: team.prof };
    if (team.kind === 'pro') {
      var b = (team.boards[board] || team.boards.league);
      cfg.presets = b.presets; cfg.config = b.config;
      cfg.status = W.lineupStatus(S, team) * (team.isUser ? 1 + 0.01 * X.Manager.lv(S, 'locker') : 1);
      cfg.morale = team.morale || 1;
    } else {
      cfg.presets = team.presets; cfg.config = team.config; cfg.status = 1;
    }
    for (var k in extra || {}) cfg[k] = extra[k];
    return cfg;
  };

  // 比赛结果应用到球员（体力、伤病、统计、意识）
  W.applyMatch = function (S, res, opts) {
    opts = opts || {};
    if (res.hl && res.hl.length) S._hlDay = (S._hlDay || []).concat(res.hl);
    for (var pid in res.stam) { var p = S.players[pid]; if (p && !opts.noStamina) p.st = Math.round(res.stam[pid]); }
    res.injuries.forEach(function (inj) {
      var p = S.players[inj.pid]; if (!p) return;
      var t = p.teamId && S.teams[p.teamId];
      if (t && t.isUser) inj.rounds = Math.max(1, Math.round(inj.rounds * X.Manager.injMul(S)));
      p.inj = Math.max(p.inj, inj.rounds); p.injName = inj.name;
      if (t && t.isUser) W.msg(S, p.name + ' 在比赛中受伤（' + inj.name + '），预计伤停 ' + inj.rounds + ' 轮', 'inj');
    });
    res.box.h.concat(res.box.a).forEach(function (b) {
      var p = S.players[b.pid]; if (!p) return;
      if (b.min > 0) P.iqGrow(p, b.min);
      if (opts.stats) P.addStats(p, b);
      if (opts.support && b.min > 0) p.support = U.clamp(p.support + (b.eff - 8) * 0.25 + 0.3, 0, 100);
    });
  };

  // 职业队训练点：每场比赛按上场时间和表现累积到全队共用的点数池
  W.earnProTP = function (S, res, userIsHome) {
    var box = userIsHome ? res.box.h : res.box.a, tot = 0;
    box.forEach(function (b) { if (b.min > 0) tot += Math.round(b.min / 6 + Math.max(0, b.eff) * 0.3); });
    tot = Math.round(tot * X.Manager.tpMul(S));
    S.user.proTP = (S.user.proTP || 0) + tot;
    return tot;
  };

  // 战术熟练度
  W.addProf = function (team, used, S) {
    var mul = team.isUser && (S || UIS()) ? 1 + 0.25 * X.Manager.lv(S || UIS(), 'tactic') : 1;
    ['off', 'def'].forEach(function (w) {
      for (var id in used[w]) team.prof[w][id] = (team.prof[w][id] || 0) + used[w][id] / 600 * mul;
    });
  };

  W.saveMatch = function (S, type, res, home, away, kind, extra) {
    var id = U.uid(S, 'g');
    var rec = {
      id: id, type: type, kind: kind, season: S.season, day: S.day, dayNo: S.dayNo,
      home: { id: home.id, name: home.name, color: home.color }, away: { id: away.id, name: away.name, color: away.color },
      hs: res.hs, as: res.as, qs: res.qs, log: res.log, box: res.box, forfeit: res.forfeit
    };
    for (var k in extra || {}) rec[k] = extra[k];
    // 记下球员名字（球员可能退役/离队）
    rec.names = {};
    var extraPs = (home.players || []).concat(away.players || []);
    res.box.h.concat(res.box.a).forEach(function (b) {
      var p = S.players[b.pid] || extraPs.find(function (x) { return x.id === b.pid; });
      if (p) rec.names[b.pid] = [p.name, p.pos, p.num];
    });
    S.matches[id] = rec;
    S.myMatches.unshift(id);
    if (S.myMatches.length > 80) { var old = S.myMatches.pop(); delete S.matches[old]; }
    // 只保留最近 30 场的文字直播，节省存档空间
    var stale = S.myMatches[30];
    if (stale && S.matches[stale]) S.matches[stale].log = null;
    return id;
  };

  // ===== 联赛比赛 =====
  function playLeagueRound(S, lg, round, out) {
    var games = lg.schedule[round - 1] || [];
    var results = [];
    games.forEach(function (g) {
      var h = S.teams[g[0]], a = S.teams[g[1]];
      var isUser = h.isUser || a.isUser;
      var res = W.preResult(S, h, a) || E.play(W.sideCfg(S, h, 'league', { home: true }), W.sideCfg(S, a, 'league'), { kind: 'pro', log: isUser, injuries: true });
      W.applyMatch(S, res, { stats: true, support: true });
      W.addProf(h, res.used.h, S); W.addProf(a, res.used.a, S);
      h.rec.pf += res.hs; h.rec.pa += res.as; a.rec.pf += res.as; a.rec.pa += res.hs;
      if (res.hs > res.as) { h.rec.w++; a.rec.l++; } else { a.rec.w++; h.rec.l++; }
      var top = function (o) { var b = null, bv = -1; for (var k in o) if (o[k] > bv) { bv = o[k]; b = k; } return b; };
      // 比赛录像：记录双方主要使用的进攻/防守战术，供研究对手
      var r = { h: h.id, a: a.id, hs: res.hs, as: res.as, tac: [top(res.used.h.off), top(res.used.h.def), top(res.used.a.off), top(res.used.a.def)] };
      if (isUser) {
        r.mid = W.saveMatch(S, 'league', res, h, a, 'pro', { round: round, league: lg.name, proTP: W.earnProTP(S, res, h.isUser) });
        out.userGame = r.mid;
        userGameFinance(S, h.isUser ? h : a, h.isUser, res, h.isUser ? a.id : h.id);
        X.Rivals.afterGame(S, h.isUser ? a.id : h.id, h.isUser ? res.hs - res.as : res.as - res.hs, 'league');
        X.Manager.xp(S, (h.isUser ? res.hs > res.as : res.as > res.hs) ? 12 : 4);
      }
      // AI 球迷变化
      [h, a].forEach(function (t) {
        if (t.isUser) return;
        var won = (t === h) === (res.hs > res.as);
        t.fans = Math.max(500, Math.round(t.fans * (won ? 1.006 : 0.997)));
      });
      results.push(r);
    });
    lg.results[round - 1] = results;
  }

  W.attendance = function (S, team) {
    var seats = X.ARENA[team.arena.lv - 1].seats;
    var ref = TICKET_REF[team.level];
    var g = team.rec.w + team.rec.l, wr = g ? team.rec.w / g : 0.5;
    var demand = team.fans * (0.8 + 0.4 * wr) * U.clamp(Math.pow(ref / Math.max(1, team.ticket), 1.4), 0, 1.6);
    return Math.round(Math.min(seats, demand));
  };

  W.userGameFinance = function (S, team, home, res, oppId) { return userGameFinance(S, team, home, res, oppId); };
  function userGameFinance(S, team, home, res, oppId) {
    var my = home ? res.hs : res.as, op = home ? res.as : res.hs, won = my > op, margin = my - op;
    var rival = oppId && X.Rivals.isRival(S, oppId), rm = rival ? 1.5 : 1, hm = 1 + 0.05 * X.Manager.lv(S, 'home');
    if (home && !(res.forfeit && res.forfeit.pre)) {
      var att = W.attendance(S, team);
      team.lastAtt = att;
      W.earn(S, att * team.ticket * rm * hm, '主场门票（' + att + '人）' + (rival ? '·宿敌对决' : ''));
      var jersey = U.sum(W.teamPlayers(S, team).map(function (p) { return p.support / 100; })) * team.fans * (won ? 1.4 : 1.0);
      W.earn(S, jersey * rm, '球衣销售' + (rival ? '·宿敌对决' : ''));
    }
    var df = won ? 0.008 + Math.min(30, margin) * 0.0007 : -0.004 + Math.max(-30, margin) * 0.0002;
    if (!home) df *= 0.5;
    if (rival) df *= 2;
    var before = team.fans;
    team.fans = Math.max(300, Math.round(team.fans * (1 + df) + (won ? 15 : 0)));
    // 向本级别基础球迷数缓慢靠拢
    team.fans += Math.round((FANS_BASE[team.level] - team.fans) * 0.004);
  }

  // 每轮薪水、广告、奢侈税
  function userRoundFinance(S) {
    var team = W.userPro(S);
    var pay = W.payroll(S, team);
    W.spend(S, pay, '球员工资');
    if (team.bonus) { W.spend(S, team.bonus, '球员奖金'); team.bonus = 0; }
    var cap = W.cap(team);
    if (pay > cap) W.spend(S, 3000 + (pay - cap) * 5, '奢侈税');
    team.ads = team.ads.filter(function (ad) {
      W.earn(S, ad.total / ad.rounds, '广告：' + ad.brand);
      ad.left -= 1;
      if (ad.left <= 0) { W.msg(S, '广告合同到期：' + ad.brand, 'fin'); return false; }
      return true;
    });
    team.morale = Math.max(1, (team.morale || 1) - 0.01);
  }

  W.adCapacity = function (team) {
    return Math.min(X.ARENA[team.arena.lv - 1].slots, Math.floor(team.fans / 4000) + 1);
  };
  W.genAdOffers = function (S) {
    var team = W.userPro(S);
    var used = {};
    S.adOffers = [];
    (team.ads || []).forEach(function (a) { used[a.brand] = 1; });
    for (var i = 0; i < 6; i++) {
      var b = U.pick(BRANDS); if (used[b]) continue; used[b] = 1;
      var rounds = U.pick([5, 10, 13, 20, 26]);
      var per = Math.round((team.fans / 1000 * 900 * U.rf(0.6, 1.4) + 1500) * (1 + 0.1 * X.Manager.lv(S, 'biz')));
      S.adOffers.push({ id: U.uid(S, 'ad'), brand: b, rounds: rounds, total: per * rounds });
    }
  };

  // ===== 每日推进 =====
  // 亲自执教：今天你的比赛（联赛或季后赛）
  W.userGameToday = function (S) {
    var pro = W.userPro(S), round = W.roundOfDay(S.day);
    if (round) {
      var lg = W.league(S, pro.leagueId), g = (lg.schedule[round - 1] || []).find(function (x) { return x[0] === pro.id || x[1] === pro.id; });
      return g ? { kind: 'league', h: g[0], a: g[1], label: lg.name + ' 第' + round + '轮' } : null;
    }
    if (X.Playoffs.isDay(S.day)) {
      X.Playoffs.prepareDay(S);
      var L = S.playoffs.leagues[pro.leagueId], st = X.Playoffs.stageOf(S.day), gn = X.Playoffs.gameOf(S.day);
      var s = L && L.rounds[st] && L.rounds[st].find(function (x) { return (x.a === pro.id || x.b === pro.id) && !x.w; });
      if (!s) return null;
      var home = gn === 2 ? s.b : s.a;
      return { kind: 'playoff', h: home, a: home === s.a ? s.b : s.a, label: X.Playoffs.label(S.day) };
    }
    return null;
  };
  // 已经亲自打完的比赛结果
  W.preResult = function (S, h, a) {
    var p = S._pre;
    if (p && p.h === h.id && p.a === a.id) { S._pre = null; return p.res; }
    return null;
  };

  W.advance = function (S, pre) {
    S._pre = pre || null;
    var out = { msgs: [], userGame: null, cupResults: [] };
    var round = W.roundOfDay(S.day);
    var pro = W.userPro(S), street = W.userStreet(S);
    if (S.draft && !S.draft.done) X.Market.draftAutoFinish(S);

    // 1. 职业联赛
    if (round) {
      // 赛前：伤病轮数 -1
      Object.keys(S.players).forEach(function (id) {
        var p = S.players[id];
        if (p.inj > 0 && p.teamId && S.teams[p.teamId] && S.teams[p.teamId].kind === 'pro') { p.inj -= 1; if (p.inj === 0 && S.teams[p.teamId].isUser) W.msg(S, p.name + ' 伤愈复出', 'inj'); }
      });
      if (X.Coach.autoOn(S)) { var oppId = X.Coach.nextLeagueOpp(S); if (oppId) X.Coach.prepare(S, 'league', oppId); }
      S.leagues.forEach(function (lg) { playLeagueRound(S, lg, round, out); });
      userRoundFinance(S);
      // 合同、生日
      Object.keys(S.teams).forEach(function (tid) {
        var t = S.teams[tid];
        W.teamPlayers(S, t).forEach(function (p) {
          if (p.bday === round) {
            var m = P.birthday(S, p, t.kind === 'pro');
            if (m && t.isUser) W.msg(S, m, 'player');
          }
          if (t.kind === 'pro') {
            p.contract -= 1;
            if (p.contract <= 0) {
              if (t.isUser) {
                p.salary = Math.round(P.salaryFor(p) * 1.3); p.contract = 10;
                W.msg(S, p.name + ' 合同到期，系统自动续约短合同 10 轮，工资涨至 ' + U.money(p.salary), 'player');
              } else { p.salary = P.salaryFor(p); p.contract = U.ri(20, 52); }
            } else if (t.isUser && p.contract === 5) W.msg(S, p.name + ' 合同仅剩 5 轮，请及时续约', 'player');
          }
        });
      });
    }

    // 1.2 季后赛
    if (X.Playoffs.isDay(S.day)) {
      Object.keys(S.players).forEach(function (id) {
        var p = S.players[id];
        if (p.inj > 0 && p.teamId && S.teams[p.teamId] && S.teams[p.teamId].kind === 'pro') { p.inj -= 1; if (p.inj === 0 && S.teams[p.teamId].isUser) W.msg(S, p.name + ' 伤愈复出', 'inj'); }
      });
      X.Playoffs.playDay(S, out);
    }

    // 1.5 XBA杯
    X.XCup.playDay(S, out);

    // 2. 街球杯赛
    X.Cups.resolveDay(S, out);

    // 2.5 联盟杯 / 联盟至尊杯
    if (S.day === 8) X.Alliance.allianceCup(S, out);
    if (S.day === 22) X.Alliance.supremeCup(S, out);

    // 3. 转会市场结算
    X.Market.resolve(S, out);

    // 4. 职员、训练、体力恢复
    var msgs = X.Staff.daily(S, pro, W.teamPlayers(S, pro), true).concat(X.Staff.daily(S, street, W.teamPlayers(S, street), false));
    msgs.forEach(function (m) { W.msg(S, m, 'staff'); });
    var proTrainer = pro.staff.trainer, recPro = X.Staff.recovery(pro), recSt = X.Staff.recovery(street);
    W.teamPlayers(S, pro).forEach(function (p) {
      P.proDailyTrain(S, p, proTrainer);
      p.st = Math.min(100, p.st + 40 + recPro + (p.train === "rest" ? 10 : 0) + (p.persona === 'lazy' ? 8 : 0));
    });
    W.teamPlayers(S, street).forEach(function (p) {
      p.st = Math.min(100, p.st + 45 + recSt + (p.persona === 'lazy' ? 8 : 0));
      p.mood = Math.min(100, p.mood + 25);
      if (p.inj > 0) { p.inj -= 1; if (p.inj === 0) W.msg(S, p.name + '（街球）伤愈', 'inj'); }
    });
    // 特长解锁/升级提示
    [pro, street].forEach(function (t) {
      W.teamPlayers(S, t).forEach(function (p) {
        var now = {};
        X.TRAITS.forEach(function (tr) { var lv = tr.lv(p); if (lv) now[tr.id] = lv; });
        var seen = p.trSeen;
        if (!seen || Array.isArray(seen)) { p.trSeen = now; return; }
        X.TRAITS.forEach(function (tr) {
          var a = seen[tr.id] || 0, b = now[tr.id] || 0;
          if (b > a) W.msg(S, '✨ ' + p.name + (a ? ' 的特长【' + tr.icon + tr.cn + '】升级为 ' : ' 解锁特长【' + tr.icon + tr.cn + '】') + X.TRAIT_TIERS[b].cn + (a ? '' : '级'), 'player');
        });
        p.trSeen = now;
      });
    });
    // AI 球队成长与体力
    Object.keys(S.teams).forEach(function (tid) {
      var t = S.teams[tid];
      if (t.isUser || t.kind !== 'pro') return;
      W.teamPlayers(S, t).forEach(function (p) {
        if (U.chance(0.2)) P.aiGrow(p, 1);
        p.st = Math.min(100, p.st + 40);
      });
      if (round && round % 7 === 0) W.refreshAITactics(S, t);
    });
    // 球场建设
    if (pro.arena.build) {
      pro.arena.build.days -= 1;
      if (pro.arena.build.days <= 0) { pro.arena.lv = pro.arena.build.to; pro.arena.build = null; W.msg(S, '球场升级完成！现在是 ' + pro.arena.lv + ' 级体育馆，座位 ' + X.ARENA[pro.arena.lv - 1].seats, 'fin'); }
    }
    // 战术等级（街球队）
    // 5. 赛季中休息日：极限球员市场开放
    if (S.day === 13) { W.msg(S, '赛季过半，转会市场「极限球员」已开放！', 'market'); X.AllStar.run(S, out); }

    // 6. 赛季末
    var seasonEnded = false;
    if (S.day === X.SEASON_END) { W.seasonEnd(S, out); seasonEnded = true; }

    S.dayNo += 1;
    if (seasonEnded) { S.day = 0; }
    else S.day += 1;

    X.Staff.refreshPool(S);
    X.Market.daily(S);
    X.Cups.daily(S);
    if (S.dayNo % 3 === 0) W.genAdOffers(S);
    X.Alliance.daily(S);
    X.Trade.daily(S);
    if (S.day === X.Trade.DEADLINE) W.msg(S, '⏰ 交易截止日已过，本赛季不能再和其他球队交易球员', 'market');
    // 今日五佳球
    if (S._hlDay && S._hlDay.length) {
      // 同类镜头最多 2 个，保证五佳球有绝杀、扣篮、盖帽等不同类型
      var all = S._hlDay.map(function (h) { return [h[0] + Math.random(), h[1]]; }).sort(function (a, b) { return b[0] - a[0]; });
      var cat = function (t) { return /绝杀/.test(t) ? 'c' : /大帽/.test(t) ? 'b' : /扣|灌篮/.test(t) ? 'd' : 'o'; }, cnt = {}, top = [];
      all.forEach(function (h) { var c = cat(h[1]); if (top.length < 5 && (cnt[c] || 0) < 2) { cnt[c] = (cnt[c] || 0) + 1; top.push(h); } });
      S.highlights = { season: S.season, label: out.label || '', list: top.map(function (h) { return h[1]; }) };
      out.highlights = S.highlights.list;
    }
    S._hlDay = null;
    X.Goals.snapshot(S);
    X.Goals.checkGoals(S, false);
    X.Goals.checkAch(S);
    X.Cups.doubleDaily(S);
    S._pre = null;
    return out;
  };

  // ===== 赛季末 =====
  W.seasonEnd = function (S, out) {
    var user = W.userPro(S);
    var summary = { season: S.season, champions: [] };
    // 名次奖金、MVP
    S.leagues.forEach(function (lg) {
      var st = W.standings(S, lg);
      var L = W.levelInfo(lg.level);
      // 季后赛决定冠军、亚军、四强；常规赛第一另有提示
      var po = X.Playoffs.results(S, lg);
      var places = po ? [[po.champion], [po.runner], po.semis] : [[st[0].id], [st[1].id], [st[2].id]];
      var names = po ? [' 总冠军', ' 亚军', ' 四强'] : [' 冠军', ' 亚军', ' 季军'];
      places.forEach(function (ids, i) {
        ids.forEach(function (tid) {
          var t = S.teams[tid];
          if (!t || !t.isUser) return;
          var prize = i === 2 && po ? Math.round(L.prize[2] / 2) : L.prize[i];
          W.earn(S, prize, lg.name + names[i] + '奖金');
          S.user.trophies.push({ season: S.season, name: lg.name + (i === 0 ? ' 冠军' : names[i]) });
          W.msg(S, '恭喜！球队获得 ' + lg.name + names[i] + '，奖金 ' + U.money(prize), 'fin');
        });
      });
      if (st[0].isUser) { S.user.trophies.push({ season: S.season, name: lg.name + ' 常规赛第一' }); W.msg(S, '球队获得 ' + lg.name + ' 常规赛第一！', 'fin'); }
      var champ = S.teams[places[0][0]] || st[0];
      summary.champions.push({ league: lg.name, team: champ.name, isUser: !!champ.isUser });
    });
    X.Awards.season(S);
    var xc = S.xcup;
    if (xc && xc.ko.champ && xc.ko.champ.champion && S.teams[xc.ko.champ.champion]) summary.xcup = S.teams[xc.ko.champ.champion].name;
    S.history.unshift(summary);
    X.Rivals.seasonDecay(S);
    X.Manager.xp(S, 60);

    // 所得税
    var L = S.user.ledger[S.season];
    if (L) {
      var net = L.inc - L.exp;
      if (net > 0) { var tax = Math.round(net * (S.user.member ? 0.25 : 0.3)); W.spend(S, tax, '赛季所得税'); W.msg(S, '本赛季净利润 ' + U.money(net) + '，缴纳所得税 ' + U.money(tax), 'fin'); }
    }

    // 赛季目标判定、赛季总结（在升降级之前）
    X.Goals.checkGoals(S, true);
    X.Goals.seasonRecord(S);

    // XBA杯邀请函（按本赛季成绩）
    X.XCup.invites(S);

    // 升降级
    promoteRelegate(S);
    var draftOrder = X.Market.draftOrder(S);

    // 退役
    Object.keys(S.players).forEach(function (id) {
      var p = S.players[id];
      if (!p.teamId) return;
      var t = S.teams[p.teamId];
      if (p.age >= p.retireAge) {
        if (t.isUser) W.msg(S, p.name + '（' + p.age + '岁）宣布退役', 'player');
        p.career.push({ season: S.season, team: t.name, stats: p.stats });
        p.stats = P.emptyStats();
        X.Awards.onRetire(S, p, t);
        if (t.isUser && X.Awards.inHof(S, p.id)) X.Staff.legend(S, p);
        W.deletePlayer(S, p);
      } else if (p.age === p.retireAge - 1 && t.isUser) {
        W.msg(S, p.name + ' 将于下个赛季结束后退役', 'player');
      }
    });

    // 赛季统计归档
    Object.keys(S.players).forEach(function (id) {
      var p = S.players[id];
      if (p.stats.gp > 0) { p.career.push({ season: S.season, team: p.teamId && S.teams[p.teamId] ? S.teams[p.teamId].name : '', stats: p.stats }); if (p.career.length > 20) p.career.shift(); }
      p.stats = P.emptyStats();
    });
    Object.keys(S.teams).forEach(function (tid) { S.teams[tid].rec = { w: 0, l: 0, pf: 0, pa: 0 }; });

    // AI 补充球员
    Object.keys(S.teams).forEach(function (tid) {
      var t = S.teams[tid];
      if (t.isUser || t.kind !== 'pro') return;
      var ps = W.teamPlayers(S, t);
      var avg = W.levelInfo(t.level).avg + (t.strength || 0);
      // 太弱的球员换掉，保持本级别实力
      ps.sort(function (a, b) { return P.ovr(a) - P.ovr(b); });
      var top8 = ps.slice(-8).map(function (p) { return P.ovr(p); });
      if (U.avg(top8) < avg - 2 && ps.length) { W.deletePlayer(S, ps[0]); }
      else if (U.avg(top8) > avg + 4 && ps.length > 9) {
        // 太强：头牌被挖走（转会到更高级别）
        var star = ps[ps.length - 1];
        var up = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (x) { return !x.isUser && x.kind === 'pro' && x.level === t.level - 1 && x.playerIds.length < 12; });
        if (up.length) W.addToTeam(S, U.pick(up), star); else W.deletePlayer(S, star);
      }
    });

    // 选秀（各队一个签，胜率低先选）
    X.Market.setupDraft(S, draftOrder);
    if (!S.draft.done) W.msg(S, '职业选秀开始！轮到你选人了，请到「转会市场 → 职业选秀」挑选新秀', 'market');

    // AI 补满至 11 人
    Object.keys(S.teams).forEach(function (tid) {
      var t = S.teams[tid];
      if (t.isUser || t.kind !== 'pro') return;
      var avg = W.levelInfo(t.level).avg + (t.strength || 0);
      while (t.playerIds.length < 11) {
        var counts = {}; X.POS.forEach(function (p) { counts[p] = 0; });
        W.teamPlayers(S, t).forEach(function (p) { counts[p.pos]++; });
        var need = X.POS.slice().sort(function (a, b) { return counts[a] - counts[b]; })[0];
        var np = P.gen(S, { pos: need, age: U.ri(20, 29), ovr: Math.max(12, avg + U.gauss() * 4 + 1) });
        W.addToTeam(S, t, np); np.joined = -99;
      }
      W.refreshAITactics(S, t);
    });

    // 新赛季：赛程、选拔卡、邀请函
    S.user.proSeasons += 1;
    if (S.user.proSeasons >= 1) { S.user.selectCards += 1; W.msg(S, '新赛季发放 1 张街球选拔卡，可将一名 18 岁以上街球员提拔至职业队', 'sys'); }
    S.season += 1;
    S.leagues.forEach(function (lg) { lg.schedule = W.genSchedule(lg.teamIds); lg.results = []; });
    X.XCup.setup(S);
    X.Goals.newSeason(S);
    var ul = W.league(S, user.leagueId);
    W.msg(S, '第 ' + S.season + ' 赛季开始！你的球队参加 ' + ul.name, 'sys');
    out.seasonSummary = summary;
  };

  function promoteRelegate(S) {
    var moves = []; // {team, toLevel}
    var lost = [];
    S.leagues.forEach(function (lg) {
      var st = W.standings(S, lg);
      if (lg.level > 1) st.slice(0, 2).forEach(function (t) { moves.push({ t: t, to: lg.level - 1, from: lg }); });
      var bottom = st.slice(-4);
      if (lg.level < 4) bottom.forEach(function (t) { moves.push({ t: t, to: lg.level + 1, from: lg }); });
      else bottom.forEach(function (t) { if (!t.isUser) lost.push({ t: t, from: lg }); });
    });
    // 出局球队删除
    lost.forEach(function (x) {
      x.from.teamIds = x.from.teamIds.filter(function (id) { return id !== x.t.id; });
      W.teamPlayers(S, x.t).forEach(function (p) { delete S.players[p.id]; });
      delete S.teams[x.t.id];
    });
    moves.forEach(function (mv) { mv.from.teamIds = mv.from.teamIds.filter(function (id) { return id !== mv.t.id; }); });
    // 分配到目标级别（人数最少的联赛优先）
    moves.forEach(function (mv) {
      var cands = S.leagues.filter(function (l) { return l.level === mv.to; }).sort(function (a, b) { return a.teamIds.length - b.teamIds.length; });
      var lg = cands[0];
      lg.teamIds.push(mv.t.id);
      mv.t.leagueId = lg.id; mv.t.level = mv.to;
      if (mv.t.isUser) {
        var up = mv.to < mv.from.level;
        W.msg(S, up ? '恭喜！球队升级到 ' + lg.name + '！' : '很遗憾，球队降级到 ' + lg.name, 'sys');
        if (up) S.user.trophies.push({ season: S.season, name: '升级至 ' + lg.name });
      }
    });
    // 最底层补充新球队
    S.leagues.forEach(function (lg) {
      while (lg.teamIds.length < X.LEAGUE_TEAMS) lg.teamIds.push(W.genAITeam(S, lg.level, lg.id).id);
    });
    // 升降级的 AI 球队实力按新级别平滑调整
    moves.forEach(function (mv) { if (!mv.t.isUser) mv.t.fans = Math.round((mv.t.fans + FANS_BASE[mv.to]) / 2); });
  }

  // ===== 用户操作 =====
  W.renewContract = function (S, p, rounds) {
    if (p.contract >= 10) return '合同少于 10 轮时才能续约';
    var sal = Math.round(P.salaryFor(p) * (rounds >= 52 ? 1.05 : 1) * X.Manager.salaryMul(S));
    p.salary = sal; p.contract += rounds;
    W.msg(S, p.name + ' 续约 ' + rounds + ' 轮，新工资 ' + U.money(sal) + '/轮', 'player');
    return null;
  };

  W.setBonus = function (S, amount) {
    var team = W.userPro(S);
    team.bonus = amount;
    team.morale = 1 + Math.min(0.05, amount / (W.payroll(S, team) * 10 + 1));
  };

  W.upgradeArena = function (S) {
    var team = W.userPro(S);
    if (team.arena.build) return '球场正在建设中';
    var next = X.ARENA[team.arena.lv];
    if (!next) return '已是最高等级';
    if (S.user.money < next.cost) return '资金不足，需要 ' + U.money(next.cost);
    W.spend(S, next.cost, '球场升级');
    team.arena.build = { to: next.lv, days: next.days };
    return null;
  };

  W.acceptAd = function (S, adId) {
    var team = W.userPro(S);
    if (team.ads.length >= W.adCapacity(team)) return '没有足够的广告位或球迷数量不足（可悬挂：' + W.adCapacity(team) + '）';
    var ad = S.adOffers.find(function (a) { return a.id === adId; });
    if (!ad) return '广告已失效';
    team.ads.push({ brand: ad.brand, rounds: ad.rounds, total: ad.total, left: ad.rounds });
    S.adOffers = S.adOffers.filter(function (a) { return a !== ad; });
    return null;
  };
})(window.XBA);
