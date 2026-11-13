// 存档升级：读档、导入存档时调用。S.saveVer 记录存档结构版本，按版本逐级升级。
// 以后改了存档结构：把 X.SAVE_VER（js/version.js）+1，在 STEPS 里追加一步。每一步只跑一次。
(function (X) {
  var MG = {};
  X.Migrate = MG;

  // 在整个存档的字符串里做替换（用于改名）
  function renameAll(S, pairs) {
    var json = JSON.stringify(S);
    pairs.forEach(function (p) { json = json.split(p[0]).join(p[1]); });
    return JSON.parse(json);
  }

  // STEPS[i] 把存档从版本 i 升到 i+1；返回升级后的存档
  var STEPS = [
    // 0 → 1：新性格「微波炉」，一部分平常心球员转成微波炉
    function (S) {
      if (!S.migMicrowave) Object.keys(S.players).forEach(function (id) { var p = S.players[id]; if (p.persona === 'calm' && Math.random() < 0.15) p.persona = 'microwave'; });
      delete S.migMicrowave;
      return S;
    },
    // 1 → 2：游戏改名《篮途经理》，联赛和杯赛改名（荣誉、历史、战报里的旧名字一并改掉）
    function (S) {
      return renameAll(S, [['XBA 超级联赛', '篮途超级联赛'], ['XBA杯', '篮途杯'], ['XBA 总冠军', '篮途总冠军']]);
    }
  ];

  // 每次读档都跑的补字段（都可以重复执行）
  function fill(S) {
    S.awards = S.awards || {};
    Object.keys(S.players || {}).forEach(function (id) { var p = S.players[id]; if (p.career) p.career = p.career.map(function (c) { return c.stats && c.stats.zn ? { season: c.season, team: c.team, stats: X.P.careerStats(c.stats) } : c; }); });
    S.hof = S.hof || [];
    if (S.user.doubleActive) S.user.doubleUntil = (S.dayNo || 0) + 3;
    delete S.user.doubleActive;
    S.hof = S.hof.filter(function (h) { var p = S.players[h.pid], t = p && p.teamId && S.teams[p.teamId]; return h.kind ? h.kind === 'pro' : !(t && t.kind === 'street'); });
    if (S.user.onboarded) {
      var pro = S.teams[S.user.proId];
      if (pro && !pro.boards.cup) pro.boards.cup = JSON.parse(JSON.stringify(pro.boards.league));
      if (!S.xcup && S.day <= 1) X.XCup.setup(S, true);
      if (!S.user.goals || S.user.goals.season !== S.season) X.Goals.newSeason(S);
      X.Alliance.init(S);
      if (!S.meta) X.Ops.newSeasonRules(S); else X.Ops.applyRules(S);
      if (S.user.streetTP == null) { S.user.streetTP = 0; Object.keys(S.players).forEach(function (id) { var p = S.players[id]; if (p.tp) { S.user.streetTP += p.tp; p.tp = 0; } }); }
      Object.keys(S.players).forEach(function (id) { X.P.persona(S.players[id]); });
    }
    return S;
  }

  // 是否是本游戏的存档
  MG.valid = function (S) { return !!(S && S.players && S.teams && S.user); };
  // 存档来自更新的版本（旧页面读新存档）
  MG.tooNew = function (S) { return (S.saveVer || 0) > X.SAVE_VER; };

  MG.run = function (S) {
    var v = S.saveVer || 0;
    if (v > X.SAVE_VER) return S; // 交给界面提示刷新，不动存档
    for (; v < X.SAVE_VER; v++) { S = STEPS[v](S); S.saveVer = v + 1; }
    return fill(S);
  };
  MG.STEPS = STEPS;
})(window.XBA);
