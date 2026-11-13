// 高难挑战：职业队打进篮途超级联赛后，每赛季开始前（前 5 天）可以自选难度词条。
// 只影响本赛季的联赛和季后赛；拿下联赛总冠军按难度分发奖励。不会削弱你的球员，词条随时由你决定开不开。
(function (X) {
  var U = X.U;
  var CH = {};
  X.Challenge = CH;
  var W = function () { return X.World; };

  CH.MODS = [
    { id: 'elite', cn: '强敌环伺', pts: 2, desc: '同联赛所有对手实力 +10%' },
    { id: 'elite2', cn: '豪门崛起', pts: 4, need: 'elite', desc: '同联赛所有对手实力再 +15%（需先选「强敌环伺」）' },
    { id: 'elite3', cn: '王朝终结者', pts: 6, need: 'elite2', desc: '同联赛所有对手实力再 +20%（需先选「豪门崛起」）' },
    { id: 'locker', cn: '更衣室风波', pts: 2, desc: '你的阵容状态 -6%' },
    { id: 'injury', cn: '伤病潮', pts: 2, desc: '你的球员受伤几率 ×2.5' },
    { id: 'tired', cn: '魔鬼赛程', pts: 1, desc: '你的球员比赛中体力消耗 +40%' },
    { id: 'press', cn: '媒体围攻', pts: 1, desc: '输一场董事会信任额外 -2' }
  ];
  CH.OPEN_DAYS = 5;
  CH.mod = function (id) { return CH.MODS.find(function (m) { return m.id === id; }); };

  CH.cur = function (S) { var c = S.user.challenge; return c && c.season === S.season ? c : null; };
  CH.has = function (S, id) { var c = CH.cur(S); return !!(c && c.mods.indexOf(id) >= 0); };
  CH.points = function (mods) { return U.sum(mods.map(function (id) { return CH.mod(id).pts; })); };
  CH.eligible = function (S) { var pro = W().userPro(S); return pro && pro.level === 1; };
  CH.canEdit = function (S) { return CH.eligible(S) && S.day <= CH.OPEN_DAYS; };
  // 奖励：游戏币 150×难度、升星卡 = 难度、荣誉
  CH.reward = function (pts) { return { coins: 150 * pts, cards: pts }; };

  CH.set = function (S, mods) {
    if (!CH.eligible(S)) return '打进篮途超级联赛后才能开启高难挑战';
    if (!CH.canEdit(S)) return '只能在赛季前 ' + CH.OPEN_DAYS + ' 天选择本赛季的挑战';
    mods = mods.filter(function (id, i) { return CH.mod(id) && mods.indexOf(id) === i; });
    var bad = mods.map(CH.mod).find(function (m) { return m.need && mods.indexOf(m.need) < 0; });
    if (bad) return '「' + bad.cn + '」要先选「' + CH.mod(bad.need).cn + '」';
    S.user.challenge = mods.length ? { season: S.season, mods: mods, pts: CH.points(mods) } : null;
    return null;
  };

  // 在 W.sideCfg 里调用：联赛 / 季后赛的比赛加词条效果
  CH.applyCfg = function (S, team, board, cfg) {
    var c = CH.cur(S);
    if (!c || board !== 'league' || team.kind !== 'pro') return;
    var pro = W().userPro(S);
    if (team.isUser) {
      if (CH.has(S, 'locker')) cfg.status *= 0.94;
      if (CH.has(S, 'injury')) cfg.injMul = 2.5;
      if (CH.has(S, 'tired')) cfg.fatigue = 1.4;
    } else if (team.leagueId === pro.leagueId) {
      cfg.status *= 1 + (CH.has(S, 'elite') ? 0.1 : 0) + (CH.has(S, 'elite2') ? 0.15 : 0) + (CH.has(S, 'elite3') ? 0.2 : 0);
    }
  };

  // 输球的额外惩罚
  CH.afterGame = function (S, won) { if (!won && CH.has(S, 'press')) X.Ops.trust(S, -2); };

  // 赛季末结算（联赛名次出来后调用，place 从 0 开始）
  CH.settle = function (S, place) {
    var c = CH.cur(S); if (!c) return;
    S.user.chalBest = S.user.chalBest || 0;
    if (place === 0) {
      var r = CH.reward(c.pts);
      S.user.coins += r.coins;
      S.user.trophies.push({ season: S.season, name: '高难挑战 ' + c.pts + ' 级：篮途超级联赛 冠军' });
      W().msg(S, '🔥 高难挑战 ' + c.pts + ' 级完成！获得 ' + r.coins + ' 游戏币', 'sys');
      W().giveStarcards(S, r.cards, '高难挑战 ' + c.pts + ' 级夺冠');
      if (c.pts > S.user.chalBest) S.user.chalBest = c.pts;
    } else {
      W().msg(S, '高难挑战 ' + c.pts + ' 级失败：本赛季没拿到联赛总冠军', 'sys');
    }
  };
})(window.XBA);
