// 亲自执教：联赛/季后赛比赛逐节进行，节间（或叫暂停时）换人、改战术
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, E = X.Engine, esc = U.esc;
  var W = function () { return X.World; };
  UI.coachGame = null;

  var origAdvance = A.advance;
  A.advance = function (d) {
    var S = UI.S;
    if (UI.coachGame) { UI.go('coach'); return; }
    if (S.user.liveCoach && !UI._confirmAdv) {
      var g = W().userGameToday(S);
      if (g) { startCoach(S, g); return; }
    }
    return origAdvance(d);
  };

  function startCoach(S, g) {
    var h = S.teams[g.h], a = S.teams[g.a], key = h.isUser ? 'h' : 'a';
    if (X.Coach.autoOn(S)) X.Coach.prepare(S, 'league', key === 'h' ? a.id : h.id);
    var G = E.start(W().sideCfg(S, h, 'league', { home: true }), W().sideCfg(S, a, 'league'), { kind: 'pro', log: true, injuries: true });
    G.timeouts += X.Manager.lv(S, 'timeout');
    if (X.Ops.life(S).energy < 30) G.timeouts = Math.max(1, G.timeouts - 1);
    UI.coachGame = { G: G, h: g.h, a: g.a, key: key, label: g.label };
    UI.go('coach');
  }
  UI.coachToggle = function (S) {
    return '<label class="small"><input type="checkbox" data-change="livecoach"' + (S.user.liveCoach ? ' checked' : '') + '> 🎮 亲自执教（联赛和季后赛逐节进行，节间可以换人、改战术、叫暂停）</label>';
  };
  A.livecoach = function (d, el) { UI.S.user.liveCoach = el.checked; UI.result(null, el.checked ? '已开启亲自执教：点「进入下一天」后进入比赛现场' : '已关闭亲自执教'); };

  function qLabel(st) {
    if (!st.inQuarter && st.q === 0) return '开赛前';
    if (!st.inQuarter) return (st.q <= 4 ? '第' + st.q + '节结束' : '加时结束');
    return (st.q < 4 ? '第' + (st.q + 1) + '节' : '加时赛') + ' ' + U.fmtTime(st.clock);
  }
  function topUsed(o) { var b = null, bv = -1; for (var k in o) if (o[k] > bv) { bv = o[k]; b = k; } return b; }

  V.coach = function () {
    var S = UI.S, C = UI.coachGame;
    if (!C) return '<div class="muted">现在没有进行中的比赛。</div>';
    var st = C.G.state(), me = st[C.key], op = st[C.key === 'h' ? 'a' : 'h'];
    var h = '<div class="scoreboard"><div class="sb-team"><i class="jersey-sm" style="background:' + st.h.color + '"></i>' + esc(st.h.name) + '<span class="muted small">主</span></div>' +
      '<div class="sb-score">' + st.h.pts + ' : ' + st.a.pts + '</div><div class="sb-team"><i class="jersey-sm" style="background:' + st.a.color + '"></i>' + esc(st.a.name) + '<span class="muted small">客</span></div></div>';
    h += '<div class="sb-meta">🎮 亲自执教 · ' + esc(C.label) + ' · <b>' + qLabel(st) + '</b> · 剩余暂停 ' + st.timeouts + ' 次</div>';
    if (st.qs.length) h += '<table class="grid qs"><tr><th></th>' + st.qs.map(function (q, i) { return '<th>' + (i < 4 ? '第' + (i + 1) + '节' : '加时') + '</th>'; }).join('') + '</tr><tr><td>' + esc(st.h.name) + '</td>' + st.qs.map(function (q) { return '<td>' + q[0] + '</td>'; }).join('') + '</tr><tr><td>' + esc(st.a.name) + '</td>' + st.qs.map(function (q) { return '<td>' + q[1] + '</td>'; }).join('') + '</tr></table>';
    // 操作按钮
    h += '<div class="coach-ctl">';
    if (st.done) h += '<b>比赛结束！</b> ' + UI.btn('完成比赛，进入下一天 ▶', 'coachfinish', {}, 'big');
    else {
      var nextQ = st.inQuarter ? (st.q < 4 ? '第' + (st.q + 1) + '节' : '加时') : (st.q < 4 ? '第' + (st.q + 1) + '节' : '加时赛');
      h += UI.btn('▶ 打完' + nextQ, 'coachrun', { s: 0 }, 'big');
      var clockNow = st.inQuarter ? st.clock : (st.q < 4 ? 720 : 300);
      if (st.timeouts > 0 && clockNow > 360 && st.q < 4) h += ' ' + UI.btn('打到 6:00 叫暂停', 'coachrun', { s: 360, t: 1 });
      h += ' ' + UI.btn('⏩ 剩下的自动打完', 'coachautorun', {}, 'sm');
    }
    h += '</div>';
    // 对手情报
    var ou = topUsed(op.used.off), du = topUsed(op.used.def);
    h += '<div class="tip">对手当前：进攻【' + E.OFF[op.preset.off].cn + '】防守【' + E.DEF[op.preset.def].cn + '】' + (ou ? '；本场用得最多的是进攻【' + E.OFF[ou].cn + '】、防守【' + E.DEF[du].cn + '】' : '') + '</div>';
    // 调整面板
    if (!st.done) {
      var pr = me.preset, avail = me.players.filter(function (p) { return !p.out; });
      h += UI.box('临场调整（' + (me.manual ? '当前是你的临场安排' : '当前按战术板') + '）', '<div class="coach-adj">' + E.SLOT_NAMES.pro.map(function (n, s) {
        var cur = me.court[s] || pr.lineup[s];
        return '<label>' + n + ' <select id="cl-' + s + '">' + avail.map(function (p) { return '<option value="' + p.id + '"' + (p.id === cur ? ' selected' : '') + '>' + p.num + ' ' + esc(p.name) + '（' + p.pos + ' 体' + Math.round(p.st) + (p.pf >= 4 ? ' 犯' + p.pf : '') + '）</option>'; }).join('') + '</select></label>';
      }).join('') +
        '<label>进攻 <select id="cl-off">' + X.OFF_TACTICS.map(function (t) { return '<option value="' + t.id + '"' + (pr.off === t.id ? ' selected' : '') + '>' + t.cn + '</option>'; }).join('') + '</select></label>' +
        '<label>防守 <select id="cl-def">' + X.DEF_TACTICS.map(function (t) { var c = Math.round(E.counter(op.preset.off, t.id) * 100); return '<option value="' + t.id + '"' + (pr.def === t.id ? ' selected' : '') + '>' + t.cn + '（对当前对手 ' + (c > 0 ? '+' : '') + c + '%）</option>'; }).join('') + '</select></label></div>' +
        '<p>' + UI.btn('应用调整', 'coachapply', {}, 'sm on') + ' ' + (me.manual ? UI.btn('交还战术板', 'coachreset', {}, 'sm') : '') + ' <span class="muted small">调整从下一个回合开始生效，一直保持到你再改或交还战术板。</span></p>');
    }
    // 球员数据
    var tbl = function (side, mine) {
      return '<table class="grid"><tr><th>球员</th><th>位置</th><th>时间</th><th>得分</th><th>篮板</th><th>助攻</th><th>犯规</th><th>体力</th></tr>' + side.players.slice().sort(function (x, y) { return y.b.pts - x.b.pts; }).map(function (p) {
        var on = side.court.indexOf(p.id) >= 0;
        return '<tr class="' + (on ? 'oncourt' : '') + (p.out ? ' muted' : '') + '"><td>' + (on ? '🟢 ' : '') + esc(p.name) + '</td><td>' + p.pos + '</td><td>' + p.min + '</td><td><b>' + p.b.pts + '</b></td><td>' + (p.b.oreb + p.b.dreb) + '</td><td>' + p.b.ast + '</td><td class="' + (p.pf >= 5 ? 'red' : '') + '">' + p.pf + '</td><td>' + UI.stam(p.st) + '</td></tr>';
      }).join('') + '</table>';
    };
    h += '<div class="cols2"><div>' + UI.box('我方 · ' + esc(me.name), tbl(me, true)) + '</div><div>' + UI.box('对手 · ' + esc(op.name), tbl(op, false)) + '</div></div>';
    var recent = st.log.slice(-14).reverse();
    h += UI.box('场上动态', recent.map(function (l) { return '<div class="ll ' + l.type + '"><span class="lt">' + (l.q < 4 ? 'Q' + (l.q + 1) : 'OT') + ' ' + l.t + '</span><span class="lx">' + esc(l.txt) + '</span><span class="ls">' + l.hs + ':' + l.as + '</span></div>'; }).join('') || '<span class="muted">比赛还没开始</span>');
    return h;
  };

  A.coachrun = function (d) {
    var C = UI.coachGame; if (!C) return;
    C.G.run(+d.s || 0);
    if (d.t && !C.G.done) { C.G.timeout(C.key); UI.toast('叫了暂停：双方场上球员体力 +4，可以趁机调整'); }
    UI.render();
  };
  A.coachautorun = function () { var C = UI.coachGame; if (!C) return; C.G.runAll(); UI.render(); };
  A.coachapply = function () {
    var C = UI.coachGame; if (!C) return;
    var lineup = [0, 1, 2, 3, 4].map(function (s) { return document.getElementById('cl-' + s).value; });
    if (new Set(lineup).size < 5) return UI.toast('同一名球员不能出现在两个位置', true);
    C.G.override(C.key, { name: '临场', lineup: lineup, off: document.getElementById('cl-off').value, def: document.getElementById('cl-def').value, core: -1, mark: -1 });
    UI.toast('调整已生效'); UI.render();
  };
  A.coachreset = function () { var C = UI.coachGame; if (!C) return; C.G.override(C.key, null); UI.render(); };
  A.coachfinish = function () {
    var C = UI.coachGame; if (!C || !C.G.done) return;
    UI._pre = { h: C.h, a: C.a, res: C.G.result };
    UI.coachGame = null;
    UI._confirmAdv = false;
    origAdvance({});
  };
})(window.XBA);
