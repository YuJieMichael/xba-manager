// 篮球联盟：加入/创建联盟、联盟杯（街球，赛季第 9 天）、联盟至尊杯（街球，赛季第 23 天）、联盟挑战（压分）
(function (X) {
  var U = X.U, P = X.P, E = X.Engine, AL = {};
  X.Alliance = AL;
  var W = function () { return X.World; };

  var NAMES = ['龙腾', '飞鹰', '皇家', '铁血', '王者', '星辰', '烈焰', '雷霆', '天下', '江湖', '巅峰', '传奇', '无双', '战神', '梦之队', '黑曼巴', '风云', '霸业', '紫禁', '长城'];

  AL.init = function (S) {
    if (S.alliances) return;
    var pro = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return t.kind === 'pro' && !t.isUser; });
    U.shuffle(pro);
    var names = U.shuffle(NAMES.slice()).slice(0, 16);
    S.alliances = names.map(function (n, i) {
      var members = pro.slice(i * 8, i * 8 + U.ri(4, 8)).map(function (t) { return t.id; });
      return { id: 'al' + i, name: n + '联盟', abbr: n.slice(0, 1), prestige: members.length + U.ri(0, 30), members: members, user: false };
    });
    S.user.alliance = null;
  };
  AL.get = function (S, id) { return (S.alliances || []).find(function (a) { return a.id === id; }); };
  AL.mine = function (S) { return S.user.alliance ? AL.get(S, S.user.alliance) : null; };
  AL.sorted = function (S) { return (S.alliances || []).slice().sort(function (a, b) { return b.prestige - a.prestige; }); };

  AL.join = function (S, id) {
    if (S.user.alliance) return '请先退出现在的联盟';
    var a = AL.get(S, id); if (!a) return '联盟不存在';
    a.user = true; a.prestige += 1; S.user.alliance = id;
    W().msg(S, '你加入了 ' + a.name + '！联盟威望 +1', 'sys');
    return null;
  };
  AL.leave = function (S) {
    var a = AL.mine(S); if (!a) return '你还没有加入联盟';
    a.user = false; a.prestige = Math.max(0, a.prestige - 1); S.user.alliance = null;
    if (!a.members.length) S.alliances = S.alliances.filter(function (x) { return x !== a; });
    S.user.zunInvite = false;
    return null;
  };
  AL.create = function (S, name) {
    if (S.user.alliance) return '请先退出现在的联盟';
    name = (name || '').trim();
    if (!name || name.length > 8) return '联盟名称 1~8 个字';
    if (S.alliances.some(function (a) { return a.name === name; })) return '联盟名称已被使用';
    var a = { id: U.uid(S, 'al'), name: name, abbr: name.slice(0, 1), prestige: 1, members: [], user: true, mineCreated: true };
    S.alliances.push(a); S.user.alliance = a.id;
    return null;
  };

  function streetPower(S) { return X.Cups.streetPower(S); }

  // 单场淘汰：返回名次（0 冠军、1 亚军、2 四强、3 八强）以及比赛 id
  function knockout(S, size, strengthFn, namesFn, label) {
    var rounds = Math.log2(size), reached = 0, mids = [];
    for (var r = 0; r < rounds; r++) {
      var ps = W().teamPlayers(S, W().userStreet(S)).filter(function (p) { return p.inj <= 0; });
      if (ps.length < 3) break;
      var opp = X.Cups.tempStreetTeam(S, strengthFn(r), namesFn(r));
      var stage = rounds - r === 1 ? '决赛' : rounds - r === 2 ? '半决赛' : '1/4决赛';
      var res = X.Cups.playStreet(S, opp, 'cup', { tp: true, extra: { cup: label + ' ' + stage } });
      mids.push(res.mid);
      X.Cups.addStreetPts(S, res.won ? 12 : 4);
      if (res.won) reached = r + 1; else break;
    }
    return { place: rounds - reached, mids: mids };
  }
  var PLACE = ['冠军', '亚军', '四强', '八强'];

  // 联盟杯（联盟内部街球杯赛）：进入四强获得至尊杯邀请函
  AL.allianceCup = function (S, out) {
    var a = AL.mine(S); if (!a) return;
    var pw = streetPower(S);
    var memberNames = a.members.map(function (id) { return S.teams[id] ? S.teams[id].name.slice(0, 2) : '无名'; });
    var r = knockout(S, 8, function (i) { return pw - 2 + i * 1.5 + U.gauss(); }, function () { return U.pick(memberNames.length ? memberNames : ['盟友']) + '街球队'; }, a.name + ' 联盟杯');
    var coins = [80, 40, 20, 5][r.place] || 0;
    S.user.coins += coins;
    a.prestige += [5, 3, 2, 0][r.place] || 0;
    if (r.place <= 2) { S.user.zunInvite = true; }
    if (r.place === 0) S.user.trophies.push({ season: S.season, name: '第' + S.season + '赛季 ' + a.name + ' 联盟杯 冠军' });
    W().msg(S, a.name + ' 联盟杯：你的街球队获得' + PLACE[r.place] + '，奖励 ' + coins + ' 游戏币' + (r.place <= 2 ? '，获得联盟至尊杯邀请函！' : ''), 'cup');
    out.cupResults.push({ name: a.name + ' 联盟杯', place: PLACE[r.place], prize: 0, mids: r.mids });
  };

  // 联盟至尊杯：各联盟代表的淘汰赛，持邀请函才能代表联盟出战
  AL.supremeCup = function (S, out) {
    var a = AL.mine(S);
    var top = AL.sorted(S).filter(function (x) { return x !== a; }).slice(0, 7);
    if (!a || !S.user.zunInvite) {
      var champ = U.pick(top.slice(0, 3));
      if (champ) { champ.prestige += 8; W().msg(S, '第 ' + S.season + ' 赛季联盟至尊杯冠军：' + champ.name, 'cup'); }
      return;
    }
    S.user.zunInvite = false;
    var pw = streetPower(S);
    var r = knockout(S, 8, function (i) { return Math.max(pw + 1, 22 + S.user.streetLevel * 3) + i * 2 + U.gauss(); }, function (i) { return (top[i] ? top[i].name : '强敌联盟') + '代表队'; }, '联盟至尊杯');
    var coins = [300, 150, 60, 20][r.place] || 0;
    S.user.coins += coins;
    a.prestige += [20, 10, 5, 2][r.place] || 0;
    if (r.place === 0) S.user.trophies.push({ season: S.season, name: '第' + S.season + '赛季 联盟至尊杯 冠军' });
    W().msg(S, '联盟至尊杯：你代表 ' + a.name + ' 获得' + PLACE[r.place] + '，奖励 ' + coins + ' 游戏币，联盟威望提升', 'cup');
    out.cupResults.push({ name: '联盟至尊杯', place: PLACE[r.place], prize: 0, mids: r.mids });
  };

  // 联盟挑战（压分）：押上游戏币，职业队挑战对方联盟的头牌球队；每天一次
  AL.challenge = function (S, targetId, stake) {
    var mine = AL.mine(S), tgt = AL.get(S, targetId);
    if (!mine) return { err: '先加入一个联盟才能发起挑战' };
    if (!tgt || tgt === mine) return { err: '请选择其他联盟' };
    stake = Math.round(stake);
    if (!(stake >= 10 && stake <= 1000)) return { err: '压分范围 10 ~ 1000 游戏币' };
    if (S.user.coins < stake) return { err: '游戏币不足' };
    if (S.user.challengeDay === S.dayNo) return { err: '今天已经挑战过了，明天再来' };
    var u = W().userPro(S);
    if (W().teamPlayers(S, u).filter(function (p) { return p.inj <= 0; }).length < 5) return { err: '可上场球员不足 5 人' };
    var champ = tgt.members.map(function (id) { return S.teams[id]; }).filter(Boolean).sort(function (a, b) { return a.level - b.level || (b.strength || 0) - (a.strength || 0); });
    // 挑选与你实力相近的对手（同级别优先，没有就取最接近的级别）
    var opp = champ.filter(function (t) { return t.level === u.level; })[0] || champ.sort(function (a, b) { return Math.abs(a.level - u.level) - Math.abs(b.level - u.level); })[0];
    if (!opp) return { err: '对方联盟没有可以应战的球队' };
    S.user.challengeDay = S.dayNo;
    if (X.Coach.autoOn(S)) X.Coach.prepare(S, 'other', opp.id);
    var res = E.play(W().sideCfg(S, u, 'other', { home: false }), W().sideCfg(S, opp, 'league', { home: true }), { kind: 'pro', log: true, injuries: false, noStamina: true });
    var mid = W().saveMatch(S, 'challenge', res, opp, u, 'pro', { cup: '联盟挑战 ' + mine.name + ' vs ' + tgt.name + '（压分 ' + stake + '）' });
    W().applyMatch(S, res, { noStamina: true });
    var won = res.as > res.hs;
    if (won) { S.user.coins += stake; mine.prestige += 2; tgt.prestige = Math.max(0, tgt.prestige - 1); }
    else { S.user.coins -= stake; tgt.prestige += 2; mine.prestige = Math.max(0, mine.prestige - 1); }
    W().msg(S, '联盟挑战 ' + tgt.name + '：' + (won ? '胜利！赢得 ' + stake + ' 游戏币' : '失利，输掉 ' + stake + ' 游戏币') + '（' + res.as + ':' + res.hs + '）', 'cup');
    return { mid: mid, won: won, opp: opp.name };
  };

  // 每天：AI 联盟威望小幅波动
  AL.daily = function (S) {
    (S.alliances || []).forEach(function (a) { if (!a.user && U.chance(0.15)) a.prestige += U.ri(0, 2); });
  };
})(window.XBA);
