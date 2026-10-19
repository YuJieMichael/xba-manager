// 比赛模拟引擎：按回合模拟，进攻方式由进攻战术决定，防守战术克制进攻方式
(function (X) {
  var U = X.U, P = X.P, E = {};
  X.Engine = E;

  var METHOD_IDX = {};
  X.METHODS.forEach(function (m, i) { METHOD_IDX[m.id] = i; });
  var OFF = {}, DEF = {};
  X.OFF_TACTICS.forEach(function (t) { OFF[t.id] = t; });
  X.DEF_TACTICS.forEach(function (t) { DEF[t.id] = t; });
  E.OFF = OFF; E.DEF = DEF;

  // 场上位置 → 列下标（C PF SF SG PG）
  var PRO_COLS = [0, 1, 2, 3, 4];
  var STREET_COLS = [0, 2, 4]; // 街球三人：内线、锋线、后卫
  E.SLOT_NAMES = { pro: ['中锋', '大前锋', '小前锋', '得分后卫', '组织后卫'], street: ['内线', '锋线', '后卫'] };
  E.SLOT_POS = { pro: ['C', 'PF', 'SF', 'SG', 'PG'], street: ['C', 'SF', 'PG'] };

  var BASE = { in: 0.535, mid: 0.415, drv: 0.495, thr: 0.35, fb: 0.66 };
  var FOUL = { in: 0.13, mid: 0.04, drv: 0.12, thr: 0.025, fb: 0.11 };

  function rw(r) { return X.rankW(r); }

  // ===== 个人能力 =====
  var CLUTCH = false; // 当前是否关键时刻（第四节/加时，分差 5 分内）
  function tr(p, id) { return p._tr && p._tr[id]; }
  function condF(p) { return P.staminaF(p._st) * (p._morale || 1) * (p._boost || 1) * (p.persona === 'hothead' ? 1.03 : 1) * (CLUTCH && p.persona === 'bigheart' ? 1.05 : 1); }

  function methodAbility(p, m) {
    var a = p.a, v;
    switch (m.zone) {
      case 'in': v = 0.32 * a.sht + 0.22 * a.str + 0.12 * a.jmp + 0.1 * a.reb + 0.24 * P.heightScore(p); break;
      case 'mid': v = 0.75 * a.sht + 0.15 * a.dri + 0.1 * a.str; break;
      case 'drv': v = 0.32 * a.spd + 0.28 * a.dri + 0.15 * a.sht + 0.12 * a.str + 0.13 * a.jmp; break;
      case 'thr': v = 0.85 * a.thr + 0.15 * a.sht; break;
      default: v = 0.45 * a.spd + 0.25 * a.dri + 0.15 * a.pas + 0.15 * a.jmp;
    }
    if (p._tr) {
      if (m.zone === 'thr' && tr(p, 'sniper')) v *= 1.07;
      if (m.zone === 'mid' && tr(p, 'shooter')) v *= 1.06;
      if (m.zone === 'in' && tr(p, 'post')) v *= 1.06;
      if (m.zone === 'in' && tr(p, 'dunker')) v *= 1.03;
      if (m.zone === 'drv' && tr(p, 'slasher')) v *= 1.06;
      if (m.zone === 'fb' && tr(p, 'jet')) v *= 1.08;
      if (CLUTCH && tr(p, 'clutch')) v *= 1.08;
    }
    if (m.kind === 'iso') v *= 0.8 + 0.4 * p.iq.off / 100;
    else if (m.kind === 'fb') v *= 0.9 + 0.2 * p.iq.off / 100;
    else v *= 0.85 + 0.3 * p.iq.team / 100;
    return v * condF(p);
  }

  function defAbility(p, col) {
    var R = X.DEF_POS_RANK, s = 0, ws = 0;
    for (var k in R) {
      var w = rw(R[k][col]);
      var v = k === 'defIQ' ? p.iq.def : p.a[k];
      s += w * v; ws += w;
    }
    return s / ws * condF(p) * (tr(p, 'lockdown') ? 1.06 : 1);
  }

  function rebAbility(p, off) {
    var a = p.a;
    return (0.4 * a.reb + 0.2 * a.jmp + 0.15 * a.str + 0.25 * P.heightScore(p)) * (0.85 + 0.3 * (off ? p.iq.off : p.iq.def) / 100) * condF(p) * (tr(p, 'glass') ? 1.08 : 1);
  }

  // ===== 球队 / 阵容 =====
  function makeSide(cfg, kind) {
    var side = {
      id: cfg.id, name: cfg.name, color: cfg.color || '#888', kind: kind,
      nslots: kind === 'pro' ? 5 : 3, cols: kind === 'pro' ? PRO_COLS : STREET_COLS,
      roster: cfg.players.filter(function (p) { return p.inj <= 0; }),
      presets: cfg.presets, config: cfg.config, prof: cfg.prof || { off: {}, def: {} },
      status: (cfg.status == null ? 1 : cfg.status) * P.chemistry(cfg.players), home: !!cfg.home,
      court: [], curPreset: -1, pts: 0, fouls: 0, box: {}, trailLock: false, leadLock: false,
      used: { off: {}, def: {} }, form: 1 + U.gauss() * 0.035
    };
    side.roster.forEach(function (p) {
      p._st = cfg.noStamina ? 100 : p.st;
      p._out = false; p._pf = 0; p._sec = 0;
      p._morale = cfg.morale || 1;
      p._tr = {}; P.traits(p).forEach(function (id) { p._tr[id] = 1; });
      side.box[p.id] = { pid: p.id, min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, eff: 0 };
    });
    return side;
  }

  function preset(side) { return side.presets[side.curPreset] || side.presets[0]; }

  function tacticLevel(side, which, id) {
    var lv = (side.prof[which] && side.prof[which][id]) || 0;
    return Math.min(7, Math.floor(lv / 20));
  }

  function slotScore(p, col) {
    return P.ovr(p, X.POS[col]) * P.staminaF(p._st);
  }

  // 按预设填充场上阵容；不可用的球员由替补中最合适的顶上
  function fillCourt(side, lg, quiet) {
    var pr = preset(side), prev = side.court.slice(), used = {}, court = [];
    for (var s = 0; s < side.nslots; s++) {
      var pid = pr.lineup && pr.lineup[s];
      var p = pid && side.roster.find(function (x) { return x.id === pid; });
      if (p && !p._out && !used[p.id]) { court[s] = p; used[p.id] = 1; }
    }
    for (s = 0; s < side.nslots; s++) {
      if (court[s]) continue;
      var best = null, bs = -1;
      side.roster.forEach(function (x) {
        if (x._out || used[x.id]) return;
        var sc = slotScore(x, side.cols[s]);
        if (sc > bs) { bs = sc; best = x; }
      });
      if (best) { court[s] = best; used[best.id] = 1; }
    }
    side.court = court;
    var hasLeader = court.some(function (p) { return p && p.persona === 'leader'; });
    side.roster.forEach(function (p) { p._boost = hasLeader && p.persona !== 'leader' ? 1.02 : 1; });
    if (!quiet && lg) {
      for (s = 0; s < side.nslots; s++) {
        if (prev[s] && court[s] && prev[s] !== court[s]) lg(side.name + ' 换人：' + court[s].name + ' 替换 ' + prev[s].name, 'sub');
      }
    }
    return court.filter(Boolean).length >= side.nslots;
  }

  function choosePreset(side, q, diff, kind) {
    var c = side.config;
    if (kind === 'pro') {
      var idx = q >= 4 ? c.ot : c.q[q];
      if (diff >= 15 && c.lead >= 0) idx = c.lead;
      else if (diff <= -15 && c.trail >= 0) idx = c.trail;
      return idx == null ? 0 : idx;
    }
    // 街球：先发、领先5/10、落后5/10；落后改变过战术后，直到领先才恢复
    if (diff > 0) side.trailLock = false;
    if (diff <= -10 && c.trail10 >= 0) { side.trailLock = true; return c.trail10; }
    if (diff <= -5 && c.trail5 >= 0) { side.trailLock = true; return c.trail5; }
    if (side.trailLock && side.curPreset >= 0) return side.curPreset;
    if (diff >= 10 && c.lead10 >= 0) return c.lead10;
    if (diff >= 5 && c.lead5 >= 0) return c.lead5;
    return c.start || 0;
  }

  function offRating(side, m, shooterSlot, helper) {
    var mi = METHOD_IDX[m.id], rk = X.METHOD_POS_RANK[m.id];
    var sh = side.court[shooterSlot];
    var own = methodAbility(sh, m);
    var sup = 0, ws = 0;
    for (var s = 0; s < side.nslots; s++) {
      var w = rw(rk[side.cols[s]]);
      sup += w * methodAbility(side.court[s], m); ws += w;
    }
    sup /= ws;
    var extra;
    if (m.kind === 'pass') extra = helper ? (0.7 * helper.a.pas + 0.3 * helper.iq.team) * condF(helper) * (tr(helper, 'playmaker') ? 1.08 : 1) : sup;
    else if (m.kind === 'pr') extra = helper ? (0.5 * helper.a.str + 0.5 * helper.iq.team) * condF(helper) * (tr(helper, 'playmaker') ? 1.08 : 1) : sup;
    else if (m.kind === 'fb') extra = U.avg(side.court.map(function (p) { return p.a.spd * condF(p); }));
    else extra = sh.iq.off;
    var pr = preset(side);
    var v = 0.55 * own + 0.25 * sup + 0.2 * extra;
    v *= side.status * (1 + 0.01 * tacticLevel(side, 'off', pr.off)) * (side.home ? 1.02 : 1);
    if (pr.intensity) v *= 1 + (pr.intensity - 2) * 0.04;
    return v;
  }

  function defRating(side, m, shooterSlot, defTac) {
    var mi = METHOD_IDX[m.id];
    var pr = preset(side), d = side.court[shooterSlot];
    var col = side.cols[shooterSlot];
    var match = defAbility(d, col);
    if (m.zone === 'in' || m.zone === 'drv') match = 0.8 * match + 0.2 * P.heightScore(d);
    if (pr.mark != null && pr.mark >= 0 && pr.mark === shooterSlot) match *= 1 + d.will / 220;
    var team = U.avg(side.court.map(function (p, s) { return defAbility(p, side.cols[s]); }));
    var iqKey = defTac.zone ? 'team' : 'def';
    var iq = U.avg(side.court.map(function (p) { return p.iq[iqKey]; }));
    var v = (0.5 * match + 0.5 * team) * (0.85 + 0.3 * iq / 100);
    var counter = 1.15 - 0.03 * (defTac.rank[mi] - 1);
    v *= counter * side.status * (1 + 0.01 * tacticLevel(side, 'def', pr.def));
    if (pr.intensity) v *= 1 + (pr.intensity - 2) * 0.04;
    return v;
  }

  function teamReb(side, off) {
    var s = 0;
    for (var i = 0; i < side.nslots; i++) s += rw(X.DEF_POS_RANK.reb[side.cols[i]]) * rebAbility(side.court[i], off);
    return s;
  }

  function pickRebounder(side, off) {
    var ws = side.court.map(function (p, i) { return Math.pow(rw(X.DEF_POS_RANK.reb[side.cols[i]]) * rebAbility(p, off), 2); });
    return side.court[U.wpick(ws)];
  }

  // ===== 文字直播 =====
  var TXT = {
    in_make: ['{s}在低位背身单打{d}，转身勾手命中', '{s}强起上篮得分', '{s}背打{d}，后仰跳投命中', '{s}篮下打板得分', '{s}卡位要球，转身打进'],
    in_miss: ['{s}内线强攻不中', '{s}勾手打铁', '{s}篮下被{d}干扰，没有打进', '{s}背身单打后仰投篮偏出'],
    mid_make: ['{s}中距离跳投命中', '{s}急停跳投，球进了', '{s}罚球线附近出手，空心入网', '{s}晃开{d}，后仰中投命中'],
    mid_miss: ['{s}中投偏出', '{s}跳投打在篮筐上弹出', '{s}急停跳投没进'],
    drv_make: ['{s}突破{d}上篮得手', '{s}一步过人杀入篮下，拉杆上篮命中', '{s}变向突破，抛投命中', '{s}顶着{d}冲进篮下得分'],
    drv_miss: ['{s}突破上篮被{d}干扰未进', '{s}强行突破，上篮没进', '{s}突破后抛投偏出'],
    thr_make: ['{s}三分出手……命中！', '{s}底角三分稳稳命中', '{s}顶着{d}的防守飙中三分！', '{s}弧顶三分，空心入网'],
    thr_miss: ['{s}三分球偏出', '{s}三分出手，弹框而出', '{s}底角三分没进'],
    fb_make: ['{s}快攻上篮得分', '{s}一条龙快攻得手', '{s}快攻中轻松上篮'],
    fb_miss: ['{s}快攻上篮居然没进', '{s}快攻被{d}追身干扰'],
    dunk: ['{s}隔着{d}暴扣得手！全场沸腾！', '{s}一记风车灌篮！', '{s}战斧式劈扣！', '{s}起飞！单手暴扣！', '{s}双手重扣，篮架都在颤抖！'],
    alley: ['{a}高抛，{s}空中接力扣篮！', '{a}妙传，{s}接球直接灌篮！']
  };
  function fill(t, o) { return t.replace(/\{(\w)\}/g, function (_, k) { return o[k] ? o[k].name : ''; }); }

  // ===== 主模拟 =====
  // cfgH/cfgA: {id,name,color,players,presets,config,prof,status,home,noStamina,morale}
  // opts: {kind:'pro'|'street', log:bool, injuries:bool, noStamina:bool}
  E.play = function (cfgH, cfgA, opts) {
    opts = opts || {};
    var kind = opts.kind || 'pro';
    if (opts.noStamina) { cfgH.noStamina = true; cfgA.noStamina = true; }
    var H = makeSide(cfgH, kind), A = makeSide(cfgA, kind);
    var qlen = kind === 'pro' ? 720 : 300, otlen = kind === 'pro' ? 300 : 180;
    var foulOut = kind === 'pro' ? 6 : 5;
    var log = [], qs = [], injuries = [], forfeit = null;
    var q = 0, clock = qlen, hq = 0, aq = 0;
    var drainMul = kind === 'pro' ? 1 : 1.2;

    function lg(txt, type, sh) {
      if (!opts.log) return;
      var e = { q: q, t: U.fmtTime(clock), txt: txt, hs: H.pts, as: A.pts, type: type || '' };
      if (sh) e.sh = sh;
      log.push(e);
    }
    // 出手位置：[进攻方 h/a, 距篮筐(英尺), 角度(度), 结果 1 进 0 不进 2 被盖]
    var SPOT = { in: [2, 8], drv: [1, 6], mid: [9, 19], thr: [22.5, 26], fb: [0.5, 4] };
    function spot(side, zone, res) {
      var r = SPOT[zone] || SPOT.mid, ang = zone === 'thr' && Math.random() < 0.25 ? (Math.random() < 0.5 ? -82 : 82) : U.ri(-80, 80);
      return [side === H ? 'h' : 'a', U.r1(U.rf(r[0], r[1])), ang, res];
    }
    function box(side, p) { return side.box[p.id]; }
    function scoreDiff(side) { return side === H ? H.pts - A.pts : A.pts - H.pts; }

    function setPreset(side, quiet) {
      var idx = choosePreset(side, q, scoreDiff(side), kind);
      if (idx !== side.curPreset) {
        var first = side.curPreset < 0;
        side.curPreset = idx;
        var pr = preset(side);
        if (!first && !quiet) lg(side.name + ' 调整战术：进攻【' + OFF[pr.off].cn + '】 防守【' + (X.STREET_DEF_CN[pr.def] && kind === 'street' ? X.STREET_DEF_CN[pr.def] : DEF[pr.def].cn) + '】', 'tac');
        return fillCourt(side, lg, first);
      }
      return fillCourt(side, lg, true);
    }

    function enough(side) { return side.roster.filter(function (p) { return !p._out; }).length >= side.nslots; }

    function tick(sec) {
      [H, A].forEach(function (side) {
        var intensity = preset(side).intensity || 2;
        var onIds = {};
        side.court.forEach(function (p) {
          onIds[p.id] = 1;
          p._sec += sec;
          if (!opts.noStamina) p._st = Math.max(0, p._st - sec * (0.0075 + 0.01 * (1 - p.a.sta / 100)) * (tr(p, 'ironman') ? 0.75 : 1) * drainMul * (1 + (intensity - 2) * 0.25));
          side.used.off[preset(side).off] = (side.used.off[preset(side).off] || 0) + sec;
          side.used.def[preset(side).def] = (side.used.def[preset(side).def] || 0) + sec;
        });
        side.roster.forEach(function (p) { if (!onIds[p.id] && !p._out) p._st = Math.min(100, p._st + sec * 0.004); });
      });
    }

    function removePlayer(side, p, why) {
      p._out = true;
      var idx = side.court.indexOf(p);
      if (!enough(side)) return false;
      var ok = fillCourt(side, null, true);
      if (idx >= 0 && side.court[idx]) lg(side.name + ' 换人：' + side.court[idx].name + ' 替换 ' + p.name + '（' + why + '）', 'sub');
      return ok;
    }

    function checkInjury(side) {
      if (!opts.injuries) return true;
      for (var i = 0; i < side.court.length; i++) {
        var p = side.court[i];
        var pi = (0.00011 + (p._st < 80 ? (80 - p._st) * 0.00004 : 0)) * (p.persona === 'glass' ? 1.8 : p.persona === 'iron' ? 0.5 : 1);
        if (Math.random() < pi) {
          var inj = X.INJURIES[U.wpick(X.INJURIES.map(function (x) { return 30 / (x.min + x.max); }))];
          var rounds = U.ri(inj.min, inj.max);
          injuries.push({ pid: p.id, side: side === H ? 'h' : 'a', name: inj.cn, rounds: rounds });
          lg(p.name + ' 受伤了！（' + inj.cn + '）', 'inj');
          if (!removePlayer(side, p, '受伤')) return false;
        }
      }
      return true;
    }

    function freeThrows(off, sh, n, andOne) {
      var made = 0, pct = U.clamp(0.42 + sh.a.sht * 0.0055, 0.35, 0.93) * condF(sh) / Math.max(0.8, condF(sh)) ;
      for (var i = 0; i < n; i++) if (Math.random() < pct) made++;
      var b = box(off, sh); b.fta += n; b.ftm += made; b.pts += made; off.pts += made;
      if (andOne) lg(sh.name + (made ? ' 加罚命中！' : ' 加罚不中'), made ? 'score' : '');
      else lg(sh.name + ' ' + n + '罚' + made + '中', made ? 'score' : '');
      return made;
    }

    function pickMethod(off, trans) {
      var pr = preset(off), tac = OFF[pr.off];
      var fbW = rw(tac.rank[METHOD_IDX.fb]);
      if (trans === 'steal' && Math.random() < 0.4 + 0.35 * fbW) return X.METHODS[METHOD_IDX.stl_fb];
      if (trans === 'dreb') {
        var spdR = U.avg(off.court.map(function (p) { return p.a.spd; })) / 50;
        if (Math.random() < (0.06 + 0.3 * fbW * fbW) * spdR) return X.METHODS[METHOD_IDX.fb];
      }
      var ws = [];
      for (var i = 0; i < 12; i++) { var w = rw(tac.rank[i]); ws.push(w * w); }
      return X.METHODS[U.wpick(ws)];
    }

    // 一次进攻；返回 'score'|'miss_def'|'to'|'oreb'
    function possession(off, def, trans) {
      var m = pickMethod(off, trans);
      var rk = X.METHOD_POS_RANK[m.id];
      var core = preset(off).core;
      var ws = off.court.map(function (p, s) {
        var v = methodAbility(p, m) * rw(rk[off.cols[s]]);
        if (core != null && core >= 0 && core === s) v *= 1 + p.lead / 150;
        return Math.pow(v, 1.7);
      });
      var ss = U.wpick(ws), sh = off.court[ss], dfd = def.court[ss];
      var helper = null;
      if (m.kind === 'pass' || m.kind === 'fb') {
        var hw = off.court.map(function (p, s) { return s === ss ? 0 : Math.pow(p.a.pas * (0.7 + 0.3 * p.iq.team / 100), 2) * (off.cols[s] === 4 ? 1.6 : 1); });
        helper = off.court[U.wpick(hw)];
      } else if (m.kind === 'pr') {
        var sw = off.court.map(function (p, s) { return s === ss ? 0 : Math.pow(p.a.str, 2) * (off.cols[s] <= 1 ? 1.5 : 1); });
        helper = off.court[U.wpick(sw)];
      }
      var t = m.zone === 'fb' ? U.ri(4, 8) : (m.kind === 'iso' ? U.ri(10, 20) : U.ri(13, 23));
      if (trans === 'oreb') t = U.ri(3, 10);
      t = Math.min(t, Math.max(1, clock));
      tick(t); clock -= t;

      // 失误 / 抢断
      if (m.id !== 'stl_fb') {
        var stlD = U.avg(def.court.map(function (p, s) { return (0.6 * p.a.stl + 0.25 * p.a.spd + 0.15 * p.iq.def) * rw(X.DEF_POS_RANK.stl[def.cols[s]]) * condF(p) * (tr(p, 'thief') ? 1.25 : 1); }));
        var hdl = U.avg(off.court.map(function (p) { return (0.5 * p.a.dri + 0.3 * p.a.pas + 0.2 * p.iq.team) * condF(p); }));
        var pStl = 0.06 * Math.pow(stlD / Math.max(5, hdl * 0.75), 0.8);
        var pTo = 0.055 * Math.pow(Math.max(5, hdl) / 45, -0.5);
        if (Math.random() < U.clamp(pStl, 0.02, 0.16)) {
          var sws = def.court.map(function (p, s) { return Math.pow(p.a.stl * rw(X.DEF_POS_RANK.stl[def.cols[s]]), 2); });
          var stealer = def.court[U.wpick(sws)];
          box(off, sh).to++; box(def, stealer).stl++;
          lg(sh.name + ' 的球被 ' + stealer.name + ' 断掉', 'to');
          return 'steal';
        }
        if (Math.random() < U.clamp(pTo, 0.03, 0.12)) {
          box(off, sh).to++;
          lg(U.pick([sh.name + ' 运球失误', sh.name + ' 走步违例', sh.name + ' 传球出界', sh.name + ' 进攻犯规', sh.name + ' 24秒违例']), 'to');
          return 'to';
        }
      }

      var dTac = DEF[preset(def).def];
      var o = offRating(off, m, ss, helper), d = defRating(def, m, ss, dTac);
      var pMake = U.clamp(BASE[m.zone] * Math.pow(o * off.form / Math.max(1, d * def.form), 0.55), 0.12, 0.85);
      var fouled = Math.random() < FOUL[m.zone] * (1 + (dfd._pf >= 4 ? -0.4 : 0));
      if (fouled) pMake *= 0.55;
      var made = Math.random() < pMake;
      var isThree = m.zone === 'thr';
      var b = box(off, sh);
      b.fga++; if (isThree) b.tpa++;
      var who = { s: sh, d: dfd, a: helper };
      var prefix = '';
      if (m.kind === 'pass' && helper) prefix = helper.name + ' 传球，';
      else if (m.kind === 'pr' && helper) prefix = helper.name + ' 掩护，';
      else if (m.id === 'stl_fb') prefix = '抢断后反击，';

      if (fouled) {
        dfd._pf++; box(def, dfd).pf++;
      }
      if (made) {
        var pts = isThree ? 3 : 2;
        b.fgm++; b.pts += pts; off.pts += pts; if (isThree) b.tpm++;
        if (helper && (m.kind !== 'iso') && Math.random() < (m.kind === 'fb' ? 0.6 : 0.85)) box(off, helper).ast++;
        else if (m.kind === 'iso' && Math.random() < 0.12) {
          var mates = off.court.filter(function (p) { return p !== sh; });
          box(off, U.pick(mates)).ast++;
        }
        var txt;
        var flashy = (m.zone === 'in' || m.zone === 'drv' || m.zone === 'fb') && Math.random() < 0.04 + Math.max(0, (P.effH(sh) - 215) / 120) + (sh.a.jmp + sh.a.spd) / 2500 + sh.iq.off / 2500 + (tr(sh, 'dunker') ? 0.1 : 0);
        if (flashy && m.kind === 'pass' && helper) txt = fill(U.pick(TXT.alley), who);
        else if (flashy) txt = prefix + fill(U.pick(TXT.dunk), who);
        else txt = prefix + fill(U.pick(TXT[m.zone + '_make']), who);
        lg(txt + '（' + m.cn + '）', 'score', spot(off, m.zone, 1));
        if (fouled) { lg(dfd.name + ' 防守犯规', 'foul'); freeThrows(off, sh, 1, true); }
      } else if (fouled) {
        b.fga--; if (isThree) b.tpa--; // 投篮犯规未进不计出手
        lg(dfd.name + ' 对 ' + sh.name + ' 投篮犯规', 'foul');
        var made2 = freeThrows(off, sh, isThree ? 3 : 2, false);
      } else {
        // 盖帽
        var blocked = false;
        if (m.zone !== 'thr' && m.zone !== 'fb') {
          var bws = def.court.map(function (p, s) { return Math.pow(p.a.blk * rw(X.DEF_POS_RANK.blk[def.cols[s]]) * P.heightScore(p) / 50, 2); });
          var bl = def.court[U.wpick(bws)];
          var pBlk = U.clamp((0.06 + 0.22 * (bl.a.blk / 100) + (P.effH(bl) - P.effH(sh)) / 200) * (tr(bl, 'blocker') ? 1.4 : 1), 0.02, 0.45);
          if (Math.random() < pBlk) { blocked = true; box(def, bl).blk++; lg(bl.name + ' 一记大帽扇飞了 ' + sh.name + ' 的出手！', 'blk', spot(off, m.zone, 2)); }
        }
        if (!blocked) lg(prefix + fill(U.pick(TXT[m.zone + '_miss']), who), '', spot(off, m.zone, 0));
      }
      // 犯规满离场
      if (fouled && dfd._pf >= foulOut) {
        lg(dfd.name + ' 犯满离场', 'foul');
        if (!removePlayer(def, dfd, '犯满')) return 'forfeit_def';
      }
      if (made || fouled) return 'score';
      // 篮板
      var orb = teamReb(off, true), drb = teamReb(def, false);
      var pO = U.clamp(0.27 * Math.pow(orb / Math.max(1, drb), 0.7), 0.1, 0.42);
      if (Math.random() < pO) {
        var r = pickRebounder(off, true); box(off, r).oreb++;
        lg(r.name + ' 抢下进攻篮板', 'reb');
        return 'oreb';
      }
      var r2 = pickRebounder(def, false); box(def, r2).dreb++;
      lg(r2.name + ' 拿到防守篮板', 'reb');
      return 'dreb';
    }

    function endByForfeit(loser) {
      // 人数不足：若输方领先则 20:0 判负，否则保留当前比分
      var winner = loser === H ? A : H;
      var lead = loser.pts > winner.pts;
      forfeit = { loser: loser === H ? 'h' : 'a', score: lead || (loser.pts === winner.pts) };
      if (forfeit.score) { winner.pts = 20; loser.pts = 0; }
      lg(loser.name + ' 场上人数不足，比赛结束', 'end');
    }

    // 开赛前人数检查
    if (H.roster.length < H.nslots || A.roster.length < A.nslots) {
      var lose = H.roster.length < H.nslots ? H : A, win = lose === H ? A : H;
      win.pts = 20; lose.pts = 0;
      return finish(true);
    }

    var poss = U.chance(0.5) ? H : A, trans = null;
    lg('比赛开始！' + H.name + '（主）对阵 ' + A.name + '（客）', 'q');
    while (true) {
      clock = q < 4 ? qlen : otlen;
      var qsH = H.pts, qsA = A.pts;
      setPreset(H, false); setPreset(A, false);
      if (q > 0) [H, A].forEach(function (side) { side.roster.forEach(function (p) { if (!p._out) p._st = Math.min(100, p._st + 3); }); });
      lg(q < 4 ? '第' + (q + 1) + '节开始' : '加时赛开始', 'q');
      var lastCheck = clock;
      while (clock > 0) {
        var off = poss, def = poss === H ? A : H;
        CLUTCH = q >= 3 && Math.abs(H.pts - A.pts) <= 5 && (q >= 4 || clock <= 300);
        var res = possession(off, def, trans);
        if (res === 'forfeit_def') { endByForfeit(def); break; }
        if (!checkInjury(H)) { endByForfeit(H); break; }
        if (!checkInjury(A)) { endByForfeit(A); break; }
        if (res === 'oreb') { trans = 'oreb'; continue; }
        trans = res === 'steal' ? 'steal' : res === 'dreb' ? 'dreb' : null;
        poss = def;
        if (lastCheck - clock >= 90) { lastCheck = clock; setPreset(H, false); setPreset(A, false); }
      }
      if (forfeit) break;
      qs.push([H.pts - qsH, A.pts - qsA]);
      lg((q < 4 ? '第' + (q + 1) + '节' : '加时赛') + '结束，比分 ' + H.pts + ' : ' + A.pts, 'q');
      q++;
      if (q >= 4 && H.pts !== A.pts) break;
      if (q > 12) { if (H.pts === A.pts) H.pts++; break; }
    }
    return finish(false);

    function finish(pre) {
      [H, A].forEach(function (side) {
        side.roster.forEach(function (p) {
          var bx = side.box[p.id];
          bx.min = Math.round(p._sec / 60);
          bx.eff = bx.pts + bx.oreb + bx.dreb + bx.ast + bx.stl + bx.blk - (bx.fga - bx.fgm) - (bx.fta - bx.ftm) - bx.to;
        });
      });
      lg('比赛结束！最终比分 ' + H.name + ' ' + H.pts + ' : ' + A.pts + ' ' + A.name, 'end');
      var res = {
        hs: H.pts, as: A.pts, qs: qs, log: log, injuries: injuries, forfeit: forfeit || (pre ? { pre: true } : null),
        box: { h: H.roster.map(function (p) { return H.box[p.id]; }), a: A.roster.map(function (p) { return A.box[p.id]; }) },
        stam: {}, used: { h: H.used, a: A.used }
      };
      [H, A].forEach(function (side) { side.roster.forEach(function (p) { res.stam[p.id] = p._st; }); });
      // 清理临时字段
      [H, A].forEach(function (side) { side.roster.forEach(function (p) { delete p._st; delete p._out; delete p._pf; delete p._sec; delete p._morale; delete p._tr; delete p._boost; }); });
      return res;
    }
  };

  E.defName = function (id, kind) { return kind === 'street' && X.STREET_DEF_CN[id] ? X.STREET_DEF_CN[id] : DEF[id].cn; };

  // ===== AI 自动阵容战术 =====
  function bestFor(players, col, used) {
    var best = null, bs = -1;
    players.forEach(function (p) {
      if (used[p.id] || p.inj > 0) return;
      var s = P.ovr(p, X.POS[col]) * (p.pos === X.POS[col] ? 1.08 : 1);
      if (s > bs) { bs = s; best = p; }
    });
    return best;
  }
  E.autoLineup = function (players, kind, exclude) {
    var cols = kind === 'pro' ? PRO_COLS : STREET_COLS, used = {}, lu = [];
    (exclude || []).forEach(function (id) { used[id] = 1; });
    // 先排最稀缺的内线
    var order = kind === 'pro' ? [0, 4, 1, 3, 2] : [0, 2, 1];
    order.forEach(function (s) {
      var p = bestFor(players, cols[s], used);
      if (!p) { used = {}; p = bestFor(players, cols[s], {}); }
      if (p) { used[p.id] = 1; lu[s] = p.id; }
    });
    return lu;
  };
  // 每套进攻战术对这个阵容的适合程度
  E.offScores = function (players, lineup, kind) {
    var list = kind === 'pro' ? X.OFF_TACTICS.map(function (t) { return t.id; }) : X.STREET_OFF;
    var cols = kind === 'pro' ? PRO_COLS : STREET_COLS, out = {};
    var court = lineup.map(function (id) { return players.find(function (p) { return p.id === id; }); }).filter(Boolean);
    list.forEach(function (tid) {
      if (court.length < cols.length) { out[tid] = 0; return; }
      var tac = OFF[tid], sc = 0, ws = 0;
      for (var i = 0; i < 12; i++) {
        var w = Math.pow(rw(tac.rank[i]), 2), m = X.METHODS[i], rk = X.METHOD_POS_RANK[m.id];
        var best1 = 0;
        court.forEach(function (p, s) {
          p._st = 100;
          best1 = Math.max(best1, methodAbility(p, m) * rw(rk[cols[s]]));
          delete p._st;
        });
        sc += w * best1; ws += w;
      }
      out[tid] = sc / ws;
    });
    return out;
  };
  // 根据阵容挑选合适的进攻战术
  E.suggestOff = function (players, lineup, kind) {
    var sc = E.offScores(players, lineup, kind), best = null, bs = -1;
    for (var t in sc) if (sc[t] > bs) { bs = sc[t]; best = t; }
    return best;
  };
  // 防守战术对进攻战术的克制程度（>0 防守占优）
  E.counter = function (offId, defId) {
    var ot = OFF[offId], dt = DEF[defId], ws = [], tot = 0, s = 0, i;
    for (i = 0; i < 12; i++) { var w = rw(ot.rank[i]); ws.push(w * w); tot += w * w; }
    for (i = 0; i < 12; i++) s += ws[i] / tot * (1.15 - 0.03 * (dt.rank[i] - 1));
    return s - 1;
  };
})(window.XBA);
