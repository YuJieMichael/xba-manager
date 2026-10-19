// XBA杯职业大赛：分组预赛 → 分组决赛 → 冠军杯 / 优胜杯；预赛后三名打参赛杯
(function (X) {
  var U = X.U, E = X.Engine, C = {};
  X.XCup = C;
  var W = function () { return X.World; };

  C.SIZE = 48;                     // 8 个预赛小组 × 6 队
  C.PRE_DAYS = [1, 2, 3, 4, 5];    // 第 2-6 轮当天
  C.FIN_DAYS = [7, 8, 9, 10, 11];  // 第 8-12 轮当天
  C.KO_DAYS = [14, 15, 16, 17, 18];// 赛季中休息日之后
  C.CUPS = {
    champ: { cn: '冠军杯', prize: [3000000, 1500000, 600000, 300000, 100000] },
    win: { cn: '优胜杯', prize: [800000, 400000, 150000, 60000, 20000] },
    part: { cn: '参赛杯', prize: [300000, 150000, 60000, 20000, 8000, 3000] }
  };
  var PLACE = ['冠军', '亚军', '四强', '八强', '十六强', '三十二强'];

  function teamsAll(S) { return Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return t.kind === 'pro'; }); }

  // 赛季末发放邀请函：各联赛前三名 + 成绩最好的 3 个第四名
  C.invites = function (S) {
    var ids = [], fourth = [];
    S.leagues.forEach(function (lg) {
      var st = W().standings(S, lg);
      st.slice(0, 3).forEach(function (t) { ids.push(t.id); });
      if (st[3]) fourth.push(st[3]);
    });
    fourth.sort(function (a, b) { return a.level - b.level || b.rec.w - a.rec.w; });
    fourth.slice(0, C.SIZE - ids.length).forEach(function (t) { ids.push(t.id); });
    S.xcupInvites = ids;
    if (ids.indexOf(S.user.proId) >= 0) W().msg(S, '你的职业队获得了下赛季 XBA杯 的邀请函！', 'cup');
  };

  C.setup = function (S, giftUser) {
    var ids = (S.xcupInvites || []).filter(function (id) { return S.teams[id]; });
    if (giftUser && ids.indexOf(S.user.proId) < 0) ids.push(S.user.proId);
    // 不足 48 队：按联赛等级从高到低随机补足
    var rest = U.shuffle(teamsAll(S).filter(function (t) { return ids.indexOf(t.id) < 0; })).sort(function (a, b) { return a.level - b.level; });
    while (ids.length < C.SIZE && rest.length) ids.push(rest.shift().id);
    ids = ids.slice(0, C.SIZE);
    if (giftUser && ids.indexOf(S.user.proId) < 0) ids[ids.length - 1] = S.user.proId;
    // 蛇形分组，保证各组实力均衡
    var sorted = ids.map(function (id) { return S.teams[id]; }).sort(function (a, b) { return a.level - b.level || (b.strength || 0) - (a.strength || 0); });
    var groups = [[], [], [], [], [], [], [], []];
    sorted.forEach(function (t, i) { var r = Math.floor(i / 8), c = i % 8; groups[r % 2 ? 7 - c : c].push(t.id); });
    S.xcup = {
      season: S.season, teams: ids, stage: 'pre', user: ids.indexOf(S.user.proId) >= 0,
      pre: makeStage(groups), fin: null, ko: {}, result: null
    };
    S.xcupInvites = null;
    if (S.xcup.user) W().msg(S, '第 ' + S.season + ' 赛季 XBA杯 开幕！你的职业队被分在预赛第 ' + (groupOf(S.xcup.pre, S.user.proId) + 1) + ' 组（第 2 轮起每天一场，可在「职业战术」设置杯赛战术板）', 'cup');
  };

  function makeStage(groups) {
    return { groups: groups, sched: groups.map(function (g) { return W().genSchedule(g).slice(0, 5); }), res: groups.map(function () { return []; }) };
  }
  function groupOf(stage, tid) { for (var i = 0; i < stage.groups.length; i++) if (stage.groups[i].indexOf(tid) >= 0) return i; return -1; }
  C.groupOf = groupOf;

  C.groupTable = function (S, stage, gi) {
    var rec = {};
    stage.groups[gi].forEach(function (id) { rec[id] = { id: id, w: 0, l: 0, pf: 0, pa: 0 }; });
    stage.res[gi].forEach(function (round) {
      round.forEach(function (g) {
        var h = rec[g.h], a = rec[g.a];
        h.pf += g.hs; h.pa += g.as; a.pf += g.as; a.pa += g.hs;
        if (g.hs > g.as) { h.w++; a.l++; } else { a.w++; h.l++; }
      });
    });
    return Object.keys(rec).map(function (k) { return rec[k]; }).sort(function (x, y) { return (y.w - x.w) || ((y.pf - y.pa) - (x.pf - x.pa)); });
  };

  function play(S, hid, aid, label, out) {
    var h = S.teams[hid], a = S.teams[aid];
    var isUser = h.isUser || a.isUser;
    var res = E.play(W().sideCfg(S, h, 'cup', { home: true }), W().sideCfg(S, a, 'cup'), { kind: 'pro', log: isUser, injuries: false, noStamina: true });
    var r = { h: hid, a: aid, hs: res.hs, as: res.as };
    if (isUser) {
      W().applyMatch(S, res, { noStamina: true });
      W().addProf(h.isUser ? h : a, h.isUser ? res.used.h : res.used.a);
      r.mid = W().saveMatch(S, 'xcup', res, h, a, 'pro', { cup: 'XBA杯 ' + label, proTP: W().earnProTP(S, res, h.isUser) });
      out.xcupGames = (out.xcupGames || []).concat([{ mid: r.mid, label: label }]);
    }
    return r;
  }

  function playGroupRound(S, stage, r, label, out) {
    stage.groups.forEach(function (g, gi) {
      var games = stage.sched[gi][r] || [];
      stage.res[gi][r] = games.map(function (pair) { return play(S, pair[0], pair[1], label + ' 第' + (gi + 1) + '组 第' + (r + 1) + '轮', out); });
    });
  }

  // 小组排名 → 前三 / 后三
  function split(S, stage) {
    var top = [], bottom = [];
    for (var pos = 0; pos < 6; pos++) {
      var tier = stage.groups.map(function (g, gi) { return C.groupTable(S, stage, gi)[pos]; }).sort(function (a, b) { return (b.w - a.w) || ((b.pf - b.pa) - (a.pf - a.pa)); });
      tier.forEach(function (x) { (pos < 3 ? top : bottom).push(x.id); });
    }
    return { top: top, bottom: bottom };
  }

  // ===== 单场淘汰（种子对阵，不足补轮空）=====
  function seedOrder(n) {
    var order = [0];
    while (order.length < n) {
      var m = order.length * 2, next = [];
      order.forEach(function (s) { next.push(s, m - 1 - s); });
      order = next;
    }
    return order;
  }
  function makeKO(ids) {
    var size = 1; while (size < ids.length) size *= 2;
    var order = seedOrder(size), slots = order.map(function (s) { return ids[s] || null; });
    var first = [];
    for (var i = 0; i < size; i += 2) first.push({ a: slots[i], b: slots[i + 1] });
    return { rounds: [first], total: Math.log2(size), done: false, champion: null };
  }
  function koRoundName(ko, r) {
    var left = ko.total - r;
    return left === 1 ? '决赛' : left === 2 ? '半决赛' : left === 3 ? '1/4决赛' : left === 4 ? '1/8决赛' : '1/16决赛';
  }
  C.koRoundName = koRoundName;

  function playKO(S, key, out) {
    var ko = S.xcup.ko[key];
    if (!ko || ko.done) return;
    var r = ko.rounds.length - 1, round = ko.rounds[r];
    var label = C.CUPS[key].cn + ' ' + koRoundName(ko, r);
    round.forEach(function (m) {
      if (m.w) return;
      if (!m.b || !S.teams[m.b]) { m.w = m.a; m.bye = true; return; }
      if (!m.a || !S.teams[m.a]) { m.w = m.b; m.bye = true; return; }
      var g = play(S, m.a, m.b, label, out);
      m.as = g.hs; m.bs = g.as; m.mid = g.mid; m.w = g.hs > g.as ? m.a : m.b;
      var loser = m.w === m.a ? m.b : m.a;
      if (loser === S.user.proId) award(S, key, ko.total - r);
    });
    if (round.length === 1) {
      ko.done = true; ko.champion = round[0].w;
      if (ko.champion === S.user.proId) award(S, key, 0);
      return;
    }
    var next = [];
    for (var i = 0; i < round.length; i += 2) next.push({ a: round[i].w, b: round[i + 1].w });
    ko.rounds.push(next);
    // 轮空不占比赛日：若下一轮全是已有胜者的直接晋级，留到下个比赛日再打
  }

  function award(S, key, place) {
    var cup = C.CUPS[key], prize = cup.prize[Math.min(place, cup.prize.length - 1)] || 0;
    var name = 'XBA杯 ' + cup.cn + ' ' + (PLACE[place] || '参赛');
    S.xcup.result = name;
    if (prize) W().earn(S, prize, name);
    if (place <= 1) S.user.trophies.push({ season: S.season, name: '第' + S.season + '赛季 ' + name });
    if (place === 0) W().userPro(S).fans += 800;
    W().msg(S, name + (prize ? '，获得奖金 ' + U.money(prize) : ''), 'cup');
  }

  // 每日推进时调用
  C.playDay = function (S, out) {
    var xc = S.xcup;
    if (!xc || xc.season !== S.season) return;
    var d = S.day, r;
    if ((r = C.PRE_DAYS.indexOf(d)) >= 0 && xc.stage === 'pre') {
      playGroupRound(S, xc.pre, r, '分组预赛', out);
      if (r === 4) {
        var sp = split(S, xc.pre);
        var fg = [[], [], [], []];
        sp.top.forEach(function (id, i) { var row = Math.floor(i / 4), c = i % 4; fg[row % 2 ? 3 - c : c].push(id); });
        xc.fin = makeStage(fg);
        xc.ko.part = makeKO(sp.bottom);
        xc.stage = 'fin';
        if (sp.bottom.indexOf(S.user.proId) >= 0) W().msg(S, 'XBA杯分组预赛结束：你的球队未能出线，进入参赛杯', 'cup');
        else if (xc.user) W().msg(S, 'XBA杯分组预赛结束：你的球队出线，进入分组决赛！', 'cup');
      }
    } else if ((r = C.FIN_DAYS.indexOf(d)) >= 0 && xc.stage === 'fin') {
      playGroupRound(S, xc.fin, r, '分组决赛', out);
      if (r === 4) {
        var sf = split(S, xc.fin);
        xc.ko.champ = makeKO(sf.top);
        xc.ko.win = makeKO(sf.bottom);
        xc.stage = 'ko';
        if (sf.top.indexOf(S.user.proId) >= 0) W().msg(S, 'XBA杯分组决赛结束：你的球队晋级冠军杯！', 'cup');
        else if (sf.bottom.indexOf(S.user.proId) >= 0) W().msg(S, 'XBA杯分组决赛结束：你的球队进入优胜杯', 'cup');
      }
    } else if (C.KO_DAYS.indexOf(d) >= 0 && xc.stage === 'ko') {
      ['champ', 'win', 'part'].forEach(function (k) { playKO(S, k, out); });
      if (xc.ko.champ.done && xc.ko.win.done && xc.ko.part.done) {
        xc.stage = 'done';
        var ch = S.teams[xc.ko.champ.champion];
        W().msg(S, '第 ' + S.season + ' 赛季 XBA杯 冠军杯冠军：' + (ch ? ch.name : '?'), 'cup');
      }
    }
  };

  C.stageName = function (xc) {
    return { pre: '分组预赛', fin: '分组决赛', ko: '冠军杯 / 优胜杯 / 参赛杯', done: '已结束' }[xc.stage];
  };
})(window.XBA);
