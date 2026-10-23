// 俱乐部运营：赛季版本、手感、董事会、设施、发布会、热度直播、经理生活、承诺、球探迷雾
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, O = {};
  X.Ops = O;
  var W = function () { return X.World; };

  // ================= 赛季版本更新 =================
  O.RULES = [
    { id: 'thr_back', cn: '三分线后移', desc: '三分命中率 -3%', r: { thr: -0.03 } },
    { id: 'thr_front', cn: '三分线前移', desc: '三分命中率 +3%', r: { thr: 0.03 } },
    { id: 'foul_loose', cn: '犯规尺度放宽', desc: '内线和突破更少吹罚，身体对抗更激烈', r: { foulIn: 0.7 } },
    { id: 'foul_tight', cn: '犯规尺度收紧', desc: '内线和突破更容易造犯规', r: { foulIn: 1.35 } },
    { id: 'clock20', cn: '进攻时间改为 20 秒', desc: '回合更快，快攻机会 +30%', r: { clock: 0.85, fb: 1.3 } },
    { id: 'zone_free', cn: '取消防守三秒', desc: '联防克制效果 +3%', r: { zone: 0.03 } },
    { id: 'block_strict', cn: '干扰球严判', desc: '盖帽几率 -20%', r: { blk: 0.8 } },
    { id: 'reb_rule', cn: '篮板卡位新规', desc: '进攻篮板几率 +15%', r: { oreb: 1.15 } },
    { id: 'pace', cn: '赛程加密', desc: '比赛体力消耗 +15%', r: { drain: 1.15 } }
  ];
  O.newSeasonRules = function (S) {
    var last = (S.meta && S.meta.ids) || [];
    var pool = O.RULES.filter(function (r) { return last.indexOf(r.id) < 0; });
    U.shuffle(pool);
    var pick = [pool[0]];
    // 不选互相矛盾的一对
    var opp = { thr_back: 'thr_front', thr_front: 'thr_back', foul_loose: 'foul_tight', foul_tight: 'foul_loose' };
    for (var i = 1; i < pool.length; i++) if (opp[pick[0].id] !== pool[i].id) { pick.push(pool[i]); break; }
    S.meta = { season: S.season, ids: pick.map(function (r) { return r.id; }) };
    O.applyRules(S);
    W().msg(S, '📢 第 ' + S.season + ' 赛季版本更新：' + pick.map(function (r) { return r.cn + '（' + r.desc + '）'; }).join('；'), 'sys');
  };
  O.applyRules = function (S) {
    var r = {};
    ((S.meta && S.meta.ids) || []).forEach(function (id) {
      var def = O.RULES.find(function (x) { return x.id === id; }); if (!def) return;
      for (var k in def.r) r[k] = k === 'thr' || k === 'zone' ? (r[k] || 0) + def.r[k] : (r[k] || 1) * def.r[k];
    });
    E.setRules(r);
  };
  O.rulesText = function (S) {
    return ((S.meta && S.meta.ids) || []).map(function (id) { var d = O.RULES.find(function (x) { return x.id === id; }); return d ? d.cn + '（' + d.desc + '）' : ''; }).join('；');
  };

  // ================= 手感（状态起伏）=================
  O.formAfterGame = function (S, b) {
    var p = S.players[b.pid]; if (!p || !b.min) return;
    var f = p.form || 0;
    if (b.eff >= 18 || (b.eff >= 12 && Math.random() < 0.5)) f++;
    else if (b.min >= 12 && (b.eff <= 2 || (b.eff <= 5 && Math.random() < 0.5))) f--;
    else if (Math.random() < 0.3) f += f > 0 ? -1 : f < 0 ? 1 : 0;
    p.form = Math.max(-3, Math.min(3, f));
  };
  O.formTag = function (p) {
    var f = p.form || 0;
    return f >= 2 ? '<span class="form hot" title="手感火热：发挥 +' + f * 2 + '%">🔥</span>' : f <= -2 ? '<span class="form cold" title="手感低迷：发挥 ' + f * 2 + '%">❄</span>' : '';
  };

  // ================= 董事会信任 =================
  O.board = function (S) { if (!S.user.board) S.user.board = { trust: 60, fired: 0 }; return S.user.board; };
  O.trust = function (S, d, why) {
    var b = O.board(S), easy = S.difficulty === 'easy';
    if (d < 0 && easy) d *= 0.5;
    b.trust = Math.max(0, Math.min(100, b.trust + d));
    if (why && Math.abs(d) >= 5) W().msg(S, '🏛 董事会信任' + (d > 0 ? '上升' : '下降') + ' ' + Math.abs(Math.round(d)) + '（' + why + '），现在 ' + Math.round(b.trust), 'sys');
    if (b.trust < 25 && !b.warned) { b.warned = true; W().msg(S, '⚠️ 董事会对你非常不满（信任 ' + Math.round(b.trust) + '）。信任跌到 10 以下，赛季结束时你会被解雇！', 'sys'); }
    if (b.trust >= 35) b.warned = false;
  };
  O.afterLeagueGame = function (S, won) { O.trust(S, won ? 0.5 : -0.45); };
  // 赛季末评估（在 checkGoals 之后、升降级之前调用）
  O.seasonBoard = function (S) {
    var gs = S.user.goals, b = O.board(S);
    if (gs && gs.season === S.season) gs.list.forEach(function (g) { if (g.done) O.trust(S, g.id === 'rank' ? 15 : 5); else if (g.id === 'rank') O.trust(S, -20, '没完成联赛排名目标'); });
    var L = S.user.ledger[S.season];
    if (L && L.inc - L.exp < 0) O.trust(S, -8, '赛季亏损');
    if (b.trust < 10) return true; // 解雇
    return false;
  };
  // 被解雇：接手一支更弱的球队（街球队、职员以外的个人资产保留）
  O.fire = function (S) {
    var old = W().userPro(S), lvl = Math.min(4, old.level + 1);
    var cands = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return t.kind === 'pro' && !t.isUser && t.level === lvl; });
    cands.sort(function (a, b) { return (a.rec.w - b.rec.w) || ((a.strength || 0) - (b.strength || 0)); });
    var nt = cands[0];
    if (!nt) return;
    // 旧队交给 AI
    old.isUser = false; W().refreshAITactics(S, old);
    W().teamPlayers(S, old).forEach(function (p) { p.green = false; });
    // 新队交给你
    nt.isUser = true; S.user.proId = nt.id;
    nt.arena = { lv: 1, build: null }; nt.ticket = 30; nt.ads = []; nt.morale = 1; nt.bonus = 0;
    nt.boards = { league: W().defaultProBoard(S, nt), cup: W().defaultProBoard(S, nt), other: W().defaultProBoard(S, nt) };
    S.user.money = Math.max(300000, Math.round(S.user.money * 0.3));
    S.user.board = { trust: 50, fired: (S.user.board.fired || 0) + 1 };
    S.user.trophies.push({ season: S.season, name: '被 ' + old.name + ' 解雇' });
    W().msg(S, '💼 你被 ' + old.name + ' 董事会解雇了。现在你接手了 ' + W().league(S, nt.leagueId).name + ' 的 ' + nt.name + '，重新开始吧。', 'sys');
  };

  // ================= 俱乐部设施 =================
  O.FAC = [
    { id: 'gym', cn: '训练馆', icon: '🏋', per: '训练效果 +5%' },
    { id: 'med', cn: '医疗中心', icon: '🩺', per: '伤停时间 -8%，每日体力恢复 +2' },
    { id: 'youth', cn: '青训营', icon: '🌱', per: '市场街头球员、球探候选人更有天赋' },
    { id: 'scout', cn: '球探网络', icon: '🔭', per: '市场球员属性看得更清楚，每天多 1 次免费考察' },
    { id: 'data', cn: '数据分析室', icon: '📊', per: '战术熟练度 +10%，2 级起能看到下个对手的战术' }
  ];
  O.FAC_COST = [0, 300000, 800000, 2000000, 5000000];
  O.FAC_DAYS = [0, 3, 5, 8, 12];
  O.fac = function (S, id) { var f = S.user.fac = S.user.fac || {}; return (f[id] && f[id].lv) || 1; };
  O.upgradeFac = function (S, id) {
    var f = S.user.fac = S.user.fac || {}, cur = f[id] = f[id] || { lv: 1 };
    if (cur.build) return '正在施工中';
    if (cur.lv >= 5) return '已是最高等级';
    var cost = O.FAC_COST[cur.lv];
    if (S.user.money < cost) return '资金不足，需要 ' + U.money(cost);
    W().spend(S, cost, '设施升级：' + O.FAC.find(function (x) { return x.id === id; }).cn);
    cur.build = O.FAC_DAYS[cur.lv];
    return null;
  };
  O.facDaily = function (S) {
    var f = S.user.fac || {};
    Object.keys(f).forEach(function (id) {
      var c = f[id];
      if (c.build) { c.build--; if (c.build <= 0) { c.build = 0; c.lv++; W().msg(S, '🏗 ' + O.FAC.find(function (x) { return x.id === id; }).cn + ' 升级到 ' + c.lv + ' 级', 'fin'); } }
    });
    S.user.scoutPts = O.fac(S, 'scout'); // 每天免费考察次数 = 球探网络等级
  };
  O.trainMul = function (S) { return 1 + 0.05 * (O.fac(S, 'gym') - 1); };

  // ================= 新闻发布会 =================
  var PRESS = [
    { q: '今晚的对手 {opp} 实力不俗，你有信心吗？', a: [
      { t: '我们一定能赢！', team: 0.03, opp: 0.03, fans: 0, d: '球队士气 +3%，对手斗志 +3%' },
      { t: '尊重对手，我们会全力以赴。', team: 0.015, opp: 0, fans: 0, d: '球队士气 +1.5%' },
      { t: '他们没那么可怕。', team: 0, opp: 0.05, fans: 0.01, d: '对手斗志 +5%，球迷 +1%' }] },
    { q: '{p} 最近手感不好，你还会坚持用他吗？', player: 'cold', a: [
      { t: '我完全信任他，他很快会找回状态。', p: 0.04, d: '他的发挥 +4%' },
      { t: '他需要自己调整好。', p: -0.02, team: 0.01, d: '他的发挥 -2%，全队士气 +1%' },
      { t: '比赛由表现说话，打不好就坐板凳。', p: -0.04, team: 0.02, d: '他的发挥 -4%，全队士气 +2%' }] },
    { q: '{p} 状态火热，他是联盟最好的球员吗？', player: 'hot', a: [
      { t: '当然，他就是最好的！', p: 0.03, team: -0.01, fans: 0.01, d: '他的发挥 +3%，队友小小吃醋（-1%），球迷 +1%' },
      { t: '篮球是团队运动，大家都很棒。', team: 0.02, d: '全队士气 +2%' }] },
    { q: '外界都说你们这赛季冲不上去，你怎么看？', a: [
      { t: '用成绩回应质疑。', team: 0.03, d: '球队士气 +3%' },
      { t: '我们会一步一步来。', trust: 2, d: '董事会信任 +2' },
      { t: '没什么好回应的。', d: '无影响' }] },
    { q: '有传闻说其他球队想挖你，你会离开吗？', a: [
      { t: '我会留在这里，和球队一起成长。', trust: 4, team: 0.01, d: '董事会信任 +4，士气 +1%' },
      { t: '一切皆有可能。', trust: -4, fame: 3, d: '董事会信任 -4，个人名气 +3' }] }
  ];
  O.pressDaily = function (S) {
    S.press = null;
    var g = W().userGameToday(S);
    if (!g || Math.random() > 0.45) return;
    var pro = W().userPro(S), opp = S.teams[g.h === pro.id ? g.a : g.h];
    var ps = W().teamPlayers(S, pro);
    var cold = ps.filter(function (p) { return (p.form || 0) <= -2; }), hot = ps.filter(function (p) { return (p.form || 0) >= 2; });
    var pool = PRESS.filter(function (x) { return !x.player || (x.player === 'cold' ? cold.length : hot.length); });
    var tpl = U.pick(pool), pl = tpl.player === 'cold' ? U.pick(cold) : tpl.player === 'hot' ? U.pick(hot) : null;
    S.press = { day: S.dayNo, q: tpl.q.replace('{opp}', opp.name).replace('{p}', pl ? pl.name : ''), a: tpl.a, pid: pl ? pl.id : null, opp: opp.id, answered: null };
  };
  O.answer = function (S, i) {
    var pr = S.press; if (!pr || pr.answered != null) return '已经回答过了';
    var a = pr.a[i], pro = W().userPro(S);
    pr.answered = i;
    if (a.team) pro.morale = Math.max(0.95, Math.min(1.08, (pro.morale || 1) + a.team));
    if (a.opp) S.pressOpp = { tid: pr.opp, day: S.dayNo, m: 1 + a.opp };
    if (a.p && pr.pid && S.players[pr.pid]) { var p = S.players[pr.pid]; p.mor = Math.max(0.9, Math.min(1.1, (p.mor || 1) + a.p)); p.morDays = 5; }
    if (a.fans) pro.fans = Math.round(pro.fans * (1 + a.fans));
    if (a.trust) O.trust(S, a.trust);
    if (a.fame) O.life(S).fame += a.fame;
    O.hype(S, 2);
    return null;
  };

  // ================= 热度与直播 =================
  O.hype = function (S, d) { S.user.hype = Math.max(0, Math.min(100, (S.user.hype || 20) + d)); return S.user.hype; };
  O.STREAMS = [
    { id: 'live', cn: '个人直播', hype: 4, coins: 10, st: 8, desc: '热度 +4，游戏币 +10，体力 -8' },
    { id: 'show', cn: '上综艺节目', hype: 8, coins: 0, money: 30000, st: 12, desc: '热度 +8，出场费 3 万，体力 -12' },
    { id: 'ad', cn: '拍广告', hype: 3, coins: 0, money: 80000, st: 6, desc: '热度 +3，广告费 8 万，体力 -6' }
  ];
  O.stream = function (S, pid, kind) {
    var p = S.players[pid], k = O.STREAMS.find(function (x) { return x.id === kind; });
    if (!p || !k) return '无效';
    if (p.streamDay === S.dayNo) return p.name + ' 今天已经安排过活动了';
    var fame = Math.max(1, P.ovr(p) / 40) * (1 + p.support / 100);
    p.streamDay = S.dayNo; p.st = Math.max(0, p.st - k.st);
    O.hype(S, Math.round(k.hype * fame));
    if (k.coins) S.user.coins += Math.round(k.coins * fame);
    if (k.money) W().earn(S, k.money * fame, k.cn + '：' + p.name);
    p.support = Math.min(100, p.support + 2);
    p.skipTrain = S.dayNo; // 当天不参加职业队每日训练
    return null;
  };
  O.hypeDaily = function (S, out) {
    O.hype(S, -1);
    if (out && out.userGame && S.matches[out.userGame]) {
      var m = S.matches[out.userGame], pro = W().userPro(S), won = (m.home.id === pro.id) === (m.hs > m.as);
      O.hype(S, won ? 2 : -1);
    }
    (out && out.highlights || []).forEach(function (t) { if (t.indexOf('【' + W().userPro(S).name + '】') === 0) O.hype(S, 2); });
  };
  O.hypeMul = function (S) { return 1 + (S.user.hype || 20) / 300; };

  // ================= 经理个人生活 =================
  O.HOUSES = [['出租屋', 0, 2], ['公寓', 200000, 4], ['洋房', 800000, 6], ['别墅', 3000000, 8], ['庄园', 10000000, 10]];
  O.CARS = [['自行车', 0, 0], ['小轿车', 150000, 2], ['SUV', 500000, 4], ['跑车', 2000000, 7], ['超级豪车', 6000000, 10]];
  O.life = function (S) {
    if (!S.user.life) S.user.life = { cash: 50000, house: 0, car: 0, fame: 10, energy: 100 };
    return S.user.life;
  };
  O.salary = function (S) { return 3000 + 1500 * (X.Manager.get(S).lv - 1) + [0, 0, 2000, 5000, 10000][W().userPro(S).level === 1 ? 4 : 5 - W().userPro(S).level]; };
  O.lifeDaily = function (S, coached) {
    var L = O.life(S);
    if (W().roundOfDay(S.day)) { var sal = O.salary(S); L.cash += sal; W().spend(S, sal, '经理薪水'); }
    var before = L.energy;
    L.energy = Math.max(0, Math.min(100, L.energy - 3 - (coached ? 6 : 0) + O.HOUSES[L.house][2]));
    if (before >= 40 && L.energy < 40) W().msg(S, '😫 经理精力只剩 ' + Math.round(L.energy) + '，训练和执教效果开始打折。去「经理生涯 → 个人生活」度个假或者换个好点的房子吧', 'sys');
    L.fame = Math.max(0, L.fame + O.CARS[L.car][2] * 0.05 - 0.05);
  };
  // 精力影响训练和执教：精力低于 40 开始打折
  O.energyMul = function (S) { var e = O.life(S).energy; return e >= 40 ? 1 : 0.8 + 0.2 * e / 40; };
  O.buy = function (S, kind, i) {
    var L = O.life(S), list = kind === 'house' ? O.HOUSES : O.CARS, item = list[i];
    if (!item || i <= L[kind]) return '无效';
    if (L.cash < item[1]) return '个人存款不足，需要 ' + U.money(item[1]);
    L.cash -= item[1]; L[kind] = i; L.fame += i * 3;
    return null;
  };
  O.vacation = function (S) {
    var L = O.life(S), cost = 20000;
    if (L.cash < cost) return '度假需要个人存款 2 万';
    if (L.vacDay === S.dayNo) return '今天已经度过假了';
    L.cash -= cost; L.energy = 100; L.vacDay = S.dayNo; L.fame += 1;
    return null;
  };

  // ================= 承诺 =================
  O.PROMISES = [
    { id: 'start', cn: '保证首发', desc: '接下来 10 场联赛平均上场 ≥ 24 分钟' },
    { id: 'playoff', cn: '带队进季后赛', desc: '本赛季常规赛进入前 8' },
    { id: 'raise', cn: '下次续约加薪', desc: '下次续约时工资 +15%（立刻兑现方式：续约时自动加）' }
  ];
  O.promise = function (S, pid, type) {
    var p = S.players[pid];
    S.user.promises = S.user.promises || [];
    if (S.user.promises.some(function (x) { return x.pid === pid && !x.done; })) return p.name + ' 已经有一个未兑现的承诺';
    if (type === 'playoff' && X.Playoffs.isDay(S.day)) return '常规赛已经结束了';
    S.user.promises.push({ pid: pid, type: type, start: (p.stats.gp || 0), min0: p.stats.min || 0, season: S.season, done: false });
    p.mor = Math.min(1.1, (p.mor || 1) + 0.03); p.morDays = 10;
    W().msg(S, '🤝 你向 ' + p.name + ' 承诺「' + O.PROMISES.find(function (x) { return x.id === type; }).cn + '」，他干劲十足（发挥 +3%）', 'player');
    return null;
  };
  function resolvePromise(S, pr, kept) {
    var p = S.players[pr.pid];
    pr.done = true; pr.kept = kept;
    if (!p) return;
    if (kept) { p.loyal = (p.loyal || 0) + 1; p.mor = 1.02; p.morDays = 10; W().msg(S, '✅ 你兑现了对 ' + p.name + ' 的承诺，他更忠诚了（续约更便宜）', 'player'); }
    else {
      p.mor = 0.93; p.morDays = 20; p.unhappy = true;
      S.user.chemPen = Math.min(0.06, (S.user.chemPen || 0) + 0.02);
      W().msg(S, '❌ 你没兑现对 ' + p.name + ' 的承诺！他公开抱怨，发挥 -7%，球队化学反应下降', 'player');
      O.trust(S, -3);
    }
  }
  O.promiseDaily = function (S) {
    (S.user.promises || []).forEach(function (pr) {
      if (pr.done) return;
      var p = S.players[pr.pid];
      if (!p || p.teamId !== S.user.proId) { pr.done = true; return; }
      if (pr.type === 'start' && pr.season === S.season) {
        var g = (p.stats.gp || 0) - pr.start;
        if (g >= 10) resolvePromise(S, pr, (p.stats.min - pr.min0) / g >= 24);
      }
      if (pr.type === 'playoff' && (S.day === X.Playoffs.START || pr.season !== S.season)) {
        var pro = W().userPro(S), lg = W().league(S, pro.leagueId);
        resolvePromise(S, pr, pr.season === S.season && W().standings(S, lg).indexOf(pro) < 8);
      }
    });
    // 个人士气慢慢回到 1
    Object.keys(S.players).forEach(function (id) {
      var p = S.players[id];
      if (p.morDays) { p.morDays--; if (!p.morDays) { p.mor = 1; p.unhappy = false; } }
    });
    if (S.user.chemPen) S.user.chemPen = Math.max(0, S.user.chemPen - 0.001);
  };
  O.renewMul = function (S, p) {
    var m = 1;
    if (p.loyal) m *= Math.pow(0.95, Math.min(3, p.loyal));
    var pr = (S.user.promises || []).find(function (x) { return x.pid === p.id && x.type === 'raise' && !x.done; });
    if (pr) { m *= 1.15; resolvePromise(S, pr, true); }
    return m;
  };

  // ================= 球探迷雾 =================
  // 看不清的球员属性显示成一个范围；level 0 最模糊，3 = 完全看清
  O.knowLevel = function (S, p) {
    var t = p.teamId && S.teams[p.teamId];
    if (t && t.isUser) return 3;
    if (p.seen && p.seen.pot) return 3;
    var base = O.fac(S, 'scout') >= 4 ? 2 : O.fac(S, 'scout') >= 2 ? 1 : 0;
    if (X.Manager.lv(S, 'eye') >= 1) base = Math.max(base, 1);
    return Math.max(base, (S.scouted && S.scouted[p.id]) || 0);
  };
  var WIDTH = [24, 14, 6, 0];
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; }
  O.range = function (S, p, v, key) {
    var lv = O.knowLevel(S, p), w = WIDTH[lv];
    if (!w) return null;
    var f = 0.2 + hash(p.id + key) * 0.6;
    return [Math.max(0, Math.round(v - w * f)), Math.round(v + w * (1 - f))];
  };
  O.scoutPlayer = function (S, pid) {
    var p = S.players[pid]; if (!p) return '球员不存在';
    var lv = O.knowLevel(S, p);
    if (lv >= 3) return '已经完全看清了';
    S.scouted = S.scouted || {};
    if ((S.user.scoutPts || 0) > 0) S.user.scoutPts--;
    else { var cost = 5000 * (lv + 1); if (S.user.money < cost) return '资金不足（考察需要 ' + U.money(cost) + '）'; W().spend(S, cost, '球探考察：' + p.name); }
    S.scouted[pid] = lv + 1;
    return null;
  };
})(window.XBA);
