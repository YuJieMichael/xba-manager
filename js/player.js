// 球员：生成、综合能力、潜力、身价工资、训练、老化
(function (X) {
  var U = X.U, P = {};
  X.P = P;

  var H_RANGE = { C: [206, 223], PF: [200, 212], SF: [194, 206], SG: [187, 199], PG: [176, 191] };

  P.name = function () { return U.pick(X.FIRST) + '.' + U.pick(X.LAST); };

  P.posWeights = function (pos) {
    return X.POS_ATTR_RANK[pos].map(X.rankW);
  };

  // 综合能力：按位置权重加权
  P.ovr = function (p, pos, useMax) {
    var w = P.posWeights(pos || p.pos), src = useMax ? p.m : p.a, s = 0, ws = 0;
    for (var i = 0; i < X.ATTRS.length; i++) { s += w[i] * src[X.ATTRS[i]]; ws += w[i]; }
    return s / ws;
  };

  // 潜力剩余：按位置加权的（上限-现值）
  P.potRemain = function (p) {
    var w = P.posWeights(p.pos), s = 0, ws = 0;
    for (var i = 0; i < X.ATTRS.length; i++) { var k = X.ATTRS[i]; s += w[i] * Math.max(0, p.m[k] - p.a[k]); ws += w[i]; }
    return s / ws * 2.2;
  };
  P.stars = function (p) {
    var r = P.potRemain(p), n = 1;
    for (var i = 0; i < X.STAR_BANDS.length; i++) if (r >= X.STAR_BANDS[i]) n = i + 2;
    return n;
  };
  P.potBand = function (diff) {
    for (var i = 0; i < X.POT_BANDS.length; i++) if (diff >= X.POT_BANDS[i]) return i;
    return X.POT_BANDS.length - 1;
  };

  P.ageValueF = function (age) {
    if (age <= 20) return 1.6; if (age <= 23) return 1.35; if (age <= 26) return 1.1;
    if (age <= 29) return 0.9; if (age <= 32) return 0.6; return 0.35;
  };
  // 期望工资（每轮）
  P.salaryFor = function (p) {
    var o = P.ovr(p);
    return Math.round(3.2 * o * o * (p.age <= 22 ? 0.85 : 1));
  };
  // 市场身价
  P.value = function (p) {
    var o = P.ovr(p);
    var v = 3.2 * o * o * 40 * P.ageValueF(p.age) * (1 + P.potRemain(p) / 40) * (1 + Math.max(0, p.h - 195) / 40);
    return Math.round(v / 100) * 100;
  };

  // 有效身高（弹跳可弥补身高）
  P.effH = function (p) { return p.h + 0.37 * p.a.jmp; };
  P.heightScore = function (p) { return U.clamp((P.effH(p) - 190) * 2, 0, 100); };

  function genAttrs(pos, target) {
    var ranks = X.POS_ATTR_RANK[pos], a = {};
    for (var i = 0; i < X.ATTRS.length; i++) {
      var f = 1.22 - 0.045 * (ranks[i] - 1);
      a[X.ATTRS[i]] = Math.max(3, target * f + U.gauss() * target * 0.09);
    }
    return a;
  }

  function gapForAge(age) {
    if (age <= 17) return U.rf(16, 30);
    if (age <= 19) return U.rf(12, 24);
    if (age <= 21) return U.rf(8, 18);
    if (age <= 23) return U.rf(5, 12);
    if (age <= 26) return U.rf(2, 7);
    if (age <= 29) return U.rf(0.5, 3);
    return U.rf(0, 1);
  }

  // 生成球员
  // opt: {pos, age, ovr, gap, street, teamId, h}
  P.gen = function (S, opt) {
    opt = opt || {};
    var pos = opt.pos || U.pick(X.POS);
    var age = opt.age || U.ri(19, 31);
    var target = opt.ovr || 35;
    var hr = H_RANGE[pos];
    var h = opt.h || Math.round(U.clamp(U.rf(hr[0], hr[1]) + U.gauss() * 2, 170, 230));
    var w = Math.round(h - 100 + (pos === 'C' || pos === 'PF' ? U.ri(5, 22) : U.ri(-8, 8)));
    var p = {
      id: U.uid(S, 'p'), name: P.name(), pos: pos, num: 0, age: age, bday: U.ri(1, X.ROUNDS),
      h: h, w: w, a: genAttrs(pos, target), m: {},
      iq: { off: U.rf(28, 42), def: U.rf(28, 42), team: U.rf(28, 42) },
      lead: 0, will: 0, st: 100, mood: U.ri(70, 100), inj: 0, injName: '',
      contract: 0, salary: 0, teamId: opt.teamId || null, green: false, joined: S.dayNo || 0,
      focus: 'team', retireAge: 0, train: '', tp: 0, support: U.ri(5, 20), hGrow: age <= 21 ? U.ri(0, 9) : 0,
      seen: {}, stats: P.emptyStats(), career: [], hist: [], decline: U.ri(29, 32), persona: P.rollPersona()
    };
    // 身材好的球员潜力往往不会很高
    var gapBase = opt.gap != null ? opt.gap : gapForAge(age) * (h > 212 ? 0.75 : 1);
    var ranks = X.POS_ATTR_RANK[pos];
    // 归一化，使综合能力等于目标值
    var scale = target / P.ovr(p);
    X.ATTRS.forEach(function (k) { p.a[k] *= scale; });
    X.ATTRS.forEach(function (k, i) {
      var g = gapBase * U.rf(0.3, 1.5) * (ranks[i] <= 3 ? 1.1 : 0.9);
      p.a[k] = U.clamp(p.a[k], 3, 95);
      p.m[k] = U.clamp(p.a[k] + g, p.a[k], X.GEN_CAP);
    });
    var avgIQ = (p.iq.off + p.iq.def + p.iq.team) / 3;
    var o = P.ovr(p);
    p.lead = U.clamp(15 + (age - 18) * 1.6 + o * 0.35 + avgIQ * 0.2 + U.gauss() * 8, 5, 99);
    p.will = U.clamp(25 + p.a.sta * 0.35 + avgIQ * 0.2 + U.gauss() * 10, 5, 99);
    p.retireAge = opt.street ? U.ri(32, 36) : U.clamp(Math.round(34 + U.gauss() * 2.2), 28, 42);
    if (!opt.street) {
      p.salary = Math.round(P.salaryFor(p) * U.rf(0.92, 1.08));
      p.contract = U.ri(20, 60);
    }
    S.players[p.id] = p;
    return p;
  };

  // 徽章槽：只有等级最高的几个特长生效（3 个，每 2 星 +1，最多 5 个）
  P.traitSlots = function (p) { return Math.min(5, 3 + Math.floor((p.star || 0) / 2)); };
  P.allTraits = function (p) {
    return X.TRAITS.map(function (t) { return { t: t, lv: t.lv(p), mg: t.margin(p) }; }).filter(function (x) { return x.lv > 0; })
      .sort(function (a, b) { return b.lv - a.lv || b.mg - a.mg; });
  };
  // 手动佩戴的徽章（p.badges）优先，空槽再按等级自动补上
  P.activeTraits = function (p) {
    var all = P.allTraits(p), pin = p.badges || [];
    var pinned = all.filter(function (x) { return pin.indexOf(x.t.id) >= 0; });
    var rest = all.filter(function (x) { return pin.indexOf(x.t.id) < 0; });
    return pinned.concat(rest).slice(0, P.traitSlots(p));
  };
  P.traits = function (p) { return P.activeTraits(p).map(function (x) { return x.t.id; }); };
  P.hasTrait = function (p, id) { return P.traits(p).indexOf(id) >= 0; };

  P.rollPersona = function () { return X.PERSONAS[U.wpick(X.PERSONAS.map(function (x) { return x.w; }))].id; };
  P.persona = function (p) { if (!p.persona) p.persona = P.rollPersona(); return X.PERSONAS.find(function (x) { return x.id === p.persona; }) || X.PERSONAS[0]; };
  P.trainMul = function (p) { return p.persona === 'gymrat' ? 1.2 : p.persona === 'lazy' ? 0.8 : 1; };
  // 球队化学反应（0.95 ~ 1.04），作用于整队发挥
  P.chemistry = function (players) {
    var c = 1, hot = 0, lead = 0;
    players.forEach(function (p) {
      if (p.persona === 'glue') c += 0.01;
      if (p.persona === 'leader' && lead < 2) { c += 0.01; lead++; }
      if (p.persona === 'hothead') hot++;
    });
    if (hot > 1) c -= 0.015 * (hot - 1);
    return Math.max(0.95, Math.min(1.04, c));
  };

  P.emptyStats = function () {
    return { gp: 0, min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, eff: 0, zn: {} };
  };

  P.displayPos = function (p) { return p.pos; };

  // 潜力可见（会员：到队 1 天即可）
  P.potVisible = function (S, p) {
    if (p.listing && X.Manager && X.Manager.lv(S, 'eye') >= 1) return true;
    var t = p.teamId && S.teams[p.teamId];
    if (!t) return !!p.seen.pot;
    if (!t.isUser) return false;
    return (S.dayNo - (p.joined || 0)) >= 1 || !!p.seen.pot;
  };

  P.staminaF = function (st) { return st >= 80 ? 1 : Math.max(0.55, 1 - (80 - st) * 0.012); };

  // ===== 训练 =====
  function gapF(p, k) {
    var gap = p.m[k] - p.a[k];
    return gap <= 0.02 ? 0 : Math.min(1, Math.sqrt(gap / 6));
  }

  // 街球训练（消耗训练点），返回 {gain, cost, msg}
  P.streetTrain = function (S, p, k, trainer) {
    var tl = trainer ? X.Staff.effLevel(trainer) : 0;
    var cost = Math.max(5, Math.round(10 * (1 - 0.045 * tl)));
    if ((S.user.streetTP || 0) < cost) return { gain: 0, cost: 0, msg: '街球训练点不足（需要' + cost + '）' };
    if (p.inj > 0) return { gain: 0, cost: 0, msg: p.name + ' 正在养伤，不能训练' };
    if (p.st < 30) return { gain: 0, cost: 0, msg: p.name + ' 体力太低，不能训练' };
    var gf = gapF(p, k);
    if (gf === 0) return { gain: 0, cost: 0, msg: X.ATTR_CN[k] + ' 已达到潜力上限' };
    var moodF = 0.6 + 0.4 * p.mood / 100;
    var gain = Math.min(3, U.rf(0.8, 3) * gf * moodF * (1 + tl * 0.02) * P.trainMul(p));
    gain = Math.min(gain, p.m[k] - p.a[k]);
    p.a[k] += gain; S.user.streetTP -= cost;
    p.st = Math.max(0, p.st - 1); p.mood = Math.max(0, p.mood - 1);
    var extra = '';
    // 年轻球员：训练员可能提高潜力（与切合度有关）
    if (trainer && p.age <= 21) {
      var fit = X.Staff.fit(trainer, p);
      if (U.chance(0.02 + tl * 0.012)) {
        var inc = U.rf(0.1, 0.8) * fit;
        if (inc > 0.05) { p.m[k] = Math.min(X.ATTR_CAP, p.m[k] + inc); extra = '，潜力提升了！'; }
      }
    }
    return { gain: gain, cost: cost, msg: p.name + ' ' + X.ATTR_CN[k] + ' +' + gain.toFixed(1) + extra };
  };

  // 职业队手动加点：从全队共用的训练点池里扣
  P.proTrainCost = function (trainer) {
    var tl = trainer ? X.Staff.effLevel(trainer) : 0;
    return Math.max(5, Math.round(10 * (1 - 0.045 * tl)));
  };
  P.proTrainClick = function (S, p, k, trainer) {
    var tl = trainer ? X.Staff.effLevel(trainer) : 0, cost = P.proTrainCost(trainer);
    if ((S.user.proTP || 0) < cost) return { gain: 0, cost: 0, msg: '职业队训练点不足（需要' + cost + '）' };
    if (p.inj > 0) return { gain: 0, cost: 0, msg: p.name + ' 正在养伤，不能训练' };
    if (p.st < 30) return { gain: 0, cost: 0, msg: p.name + ' 体力太低，不能训练' };
    var gf = gapF(p, k);
    if (gf === 0) return { gain: 0, cost: 0, msg: X.ATTR_CN[k] + ' 已达到潜力上限' };
    var ageF = p.age <= 24 ? 1 : p.age <= 28 ? 0.85 : p.age <= 31 ? 0.65 : 0.45;
    var gain = Math.min(3, U.rf(0.8, 3) * Math.max(0.4, gf) * ageF * (1 + tl * 0.02) * P.trainMul(p));
    gain = Math.min(gain, p.m[k] - p.a[k]);
    p.a[k] += gain; S.user.proTP -= cost;
    p.st = Math.max(0, p.st - 1);
    return { gain: gain, cost: cost, msg: p.name + ' ' + X.ATTR_CN[k] + ' +' + gain.toFixed(1) };
  };

  // ===== 升星：训满后突破潜力上限 =====
  P.isMaxed = function (p) { return P.potRemain(p) < 2; };
  P.starCost = function (p) { return (p.star || 0) + 1; };
  P.canStarUp = function (S, p) {
    var team = p.teamId && S.teams[p.teamId];
    if (!team || team.kind !== 'pro') return '只有职业队球员才能升星';
    if ((p.star || 0) >= X.STAR_MAX) return '已经是最高 ' + X.STAR_MAX + ' 星';
    if (!P.isMaxed(p)) return '还没训满（潜力剩余 ' + P.potRemain(p).toFixed(1) + '，需要低于 2）';
    var need = P.starCost(p);
    if ((S.user.items.starcard || 0) < need) return '升到 ' + ((p.star || 0) + 1) + ' 星需要 ' + need + ' 张升星卡（拥有 ' + (S.user.items.starcard || 0) + ' 张）';
    return null;
  };
  // 返回各项上限的提升量
  P.starUp = function (S, p) {
    var err = P.canStarUp(S, p);
    if (err) return { err: err };
    S.user.items.starcard -= P.starCost(p);
    p.star = (p.star || 0) + 1;
    var ranks = X.POS_ATTR_RANK[p.pos], gains = {};
    X.ATTRS.forEach(function (k, i) {
      var g = ranks[i] <= 3 ? U.rf(10, 14) : ranks[i] <= 6 ? U.rf(6, 9) : U.rf(4, 6);
      var nm = Math.min(X.ATTR_CAP, p.m[k] + g);
      gains[k] = nm - p.m[k];
      p.m[k] = nm;
    });
    p.mood = 100;
    return { gains: gains };
  };

  // 职业队每日训练
  P.proDailyTrain = function (S, p, trainer) {
    var k = p.train;
    if (!k || p.inj > 0) return 0;
    if (k === 'rest') return 0;
    var tl = trainer ? X.Staff.effLevel(trainer) : 0;
    var ageF = p.age <= 22 ? 1.3 : p.age <= 25 ? 1.1 : p.age <= 28 ? 0.9 : p.age <= 31 ? 0.6 : 0.35;
    var gf = gapF(p, k); var gain = U.rf(0.8, 1.6) * (gf > 0 ? Math.max(0.4, gf) : 0) * ageF * (1 + tl * 0.07) * (0.7 + 0.3 * P.staminaF(p.st)) * P.trainMul(p);
    gain = Math.min(gain, Math.max(0, p.m[k] - p.a[k]));
    p.a[k] += gain;
    p.st = Math.max(0, p.st - 4);
    return gain;
  };

  // AI 自动成长（按位置重要度随机挑选）
  P.aiGrow = function (p, mult) {
    var ranks = X.POS_ATTR_RANK[p.pos];
    var idx = U.wpick(ranks.map(function (r) { return 12 - r; }));
    var k = X.ATTRS[idx];
    var ageF = p.age <= 22 ? 1.3 : p.age <= 25 ? 1.1 : p.age <= 28 ? 0.9 : 0.5;
    p.a[k] = Math.min(p.m[k], p.a[k] + U.rf(0.2, 0.6) * gapF(p, k) * ageF * (mult || 1));
  };

  // 意识成长：比赛后
  P.iqGrow = function (p, minutes) {
    var g = Math.min(1, minutes / 30) * U.rf(0.04, 0.12);
    var f = p.focus || 'team';
    p.iq[f] = Math.min(99, p.iq[f] + g);
    ['off', 'def', 'team'].forEach(function (o) {
      if (o !== f) p.iq[o] = Math.max(10, p.iq[o] - g * (o === 'team' ? 0.15 : 0.3));
    });
    var avgIQ = (p.iq.off + p.iq.def + p.iq.team) / 3;
    p.lead = Math.min(99, p.lead + g * 0.15 * (avgIQ / 50));
    p.will = Math.min(99, p.will + g * 0.12 * (p.a.sta / 50));
  };

  // 生日：长一岁 + 老化
  P.birthday = function (S, p, isPro) {
    p.age += 1;
    var msg = null;
    if (isPro && p.age >= p.decline) {
      var sev = p.age >= p.decline + 3 ? 1.2 : 1;
      X.ATTRS.forEach(function (k) {
        var r = X.PHYS.indexOf(k) >= 0 ? U.rf(0.07, 0.12) * sev : U.rf(0.03, 0.06) * sev;
        p.a[k] = Math.max(3, p.a[k] * (1 - r));
        p.m[k] = Math.max(p.a[k], p.m[k] * (1 - r));
      });
      msg = p.name + ' 年满 ' + p.age + ' 岁，能力出现衰退';
    }
    return msg;
  };

  P.addStats = function (p, line) {
    var s = p.stats;
    s.gp += 1;
    for (var k in line) if (k !== 'pid' && typeof line[k] === 'number' && s[k] != null) s[k] += line[k];
    if (line.zn) { s.zn = s.zn || {}; for (var z in line.zn) { var t = s.zn[z] = s.zn[z] || [0, 0]; t[0] += line.zn[z][0]; t[1] += line.zn[z][1]; } }
  };
})(window.XBA);
