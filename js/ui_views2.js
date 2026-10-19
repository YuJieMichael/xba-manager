// 页面：职业战术、街球战术（阵容战术、配置阵容战术、战术等级、战术相克表）
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, E = X.Engine, esc = U.esc;
  var W = function () { return X.World; };

  UI.tac = { board: 'league', preset: 0, slot: null };
  UI.stac = { preset: 0, slot: null };

  // 场上站位坐标（半场示意图，百分比）
  var COURT_XY = {
    pro: [[50, 78], [26, 62], [74, 62], [80, 28], [38, 22]],
    street: [[50, 76], [74, 44], [34, 26]]
  };

  function courtHtml(S, team, pr, kind, selSlot, act) {
    var slots = E.SLOT_NAMES[kind], spos = E.SLOT_POS[kind];
    var h = '<div class="court"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="court-bg">' +
      '<rect x="0" y="0" width="100" height="100" fill="#d9a15b"/>' +
      '<rect x="36" y="62" width="28" height="38" fill="#c98a45" stroke="#fff" stroke-width="0.6"/>' +
      '<circle cx="50" cy="62" r="12" fill="none" stroke="#fff" stroke-width="0.6"/>' +
      '<path d="M6 100 L6 78 Q50 -8 94 78 L94 100" fill="none" stroke="#fff" stroke-width="0.6"/>' +
      '<circle cx="50" cy="92" r="2.4" fill="none" stroke="#f60" stroke-width="0.8"/><line x1="44" y1="95.5" x2="56" y2="95.5" stroke="#fff" stroke-width="0.8"/>' +
      '<rect x="0" y="0" width="100" height="100" fill="none" stroke="#fff" stroke-width="1"/></svg>';
    for (var s = 0; s < slots.length; s++) {
      var p = pr.lineup[s] && S.players[pr.lineup[s]];
      var xy = COURT_XY[kind][s];
      var badPos = p && p.inj > 0;
      h += '<div class="slot' + (selSlot === s ? ' sel' : '') + (p ? '' : ' empty') + (badPos ? ' hurt' : '') + '" style="left:' + xy[0] + '%;top:' + xy[1] + '%" data-act="' + act + '" data-slot="' + s + '">' +
        '<div class="jersey" style="background:' + team.color + '">' + (p ? p.num : '?') + '</div>' +
        '<div class="slot-n">' + slots[s] + '</div>' +
        (p ? '<div class="slot-p">' + esc(p.name) + '<br><span>' + p.pos + ' · ' + UI.ovrTag(P.ovr(p, spos[s])) + ' · 体' + Math.round(p.st) + '</span></div>' : '<div class="slot-p muted">点击替补上场</div>') + '</div>';
    }
    return h + '</div>';
  }

  function benchHtml(S, team, pr, kind, act) {
    var on = {};
    pr.lineup.forEach(function (id) { if (id) on[id] = 1; });
    var ps = W().teamPlayers(S, team).filter(function (p) { return !on[p.id]; }).sort(function (a, b) { return P.ovr(b) - P.ovr(a); });
    return '<div class="bench"><div class="bench-h">替补席（先点场上位置，再点替补球员换上；再点一次场上位置可让其下场）</div>' + ps.map(function (p) {
      return '<span class="bp' + (p.inj > 0 ? ' hurt' : '') + '" data-act="' + act + '" data-pid="' + p.id + '"><b class="jn" style="background:' + team.color + '">' + p.num + '</b>' + esc(p.name) + ' <i>' + p.pos + ' ' + UI.ovrTag(P.ovr(p)) + ' 体' + Math.round(p.st) + (p.inj > 0 ? ' 伤' : '') + '</i></span>';
    }).join('') + '</div>';
  }

  // 战术相克表：进攻战术 × 防守战术，数字越大对进攻越不利
  function counterTable(offs, defs, kind) {
    var midx = {}; X.METHODS.forEach(function (m, i) { midx[m.id] = i; });
    var h = '<table class="grid ct"><tr><th>进攻＼防守</th>' + defs.map(function (d) { return '<th>' + E.defName(d, kind) + '</th>'; }).join('') + '</tr>';
    offs.forEach(function (o) {
      var ot = E.OFF[o];
      var ws = []; for (var i = 0; i < 12; i++) { var w = X.rankW(ot.rank[i]); ws.push(w * w); }
      var tot = U.sum(ws);
      h += '<tr><th>' + ot.cn + '</th>' + defs.map(function (d) {
        var dt = E.DEF[d], s = 0;
        for (var i = 0; i < 12; i++) s += ws[i] / tot * (1.15 - 0.03 * (dt.rank[i] - 1));
        var pct = Math.round((s - 1) * 100);
        var cls = pct >= 6 ? 'c3' : pct >= 2 ? 'c2' : pct <= -6 ? 'c-3' : pct <= -2 ? 'c-2' : 'c0';
        return '<td class="' + cls + '">' + (pct > 0 ? '+' : '') + pct + '%</td>';
      }).join('') + '</tr>';
    });
    return h + '</table><div class="muted small">表中为该防守对该进攻战术的克制程度（防守加成）。红色 = 防守克制进攻；绿色 = 进攻占优。</div>';
  }

  function levelTable(team, offs, defs, kind) {
    function row(list, which) {
      return list.map(function (id) {
        var v = team.prof[which][id] || 0, lv = Math.min(7, Math.floor(v / 20));
        var name = which === 'off' ? E.OFF[id].cn : E.defName(id, kind);
        return '<tr><td>' + name + '</td><td>' + lv + ' 级</td><td><div class="bar sm"><i style="width:' + (lv >= 7 ? 100 : (v % 20) / 20 * 100) + '%;background:#4a8fd8"></i></div></td><td>+' + lv + '%</td></tr>';
      }).join('');
    }
    return '<div class="cols2"><div><table class="grid"><tr><th>进攻战术</th><th>等级</th><th>熟练度</th><th>加成</th></tr>' + row(offs, 'off') + '</table></div><div><table class="grid"><tr><th>防守战术</th><th>等级</th><th>熟练度</th><th>加成</th></tr>' + row(defs, 'def') + '</table></div></div>' +
      '<div class="muted small">战术在比赛中使用越多熟练度越高，每升一级该战术下球员获得 1% 能力加成，最多 7%。可用「战术洗点」道具重置。</div>';
  }

  // ===== 职业战术 =====
  V.tac_pro = function () {
    var S = UI.S, team = W().userPro(S), T = UI.tac;
    if (!team.boards[T.board]) team.boards[T.board] = JSON.parse(JSON.stringify(team.boards.league));
    var board = team.boards[T.board];
    var pr = board.presets[T.preset];
    var tab = UI.curTab('tacpro', 'lineup');
    var h = coachBox(S);
    h += '<div class="tac-top">战术板：' + [['league', '联赛战术板'], ['cup', 'XBA杯战术板'], ['other', '表演赛/胜者为王战术板']].map(function (b) {
      return UI.btn(b[1], 'tacboard', { b: b[0] }, 'sm' + (T.board === b[0] ? ' on' : ''));
    }).join(' ') + '　' + UI.btn('把联赛战术板复制到当前战术板', 'tacboardcopy', {}, 'sm') + '</div>';
    h += UI.tabs('tacpro', [['lineup', '阵容战术'], ['config', '配置阵容战术'], ['level', '战术等级'], ['counter', '战术相克表']], tab);
    if (tab === 'lineup') {
      h += '<div class="presets">' + board.presets.map(function (p, i) { return UI.btn((i + 1) + '. ' + esc(p.name), 'tacpreset', { i: i }, 'sm' + (T.preset === i ? ' on' : '')); }).join(' ') + '</div>';
      h += '<div class="tac-wrap"><div>' + courtHtml(S, team, pr, 'pro', T.slot, 'tacslot') + '</div><div class="tac-form">' +
        '<label>阵容名称 <input id="pr-name" value="' + esc(pr.name) + '" maxlength="8" data-change="tacname"></label>' +
        '<label>进攻战术 <select data-change="tacset" data-f="off">' + X.OFF_TACTICS.map(function (t) { return '<option value="' + t.id + '"' + (pr.off === t.id ? ' selected' : '') + '>' + t.cn + '</option>'; }).join('') + '</select></label>' +
        '<div class="muted small">' + E.OFF[pr.off].desc + '</div>' +
        '<label>防守战术 <select data-change="tacset" data-f="def">' + X.DEF_TACTICS.map(function (t) { return '<option value="' + t.id + '"' + (pr.def === t.id ? ' selected' : '') + '>' + t.cn + '</option>'; }).join('') + '</select></label>' +
        '<div class="muted small">' + E.DEF[pr.def].desc + '</div>' +
        '<label>进攻核心 <select data-change="tacset" data-f="core">' + slotOpts(pr.core) + '</select></label>' +
        '<div class="muted small">进攻核心对球员的领导力要求很高。</div>' +
        '<label>主防对象 <select data-change="tacset" data-f="mark">' + slotOpts(pr.mark) + '</select></label>' +
        '<div class="muted small">设置主防后，对应位置的防守球员毅力越高效果越好。根据对方的进攻核心设置主防，可以很好地限制对方。</div>' +
        '<p>' + UI.btn('自动排出最强阵容', 'tacauto', {}, 'sm') + ' ' + UI.btn('推荐进攻战术', 'tacsuggest', {}, 'sm') + '</p></div></div>';
      h += benchHtml(S, team, pr, 'pro', 'tacbench');
      h += '<p class="tip">体力一定要保持在 80 以上，否则不但能力发挥受限，还容易受伤；尽量不要让一个球员打满全场。阵容状态与上场球员工资超出工资帽的多少有关（当前 ' + Math.round(W().lineupStatus(S, team) * 100) + '%）。</p>';
    } else if (tab === 'config') {
      var c = board.config;
      var opts = function (v, allowNone) {
        return (allowNone ? '<option value="-1"' + (v < 0 ? ' selected' : '') + '>不采用</option>' : '') + board.presets.map(function (p, i) { return '<option value="' + i + '"' + (v === i ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(p.name) + '</option>'; }).join('');
      };
      h += '<table class="grid cfg"><tr><th>情况</th><th>使用的阵容战术</th></tr>' +
        [0, 1, 2, 3].map(function (q) { return '<tr><td>第' + '一二三四'[q] + '节</td><td><select data-change="taccfg" data-f="q" data-i="' + q + '">' + opts(c.q[q]) + '</select></td></tr>'; }).join('') +
        '<tr><td>加时赛</td><td><select data-change="taccfg" data-f="ot">' + opts(c.ot) + '</select></td></tr>' +
        '<tr><td>领先 15 分</td><td><select data-change="taccfg" data-f="lead">' + opts(c.lead, true) + '</select></td></tr>' +
        '<tr><td>落后 15 分</td><td><select data-change="taccfg" data-f="trail">' + opts(c.trail, true) + '</select></td></tr></table>' +
        '<p class="tip">把预设好的 4 种阵容战术匹配到各节和比赛情况。比赛开始后不能再修改。「领先/落后 15 分」可选择不采用，那样就一直使用每节设置好的阵容战术。</p>';
      h += UI.box('体力消耗预估', staminaPlan(S, team, board));
    } else if (tab === 'level') {
      h += levelTable(team, X.OFF_TACTICS.map(function (t) { return t.id; }), X.DEF_TACTICS.map(function (t) { return t.id; }), 'pro');
    } else {
      h += counterTable(X.OFF_TACTICS.map(function (t) { return t.id; }), X.DEF_TACTICS.map(function (t) { return t.id; }), 'pro');
      h += UI.box('进攻方式说明', '<p class="small">比赛引擎共有 14 种基本进攻方式：内线单打、接传球内线、挡拆内线、单打中投、接传球中投、挡拆中投、单打突破、接传球突破、挡拆突破、单打三分、接传球三分、挡拆三分、普通快攻、抄球快攻。进攻战术决定每种进攻方式出现的几率，防守战术通过克制进攻方式来克制进攻战术。</p>');
    }
    return h;
  };

  function slotOpts(v) {
    return '<option value="-1"' + (v == null || v < 0 ? ' selected' : '') + '>无</option>' + E.SLOT_NAMES.pro.map(function (n, i) { return '<option value="' + i + '"' + (v === i ? ' selected' : '') + '>' + n + '</option>'; }).join('');
  }

  function staminaPlan(S, team, board) {
    var mins = {};
    board.config.q.forEach(function (pi) { board.presets[pi].lineup.forEach(function (id) { if (id) mins[id] = (mins[id] || 0) + 12; }); });
    var ps = W().teamPlayers(S, team).sort(function (a, b) { return (mins[b.id] || 0) - (mins[a.id] || 0); });
    return '<table class="grid"><tr><th>球员</th><th>当前体力</th><th>计划上场</th><th>预计赛后体力</th></tr>' + ps.map(function (p) {
      var m = mins[p.id] || 0;
      var after = p.st - m * 60 * (0.0075 + 0.01 * (1 - p.a.sta / 100)) + (48 - m) * 60 * 0.004 + 9;
      return '<tr><td>' + UI.pname(p) + '</td><td>' + UI.stam(p.st) + '</td><td>' + m + ' 分钟</td><td>' + UI.stam(Math.max(0, Math.min(100, after))) + '</td></tr>';
    }).join('') + '</table>';
  }

  function coachBox(S) {
    var c = S.user.coach || {}, rep = S.user.lastCoach, Co = X.Coach;
    var h = '<div class="coach"><div><b>🧑‍🏫 助理教练</b>　风格 <select data-change="coachstyle">' + Object.keys(Co.STYLES).map(function (k) {
      return '<option value="' + k + '"' + ((c.style || 'balance') === k ? ' selected' : '') + '>' + Co.STYLES[k].cn + '</option>';
    }).join('') + '</select> <span class="muted small">' + Co.STYLES[c.style || 'balance'].desc + '</span></div>' +
      '<div style="margin-top:4px">' + UI.btn('针对下一个联赛对手排阵', 'coachnext', {}, 'sm on') + ' ' + UI.btn('排一套通用阵容', 'coachgen', {}, 'sm') +
      ' <label class="small"><input type="checkbox" data-change="coachauto"' + (c.auto ? ' checked' : '') + '> 每场比赛前自动针对对手排阵（联赛、XBA杯、表演赛、胜者为王）</label></div><div style="margin-top:4px">' + UI.coachToggle(S) + '</div>';
    if (rep) {
      h += '<div class="coach-rep small">' + (rep.opp ? '对手 <b>' + esc(rep.opp) + '</b>' + (rep.games ? '（看了 ' + rep.games + ' 场录像）' : '') + '常用进攻【' + E.OFF[rep.oppOff].cn + '】、防守【' + E.DEF[rep.oppDef].cn + '】' + (rep.star ? '，头号得分手 ' + esc(rep.star) : '') + '。' : '') +
        '我方（' + rep.style + '）：进攻用【' + E.OFF[rep.off].cn + '】，防守用【' + E.DEF[rep.def].cn + '】' + (rep.core ? '，进攻核心 ' + esc(rep.core) : '') + (rep.mark >= 0 ? '，主防对方' + E.SLOT_NAMES.pro[rep.mark] : '') + '；第二节轮换，领先 15 分换保守阵容，落后 15 分换追分阵容。</div>';
    }
    return h + '</div>';
  }
  A.coachstyle = function (d, el) { var S = UI.S; S.user.coach = S.user.coach || {}; S.user.coach.style = el.value; UI.persist(); UI.render(); };
  A.coachauto = function (d, el) { var S = UI.S; S.user.coach = S.user.coach || {}; S.user.coach.auto = el.checked; UI.result(null, el.checked ? '助理教练会在每场比赛前自动排阵' : '已关闭自动排阵'); };
  A.coachautost = function (d, el) { var S = UI.S; S.user.coach = S.user.coach || {}; S.user.coach.autoStreet = el.checked; UI.result(null, el.checked ? '街球助理会在每场比赛前自动排阵' : '已关闭'); };
  A.coachnext = function () {
    var S = UI.S, opp = X.Coach.nextLeagueOpp(S);
    var rep = X.Coach.prepare(S, 'league', opp);
    if (!rep) return UI.toast('可上场球员不足 5 人', true);
    UI.tac.board = 'league'; UI.tac.preset = 0;
    UI.result(null, '已针对 ' + (rep.opp || '对手') + ' 排好联赛战术板');
  };
  A.coachgen = function () {
    var S = UI.S, rep = X.Coach.prepare(S, UI.tac.board, null);
    if (!rep) return UI.toast('可上场球员不足 5 人', true);
    UI.result(null, '已为当前战术板排好通用阵容');
  };
  A.coachst = function () { X.Coach.prepareStreet(UI.S); UI.stac.preset = 0; UI.result(null, '街球阵容已排好'); };
  function curPro() { var t = W().userPro(UI.S); return { team: t, board: t.boards[UI.tac.board], pr: t.boards[UI.tac.board].presets[UI.tac.preset] }; }
  A.tacboard = function (d) { UI.tac.board = d.b; UI.tac.slot = null; UI.render(); };
  A.tacboardcopy = function () {
    var t = W().userPro(UI.S);
    if (UI.tac.board === 'league') return UI.toast('当前就是联赛战术板，先切换到其他战术板', true);
    t.boards[UI.tac.board] = JSON.parse(JSON.stringify(t.boards.league));
    UI.result(null, '已复制联赛战术板');
  };
  A.tacpreset = function (d) { UI.tac.preset = +d.i; UI.tac.slot = null; UI.render(); };
  A.tacslot = function (d) {
    var s = +d.slot, c = curPro();
    if (UI.tac.slot === s) { c.pr.lineup[s] = null; UI.tac.slot = null; UI.persist(); }
    else if (UI.tac.slot != null) {
      var a = UI.tac.slot, tmp = c.pr.lineup[a]; c.pr.lineup[a] = c.pr.lineup[s]; c.pr.lineup[s] = tmp; UI.tac.slot = null; UI.persist();
    } else UI.tac.slot = s;
    UI.render();
  };
  A.tacbench = function (d) {
    var c = curPro();
    var s = UI.tac.slot;
    if (s == null) s = c.pr.lineup.findIndex(function (x) { return !x; });
    if (s == null || s < 0) { UI.sel = d.pid; UI.toast('先点击场上的一个位置，再点替补球员'); UI.renderCard(); return; }
    c.pr.lineup[s] = d.pid; UI.tac.slot = null; UI.sel = d.pid;
    UI.persist(); UI.render();
  };
  A.tacname = function (d, el) { curPro().pr.name = el.value.trim() || '阵容'; UI.persist(); UI.render(); };
  A.tacset = function (d, el) {
    var pr = curPro().pr;
    if (d.f === 'core' || d.f === 'mark') pr[d.f] = +el.value; else pr[d.f] = el.value;
    UI.persist(); UI.render();
  };
  A.taccfg = function (d, el) {
    var c = curPro().board.config;
    if (d.f === 'q') c.q[+d.i] = +el.value; else c[d.f] = +el.value;
    UI.persist(); UI.render();
  };
  A.tacauto = function () {
    var c = curPro(), ps = W().teamPlayers(UI.S, c.team);
    c.pr.lineup = E.autoLineup(ps, 'pro');
    UI.persist(); UI.render();
  };
  A.tacsuggest = function () {
    var c = curPro(), ps = W().teamPlayers(UI.S, c.team);
    c.pr.off = E.suggestOff(ps, c.pr.lineup, 'pro');
    UI.result(null, '推荐进攻战术：' + E.OFF[c.pr.off].cn);
  };

  // ===== 街球战术 =====
  V.tac_street = function () {
    var S = UI.S, team = W().userStreet(S), T = UI.stac;
    var pr = team.presets[T.preset];
    var tab = UI.curTab('tacst', 'lineup');
    var cs = S.user.coach || {};
    var h = '<div class="coach"><b>🧑‍🏫 街球助理</b> ' + UI.btn('一键排阵', 'coachst', {}, 'sm on') + ' <label class="small"><input type="checkbox" data-change="coachautost"' + (cs.autoStreet ? ' checked' : '') + '> 每场比赛前自动排阵（按体力轮换）</label></div>';
    h += UI.tabs('tacst', [['lineup', '阵容战术'], ['config', '配置阵容战术'], ['level', '战术等级'], ['counter', '战术相克表']], tab);
    if (tab === 'lineup') {
      h += '<div class="presets">' + team.presets.map(function (p, i) { return UI.btn((i + 1) + '. ' + esc(p.name), 'stpreset', { i: i }, 'sm' + (T.preset === i ? ' on' : '')); }).join(' ') + '</div>';
      h += '<div class="tac-wrap"><div>' + courtHtml(S, team, pr, 'street', T.slot, 'stslot') + '</div><div class="tac-form">' +
        '<label>阵容名称 <input value="' + esc(pr.name) + '" maxlength="8" data-change="stname"></label>' +
        '<label>进攻战术 <select data-change="stset" data-f="off">' + X.STREET_OFF.map(function (id) { return '<option value="' + id + '"' + (pr.off === id ? ' selected' : '') + '>' + E.OFF[id].cn + '</option>'; }).join('') + '</select></label>' +
        '<label>防守战术 <select data-change="stset" data-f="def">' + X.STREET_DEF.map(function (id) { return '<option value="' + id + '"' + (pr.def === id ? ' selected' : '') + '>' + E.defName(id, 'street') + '</option>'; }).join('') + '</select></label>' +
        '<label>比赛强度 <select data-change="stset" data-f="intensity">' + [[1, '低'], [2, '中'], [3, '高']].map(function (x) { return '<option value="' + x[0] + '"' + (pr.intensity === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
        '<div class="muted small">强度大，球员积极性更高，但消耗更多体力。体力低于 80 就可能受伤，越低越容易受重伤。</div>' +
        '<p>' + UI.btn('自动排出最强阵容', 'stauto', {}, 'sm') + '</p></div></div>';
      h += benchHtml(S, team, pr, 'street', 'stbench');
    } else if (tab === 'config') {
      var c = team.config;
      var opts = function (v, none) { return (none ? '<option value="-1"' + (v < 0 ? ' selected' : '') + '>不采用</option>' : '') + team.presets.map(function (p, i) { return '<option value="' + i + '"' + (v === i ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(p.name) + '</option>'; }).join(''); };
      h += '<table class="grid cfg"><tr><th>情况</th><th>使用的阵容战术</th></tr>' +
        [['start', '先发', false], ['lead5', '领先 5 分', true], ['lead10', '领先 10 分', true], ['trail5', '落后 5 分', true], ['trail10', '落后 10 分', true]].map(function (x) {
          return '<tr><td>' + x[1] + '</td><td><select data-change="stcfg" data-f="' + x[0] + '">' + opts(c[x[0]], x[2]) + '</select></td></tr>';
        }).join('') + '</table><p class="tip">一个球队如果曾经因为落后而改变过战术，那么直到球队领先后才会改变现有战术，而不会因为追平就改回初始战术。</p>';
    } else if (tab === 'level') {
      h += levelTable(team, X.STREET_OFF, X.STREET_DEF, 'street');
    } else {
      h += counterTable(X.STREET_OFF, X.STREET_DEF, 'street');
    }
    return h;
  };
  function curSt() { var t = W().userStreet(UI.S); return { team: t, pr: t.presets[UI.stac.preset] }; }
  A.stpreset = function (d) { UI.stac.preset = +d.i; UI.stac.slot = null; UI.render(); };
  A.stslot = function (d) {
    var s = +d.slot, c = curSt();
    if (UI.stac.slot === s) { c.pr.lineup[s] = null; UI.stac.slot = null; UI.persist(); }
    else if (UI.stac.slot != null) { var a = UI.stac.slot, tmp = c.pr.lineup[a]; c.pr.lineup[a] = c.pr.lineup[s]; c.pr.lineup[s] = tmp; UI.stac.slot = null; UI.persist(); }
    else UI.stac.slot = s;
    UI.render();
  };
  A.stbench = function (d) {
    var c = curSt(), s = UI.stac.slot;
    if (s == null) s = c.pr.lineup.findIndex(function (x) { return !x; });
    if (s == null || s < 0) { UI.sel = d.pid; UI.toast('先点击场上的一个位置，再点替补球员'); UI.renderCard(); return; }
    c.pr.lineup[s] = d.pid; UI.stac.slot = null; UI.sel = d.pid;
    UI.persist(); UI.render();
  };
  A.stname = function (d, el) { curSt().pr.name = el.value.trim() || '阵容'; UI.persist(); UI.render(); };
  A.stset = function (d, el) { var pr = curSt().pr; pr[d.f] = d.f === 'intensity' ? +el.value : el.value; UI.persist(); UI.render(); };
  A.stcfg = function (d, el) { curSt().team.config[d.f] = +el.value; UI.persist(); UI.render(); };
  A.stauto = function () { var c = curSt(); c.pr.lineup = E.autoLineup(W().teamPlayers(UI.S, c.team), 'street'); UI.persist(); UI.render(); };
})(window.XBA);
