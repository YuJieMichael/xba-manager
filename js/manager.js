// 经理生涯：比赛、目标、成就攒经验升级，每级 1 个技能点，点技能树
(function (X) {
  var U = X.U, MG = {};
  X.Manager = MG;
  var W = function () { return X.World; };

  MG.SKILLS = [
    { id: 'nego', cn: '谈判专家', icon: '🤝', max: 3, per: '续约、签约球员工资 -5%' },
    { id: 'eye', cn: '球探之眼', icon: '🔍', max: 3, per: '1 级：市场球员潜力可见；2 级：暗拍提示价更准；3 级：球探只要 20 游戏币、选秀试训次数 +1' },
    { id: 'drill', cn: '魔鬼训练', icon: '🏋', max: 3, per: '街球和职业队获得的训练点 +10%' },
    { id: 'locker', cn: '更衣室大师', icon: '🤗', max: 3, per: '职业队化学反应 +1%' },
    { id: 'home', cn: '主场之王', icon: '🏟', max: 3, per: '门票收入 +5%' },
    { id: 'tactic', cn: '战术大师', icon: '📋', max: 3, per: '战术熟练度增长 +25%' },
    { id: 'medic', cn: '医疗专家', icon: '🩺', max: 3, per: '伤停时间 -10%' },
    { id: 'biz', cn: '商业头脑', icon: '💼', max: 3, per: '广告商报价 +10%' },
    { id: 'timeout', cn: '临场指挥', icon: '⏱', max: 3, per: '亲自执教时暂停次数 +1' }
  ];

  MG.get = function (S) {
    if (!S.user.mgr) S.user.mgr = { xp: 0, lv: 1, pts: 0, skills: {} };
    return S.user.mgr;
  };
  MG.lv = function (S, id) { return (S.user.mgr && S.user.mgr.skills[id]) || 0; };
  MG.need = function (lv) { return 120 + (lv - 1) * 80; }; // 升到下一级需要的经验

  MG.xp = function (S, n) {
    var m = MG.get(S);
    m.xp += n;
    while (m.xp >= MG.need(m.lv)) {
      m.xp -= MG.need(m.lv); m.lv++; m.pts++;
      W().msg(S, '🎓 经理等级提升到 ' + m.lv + ' 级！获得 1 个技能点，到「俱乐部 → 经理生涯」加点', 'sys');
    }
  };
  MG.learn = function (S, id) {
    var m = MG.get(S), sk = MG.SKILLS.find(function (s) { return s.id === id; });
    if (!sk) return '技能不存在';
    if (m.pts <= 0) return '没有技能点';
    if ((m.skills[id] || 0) >= sk.max) return '已经满级';
    m.pts--; m.skills[id] = (m.skills[id] || 0) + 1;
    return null;
  };
  MG.reset = function (S) {
    var m = MG.get(S), n = 0;
    for (var k in m.skills) n += m.skills[k];
    if (S.user.coins < 100) return '洗点需要 100 游戏币';
    S.user.coins -= 100; m.pts += n; m.skills = {};
    return null;
  };

  // 效果系数
  MG.salaryMul = function (S) { return (1 - 0.05 * MG.lv(S, 'nego')) * (1 - Math.min(0.1, ((S.user.life && S.user.life.fame) || 0) / 1500)); };
  MG.tpMul = function (S) { return (1 + 0.1 * MG.lv(S, 'drill')) * Math.pow(1.1, X.World.legacyCount(S, 'tp')); };
  MG.injMul = function (S) { return 1 - 0.1 * MG.lv(S, 'medic'); };
})(window.XBA);
