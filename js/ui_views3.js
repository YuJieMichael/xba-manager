// 页面：职业联赛、街球杯赛、训练中心、胜者为王、我的比赛、比赛战报（文字直播）、每日战报
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, E = X.Engine, esc = U.esc;
  var W = function () { return X.World; };

  // ===== 职业联赛 =====
  UI.leagueView = null;
  V.league = function (arg) {
    var S = UI.S, pro = W().userPro(S);
    if (arg && String(arg).indexOf('video:') === 0) { UI.tab.league = 'video'; UI.videoTeam = arg.slice(6); UI.arg = null; }
    var lg = W().league(S, UI.leagueView || pro.leagueId) || W().league(S, pro.leagueId);
    var tab = UI.curTab('league', 'sched');
    var h = '<div class="lg-title">' + esc(lg.name) + (lg.id !== pro.leagueId ? '　' + UI.link('← 回到我的联赛', 'lgview', { id: pro.leagueId }) : '') + '</div>';
    h += UI.tabs('league', [['sched', '联赛赛程'], ['round', '上轮/本轮'], ['rank', '联赛排名'], ['po', '季后赛'], ['stats', '技术统计'], ['rivals', '宿敌'], ['pyramid', '等级示图'], ['video', '比赛录像']], tab);
    var round = W().roundOfDay(S.day);
    var played = lg.results.length;
    if (tab === 'sched') {
      var myLg = W().league(S, pro.leagueId);
      h += '<table class="grid"><tr><th>轮次</th><th>主队</th><th>比分</th><th>客队</th><th></th></tr>' + myLg.schedule.map(function (games, i) {
        var g = games.find(function (x) { return x[0] === pro.id || x[1] === pro.id; });
        if (!g) return '';
        var res = myLg.results[i] && myLg.results[i].find(function (r) { return r.h === g[0] && r.a === g[1]; });
        var cur = round === i + 1;
        var score = res ? '<b class="' + (((res.h === pro.id) === (res.hs > res.as)) ? 'win' : 'lose') + '">' + res.hs + ' : ' + res.as + '</b>' : (cur ? '<span class="tag">今天</span>' : 'VS');
        return '<tr class="' + (cur ? 'me' : '') + '"><td>第 ' + (i + 1) + ' 轮' + (i === 12 ? '<br><span class="muted small">之后休息一天</span>' : '') + '</td><td>' + UI.teamLink(S.teams[g[0]]) + '</td><td>' + score + '</td><td>' + UI.teamLink(S.teams[g[1]]) + '</td><td>' + (res && res.mid && S.matches[res.mid] ? UI.link('战报', 'go', { r: 'match', a: res.mid }) : '') + '</td></tr>';
      }).join('') + '</table><p class="muted small">赛程空缺会显示轮空，以 20:0 记你胜。一个赛季 26 轮，13 个主场、13 个客场。</p>';
    } else if (tab === 'round') {
      var last = lg.results[played - 1];
      h += UI.box('上轮结果' + (last ? '（第 ' + played + ' 轮）' : ''), last ? '<table class="grid">' + last.map(function (r) {
        return '<tr><td>' + UI.teamLink(S.teams[r.h]) + '</td><td><b>' + r.hs + ' : ' + r.as + '</b></td><td>' + UI.teamLink(S.teams[r.a]) + '</td><td>' + (r.mid && S.matches[r.mid] ? UI.link('战报', 'go', { r: 'match', a: r.mid }) : '') + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">本赛季还没有比赛</span>');
      var nr = played < 26 ? lg.schedule[played] : null;
      h += UI.box('本轮对阵' + (nr ? '（第 ' + (played + 1) + ' 轮）' : ''), nr ? '<table class="grid">' + nr.map(function (g) {
        return '<tr><td>' + UI.teamLink(S.teams[g[0]]) + '</td><td>VS</td><td>' + UI.teamLink(S.teams[g[1]]) + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">本赛季已结束</span>');
    } else if (tab === 'rank') {
      h += UI.standingsTable(S, W().standings(S, lg), false);
      h += '<p class="muted small">按胜场、净胜分、注册先后排列。' + (lg.level > 1 ? '前 2 名升级（绿色），' : '') + (lg.level < 4 ? '后 4 名降级（红色）。' : '后 4 名失去联赛资格（需重新申请）。') + '第一联赛冠军奖金 1 亿。</p>';
    } else if (tab === 'po') {
      h += UI.playoffsView(S, lg);
    } else if (tab === 'rivals') {
      h += UI.rivalsView(S);
    } else if (tab === 'stats') {
      var all = [];
      lg.teamIds.forEach(function (tid) { W().teamPlayers(S, S.teams[tid]).forEach(function (p) { if (p.stats.gp >= Math.max(1, Math.floor(played / 3))) all.push(p); }); });
      var cats = [['MVP', function (s) { return (s.pts + s.oreb + s.dreb + s.ast + s.stl + s.blk) / s.gp; }], ['得分', function (s) { return s.pts / s.gp; }], ['篮板', function (s) { return (s.oreb + s.dreb) / s.gp; }], ['助攻', function (s) { return s.ast / s.gp; }], ['抢断', function (s) { return s.stl / s.gp; }], ['封盖', function (s) { return s.blk / s.gp; }]];
      h += '<div class="statgrid">' + cats.map(function (c) {
        var top = all.slice().sort(function (a, b) { return c[1](b.stats) - c[1](a.stats); }).slice(0, 8);
        return UI.box(c[0] + '榜', '<table class="grid">' + top.map(function (p, i) {
          var t = S.teams[p.teamId];
          return '<tr class="' + (t.isUser ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + UI.pname(p) + '<br><span class="muted small">' + esc(t.name) + '</span></td><td><b>' + c[1](p.stats).toFixed(1) + '</b></td></tr>';
        }).join('') + '</table>');
      }).join('') + '</div><p class="muted small">MVP 榜综合了得分、篮板、助攻、抢断、封盖。赛季结束后 MVP 榜第一名的潜力可能获得小幅提升。</p>';
      var mine = W().teamPlayers(S, pro).filter(function (p) { return p.stats.gp; });
      h += UI.box('我的球员本赛季数据', boxTable(mine.map(function (p) { var s = Object.assign({ pid: p.id }, p.stats); return s; }), function (pid) { return S.players[pid]; }, true));
    } else if (tab === 'pyramid') {
      h += '<div class="pyramid">' + [1, 2, 3, 4].map(function (lv) {
        return '<div class="pyr-row">' + S.leagues.filter(function (l) { return l.level === lv; }).map(function (l) {
          var st = W().standings(S, l);
          return '<div class="pyr' + (l.id === pro.leagueId ? ' me' : '') + '" data-act="lgview" data-id="' + l.id + '"><b>' + esc(l.name) + '</b><span>领头：' + esc(st[0].name) + '</span></div>';
        }).join('') + '</div>';
      }).join('') + '</div><p class="muted small">XBA 联赛结构像金字塔：第一等级只有一个联赛，其冠军是 XBA 职业篮球联赛总冠军。点击方格查看该联赛。</p>';
    } else {
      var tid = UI.videoTeam || null;
      h += '<p>选择球队：<select data-change="videoteam"><option value="">--</option>' + lg.teamIds.map(function (id) { var t = S.teams[id]; return '<option value="' + id + '"' + (id === tid ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></p>';
      if (tid && S.teams[tid]) {
        var rows = [];
        var tlg = W().league(S, S.teams[tid].leagueId);
        tlg.results.forEach(function (rr, i) {
          var r = rr.find(function (x) { return x.h === tid || x.a === tid; });
          if (!r) return;
          var isH = r.h === tid, opp = S.teams[isH ? r.a : r.h];
          var tac = r.tac || [];
          var off = isH ? tac[0] : tac[2], def = isH ? tac[1] : tac[3];
          rows.push('<tr><td>第 ' + (i + 1) + ' 轮</td><td>' + (isH ? '主' : '客') + '</td><td>' + UI.teamLink(opp) + '</td><td><b>' + (isH ? r.hs + ':' + r.as : r.as + ':' + r.hs) + '</b></td><td>' + (off ? E.OFF[off].cn : '-') + '</td><td>' + (def ? E.DEF[def].cn : '-') + '</td><td>' + (r.mid && S.matches[r.mid] ? UI.link('战报', 'go', { r: 'match', a: r.mid }) : '') + '</td></tr>');
        });
        h += rows.length ? '<table class="grid"><tr><th>轮次</th><th>主客</th><th>对手</th><th>比分</th><th>主要进攻战术</th><th>主要防守战术</th><th></th></tr>' + rows.join('') + '</table>' : '<span class="muted">该队本赛季还没有比赛</span>';
        var t = S.teams[tid];
        if (!t.isUser) {
          var lu = t.boards.league.presets[0];
          h += UI.box('球探报告：' + esc(t.name), '<p>主力阵容：' + lu.lineup.map(function (id, s) { var p = S.players[id]; return p ? E.SLOT_NAMES.pro[s] + ' ' + UI.pname(p) + '(' + P.ovr(p).toFixed(0) + ')' : ''; }).join('，') + '</p>' +
            '<p>阵容状态：' + Math.round(W().lineupStatus(S, t) * 100) + '%　主力综合均值：' + U.avg(lu.lineup.map(function (id) { return S.players[id] ? P.ovr(S.players[id]) : 0; })).toFixed(1) + '</p>');
        }
      }
      h += '<p class="muted small">研究对手常用的战术，用相克的防守去限制他。</p>';
    }
    return h;
  };
  A.lgview = function (d) { UI.leagueView = d.id; UI.tab.league = 'rank'; UI.render(); };
  A.videoteam = function (d, el) { UI.videoTeam = el.value; UI.render(); };

  // ===== 技术统计表 =====
  function boxTable(lines, getP, perGame) {
    var h = '<table class="grid box"><tr><th>球员</th>' + (perGame ? '<th>场</th>' : '') + '<th>时间</th><th>得分</th><th>投篮</th><th>三分</th><th>罚球</th><th>前板</th><th>后板</th><th>助攻</th><th>抢断</th><th>盖帽</th><th>失误</th><th>犯规</th><th>效率</th></tr>';
    var tot = { min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 };
    lines.slice().sort(function (a, b) { return b.min - a.min; }).forEach(function (b) {
      var p = getP(b.pid);
      var g = perGame ? (b.gp || 1) : 1;
      var f = function (v) { return perGame ? U.r1(v / g) : v; };
      for (var k in tot) tot[k] += b[k] || 0;
      h += '<tr' + (b.min ? '' : ' class="muted"') + '><td>' + (p ? (p.id ? UI.pname(p) : esc(p.name)) : '?') + (p && p.pos ? ' <span class="muted small">' + p.pos + '</span>' : '') + '</td>' + (perGame ? '<td>' + b.gp + '</td>' : '') + '<td>' + f(b.min) + '</td><td><b>' + f(b.pts) + '</b></td><td>' + f(b.fgm) + '-' + f(b.fga) + '</td><td>' + f(b.tpm) + '-' + f(b.tpa) + '</td><td>' + f(b.ftm) + '-' + f(b.fta) + '</td><td>' + f(b.oreb) + '</td><td>' + f(b.dreb) + '</td><td>' + f(b.ast) + '</td><td>' + f(b.stl) + '</td><td>' + f(b.blk) + '</td><td>' + f(b.to) + '</td><td>' + f(b.pf) + '</td><td>' + f(b.eff || 0) + '</td></tr>';
    });
    if (!perGame) h += '<tr class="tot"><td>合计</td><td></td><td>' + tot.pts + '</td><td>' + tot.fgm + '-' + tot.fga + '（' + (tot.fga ? Math.round(tot.fgm / tot.fga * 100) : 0) + '%）</td><td>' + tot.tpm + '-' + tot.tpa + '</td><td>' + tot.ftm + '-' + tot.fta + '</td><td>' + tot.oreb + '</td><td>' + tot.dreb + '</td><td>' + tot.ast + '</td><td>' + tot.stl + '</td><td>' + tot.blk + '</td><td>' + tot.to + '</td><td>' + tot.pf + '</td><td></td></tr>';
    return h + '</table>';
  }
  UI.boxTable = boxTable;

  // ===== 比赛战报 / 文字直播 =====
  UI.live = null;
  V.match = function (id) {
    var S = UI.S, m = S.matches[id];
    if (!m) return '<div class="muted">比赛记录不存在（只保留最近 80 场）</div>';
    var tab = UI.curTab('match', 'log');
    var getP = function (pid) {
      var p = S.players[pid];
      if (p) return p;
      var n = m.names && m.names[pid];
      return n ? { name: n[0], pos: n[1] } : null;
    };
    var live = UI.live && UI.live.id === id;
    var idx = live ? UI.live.idx : (m.log ? m.log.length : 0);
    var cur = live && m.log && m.log[Math.max(0, idx - 1)];
    var hs = cur ? cur.hs : m.hs, as = cur ? cur.as : m.as;
    var h = '<div class="scoreboard"><div class="sb-team"><i class="jersey-sm" style="background:' + m.home.color + '"></i>' + esc(m.home.name) + '<span class="muted small">主</span></div>' +
      '<div class="sb-score" id="sb-score">' + hs + ' : ' + as + '</div><div class="sb-team"><i class="jersey-sm" style="background:' + m.away.color + '"></i>' + esc(m.away.name) + '<span class="muted small">客</span></div></div>';
    h += '<div class="sb-meta">' + (UI.TYPE_CN[m.type] || '') + (m.league ? ' · ' + esc(m.league) + ' 第' + m.round + '轮' : '') + (m.cup ? ' · ' + esc(m.cup) : '') + ' · 第' + m.season + '赛季第' + (m.day + 1) + '天' + (m.forfeit && m.forfeit.loser ? ' · <b class="red">人数不足提前结束</b>' : '') + '</div>';
    if (!live || idx >= (m.log || []).length) {
      h += '<table class="grid qs"><tr><th></th>' + m.qs.map(function (q, i) { return '<th>' + (i < 4 ? '第' + (i + 1) + '节' : '加时' + (i - 3)) + '</th>'; }).join('') + '<th>总分</th></tr>' +
        '<tr><td>' + esc(m.home.name) + '</td>' + m.qs.map(function (q) { return '<td>' + q[0] + '</td>'; }).join('') + '<td><b>' + m.hs + '</b></td></tr>' +
        '<tr><td>' + esc(m.away.name) + '</td>' + m.qs.map(function (q) { return '<td>' + q[1] + '</td>'; }).join('') + '<td><b>' + m.as + '</b></td></tr></table>';
    }
    if (m.proTP) h += '<div class="tip">职业队训练点 +' + m.proTP + '（当前共 ' + (UI.S.user.proTP || 0) + ' 点，到「球员训练 → 职业队」加点）</div>';
    if (m.tp && Object.keys(m.tp).length) h += '<div class="tip">训练点收获：' + Object.keys(m.tp).map(function (pid) { var p = getP(pid); return esc(p ? p.name : '?') + ' +' + m.tp[pid]; }).join('，') + '</div>';
    var hasShots = m.log && m.log.some(function (l) { return l.sh; });
    h += UI.tabs('match', [['log', live ? '🔴 现场文字直播' : '文字直播'], ['box', '技术统计']].concat(hasShots ? [['shots', '投篮分布']] : []), tab);
    if (tab === 'log') {
      if (!m.log) h += '<div class="muted">文字直播只保留最近 30 场比赛。</div>';
      else {
        if (live) h += '<div class="live-ctl">直播速度：' + [[1, '正常'], [4, '快'], [20, '极快']].map(function (s) { return UI.btn(s[1], 'livespeed', { s: s[0] }, 'sm' + (UI.live.speed === s[0] ? ' on' : '')); }).join(' ') + ' ' + UI.btn('跳到结尾', 'liveend', {}, 'sm') + '</div>';
        else h += '<div class="live-ctl">' + UI.btn('▶ 回放直播', 'livestart', { id: id }, 'sm') + '　<label><input type="checkbox" data-change="logfilter"' + (UI.logKey ? ' checked' : '') + '> 只看得分和关键事件</label></div>';
        var lines = m.log.slice(0, idx);
        if (UI.logKey && !live) lines = lines.filter(function (l) { return l.type === 'score' || l.type === 'q' || l.type === 'end' || l.type === 'inj' || l.type === 'tac' || l.type === 'blk'; });
        if (live && hasShots) {
          var lastSh = null; for (var li = idx - 1; li >= 0; li--) if (m.log[li].sh) { lastSh = m.log[li].sh; break; }
          h += '<div id="mini-court">' + UI.courtSvg(m, lastSh ? [lastSh] : [], lastSh ? lastSh[0] : 'h', true) + '</div>';
        }
        h += '<div class="log" id="live-log">' + lines.map(logLine).join('') + '</div>';
      }
    } else if (tab === 'shots' && hasShots) {
      var all = m.log.filter(function (l) { return l.sh; }).map(function (l) { return l.sh; });
      var stat = function (s) { var xs = all.filter(function (x) { return x[0] === s; }); var mk = xs.filter(function (x) { return x[3] === 1; }).length; return mk + '/' + xs.length + '（' + (xs.length ? Math.round(mk / xs.length * 100) : 0) + '%）'; };
      h += '<div class="court-legend"><span><i style="background:' + m.home.color + '"></i>' + esc(m.home.name) + ' 投中 ' + stat('h') + '，向右进攻</span><span><i style="background:' + m.away.color + '"></i>' + esc(m.away.name) + ' 投中 ' + stat('a') + '，向左进攻</span><span>● 投中　○ 不中　✕ 被盖</span></div>';
      h += UI.courtSvg(m, all, null, false);
    } else {
      h += UI.box(esc(m.home.name), boxTable(m.box.h, getP)) + UI.box(esc(m.away.name), boxTable(m.box.a, getP));
    }
    if (live) UI.afterRender = startLive;
    return h;
  };
  // 全场球场（94×50 英尺）：主队向右进攻，客队向左进攻
  UI.courtSvg = function (m, shots, offSide, players) {
    var line = 'stroke="#fff" stroke-width="0.35" fill="none"';
    var svg = '<svg class="court-svg" viewBox="0 0 94 50"><rect width="94" height="50" fill="#d9a15b"/>' +
      '<rect x="0.2" y="0.2" width="93.6" height="49.6" ' + line + '/><line x1="47" y1="0" x2="47" y2="50" ' + line + '/><circle cx="47" cy="25" r="6" ' + line + '/>';
    [[5.25, 1], [88.75, -1]].forEach(function (b) {
      var bx = b[0], d = b[1];
      svg += '<rect x="' + (d > 0 ? 0 : 75) + '" y="17" width="19" height="16" fill="#c98a45" ' + line.replace('fill="none"', '') + '/>' +
        '<path d="M' + (d > 0 ? 0 : 94) + ' 3 L' + (bx + d * 9) + ' 3 A 23.75 23.75 0 0 ' + (d > 0 ? 1 : 0) + ' ' + (bx + d * 9) + ' 47 L' + (d > 0 ? 0 : 94) + ' 47" ' + line + '/>' +
        '<circle cx="' + bx + '" cy="25" r="0.75" stroke="#f60" stroke-width="0.3" fill="none"/>';
    });
    function pos(side, dist, ang) {
      var bx = side === 'h' ? 88.75 : 5.25, dir = side === 'h' ? -1 : 1, a = ang * Math.PI / 180;
      return [Math.max(1, Math.min(93, bx + dir * dist * Math.cos(a))), Math.max(1, Math.min(49, 25 + dist * Math.sin(a)))];
    }
    if (players && offSide) {
      var form = [[6, 25], [12, -50], [20, 62], [23, -72], [25, 4]];
      form.forEach(function (f) {
        var j1 = (Math.random() - 0.5) * 6, j2 = (Math.random() - 0.5) * 16;
        var o = pos(offSide, f[0] + j1 * 0.4, f[1] + j2), dfn = pos(offSide, Math.max(1, f[0] + j1 * 0.4 - 3), f[1] + j2 * 0.8);
        svg += '<circle cx="' + dfn[0] + '" cy="' + dfn[1] + '" r="1.3" fill="' + (offSide === 'h' ? m.away.color : m.home.color) + '" stroke="#222" stroke-width="0.25" opacity="0.9"/>' +
          '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="1.3" fill="' + (offSide === 'h' ? m.home.color : m.away.color) + '" stroke="#222" stroke-width="0.25"/>';
      });
    }
    shots.forEach(function (s) {
      var p = pos(s[0], s[1], s[2]), c = s[0] === 'h' ? m.home.color : m.away.color;
      if (s[3] === 1) svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (players ? 1.4 : 0.9) + '" fill="' + c + '" stroke="#222" stroke-width="0.2"' + (players ? ' class="shot-pop"' : '') + '/>';
      else if (s[3] === 2) svg += '<path d="M' + (p[0] - 0.8) + ' ' + (p[1] - 0.8) + ' L' + (p[0] + 0.8) + ' ' + (p[1] + 0.8) + ' M' + (p[0] + 0.8) + ' ' + (p[1] - 0.8) + ' L' + (p[0] - 0.8) + ' ' + (p[1] + 0.8) + '" stroke="' + c + '" stroke-width="0.45"/>';
      else svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (players ? 1.2 : 0.8) + '" fill="none" stroke="' + c + '" stroke-width="0.35"/>';
      if (players) svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="0.7" fill="#f58426" stroke="#000" stroke-width="0.15"/>';
    });
    return svg + '</svg>';
  };
  function logLine(l) {
    return '<div class="ll ' + l.type + '"><span class="lt">' + (l.q < 4 ? 'Q' + (l.q + 1) : 'OT') + ' ' + l.t + '</span><span class="lx">' + esc(l.txt) + '</span><span class="ls">' + l.hs + ':' + l.as + '</span></div>';
  }
  function startLive() {
    clearInterval(UI._live);
    var L = UI.live;
    if (!L) return;
    var m = UI.S.matches[L.id];
    UI._live = setInterval(function () {
      if (!UI.live || UI.route !== 'match' || UI.arg !== L.id) { clearInterval(UI._live); return; }
      var box = document.getElementById('live-log');
      var n = Math.max(1, Math.round(L.speed / 2));
      for (var i = 0; i < n && L.idx < m.log.length; i++) {
        var l = m.log[L.idx++];
        if (box) { box.insertAdjacentHTML('beforeend', logLine(l)); }
        if (l.sh) { var mc = document.getElementById('mini-court'); if (mc) mc.innerHTML = UI.courtSvg(m, [l.sh], l.sh[0], true); }
        var sb = document.getElementById('sb-score'); if (sb) sb.textContent = l.hs + ' : ' + l.as;
      }
      if (box) box.scrollTop = box.scrollHeight;
      if (L.idx >= m.log.length) { clearInterval(UI._live); UI.live = null; UI.render(); }
    }, L.speed >= 20 ? 30 : L.speed >= 4 ? 90 : 420);
  }
  A.livespeed = function (d) { UI.live.speed = +d.s; startLive(); UI.render(); };
  A.liveend = function () { clearInterval(UI._live); UI.live = null; UI.render(); };
  A.livestart = function (d) { UI.live = { id: d.id, idx: 0, speed: 4 }; UI.tab.match = 'log'; UI.render(); };
  A.logfilter = function (d, el) { UI.logKey = el.checked; UI.render(); };

  // ===== 每日战报 =====
  V.report = function () {
    var S = UI.S, r = UI.lastReport;
    if (!r) return V.home();
    var h = '<div class="report-h">📰 ' + esc(r.label) + ' 战报</div>';
    if (r.userGame && S.matches[r.userGame]) {
      var m = S.matches[r.userGame];
      var pro = W().userPro(S), isH = m.home.id === pro.id, won = isH ? m.hs > m.as : m.as > m.hs;
      h += UI.box('职业联赛 第' + m.round + '轮', '<div class="big-result ' + (won ? 'win' : 'lose') + '">' + esc(m.home.name) + ' <b>' + m.hs + ' : ' + m.as + '</b> ' + esc(m.away.name) + '　' + (won ? '胜利！' : '失利') + '</div>' +
        '<p>' + UI.btn('🔴 观看现场文字直播', 'livestart2', { id: m.id }, 'big') + ' ' + UI.btn('查看技术统计', 'go', { r: 'match', a: m.id }) + '</p>');
    }
    if (r.xcupGames && r.xcupGames.length) {
      h += UI.box('XBA杯', r.xcupGames.map(function (g) { var m = S.matches[g.mid]; if (!m) return ''; var me = S.teams[m.home.id] && S.teams[m.home.id].isUser, won = me ? m.hs > m.as : m.as > m.hs; return '<div>' + esc(g.label) + '：' + esc(m.home.name) + ' <b class="' + (won ? 'win' : 'lose') + '">' + m.hs + ' : ' + m.as + '</b> ' + esc(m.away.name) + '　' + UI.link('战报', 'go', { r: 'match', a: m.id }) + '</div>'; }).join(''));
    }
    if (r.cupResults && r.cupResults.length) {
      h += UI.box('街球杯赛', r.cupResults.map(function (c) {
        return '<div>' + esc(c.name) + '：<b>' + c.place + '</b>' + (c.prize ? '，奖金 ' + U.money(c.prize) : '') + '　' + c.mids.map(function (id, i) { return UI.link('第' + (i + 1) + '场', 'go', { r: 'match', a: id }); }).join(' ') + '</div>';
      }).join(''));
    }
    if (r.allstar) h += UI.box('⭐ 全明星周末', '<p>本赛季全明星赛、三分大赛、扣篮大赛已经结束。</p><p>' + UI.btn('查看全明星周末', 'go', { r: 'allstar' }, 'big') + '</p>');
    if (r.seasonSummary) {
      h += UI.box('🏆 第 ' + r.seasonSummary.season + ' 赛季结束', r.seasonSummary.champions.map(function (c) { return '<div>' + esc(c.league) + ' 冠军：<b>' + esc(c.team) + '</b>' + (c.isUser ? ' 🎉' : '') + '</div>'; }).join(''));
    }
    var news = (r.news || []).slice(0, 30);
    h += UI.box('今日消息', news.map(function (m) { return '<div class="msg-line ' + m.type + '">' + esc(m.txt) + '</div>'; }).join('') || '<span class="muted">无</span>');
    h += '<p>' + UI.btn('返回俱乐部首页', 'go', { r: 'home' }) + '</p>';
    return h;
  };
  A.livestart2 = function (d) { UI.live = { id: d.id, idx: 0, speed: 1 }; UI.tab.match = 'log'; UI.go('match', d.id); };

  // ===== 街球杯赛 =====
  V.cups = function () {
    var S = UI.S;
    var NAMES = { newbie: '新人杯', small: '小杯赛', big: '大杯赛' };
    var DESC = { newbie: '为保护新人设置的杯赛，需持新人杯邀请函，街球等级必须为 1 级。', small: '不同街球等级的球队只能报名属于自己等级的小杯赛。', big: '每个赛季举行两次，不分等级都可报名，奖金丰厚。' };
    var h = '<p class="tip">街球杯赛在你点击「进入下一天」时进行（单场淘汰），比赛可获得<b>训练点</b>、资金奖励和街球积分。新人杯邀请函：<b>' + S.user.items.newbie + '</b> 张。街球等级：' + S.user.streetLevel + ' 级（积分 ' + S.user.streetPts + (X.STREET_LEVELS[S.user.streetLevel] ? ' / ' + X.STREET_LEVELS[S.user.streetLevel] : '') + '）</p>';
    h += '<table class="grid"><tr><th>杯赛</th><th>类型</th><th>参赛队</th><th>对手实力</th><th>冠军奖金</th><th>说明</th><th></th></tr>' + S.cups.map(function (c) {
      return '<tr><td><b>' + esc(c.name) + '</b></td><td>' + NAMES[c.type] + '</td><td>' + c.size + '</td><td>约 ' + Math.round(c.strength) + '</td><td>' + U.money(c.prize[0]) + '</td><td class="small">' + DESC[c.type] + '</td><td>' + (c.registered ? '<span class="tag ok">已报名</span>' : UI.btn('报名', 'cupreg', { id: c.id }, 'sm')) + '</td></tr>';
    }).join('') + '</table>';
    h += '<p class="muted small">你的街球队当前实力（场上三人平均综合）：' + X.Cups.streetPower(S).toFixed(1) + '。注意比赛会消耗体力，体力低于 80 容易受伤。</p>';
    return h;
  };
  A.cupreg = function (d) { UI.result(X.Cups.register(UI.S, d.id), '报名成功！杯赛将在进入下一天时进行'); };

  // ===== 训练中心 =====
  V.center = function () {
    var S = UI.S, tab = UI.curTab('center', 'train');
    var h = UI.tabs('center', [['train', '街球训练赛'], ['sfriend', '街球友谊赛'], ['show', '职业表演赛'], ['pfriend', '职业友谊赛']], tab);
    if (tab === 'train' || tab === 'sfriend') {
      var tr = tab === 'train';
      var ps = W().teamPlayers(S, W().userStreet(S));
      h += '<p class="tip">' + (tr ? '训练赛会消耗球员体力和心情，同时获得<b>训练点</b>用于训练街球球员。<br>' + UI.doubleWidget() : '友谊赛不消耗体力，但也没有训练点。可以用来测试战术。') + '</p>';
      h += '<p>' + UI.btn('全队理疗', 'physioall', { t: 'street' }, 'sm') + ' <span class="muted small">理疗卡 ' + S.user.items.physio + ' 张</span></p>';
      h += '<div class="muted small">街球队体力：' + ps.map(function (p) { return esc(p.name) + ' ' + Math.round(p.st); }).join('，') + '</div>';
      h += '<table class="grid"><tr><th>对手</th><th>实力</th><th></th></tr>' + X.Cups.trainOpponents(S).map(function (o) {
        var diff = o.ovr - X.Cups.streetPower(S);
        return '<tr><td>' + esc(o.name) + '</td><td>' + o.ovr.toFixed(1) + ' <span class="' + (diff > 2 ? 'red' : diff < -2 ? 'ok' : '') + '">' + (diff > 2 ? '较强' : diff < -2 ? '较弱' : '相当') + '</span></td><td>' + UI.btn(tr ? '训练赛' : '友谊赛', 'trainmatch', { id: o.id, f: tr ? '' : '1' }, 'sm') + '</td></tr>';
      }).join('') + '</table>';
    } else {
      var show = tab === 'show';
      var u = W().userPro(S);
      h += '<p class="tip">' + (show ? '表演赛胜利会获得资金奖励，并“抢”到对方部分球迷；失败将失去资金和球迷。会消耗体力，有受伤风险，请慎重！使用「表演赛/胜者为王战术板」。' : '职业友谊赛不消耗体力、无奖励，用来测试战术。使用「表演赛/胜者为王战术板」。') + '</p>';
      h += '<table class="grid"><tr><th>对手</th><th>联赛</th><th>主力综合</th><th>球迷</th><th></th></tr>' + X.Cups.proOpponents(S).map(function (t) {
        var lu = t.boards.league.presets[0].lineup;
        var av = U.avg(lu.map(function (id) { return S.players[id] ? P.ovr(S.players[id]) : 0; }));
        return '<tr><td>' + UI.teamLink(t) + '</td><td>' + esc(W().league(S, t.leagueId).name) + '</td><td>' + av.toFixed(1) + '</td><td>' + U.money(t.fans) + '</td><td>' + UI.btn(show ? '表演赛' : '友谊赛', 'promatch', { id: t.id, type: show ? 'show' : 'friendly' }, 'sm') + '</td></tr>';
      }).join('') + '</table>';
    }
    return h;
  };
  UI.doubleWidget = function () {
    var S = UI.S, on = X.Cups.doubleOn(S);
    return '<span class="dbl">' + (on ? '<b class="ok">双倍训练卡生效中（还剩 ' + X.Cups.doubleLeft(S) + ' 天）</b> ' : '') +
      UI.btn(on ? '再用一张（延长 3 天）' : '使用双倍训练卡', 'usedouble', {}, 'sm') + ' <span class="muted small">拥有 ' + (S.user.items.double || 0) + ' 张</span> ' +
      '<label class="small"><input type="checkbox" data-change="doubleauto"' + (S.user.doubleAuto ? ' checked' : '') + '> 到期自动续约（没卡时自动花 20 游戏币买）</label></span>';
  };
  A.usedouble = function () { var S = UI.S; UI.result(X.Cups.useDouble(S, false), '双倍训练卡生效，还剩 ' + X.Cups.doubleLeft(S) + ' 天'); };
  A.doubleauto = function (d, el) { UI.S.user.doubleAuto = el.checked; UI.result(null, el.checked ? '已开启自动续约' : '已关闭自动续约'); };
  A.trainmatch = function (d) {
    var r = X.Cups.trainingMatch(UI.S, d.id, !!d.f);
    if (r.err) return UI.toast(r.err, true);
    UI.persist();
    UI.toast(r.won ? '比赛胜利！' : '比赛失利');
    UI.tab.match = 'log'; UI.go('match', r.mid);
  };
  A.promatch = function (d) {
    var r = X.Cups.proMatch(UI.S, d.id, d.type);
    if (r.err) return UI.toast(r.err, true);
    UI.persist(); UI.toast(r.won ? '比赛胜利！' : '比赛失利');
    UI.tab.match = 'log'; UI.go('match', r.mid);
  };

  // ===== 胜者为王 =====
  V.wk = function () {
    var S = UI.S, wk = S.user.wk, today = S.user.wkDay === S.dayNo;
    var h = '<div class="wk-h">👑 胜者为王 <small>XBA 大陆最残酷的职业竞技场</small></div>';
    h += '<p class="tip">每次最多连续进行 9 场淘汰赛，系统按球队主力工资和匹配对手。连胜 3、6、9 场后可退出领取王者积分（1 积分 = 1 游戏币）；继续比赛一旦输球，积分清零。参赛阵容状态恒定 100%，不消耗体力。每天可参加一次。使用「表演赛/胜者为王战术板」。</p>';
    h += '<div class="wk-pts">取胜 1-3 场每场 1 分，4-6 场每场 2 分，7-9 场每场 4 分。累计王者积分：<b>' + S.user.wkPts + '</b></div>';
    if (!wk || wk.over || !today) {
      h += '<p>' + (today && wk ? '今天的挑战已结束（连胜 ' + wk.wins + ' 场）。明天再来！' : UI.btn('报名参加', 'wkstart', {}, 'big')) + '</p>';
    } else {
      var opp = S.teams[wk.opp];
      var lu = opp.boards.league.presets[0].lineup;
      h += '<div class="wk-status">当前连胜：<b>' + wk.wins + '</b> 场　本次积分：<b>' + wk.pts + '</b></div>';
      h += UI.box('下一个对手', UI.teamLink(opp) + '（' + esc(W().league(S, opp.leagueId).name) + '）主力综合 ' + U.avg(lu.map(function (id) { return S.players[id] ? P.ovr(S.players[id]) : 0; })).toFixed(1) +
        '<p>' + UI.btn('开始比赛', 'wkplay', {}, 'big') + ' ' + (wk.wins > 0 && wk.wins % 3 === 0 ? UI.btn('退出并领取 ' + wk.pts + ' 积分', 'wkclaim') : '') + '</p>');
    }
    if (wk && wk.games.length && today) {
      var ms = S.myMatches.map(function (id) { return S.matches[id]; }).filter(function (m) { return m && m.type === 'wk' && m.dayNo === S.dayNo; });
      h += UI.box('今日战绩', UI.matchList(S, ms));
    }
    return h;
  };
  A.wkstart = function () { UI.result(X.Cups.wkStart(UI.S)); };
  A.wkplay = function () {
    var r = X.Cups.wkPlay(UI.S);
    if (r.err) return UI.toast(r.err, true);
    UI.persist(); UI.toast(r.won ? '胜利！连胜继续' : '落败了……');
    UI.render();
  };
  A.wkclaim = function () { UI.result(X.Cups.wkClaim(UI.S), '积分已领取'); };

  // ===== 我的比赛 =====
  V.mymatches = function () {
    var S = UI.S, f = UI.curTab('mm', 'all');
    var list = S.myMatches.map(function (id) { return S.matches[id]; }).filter(function (m) { return m && (f === 'all' || m.type === f); });
    return UI.tabs('mm', [['all', '全部'], ['league', '职业联赛'], ['cup', '街球杯赛'], ['train', '训练赛'], ['friendly', '友谊赛'], ['show', '表演赛'], ['wk', '胜者为王'], ['xcup', 'XBA杯'], ['playoff', '季后赛'], ['challenge', '联盟挑战'], ['allstar', '全明星']], f) +
      (list.length ? UI.matchList(S, list) : '<span class="muted">暂无比赛</span>');
  };
})(window.XBA);
