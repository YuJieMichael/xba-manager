// 街球杯赛、训练中心（训练赛/友谊赛）、表演赛、胜者为王
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, C = {};
  X.Cups = C;
  var W = function () { return X.World; };

  // 街球队实力（场上三人的平均综合）
  C.streetPower = function (S) {
    var ps = W().teamPlayers(S, W().userStreet(S)).map(function (p) { return P.ovr(p); }).sort(function (a, b) { return b - a; });
    return U.avg(ps.slice(0, 3)) || 15;
  };

  // 临时 AI 街球队（不入库）
  C.tempStreetTeam = function (S, ovr, name) {
    var ps = [];
    var pos = ['C', 'SF', 'PG', U.pick(X.POS), U.pick(X.POS)];
    pos.forEach(function (ps1) {
      var p = P.gen(S, { pos: ps1, age: U.ri(15, 21), ovr: Math.max(8, ovr + U.gauss() * 2.5), street: true });
      delete S.players[p.id];
      ps.push(p);
    });
    var lu = E.autoLineup(ps, 'street');
    return {
      id: 'tmp' + U.ri(1, 1e9), name: name || (U.pick(X.TEAM_CITY) + U.pick(X.STREET_NICK)), color: U.pick(X.JERSEY_COLORS).c, kind: 'street', temp: true,
      players: ps, presets: [{ name: '先发', lineup: lu, off: E.suggestOff(ps, lu, 'street'), def: U.pick(X.STREET_DEF), intensity: 2 }],
      config: { start: 0, lead5: -1, lead10: -1, trail5: -1, trail10: -1 }, prof: { off: {}, def: {} }, status: 1
    };
  };

  function streetCfg(S, home) {
    var st = W().userStreet(S);
    return W().sideCfg(S, st, null, { home: !!home });
  }

  function addStreetPts(S, pts) {
    S.user.streetPts += pts;
    var lv = 1;
    for (var i = 0; i < X.STREET_LEVELS.length; i++) if (S.user.streetPts >= X.STREET_LEVELS[i]) lv = i + 1;
    if (lv > S.user.streetLevel) { S.user.streetLevel = lv; W().msg(S, '街球等级提升到 ' + lv + ' 级！', 'sys'); }
  }

  // 街球正规比赛后：训练点、心情
  function streetAfter(S, res, userSide, tpOn) {
    var box = userSide === 'h' ? res.box.h : res.box.a;
    var dbl = C.doubleOn(S) ? 2 : 1;
    var gained = {};
    box.forEach(function (b) {
      var p = S.players[b.pid]; if (!p) return;
      if (tpOn) {
        // 训练点按上场时间和表现分配：主力拿大头，没上场的替补只有 1 点
        var tp = b.min > 0 ? Math.round((b.min / 2 + Math.max(0, b.eff) * 0.6) * dbl) : dbl;
        p.tp += tp; gained[p.id] = tp;
        p.mood = Math.max(0, p.mood - 2);
      }
    });
    return gained;
  }

  function playStreet(S, opp, type, opts) {
    if (S.user.coach && S.user.coach.autoStreet) X.Coach.prepareStreet(S);
    var st = W().userStreet(S);
    var home = U.chance(0.5);
    var me = streetCfg(S, home), them = Object.assign({}, opp, { home: !home });
    var res = home ? E.play(me, them, { kind: 'street', log: true, injuries: !opts.friendly, noStamina: !!opts.friendly })
      : E.play(them, me, { kind: 'street', log: true, injuries: !opts.friendly, noStamina: !!opts.friendly });
    var userSide = home ? 'h' : 'a';
    var mid = W().saveMatch(S, type, res, home ? st : opp, home ? opp : st, 'street', opts.extra || {});
    W().applyMatch(S, res, { noStamina: !!opts.friendly });
    if (!opts.friendly) W().addProf(st, userSide === 'h' ? res.used.h : res.used.a);
    var won = home ? res.hs > res.as : res.as > res.hs;
    var gained = streetAfter(S, res, userSide, !!opts.tp);
    S.matches[mid].tp = gained;
    return { mid: mid, won: won, res: res };
  }

  // ===== 双倍训练卡：生效 3 天，可自动续约 =====
  C.DOUBLE_DAYS = 3;
  C.doubleOn = function (S) { return S.dayNo < (S.user.doubleUntil || 0); };
  C.doubleLeft = function (S) { return Math.max(0, (S.user.doubleUntil || 0) - S.dayNo); };
  C.useDouble = function (S, auto) {
    var u = S.user, bought = false;
    if ((u.items.double || 0) > 0) u.items.double--;
    else if (auto && u.coins >= 20) { u.coins -= 20; bought = true; }
    else return '没有双倍训练卡' + (auto ? '，游戏币也不足 20' : '');
    u.doubleUntil = Math.max(u.doubleUntil || 0, S.dayNo) + C.DOUBLE_DAYS;
    if (auto) W().msg(S, '双倍训练卡已自动续约' + (bought ? '（花费 20 游戏币自动购买）' : '') + '，有效期 ' + C.DOUBLE_DAYS + ' 天', 'sys');
    return null;
  };
  // 每天推进后：到期且开启自动续约就再用一张
  C.doubleDaily = function (S) {
    var u = S.user;
    if (!u.doubleAuto || C.doubleOn(S)) return;
    if (!u.doubleUntil) return; // 从未用过不自动开启
    var err = C.useDouble(S, true);
    if (err) { W().msg(S, '双倍训练卡到期，自动续约失败：' + err, 'sys'); u.doubleAuto = false; }
  };

  // ===== 训练中心 =====
  C.trainOpponents = function (S) {
    if (!S.trainOpps || S.trainOpps.day !== S.dayNo) {
      var pw = C.streetPower(S);
      S.trainOpps = { day: S.dayNo, list: [-7, -4, -2, 0, 2, 4, 7].map(function (d) {
        return { name: U.pick(X.TEAM_CITY) + U.pick(X.STREET_NICK), ovr: Math.max(8, pw + d + U.gauss()), id: U.uid(S, 'o') };
      }) };
    }
    return S.trainOpps.list;
  };

  C.trainingMatch = function (S, oppId, friendly) {
    var o = C.trainOpponents(S).find(function (x) { return x.id === oppId; });
    if (!o) return { err: '对手不存在' };
    var ps = W().teamPlayers(S, W().userStreet(S)).filter(function (p) { return p.inj <= 0; });
    if (ps.length < 3) return { err: '街球队可上场球员不足 3 人' };
    if (!friendly && U.avg(ps.map(function (p) { return p.st; })) < 25) return { err: '球员体力太低，先休息吧' };
    var opp = C.tempStreetTeam(S, o.ovr, o.name);
    var r = playStreet(S, opp, friendly ? 'friendly' : 'train', { tp: !friendly, friendly: friendly });
    if (!friendly) addStreetPts(S, r.won ? 6 : 2);
    return r;
  };

  // ===== 街球杯赛 =====
  C.daily = function (S) {
    var lv = S.user.streetLevel;
    var keep = S.cups.filter(function (c) { return c.registered && !c.done; });
    var has = function (type) { return keep.some(function (c) { return c.type === type; }); };
    var pw = C.streetPower(S);
    if (!has('newbie')) keep.push({ id: U.uid(S, 'c'), type: 'newbie', name: '新人杯（第' + S.dayNo + '期）', size: 8, strength: Math.min(pw, 24) - 1, prize: [30000, 15000, 8000, 3000] });
    if (!has('small')) keep.push({ id: U.uid(S, 'c'), type: 'small', name: lv + '级小杯赛', size: 8, strength: 14 + lv * 4, prize: [40000 * lv, 20000 * lv, 10000 * lv, 4000 * lv] });
    if ((S.day === 6 || S.day === 20) && !has('big')) keep.push({ id: U.uid(S, 'c'), type: 'big', name: '第' + S.season + '赛季大杯赛（' + (S.day === 6 ? '上' : '下') + '）', size: 16, strength: Math.max(28, pw + 4), prize: [600000, 300000, 120000, 50000, 20000] });
    S.cups = keep;
  };

  C.register = function (S, cid) {
    var c = S.cups.find(function (x) { return x.id === cid; });
    if (!c) return '杯赛不存在';
    if (c.registered) return '已经报名';
    if (c.type === 'newbie') {
      if (S.user.streetLevel > 1) return '新人杯仅限街球等级 1 级的球队';
      if (S.user.items.newbie <= 0) return '没有新人杯邀请函';
      S.user.items.newbie -= 1;
    }
    if (c.type === 'small' && S.cups.some(function (x) { return x.type === 'small' && x.registered && x !== c; })) return '已报名其他小杯赛';
    c.registered = true;
    return null;
  };

  C.resolveDay = function (S, out) {
    S.cups.forEach(function (c) {
      if (!c.registered || c.done) return;
      c.done = true;
      var rounds = Math.log2(c.size), alive = true, reached = 0, mids = [];
      for (var r = 0; r < rounds && alive; r++) {
        var opp = C.tempStreetTeam(S, c.strength + r * 1.2 + U.gauss() * 1.5);
        var stage = rounds - r === 1 ? '决赛' : rounds - r === 2 ? '半决赛' : rounds - r === 3 ? '1/4决赛' : '1/8决赛';
        var ps = W().teamPlayers(S, W().userStreet(S)).filter(function (p) { return p.inj <= 0; });
        if (ps.length < 3) { alive = false; break; }
        var res = playStreet(S, opp, 'cup', { tp: true, extra: { cup: c.name + ' ' + stage } });
        mids.push(res.mid);
        addStreetPts(S, res.won ? 12 : 4);
        if (res.won) reached = r + 1; else alive = false;
      }
      // 名次奖金
      var place = rounds - reached; // 0=冠军
      var prize = c.prize[Math.min(place, c.prize.length - 1)] || 0;
      if (place >= c.prize.length) prize = 0;
      var placeName = place === 0 ? '冠军' : place === 1 ? '亚军' : place === 2 ? '四强' : place === 3 ? '八强' : '十六强';
      if (prize) W().earn(S, prize, c.name + ' ' + placeName);
      if (place === 0) S.user.trophies.push({ season: S.season, name: c.name + ' 冠军' });
      W().msg(S, c.name + '：你的街球队获得' + placeName + (prize ? '，奖金 ' + U.money(prize) : ''), 'cup');
      out.cupResults.push({ name: c.name, place: placeName, prize: prize, mids: mids });
    });
    S.cups = S.cups.filter(function (c) { return !c.done; });
  };

  // ===== 表演赛 / 职业友谊赛 =====
  C.proOpponents = function (S) {
    var u = W().userPro(S);
    if (!S.proOpps || S.proOpps.day !== S.dayNo) {
      var list = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && Math.abs(t.level - u.level) <= 1; });
      S.proOpps = { day: S.dayNo, list: U.shuffle(list).slice(0, 8).map(function (t) { return t.id; }) };
    }
    return S.proOpps.list.map(function (id) { return S.teams[id]; }).filter(Boolean);
  };

  C.proMatch = function (S, tid, type) {
    var u = W().userPro(S), opp = S.teams[tid];
    if (!opp) return { err: '对手不存在' };
    var friendly = type === 'friendly';
    if (W().teamPlayers(S, u).filter(function (p) { return p.inj <= 0; }).length < 5) return { err: '可上场球员不足 5 人' };
    if (X.Coach.autoOn(S)) X.Coach.prepare(S, 'other', tid);
    var home = U.chance(0.5);
    var me = W().sideCfg(S, u, 'other', { home: home }), them = W().sideCfg(S, opp, 'league', { home: !home });
    var opts = { kind: 'pro', log: true, injuries: !friendly, noStamina: friendly };
    var res = home ? E.play(me, them, opts) : E.play(them, me, opts);
    var mid = W().saveMatch(S, type, res, home ? u : opp, home ? opp : u, 'pro', type === 'show' ? { proTP: W().earnProTP(S, res, home) } : {});
    W().applyMatch(S, res, { noStamina: friendly });
    // AI 对手也消耗体力（友谊赛除外）
    var won = home ? res.hs > res.as : res.as > res.hs;
    if (type === 'show') {
      var stake = [0, 200000, 80000, 40000, 20000][u.level];
      var fans = Math.round(Math.min(u.fans, opp.fans) * 0.01);
      if (won) { W().earn(S, stake, '表演赛胜利奖金'); u.fans += fans; opp.fans = Math.max(300, opp.fans - fans); W().msg(S, '表演赛胜利！获得 ' + U.money(stake) + '，抢到对方球迷 ' + fans + ' 人', 'cup'); }
      else { W().spend(S, Math.round(stake / 2), '表演赛失利'); u.fans = Math.max(300, u.fans - fans); opp.fans += fans; W().msg(S, '表演赛失利，损失 ' + U.money(stake / 2) + '，流失球迷 ' + fans + ' 人', 'cup'); }
    }
    S.proOpps.list = S.proOpps.list.filter(function (id) { return id !== tid; });
    return { mid: mid, won: won };
  };

  // ===== 胜者为王 =====
  function mainSalary(S, t) {
    return U.sum(W().teamPlayers(S, t).map(function (p) { return p.salary; }).sort(function (a, b) { return b - a; }).slice(0, 8));
  }
  C.wkStart = function (S) {
    if (S.user.wkDay === S.dayNo) return '今天已经参加过胜者为王了，明天再来吧';
    if (W().teamPlayers(S, W().userPro(S)).filter(function (p) { return p.inj <= 0; }).length < 5) return '可上场球员不足 5 人';
    S.user.wkDay = S.dayNo;
    S.user.wk = { wins: 0, pts: 0, games: [], over: false };
    C.wkNextOpp(S);
    return null;
  };
  C.wkNextOpp = function (S) {
    var u = W().userPro(S), my = mainSalary(S, u);
    var cands = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro'; });
    cands.sort(function (a, b) { return Math.abs(mainSalary(S, a) - my) - Math.abs(mainSalary(S, b) - my); });
    var wk = S.user.wk;
    var pool = cands.slice(0, 12 + wk.wins * 2).filter(function (t) { return wk.games.indexOf(t.id) < 0; });
    wk.opp = (pool.length ? U.pick(pool) : U.pick(cands)).id;
  };
  C.wkPlay = function (S) {
    var wk = S.user.wk;
    if (!wk || wk.over) return { err: '请先报名' };
    var u = W().userPro(S), opp = S.teams[wk.opp];
    if (X.Coach.autoOn(S)) X.Coach.prepare(S, 'other', opp.id);
    var me = W().sideCfg(S, u, 'other', { home: true, status: 1 }), them = W().sideCfg(S, opp, 'league', { status: 1 });
    var res = E.play(me, them, { kind: 'pro', log: true, injuries: false, noStamina: true });
    var mid = W().saveMatch(S, 'wk', res, u, opp, 'pro', { cup: '胜者为王 第' + (wk.wins + 1) + '场' });
    W().applyMatch(S, res, { noStamina: true });
    wk.games.push(opp.id);
    var won = res.hs > res.as;
    if (won) {
      wk.wins += 1;
      wk.pts += wk.wins <= 3 ? 1 : wk.wins <= 6 ? 2 : 4;
      if (wk.wins >= 9) { C.wkClaim(S); }
      else C.wkNextOpp(S);
    } else {
      W().msg(S, '胜者为王：连胜 ' + wk.wins + ' 场后落败，本次积分清零', 'cup');
      wk.over = true; wk.pts = 0;
    }
    return { mid: mid, won: won };
  };
  C.wkClaim = function (S) {
    var wk = S.user.wk;
    if (!wk || wk.over) return '没有可领取的积分';
    if (wk.wins % 3 !== 0 || wk.wins === 0) return '连胜 3、6、9 场后才能退出领取积分';
    S.user.wkPts += wk.pts;
    S.user.coins += wk.pts;
    W().msg(S, '胜者为王：连胜 ' + wk.wins + ' 场退出，获得王者积分 ' + wk.pts + '（已兑换为 ' + wk.pts + ' 游戏币）', 'cup');
    if (wk.wins >= 9) S.user.trophies.push({ season: S.season, name: '胜者为王 九连胜' });
    wk.over = true;
    return null;
  };
})(window.XBA);
