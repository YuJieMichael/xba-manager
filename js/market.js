// 转会市场：街头自由球员、街球选秀、职业转会、极限球员、街头竞价；职业选秀；球探；选拔卡
(function (X) {
  var U = X.U, P = X.P, M = {};
  X.Market = M;
  var W = function () { return X.World; };

  M.PRO_MAX = 12; M.PRO_MIN = 8; M.ST_MAX = 8; M.ST_MIN = 4;
  M.NAMES = { free: '街头自由球员', sdraft: '街球选秀', pro: '职业转会', extreme: '极限球员', auction: '街头竞价' };

  function listing(S, mk, p, opt) {
    var l = { id: U.uid(S, 'l'), mk: mk, pid: p.id, end: S.dayNo + (opt.days || 1), min: opt.min || 0, price: opt.price || 0,
      leader: null, userBid: 0, cancelled: false, aiMax: opt.aiMax || 0, seller: opt.seller || 'ai', fromTeam: opt.fromTeam || null, open: !!opt.open };
    p.listing = l.id;
    S.market.push(l);
    return l;
  }
  // 小秘书的提示价：舍去形式（49999 → 40000）
  M.hint = function (v) {
    if (v < 10) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.floor(v / mag) * mag;
  };

  function userLevel(S) { return W().userPro(S).level; }

  M.daily = function (S) {
    var lv = userLevel(S), avg = X.LEVELS[lv - 1].avg;
    var cnt = function (mk) { return S.market.filter(function (l) { return l.mk === mk; }).length; };
    // 街头自由球员（进入街球队）
    while (cnt('free') < 12) {
      var age = U.ri(15, 20);
      var p = P.gen(S, { age: age, ovr: U.rf(14, 22) + S.user.streetLevel * 1.5 + (20 - age) * -0.5, street: true });
      var v = P.value(p);
      listing(S, 'free', p, { days: U.ri(1, 2), min: Math.round(v * U.rf(0.3, 0.55) / 100) * 100, aiMax: U.chance(0.55) ? Math.round(v * U.rf(0.35, 0.9)) : 0 });
    }
    // 街球选秀（进入职业队）
    while (cnt('sdraft') < 8) {
      var p2 = P.gen(S, { age: U.ri(18, 21), ovr: Math.max(15, avg - 8 + U.gauss() * 5), street: false });
      var v2 = P.value(p2);
      listing(S, 'sdraft', p2, { days: U.ri(1, 2), min: Math.round(v2 * U.rf(0.35, 0.55) / 100) * 100, aiMax: U.chance(0.6) ? Math.round(v2 * U.rf(0.4, 0.95)) : 0 });
    }
    // 职业转会（明拍）：从 AI 球队挂牌
    var tries = 0;
    while (cnt('pro') < 10 && tries++ < 50) {
      var teams = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && Math.abs(t.level - lv) <= 1 && t.playerIds.length > 9; });
      if (!teams.length) break;
      var t = U.pick(teams);
      var ps = W().teamPlayers(S, t).filter(function (x) { return !x.listing; });
      if (!ps.length) continue;
      var p3 = U.pick(ps), v3 = P.value(p3);
      listing(S, 'pro', p3, { days: U.ri(2, 3), open: true, price: Math.round(v3 * U.rf(0.5, 0.75) / 1000) * 1000, aiMax: U.chance(0.6) ? Math.round(v3 * U.rf(0.8, 1.3)) : 0, fromTeam: t.id });
    }
    // 极限球员（赛季中开放）
    if (S.day >= 13 && S.day <= 26) {
      while (cnt('extreme') < 6) {
        var p4 = P.gen(S, { age: U.ri(23, 30), ovr: avg + U.rf(8, 16) });
        var v4 = P.value(p4);
        listing(S, 'extreme', p4, { days: U.ri(2, 3), min: Math.round(v4 * U.rf(0.7, 0.95) / 1000) * 1000, aiMax: U.chance(0.5) ? Math.round(v4 * U.rf(0.8, 1.2)) : 0 });
      }
    }
  };

  M.get = function (S, id) { return S.market.find(function (l) { return l.id === id; }); };

  function capOk(S, p) {
    var team = W().userPro(S);
    return W().payroll(S, team) + P.salaryFor(p) <= W().cap(team);
  }

  M.minBid = function (S, l) {
    if (!l.open) return l.min;
    if (!l.leader) return l.price;
    return Math.max(l.price + 1000, Math.round(l.price * 1.05 / 100) * 100);
  };

  M.bid = function (S, lid, amount) {
    var l = M.get(S, lid);
    if (!l) return '该球员已经成交';
    var p = S.players[l.pid];
    amount = Math.round(amount);
    if (!(amount > 0)) return '请输入出价';
    if (amount > S.user.money) return '资金不足';
    var toPro = l.mk !== 'free';
    if (toPro) {
      var pro = W().userPro(S);
      if (pro.playerIds.length >= M.PRO_MAX) return '职业队人数已满（上限 ' + M.PRO_MAX + '）';
      if (!capOk(S, p)) return '签下此球员后工资将超过工资帽，不能购买新球员';
    } else if (W().userStreet(S).playerIds.length >= M.ST_MAX) return '街球队人数已满（上限 ' + M.ST_MAX + '）';
    if (l.open) {
      var mb = M.minBid(S, l);
      if (l.leader === 'user') return '你已经是最高出价者';
      if (amount < mb) return '出价至少为 ' + U.money(mb);
      l.price = amount; l.leader = 'user'; l.userBid = amount;
      if (S.dayNo + 0 >= l.end - 0 && false) l.end += 1;
    } else {
      if (l.userBid) return '每个球员只能出价一次';
      if (l.cancelled) return '你已取消过出价，不能再次出价';
      l.userBid = amount;
    }
    if (S.user.watch.indexOf(lid) < 0) S.user.watch.push(lid);
    return null;
  };

  M.cancel = function (S, lid) {
    var l = M.get(S, lid);
    if (!l || l.open || !l.userBid) return '无法取消';
    l.userBid = 0; l.cancelled = true;
    return null;
  };

  function giveToUser(S, l, p, price) {
    var toPro = l.mk !== 'free';
    var team = toPro ? W().userPro(S) : W().userStreet(S);
    if (S.user.money < price) { W().msg(S, '资金不足，竞拍 ' + p.name + ' 失败', 'market'); return false; }
    if (toPro && team.playerIds.length >= M.PRO_MAX) { W().msg(S, '职业队已满，竞拍 ' + p.name + ' 失败', 'market'); return false; }
    if (!toPro && team.playerIds.length >= M.ST_MAX) { W().msg(S, '街球队已满，竞拍 ' + p.name + ' 失败', 'market'); return false; }
    W().spend(S, price, M.NAMES[l.mk] + '：' + p.name);
    if (l.fromTeam && S.teams[l.fromTeam]) W().removeFromTeam(S, S.teams[l.fromTeam], p);
    W().addToTeam(S, team, p);
    if (toPro) { p.salary = P.salaryFor(p); p.contract = U.ri(26, 52); p.green = false; p.tp = 0; }
    else { p.salary = 0; p.contract = 0; p.tp = 10; }
    p.joined = S.dayNo;
    W().msg(S, '竞拍成功！' + p.name + ' 以 ' + U.money(price) + ' 加盟' + team.name, 'market');
    return true;
  }

  // 每日结算（在推进日期时调用）
  M.resolve = function (S, out) {
    var keep = [];
    S.market.forEach(function (l) {
      var p = S.players[l.pid];
      if (!p) return;
      // 明拍：AI 反加价
      if (l.open && l.leader === 'user' && l.aiMax > l.price) {
        var np = Math.min(l.aiMax, Math.round(l.price * U.rf(1.05, 1.15) / 100) * 100);
        if (np > l.price) {
          l.price = np; l.leader = 'ai';
          W().msg(S, '你对 ' + p.name + ' 的出价已被其他经理超过，当前价 ' + U.money(np), 'market');
          if (S.dayNo >= l.end) l.end = S.dayNo + 1; // 截止前有人出价，延时
        }
      }
      if (S.dayNo < l.end) { keep.push(l); return; }
      // 截止结算
      var won = false;
      if (l.seller === 'user') { sellResolve(S, l, p); return; }
      if (l.open) {
        if (l.leader === 'user') won = giveToUser(S, l, p, l.price);
        else if (l.userBid) W().msg(S, '竞拍失败：' + p.name + ' 被其他球队以 ' + U.money(l.price) + ' 签下', 'market');
      } else if (l.userBid) {
        if (l.userBid >= l.min && l.userBid > l.aiMax) won = giveToUser(S, l, p, l.userBid);
        else W().msg(S, '暗拍失败：' + p.name + (l.userBid < l.min ? '（出价低于球员最低身价）' : '（其他经理出价更高）'), 'market');
      }
      if (!won) {
        // 未成交 / 被 AI 买走
        if (!l.fromTeam) { if (!p.teamId) delete S.players[p.id]; }
        else if (l.aiMax > l.price || l.leader === 'ai') {
          var from = S.teams[l.fromTeam];
          var others = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && t !== from && t.level === (from ? from.level : 4) && t.playerIds.length < M.PRO_MAX; });
          if (from && others.length && from.playerIds.length > 9) { W().removeFromTeam(S, from, p); W().addToTeam(S, U.pick(others), p); }
        }
      }
      p.listing = null;
      S.user.watch = S.user.watch.filter(function (id) { return id !== l.id; });
    });
    S.market = keep;
  };

  // ===== 用户出售 =====
  M.sellPro = function (S, pid, reserve) {
    var p = S.players[pid], team = W().userPro(S);
    if (!p || p.teamId !== team.id) return '球员不在你的职业队';
    if (p.listing) return '已在挂牌中';
    if (team.playerIds.length <= M.PRO_MIN) return '职业队人数不能少于 ' + M.PRO_MIN + ' 人';
    if (!p.green) {
      var v = Math.round(P.value(p) * 0.05);
      W().earn(S, v, '出售球员：' + p.name);
      fanLoss(S, team, p);
      W().msg(S, p.name + ' 以市场价的 5%（' + U.money(v) + '）出售', 'market');
      W().deletePlayer(S, p);
      return null;
    }
    reserve = Math.max(1000, Math.round(reserve || P.value(p) * 0.6));
    var bidders = U.ri(0, 4), best = 0, second = 0;
    for (var i = 0; i < bidders; i++) { var b = P.value(p) * U.rf(0.6, 1.35); if (b > best) { second = best; best = b; } else if (b > second) second = b; }
    listing(S, 'pro', p, { days: 2, open: true, price: reserve, aiMax: Math.round(best), seller: 'user', fromTeam: team.id });
    S.market[S.market.length - 1].second = Math.round(second);
    return null;
  };

  M.sellStreet = function (S, pid) {
    var p = S.players[pid], team = W().userStreet(S);
    if (!p || p.teamId !== team.id) return '球员不在你的街球队';
    if (p.listing) return '已在挂牌中';
    if (team.playerIds.length <= M.ST_MIN) return '街球队人数不能少于 ' + M.ST_MIN + ' 人';
    var coins = Math.max(1, Math.round(P.value(p) / 2500 * U.rf(0.5, 1.5)));
    listing(S, 'auction', p, { days: 1, open: true, price: 1, aiMax: coins, seller: 'user', fromTeam: team.id });
    return null;
  };

  M.unlist = function (S, lid) {
    var l = M.get(S, lid);
    if (!l || l.seller !== 'user') return '无法撤销';
    var p = S.players[l.pid]; if (p) p.listing = null;
    S.market = S.market.filter(function (x) { return x !== l; });
    return null;
  };

  function fanLoss(S, team, p) {
    var loss = Math.round(team.fans * p.support / 100 * 0.06);
    if (loss > 0) { team.fans = Math.max(300, team.fans - loss); W().msg(S, p.name + ' 离队，球队流失球迷 ' + loss + ' 人', 'fin'); }
  }

  function sellResolve(S, l, p) {
    var team = S.teams[l.fromTeam];
    if (l.mk === 'auction') {
      var coins = Math.round(l.aiMax * (S.user.member ? 0.7 : 0.5));
      S.user.coins += coins;
      W().msg(S, '街头竞价：' + p.name + ' 以 ' + l.aiMax + ' 游戏币成交，你获得 ' + coins + ' 游戏币', 'market');
      W().deletePlayer(S, p);
      ensureStreetMin(S);
      return;
    }
    if (l.aiMax >= l.price) {
      var price = Math.max(l.price, Math.min(l.aiMax, Math.round((l.second || 0) * 1.05)));
      W().earn(S, price, '转会出售：' + p.name);
      fanLoss(S, team, p);
      W().msg(S, p.name + ' 转会成功，转会费 ' + U.money(price), 'market');
      W().removeFromTeam(S, team, p);
      var dest = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && t.playerIds.length < M.PRO_MAX; });
      if (dest.length) W().addToTeam(S, U.pick(dest), p); else delete S.players[p.id];
      p.green = false;
    } else {
      W().msg(S, p.name + ' 挂牌到期，无人出价达到底价，留在队中', 'market');
    }
    p.listing = null;
  }

  function ensureStreetMin(S) {
    var st = W().userStreet(S);
    while (st.playerIds.length < M.ST_MIN) {
      var g = P.gen(S, { age: U.ri(15, 18), ovr: U.rf(10, 16), street: true });
      W().addToTeam(S, st, g);
      W().msg(S, '街球队人数不足，系统自动补充球员 ' + g.name + '（潜力综合较差）', 'player');
    }
  }
  M.ensureStreetMin = ensureStreetMin;

  // 下放：结束篮球生涯
  M.release = function (S, pid) {
    var p = S.players[pid], st = W().userStreet(S);
    if (!p || p.teamId !== st.id) return '只能下放街球队员';
    if (p.listing) return '该球员正在挂牌';
    W().msg(S, p.name + ' 被下放，结束了篮球生涯', 'player');
    W().deletePlayer(S, p);
    ensureStreetMin(S);
    return null;
  };

  // 街球选秀：年满18岁的街球员参加职业选秀，经理获得少量资金
  M.streetDraft = function (S, pid) {
    var p = S.players[pid], st = W().userStreet(S);
    if (!p || p.teamId !== st.id) return '只能选秀街球队员';
    if (p.age < 18) return '年满 18 岁才能参加选秀';
    var v = Math.round(U.clamp(P.value(p) * 0.08, 10000, 120000) / 100) * 100;
    W().earn(S, v, '街球选秀：' + p.name);
    W().msg(S, p.name + ' 参加选秀离队，你获得系统定价资金 ' + U.money(v), 'market');
    W().deletePlayer(S, p);
    ensureStreetMin(S);
    return null;
  };

  // 选拔卡：街球员（≥18岁）提拔到职业队（绿色名字）
  M.promote = function (S, pid) {
    var p = S.players[pid], st = W().userStreet(S), pro = W().userPro(S);
    if (S.user.selectCards <= 0) return '没有街球选拔卡（第二个赛季起每赛季发放 1 张，也可以在道具商店用 100 游戏币购买）';
    if (!p || p.teamId !== st.id) return '只能选拔街球队员';
    if (p.age < 18) return '年满 18 岁才能选拔';
    if (pro.playerIds.length >= M.PRO_MAX) return '职业队人数已满';
    var ageF = p.age <= 18 ? 1 : p.age === 19 ? 0.9 : p.age === 20 ? 0.8 : p.age === 21 ? 0.65 : p.age === 22 ? 0.5 : 0.3;
    var report = [];
    X.ATTRS.forEach(function (k) {
      var close = p.m[k] > 0 ? p.a[k] / p.m[k] : 0;
      var inc = p.m[k] / 100 * U.rf(4, 10) * close * close * ageF;
      p.m[k] = Math.min(X.ATTR_CAP, p.m[k] + inc);
    });
    S.user.selectCards -= 1;
    W().removeFromTeam(S, st, p);
    W().addToTeam(S, pro, p);
    p.green = true; p.salary = P.salaryFor(p); p.contract = 52; p.tp = 0;
    W().msg(S, p.name + ' 被选拔进入职业队！潜力上限获得提升', 'player');
    ensureStreetMin(S);
    return null;
  };

  // 球探
  M.scout = function (S) {
    if (S.user.items.scout > 0) S.user.items.scout -= 1;
    else if (S.user.coins >= 30) S.user.coins -= 30;
    else return '需要球探道具或 30 游戏币';
    var ids = [];
    for (var i = 0; i < 3; i++) {
      // 潜力档次：绿 45%、蓝 30%、紫 18%、红 7%
      var tier = U.wpick([45, 30, 18, 7]);
      var gap = [U.rf(6, 12), U.rf(12, 18), U.rf(18, 24), U.rf(24, 32)][tier];
      var p = P.gen(S, { age: U.ri(15, 17), ovr: U.rf(13, 21) + S.user.streetLevel, street: true, gap: gap });
      ids.push(p.id);
    }
    if (S.scout) S.scout.forEach(function (id) { var p = S.players[id]; if (p && !p.teamId) delete S.players[id]; });
    S.scout = ids;
    return null;
  };
  // 球探评价：按潜力分四档，绿 < 蓝 < 紫 < 红
  M.GRADES = [{ cn: '绿', name: '普通', c: '#2e9b2e' }, { cn: '蓝', name: '良好', c: '#2a6fd6' }, { cn: '紫', name: '优秀', c: '#8a3fc4' }, { cn: '红', name: '天才', c: '#d0202e' }];
  M.scoutGrade = function (p) {
    var r = P.potRemain(p);
    return M.GRADES[r >= 50 ? 3 : r >= 37 ? 2 : r >= 25 ? 1 : 0];
  };
  // 自动球探：一直找，直到候选人里出现目标颜色（或更好）为止，自动签下
  M.scoutUntil = function (S, target, maxTries) {
    var st = W().userStreet(S);
    if (st.playerIds.length >= M.ST_MAX) return { err: '街球队人数已满，先腾出位置' };
    var tries = 0, coins = 0, items = 0;
    maxTries = maxTries || 300;
    while (tries < maxTries) {
      if (S.user.items.scout > 0) items++;
      else if (S.user.coins >= 30) coins += 30;
      else break;
      var err = M.scout(S);
      if (err) break;
      tries++;
      var best = null, bg = -1;
      S.scout.forEach(function (id) { var g = M.GRADES.indexOf(M.scoutGrade(S.players[id])); if (g > bg) { bg = g; best = id; } });
      if (bg >= target) {
        M.signScout(S, best);
        return { pid: best, tries: tries, coins: coins, items: items };
      }
    }
    if (S.scout) { S.scout.forEach(function (id) { var p = S.players[id]; if (p && !p.teamId) delete S.players[id]; }); S.scout = null; }
    return { err: tries >= maxTries ? '找了 ' + tries + ' 次还没找到，先休息一下吧' : '游戏币不足（每次 30），找了 ' + tries + ' 次没找到', tries: tries, coins: coins, items: items };
  };
  M.signScout = function (S, pid) {
    var st = W().userStreet(S);
    if (!S.scout || S.scout.indexOf(pid) < 0) return '无效';
    if (st.playerIds.length >= M.ST_MAX) return '街球队人数已满';
    var np = S.players[pid];
    W().addToTeam(S, st, np);
    np.tp = 10;
    np.scoutGrade = M.GRADES.indexOf(M.scoutGrade(np));
    var g = M.GRADES[np.scoutGrade];
    W().msg(S, '球探签约：' + np.name + ' 加入街球队，球探潜力评价【' + g.cn + '·' + g.name + '】', 'player');
    S.scout.forEach(function (id) { var p = S.players[id]; if (p && !p.teamId) delete S.players[id]; });
    S.scout = null;
    return null;
  };

  // ===== 职业选秀 =====
  M.draftOrder = function (S) {
    return Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return t.kind === 'pro'; })
      .sort(function (a, b) {
        var ga = a.rec.w + a.rec.l || 1, gb = b.rec.w + b.rec.l || 1;
        return (a.rec.w / ga) - (b.rec.w / gb) || (b.level - a.level);
      }).map(function (t) { return t.id; });
  };
  M.setupDraft = function (S, order) {
    var pool = [];
    var n = order.length + 12;
    for (var i = 0; i < n; i++) {
      var tier = U.chance(0.06) ? 18 : U.chance(0.25) ? 8 : 0;
      var p = P.gen(S, { pos: X.POS[i % 5], age: U.ri(19, 21), ovr: U.rf(22, 38) + tier });
      p.draft = true;
      pool.push(p.id);
    }
    S.draft = { pool: pool, order: order, idx: 0, done: false, picks: [] };
    M.draftRun(S);
  };
  function draftScore(S, p) { return P.ovr(p) + P.potRemain(p) * 0.6 + U.rf(0, 4); }
  M.draftRun = function (S) {
    var d = S.draft;
    while (d.idx < d.order.length) {
      var t = S.teams[d.order[d.idx]];
      if (!t) { d.idx++; continue; }
      if (t.isUser) {
        if (t.playerIds.length >= M.PRO_MAX) { d.picks.push({ team: t.name, player: '（人数已满，放弃）' }); d.idx++; continue; }
        return; // 等待用户选择
      }
      var best = null, bs = -1;
      d.pool.forEach(function (id) { var p = S.players[id]; if (!p || p.teamId) return; var s = draftScore(S, p); if (s > bs) { bs = s; best = p; } });
      if (best && t.playerIds.length < M.PRO_MAX + 1) {
        W().addToTeam(S, t, best); best.salary = P.salaryFor(best); best.contract = 52; best.draft = false;
        d.picks.push({ team: t.name, player: best.name, pid: best.id });
      }
      d.idx++;
    }
    M.draftEnd(S);
  };
  M.draftPick = function (S, pid) {
    var d = S.draft, t = W().userPro(S);
    if (!d || d.done) return '选秀未进行';
    if (d.order[d.idx] !== t.id) return '还没轮到你';
    var p = S.players[pid];
    if (!p || p.teamId || d.pool.indexOf(pid) < 0) return '该球员已被选走';
    W().addToTeam(S, t, p); p.salary = P.salaryFor(p); p.contract = 52; p.draft = false;
    d.picks.push({ team: t.name, player: p.name, pid: p.id, user: true });
    W().msg(S, '选秀：你选中了 ' + p.name + '（第 ' + (d.idx + 1) + ' 顺位）', 'market');
    d.idx++;
    M.draftRun(S);
    return null;
  };
  M.draftSkip = function (S) {
    var d = S.draft;
    if (!d || d.done) return;
    d.picks.push({ team: W().userPro(S).name, player: '（放弃）' });
    d.idx++;
    M.draftRun(S);
  };
  M.draftAutoFinish = function (S) {
    var d = S.draft;
    if (!d || d.done) return;
    if (d.order[d.idx] === S.user.proId) {
      var best = null, bs = -1;
      d.pool.forEach(function (id) { var p = S.players[id]; if (!p || p.teamId) return; var s = draftScore(S, p); if (s > bs) { bs = s; best = p; } });
      if (best) M.draftPick(S, best.id); else M.draftSkip(S);
    }
  };
  M.draftEnd = function (S) {
    var d = S.draft;
    d.pool.forEach(function (id) { var p = S.players[id]; if (p && !p.teamId) delete S.players[id]; });
    d.done = true;
    d.pool = [];
  };
})(window.XBA);
