// 页面：数据中心（球队走势、球员成长、赛季总结）、成就、首页赛季目标
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
  UI.charts = {};

  // ===== 折线图（单一 y 轴，悬停显示十字线和数值）=====
  function niceTicks(min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    var step = Math.pow(10, Math.floor(Math.log10((max - min) / n)));
    var err = (max - min) / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var t = [], s = Math.floor(min / step) * step;
    for (var v = s; ; v += step) { t.push(Math.round(v * 1000) / 1000); if (v >= max - 1e-9) break; }
    return t;
  }
  UI.lineChart = function (id, cfg) {
    var w = 640, h = cfg.h || 220, m = { l: 52, r: cfg.legendRight ? 90 : 16, t: 12, b: 26 };
    var pts = [];
    cfg.series.forEach(function (s) { s.points.forEach(function (p) { pts.push(p); }); });
    if (!pts.length) return '<div class="muted">还没有数据，过几天再来看。</div>';
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x0 === x1) x1 = x0 + 1;
    var ticks = niceTicks(cfg.yMin != null ? Math.min(cfg.yMin, Math.min.apply(null, ys)) : Math.min.apply(null, ys), Math.max.apply(null, ys), 4);
    var y0 = ticks[0], y1 = ticks[ticks.length - 1];
    var sx = function (x) { return m.l + (x - x0) / (x1 - x0) * (w - m.l - m.r); };
    var sy = function (y) { var f = (y - y0) / (y1 - y0 || 1); return cfg.invert ? m.t + f * (h - m.t - m.b) : h - m.b - f * (h - m.t - m.b); };
    var fmt = cfg.fmt || function (v) { return String(v); };
    var svg = '<svg class="lc" viewBox="0 0 ' + w + ' ' + h + '" data-chart="' + id + '">';
    ticks.forEach(function (t) {
      svg += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + sy(t) + '" y2="' + sy(t) + '" class="lc-grid"/><text x="' + (m.l - 6) + '" y="' + (sy(t) + 4) + '" class="lc-ax" text-anchor="end">' + fmt(t) + '</text>';
    });
    // 赛季分隔线
    (cfg.marks || []).forEach(function (mk) {
      if (mk.x <= x0 || mk.x >= x1) return;
      svg += '<line x1="' + sx(mk.x) + '" x2="' + sx(mk.x) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" class="lc-mark"/><text x="' + (sx(mk.x) + 3) + '" y="' + (h - 8) + '" class="lc-ax">' + mk.label + '</text>';
    });
    cfg.series.forEach(function (s) {
      if (!s.points.length) return;
      var d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); }).join('');
      svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
      if (cfg.legendRight) {
        var last = s.points[s.points.length - 1];
        svg += '<text x="' + (sx(last[0]) + 6) + '" y="' + (sy(last[1]) + 4) + '" class="lc-lab">' + esc(s.name) + '</text>';
      }
    });
    svg += '<line class="lc-cross" x1="0" x2="0" y1="' + m.t + '" y2="' + (h - m.b) + '" style="display:none"/></svg>';
    UI.charts[id] = { cfg: cfg, sx: sx, sy: sy, x0: x0, x1: x1, w: w, h: h, m: m, fmt: fmt };
    var legend = cfg.series.length > 1 ? '<div class="lc-legend">' + cfg.series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="lc-wrap">' + legend + '<div class="lc-box">' + svg + '<div class="lc-tip" style="display:none"></div></div></div>';
  };
  function onMove(e) {
    var svg = e.target.closest && e.target.closest('svg.lc');
    if (!svg) return;
    var ch = UI.charts[svg.getAttribute('data-chart')];
    if (!ch) return;
    var r = svg.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width * ch.w;
    var xv = ch.x0 + (px - ch.m.l) / (ch.w - ch.m.l - ch.m.r) * (ch.x1 - ch.x0);
    var rows = [], snapX = null;
    ch.cfg.series.forEach(function (s) {
      var best = null, bd = 1e9;
      s.points.forEach(function (p) { var dd = Math.abs(p[0] - xv); if (dd < bd) { bd = dd; best = p; } });
      if (best) { rows.push({ s: s, p: best }); if (snapX == null) snapX = best[0]; }
    });
    if (snapX == null) return;
    var cross = svg.querySelector('.lc-cross');
    cross.style.display = ''; cross.setAttribute('x1', ch.sx(snapX)); cross.setAttribute('x2', ch.sx(snapX));
    var tip = svg.parentNode.querySelector('.lc-tip');
    tip.style.display = '';
    tip.innerHTML = '<div class="lc-tt">' + (ch.cfg.xLabel ? ch.cfg.xLabel(snapX) : snapX) + '</div>' + rows.map(function (x) {
      return '<div><i style="background:' + x.s.color + '"></i>' + esc(x.s.name) + ' <b>' + ch.fmt(x.p[1]) + '</b></div>';
    }).join('');
    var left = ch.sx(snapX) / ch.w * r.width;
    tip.style.left = Math.min(r.width - 150, Math.max(0, left + 10)) + 'px';
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchstart', function (e) { if (e.touches[0]) onMove({ target: e.target, clientX: e.touches[0].clientX }); }, { passive: true });
  document.addEventListener('mouseout', function (e) {
    var svg = e.target.closest && e.target.closest('svg.lc');
    if (!svg || (e.relatedTarget && svg.contains(e.relatedTarget))) return;
    svg.querySelector('.lc-cross').style.display = 'none';
    var tip = svg.parentNode.querySelector('.lc-tip'); if (tip) tip.style.display = 'none';
  });

  function dayLabel(S) {
    var map = {};
    (S.user.hist || []).forEach(function (h) { map[h.n] = h; });
    return function (n) { var h = map[n]; if (!h) return '第' + n + '天'; var r = W().roundOfDay(h.d); return '第' + h.s + '赛季 ' + (r ? '第' + r + '轮' : '休息日'); };
  }
  function seasonMarks(S) {
    var out = [], seen = {};
    (S.user.hist || []).forEach(function (h) { if (!seen[h.s]) { seen[h.s] = 1; out.push({ x: h.n, label: '第' + h.s + '季' }); } });
    return out;
  }

  // ===== 数据中心 =====
  V.datacenter = function () {
    var S = UI.S, tab = UI.curTab('dc', 'team');
    var h = UI.tabs('dc', [['team', '球队走势'], ['players', '球员成长'], ['seasons', '赛季总结']], tab);
    var hist = S.user.hist || [];
    if (tab === 'team') {
      if (hist.length < 2) return h + '<div class="muted">数据中心从现在开始记录，每进入下一天记一次。过几天再来看走势。</div>';
      var xl = dayLabel(S), marks = seasonMarks(S);
      var line = function (key) { return hist.map(function (x) { return [x.n, x[key]]; }); };
      h += UI.box('阵容实力（综合均值）', UI.lineChart('dc-ovr', { series: [{ name: '职业队前 8 人', color: SERIES[0], points: line('ovr') }, { name: '街球队前 3 人', color: SERIES[1], points: line('st') }], fmt: function (v) { return U.r1(v); }, xLabel: xl, marks: marks }));
      h += UI.box('联赛排名', UI.lineChart('dc-rank', { series: [{ name: '排名', color: SERIES[0], points: line('rank') }], invert: true, yMin: 1, fmt: function (v) { return v < 1 ? '' : '第' + Math.round(v) + '名'; }, xLabel: xl, marks: marks }) + '<div class="muted small">越靠上名次越好。换联赛（升降级）后排名重新计算。</div>');
      h += UI.box('球队资金', UI.lineChart('dc-money', { series: [{ name: '资金', color: SERIES[0], points: line('money') }], fmt: function (v) { return U.wan(v); }, xLabel: xl, marks: marks }));
      h += UI.box('球迷人数', UI.lineChart('dc-fans', { series: [{ name: '球迷', color: SERIES[0], points: line('fans') }], fmt: function (v) { return U.wan(v); }, xLabel: xl, marks: marks }));
    } else if (tab === 'players') {
      var mine = W().teamPlayers(S, W().userPro(S)).concat(W().teamPlayers(S, W().userStreet(S)));
      if (!UI.dcSel) UI.dcSel = mine.slice().sort(function (a, b) { return P.ovr(b) - P.ovr(a); }).slice(0, 3).map(function (p) { return p.id; });
      UI.dcSel = UI.dcSel.filter(function (id) { return S.players[id]; });
      h += '<div class="dc-pick">选择球员（最多 5 名）：' + mine.map(function (p) {
        var on = UI.dcSel.indexOf(p.id) >= 0;
        var t = S.teams[p.teamId];
        return '<label class="dc-chip' + (on ? ' on' : '') + '"><input type="checkbox" data-change="dcpick" data-pid="' + p.id + '"' + (on ? ' checked' : '') + '>' + esc(p.name) + ' <span class="muted small">' + (t.kind === 'pro' ? '职业' : '街球') + '</span></label>';
      }).join('') + '</div>';
      var series = UI.dcSel.map(function (id, i) { var p = S.players[id]; return { name: p.name, color: SERIES[i], points: (p.oh || []) }; });
      h += UI.box('综合能力成长', UI.lineChart('dc-p', { series: series, fmt: function (v) { return U.r1(v); }, xLabel: dayLabel(S), marks: seasonMarks(S), legendRight: true, h: 260 }));
      h += UI.box('当前能力对比', '<table class="grid"><tr><th>能力</th>' + UI.dcSel.map(function (id, i) { return '<th><i class="dot" style="background:' + SERIES[i] + '"></i>' + esc(S.players[id].name) + '</th>'; }).join('') + '</tr>' +
        ['综合'].concat(X.ATTRS).map(function (k) {
          return '<tr><td>' + (k === '综合' ? '<b>综合</b>' : X.ATTR_CN[k]) + '</td>' + UI.dcSel.map(function (id) { var p = S.players[id]; return '<td>' + (k === '综合' ? UI.ovrTag(P.ovr(p)) : p.a[k].toFixed(1)) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table>');
    } else {
      var ss = (S.user.seasons || []).slice().reverse();
      h += ss.length ? '<table class="grid"><tr><th>赛季</th><th>联赛</th><th>排名</th><th>战绩</th><th>得失分</th><th>净利润</th><th>球迷</th><th>XBA杯</th></tr>' + ss.map(function (x) {
        return '<tr><td>第 ' + x.s + ' 赛季</td><td>' + esc(x.league) + '</td><td>第 ' + x.rank + ' 名</td><td>' + x.w + ' 胜 ' + x.l + ' 负</td><td>' + x.pf + ' / ' + x.pa + '</td><td class="' + (x.net < 0 ? 'red' : 'ok') + '">' + U.money(x.net) + '</td><td>' + U.money(x.fans) + '</td><td>' + esc(x.xcup || '-') + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">打完一个赛季后这里会有总结。</span>';
    }
    return h;
  };
  A.dcpick = function (d, el) {
    var i = UI.dcSel.indexOf(d.pid);
    if (el.checked && i < 0) { if (UI.dcSel.length >= 5) { el.checked = false; return UI.toast('最多比较 5 名球员', true); } UI.dcSel.push(d.pid); }
    if (!el.checked && i >= 0) UI.dcSel.splice(i, 1);
    UI.render();
  };

  // ===== 成就（荣誉室新标签）=====
  V.achievements = function () {
    var S = UI.S, got = S.user.ach || {};
    var n = Object.keys(got).length;
    return '<div class="sumline">已达成 <b>' + n + '</b> / ' + X.Goals.ACH.length + ' 个成就</div><div class="ach">' + X.Goals.ACH.map(function (a) {
      var g = got[a.id];
      return '<div class="ach-c' + (g ? ' on' : '') + '"><div class="ach-n">' + (g ? '🏅' : '🔒') + ' ' + a.cn + '</div><div class="small">' + a.desc + '</div><div class="muted small">' + (g ? '第 ' + g.season + ' 赛季达成' : '奖励 ' + a.coins + ' 游戏币') + '</div></div>';
    }).join('') + '</div>';
  };

  // ===== 赛季目标（首页）=====
  UI.goalsBox = function (S) {
    var gs = S.user.goals;
    if (!gs || gs.season !== S.season) return '';
    return UI.box('🎯 第 ' + S.season + ' 赛季目标', '<table class="grid"><tr><th>目标</th><th>进度</th><th>奖励</th><th>状态</th></tr>' + gs.list.map(function (g) {
      return '<tr><td>' + esc(g.cn) + '</td><td class="small">' + esc(X.Goals.progress(S, g)) + '</td><td class="small">' + X.Goals.rewardText(g.reward) + '</td><td>' + (g.done ? '<span class="tag ok">已完成</span>' : g.failed ? '<span class="tag red">未完成</span>' : '<span class="tag">进行中</span>') + '</td></tr>';
    }).join('') + '</table>');
  };
})(window.XBA);
