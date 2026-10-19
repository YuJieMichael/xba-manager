// 职员：训练员、营养师、队医
(function (X) {
  var U = X.U, St = {};
  var P = function () { return X.P; };
  X.Staff = St;

  var SURN = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';
  var GIVEN = '伟芳娜敏静丽强磊军洋勇艳杰娟涛明超秀霞平刚桂英华建国志红春晓东海波宁鹏飞斌辉亮林峰云龙浩凯翔宇';

  St.gen = function (S, type, level) {
    level = level || U.ri(1, 8);
    var eff = level;
    if (level <= 4 && U.chance(0.1)) eff = Math.min(10, level + U.ri(3, 5)); // 低级职员里有 10% 的“宝藏”
    var s = {
      id: U.uid(S, 's'), type: type, level: level, eff: eff,
      name: SURN[U.ri(0, SURN.length - 1)] + GIVEN[U.ri(0, GIVEN.length - 1)] + (U.chance(0.5) ? GIVEN[U.ri(0, GIVEN.length - 1)] : ''),
      age: U.ri(28, 62), salary: Math.round(600 * Math.pow(level, 1.6) / 10) * 10, contract: U.ri(10, 40), teamId: null, slot: null
    };
    return s;
  };

  St.effLevel = function (s) { return s ? s.eff : 0; };

  // 名人堂球员退役后回队当职员（传奇职员：能力比级别高一级、薪水打五折，一直等你雇佣）
  St.legend = function (S, p) {
    var type = p.lead >= 55 || (p.iq.off + p.iq.def + p.iq.team) / 3 >= 50 ? 'trainer' : p.a.sta >= p.a.str ? 'nutri' : 'doctor';
    var level = Math.max(3, Math.min(10, Math.round((p.peak || P().ovr(p)) / 10)));
    var s = {
      id: U.uid(S, 's'), type: type, level: level, eff: Math.min(10, level + 1), legend: true, fromPid: p.id,
      name: p.name + '（传奇）', age: p.age, salary: Math.round(600 * Math.pow(level, 1.6) / 20) * 10, contract: 40, teamId: null, slot: null
    };
    S.staffPool.unshift(s);
    X.World.msg(S, '🎖 名人堂球员 ' + p.name + ' 退役后愿意回队担任' + X.STAFF_TYPES[type] + '（' + level + '级，能力更强、薪水五折），到「职员管理」雇佣他', 'staff');
    return s;
  };

  // 训练员与年轻球员的切合度（隐藏，0.2~1）
  St.fit = function (s, p) {
    var str = s.id + '|' + p.id, h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return 0.2 + (h % 1000) / 1000 * 0.8;
  };

  St.refreshPool = function (S) {
    var pool = S.staffPool || [];
    pool = pool.filter(function (s) { return s.legend || U.chance(0.6); });
    var types = ['trainer', 'nutri', 'doctor'];
    while (pool.length < 18) pool.push(St.gen(S, types[pool.length % 3], U.wpick([8, 9, 9, 8, 7, 5, 4, 3, 2, 1]) + 1));
    S.staffPool = pool;
  };

  // team.staff = {trainer: staffObj|null, nutri:..., doctor:...}
  St.hire = function (S, team, sid) {
    var s = S.staffPool.find(function (x) { return x.id === sid; });
    if (!s) return '该职员已被别人雇走';
    if (team.staff[s.type]) return '请先解雇现有的' + X.STAFF_TYPES[s.type];
    var cost = s.salary * s.contract;
    if (S.user.money < cost) return '资金不足，需要一次性支付 ' + U.money(cost);
    X.World.spend(S, cost, '雇佣职员');
    S.staffPool = S.staffPool.filter(function (x) { return x !== s; });
    s.teamId = team.id;
    team.staff[s.type] = s;
    return null;
  };

  St.fire = function (S, team, type) {
    team.staff[type] = null;
  };

  St.renew = function (S, team, type) {
    var s = team.staff[type];
    if (!s) return '没有该职员';
    s.salary = Math.round(s.salary * 1.1);
    var add = 20, cost = s.salary * add;
    if (S.user.money < cost) return '资金不足，需要 ' + U.money(cost);
    X.World.spend(S, cost, '职员续约');
    s.contract += add;
    return null;
  };

  // 每日：合同 -1，队医/营养师生效
  St.daily = function (S, team, players, isPro) {
    var msgs = [];
    ['trainer', 'nutri', 'doctor'].forEach(function (t) {
      var s = team.staff[t];
      if (!s) return;
      s.contract -= 1;
      if (s.contract <= 0) {
        team.staff[t] = null;
        msgs.push((isPro ? '职业队' : '街球队') + X.STAFF_TYPES[t] + ' ' + s.name + ' 合同到期，已离开球队');
        s.teamId = null; s.contract = U.ri(10, 40);
        S.staffPool.push(s);
      }
    });
    var doc = team.staff.doctor, nut = team.staff.nutri;
    players.forEach(function (p) {
      if (doc && p.inj > 0 && U.chance(0.05 + doc.eff * 0.06)) {
        var red = doc.eff >= 8 && U.chance(0.4) ? 2 : 1;
        red = Math.min(red, p.inj);
        if (red > 0 && p.inj > 1) {
          p.inj -= red;
          msgs.push('队医' + doc.name + '：' + p.name + ' 恢复良好，伤停减少 ' + red + ' 轮');
        }
      }
      if (!isPro && nut && p.age <= 21 && p.hGrow > 0 && U.chance(0.04 + nut.eff * 0.02)) {
        p.h += 1; p.hGrow -= 1; p.w += U.ri(-1, 2);
        msgs.push('营养师' + nut.name + '：' + p.name + ' 长高了 1cm（现在 ' + p.h + 'cm）');
      } else if (!isPro && p.age <= 21 && U.chance(0.05)) {
        p.w += U.ri(-1, 1);
      }
    });
    return msgs;
  };

  St.recovery = function (team) {
    var r = 0;
    if (team.staff.nutri) r += team.staff.nutri.eff * 2;
    if (team.staff.doctor) r += team.staff.doctor.eff * 0.8;
    return r;
  };
})(window.XBA);
