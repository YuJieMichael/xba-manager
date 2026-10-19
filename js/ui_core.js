// 界面框架：布局、导航、状态栏、球员卡、事件分发
(function (X) {
  var U = X.U, P = X.P;
  var UI = { S: null, route: 'home', arg: null, tab: {}, sel: null, views: {}, acts: {}, flash: null };
  X.UI = UI;
  var W = function () { return X.World; };
  var esc = U.esc;

  UI.NAV = [
    { title: '俱乐部', short: '俱乐部', icon: '🏠', items: [['home', '俱乐部首页'], ['msgs', '系统消息'], ['trophies', '荣誉室']] },
    { title: '球队管理', icon: '👥', items: [['players', '球员管理'], ['training', '球员训练'], ['staff', '职员管理'], ['arena', '球场建设'], ['finance', '球队财政']] },
    { title: '战术设定', icon: '📋', items: [['tac_pro', '职业战术'], ['tac_street', '街球战术']] },
    { title: '赛程管理', icon: '🏆', items: [['league', '职业联赛'], ['xcup', 'XBA杯'], ['cups', '街球杯赛']] },
    { title: '竞技中心', icon: '🏀', items: [['center', '训练中心'], ['wk', '胜者为王'], ['mymatches', '我的比赛']] },
    { title: '转会市场', icon: '💰', items: [['market', '转会市场'], ['draft', '职业选秀']] },
    { title: '其他', icon: '🛒', items: [['shop', '道具商店'], ['manual', '经理手册'], ['settings', '存档设置']] }
  ];

  // ===== 小组件 =====
  UI.btn = function (label, act, data, cls) {
    var d = '';
    for (var k in data || {}) d += ' data-' + k + '="' + esc(data[k]) + '"';
    return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + d + '>' + label + '</button>';
  };
  UI.link = function (label, act, data, cls) {
    var d = '';
    for (var k in data || {}) d += ' data-' + k + '="' + esc(data[k]) + '"';
    return '<a href="javascript:void(0)" class="lnk ' + (cls || '') + '" data-act="' + act + '"' + d + '>' + label + '</a>';
  };
  UI.tabs = function (key, list, cur) {
    return '<div class="tabs">' + list.map(function (t) {
      return '<span class="tab' + (t[0] === cur ? ' on' : '') + '" data-act="tab" data-key="' + key + '" data-val="' + t[0] + '">' + t[1] + '</span>';
    }).join('') + '</div>';
  };
  UI.curTab = function (key, def) { return UI.tab[key] || def; };
  UI.box = function (title, html, extra) {
    return '<div class="box"><div class="box-h">' + title + (extra ? '<span class="box-x">' + extra + '</span>' : '') + '</div><div class="box-b">' + html + '</div></div>';
  };
  UI.pname = function (p, opt) {
    if (!p) return '-';
    var cls = 'pn' + (p.green ? ' green' : '') + (p.inj > 0 ? ' injured' : '');
    return '<a href="javascript:void(0)" class="' + cls + '" data-act="selp" data-pid="' + p.id + '">' + esc(p.name) + '</a>' + UI.starBadge(p) + (p.inj > 0 ? '<span class="tag red" title="' + esc(p.injName) + '">伤' + p.inj + '</span>' : '');
  };
  UI.starBadge = function (p) { return p && p.star ? '<span class="pstar" title="升星 ' + p.star + ' 星">' + p.star + '★</span>' : ''; };
  UI.teamLink = function (t) {
    if (!t) return '-';
    return '<span class="tm' + (t.isUser ? ' me' : '') + '"><i class="dot" style="background:' + t.color + '"></i>' + esc(t.name) + '</span>';
  };
  UI.stam = function (v) {
    v = Math.round(v);
    return '<span class="' + (v >= 80 ? 'ok' : v >= 60 ? 'warn' : 'bad') + '">' + v + '</span>';
  };
  // 综合颜色：60 绿、70 蓝、80 紫、90 橙、100 红
  UI.ovrTag = function (v) {
    var c = v >= 100 ? 'o100' : v >= 90 ? 'o90' : v >= 80 ? 'o80' : v >= 70 ? 'o70' : v >= 60 ? 'o60' : '';
    return '<span class="ovrc ' + c + '">' + v.toFixed(1) + '</span>';
  };
  UI.stars = function (n) { return '<span class="stars" title="潜力星级 ' + n + '/10">' + '★'.repeat(Math.ceil(n / 2)) + '</span>'; };
  UI.money = function (v) { return '<span class="money">' + U.money(v) + '</span>'; };

  // 简易头像（像素风小人）
  UI.avatar = function (p, color, size) {
    size = size || 64;
    var skin = ['#f2c9a0', '#d9a273', '#a86b3c', '#6e4424'][(p.id.charCodeAt(p.id.length - 1)) % 4];
    var hair = ['#222', '#5a3a1a', '#111', '#8a5a2a', '#333'][(p.id.charCodeAt(1) || 0) % 5];
    var c = color || '#c8102e';
    var light = c.toLowerCase() === '#f0f0f0' || c.toLowerCase() === '#fdb927';
    return '<svg class="avatar" width="' + size + '" height="' + Math.round(size * 1.15) + '" viewBox="0 0 40 46">' +
      '<rect x="0" y="0" width="40" height="46" fill="#7ec4e8"/><rect x="0" y="34" width="40" height="12" fill="#e9c58c"/>' +
      '<rect x="14" y="4" width="12" height="13" rx="3" fill="' + skin + '"/><rect x="13" y="3" width="14" height="4" rx="2" fill="' + hair + '"/>' +
      '<rect x="16" y="9" width="2" height="2" fill="#222"/><rect x="22" y="9" width="2" height="2" fill="#222"/><rect x="18" y="13" width="4" height="1" fill="#a33"/>' +
      '<rect x="11" y="17" width="18" height="15" rx="2" fill="' + c + '"/><rect x="8" y="18" width="4" height="10" fill="' + skin + '"/><rect x="28" y="18" width="4" height="10" fill="' + skin + '"/>' +
      '<text x="20" y="28" font-size="8" text-anchor="middle" fill="' + (light ? '#222' : '#fff') + '" font-family="Arial" font-weight="bold">' + (p.num || 0) + '</text>' +
      '<rect x="12" y="32" width="16" height="5" fill="' + c + '"/><rect x="13" y="37" width="5" height="6" fill="' + skin + '"/><rect x="22" y="37" width="5" height="6" fill="' + skin + '"/>' +
      '<rect x="12" y="43" width="7" height="3" fill="#fff"/><rect x="21" y="43" width="7" height="3" fill="#fff"/></svg>';
  };

  // 属性条：颜色代表潜力（会员到队 1 天即可显示）
  UI.attrRows = function (S, p) {
    var vis = P.potVisible(S, p);
    return '<table class="attrs">' + X.ATTRS.map(function (k) {
      var v = p.a[k], gap = p.m[k] - v, band = P.potBand(gap);
      var color = vis ? X.POT_COLORS[band] : '#3aa33a';
      var tip = vis ? '潜力差值 ' + (band === 0 ? '>25' : X.POT_BANDS[band] + '~' + X.POT_BANDS[band - 1]) : '潜力未知（到队后可见）';
      return '<tr><td class="an">' + X.ATTR_CN[k] + '</td><td class="ab" title="' + tip + '"><div class="bar"><i style="width:' + U.clamp(v, 0, 100) + '%;background:' + (v > 100 ? 'linear-gradient(90deg,#f7c600,#ff7a00,#d0202e)' : color) + '"></i></div></td><td class="av' + (v > 100 ? ' over' : '') + '">' + v.toFixed(1) + '</td></tr>';
    }).join('') + (function () {
      var o = P.ovr(p), om = P.ovr(p, null, true);
      return '<tr class="ovr-row"><td class="an"><b>综合</b></td><td class="ab" title="按 ' + p.pos + ' 位置加权"><div class="bar"><i style="width:' + U.clamp(o, 0, 100) + '%;background:' + (o > 100 ? 'linear-gradient(90deg,#f7c600,#ff7a00,#d0202e)' : '#b4431a') + '"></i></div></td><td class="av' + (o > 100 ? ' over' : '') + '"><b>' + UI.ovrTag(o) + '</b></td></tr>';
    })() + '</table>';
  };

  UI.card = function () {
    var S = UI.S, p = UI.sel && S.players[UI.sel];
    if (!p) return '<div class="card-empty">点击球员名字<br>查看详细信息</div>';
    var t = p.teamId && S.teams[p.teamId];
    var mine = t && t.isUser, street = t && t.kind === 'street';
    var tab = UI.curTab('card', 'ab');
    var h = '<div class="card"><span class="card-x" data-act="closecard">✕ 关闭</span><div class="card-top">' + UI.avatar(p, t ? t.color : '#888', 64) +
      '<div class="card-info"><div class="card-name' + (p.green ? ' green' : '') + '">' + esc(p.name) + '</div>' +
      '<div>年龄 <b title="生日：每赛季第 ' + p.bday + ' 轮">' + p.age + '</b> [' + p.bday + ']</div>' +
      (street ? '<div>训练点 <b>' + p.tp + '</b></div>' : '<div>薪水 <b>' + U.money(p.salary) + '</b></div>') +
      '<div>位置 <b>' + p.pos + '</b> 号码 <b>' + p.num + '</b></div>' +
      '<div>身高 ' + p.h + 'CM</div><div>体重 ' + p.w + 'KG</div>' +
      '<div>体力 ' + UI.stam(p.st) + (street ? ' 心情 ' + UI.stam(p.mood) : '') + '</div>' +
      '<div>综合 <b class="ovr">' + UI.ovrTag(P.ovr(p)) + '</b></div>' + (p.star ? '<div>升星 <span class="pstar">' + '★'.repeat(p.star) + '</span></div>' : '') + '</div></div>';
    h += '<div class="card-meta">' + (t ? UI.teamLink(t) : '<span class="muted">自由球员</span>') +
      (!street && t ? ' · 合同 ' + p.contract + ' 轮' : '') + (P.potVisible(S, p) || p.seen.pot ? ' · ' + UI.stars(P.stars(p)) : '') + (p.scoutGrade != null && X.Market.GRADES[p.scoutGrade] ? ' <span class="grade" title="球探潜力评价" style="background:' + X.Market.GRADES[p.scoutGrade].c + '">' + X.Market.GRADES[p.scoutGrade].cn + '</span>' : '') +
      (p.inj > 0 ? '<div class="red">伤病：' + esc(p.injName) + '，还需 ' + p.inj + ' 轮</div>' : '') + '</div>';
    h += '<div class="minitabs">' + [['ab', '能力'], ['st', '统计'], ['hi', '履历']].map(function (x) {
      return '<span class="' + (tab === x[0] ? 'on' : '') + '" data-act="tab" data-key="card" data-val="' + x[0] + '">' + x[1] + '</span>';
    }).join('|') + '</div>';
    if (tab === 'ab') {
      h += UI.attrRows(S, p);
      if (p.seen.hidden) {
        h += '<table class="attrs hidden-attrs">' + [['进攻意识', p.iq.off], ['防守意识', p.iq.def], ['团队意识', p.iq.team], ['领导能力', p.lead], ['毅力', p.will]].map(function (x) {
          return '<tr><td class="an">' + x[0] + '</td><td class="ab"><div class="bar"><i style="width:' + x[1] + '%;background:#7a5cc4"></i></div></td><td class="av">' + x[1].toFixed(1) + '</td></tr>';
        }).join('') + '</table>';
      }
    } else if (tab === 'st') {
      var s = p.stats, g = s.gp || 1;
      h += '<table class="mini"><tr><th>场次</th><th>分钟</th><th>得分</th><th>篮板</th><th>助攻</th></tr><tr><td>' + s.gp + '</td><td>' + U.r1(s.min / g) + '</td><td>' + U.r1(s.pts / g) + '</td><td>' + U.r1((s.oreb + s.dreb) / g) + '</td><td>' + U.r1(s.ast / g) + '</td></tr>' +
        '<tr><th>抢断</th><th>盖帽</th><th>投篮%</th><th>三分%</th><th>罚球%</th></tr><tr><td>' + U.r1(s.stl / g) + '</td><td>' + U.r1(s.blk / g) + '</td><td>' + (s.fga ? Math.round(s.fgm / s.fga * 100) : 0) + '</td><td>' + (s.tpa ? Math.round(s.tpm / s.tpa * 100) : 0) + '</td><td>' + (s.fta ? Math.round(s.ftm / s.fta * 100) : 0) + '</td></tr></table>' +
        '<div class="muted small">本赛季职业联赛场均数据</div>';
    } else {
      if (p.awards && p.awards.length) h += '<div class="hof-a">' + p.awards.map(function (a) { return '<span class="tag">🏅' + esc(a) + '</span>'; }).join('') + '</div>';
      h += p.career.length ? '<table class="mini"><tr><th>赛季</th><th>球队</th><th>场</th><th>分</th><th>板</th><th>助</th></tr>' + p.career.slice().reverse().map(function (c) {
        var g = c.stats.gp || 1;
        return '<tr><td>' + c.season + '</td><td>' + esc(c.team) + '</td><td>' + c.stats.gp + '</td><td>' + U.r1(c.stats.pts / g) + '</td><td>' + U.r1((c.stats.oreb + c.stats.dreb) / g) + '</td><td>' + U.r1(c.stats.ast / g) + '</td></tr>';
      }).join('') + '</table>' : '<div class="muted">暂无履历</div>';
    }
    if (mine) {
      h += '<div class="card-acts">';
      if (!p.seen.hidden) h += UI.btn('查看隐藏属性', 'hidden', { pid: p.id }, 'sm');
      h += UI.btn('修改', 'editp', { pid: p.id }, 'sm');
      h += UI.btn('谈话', 'talk', { pid: p.id }, 'sm');
      if (S.user.items.physio > 0) h += UI.btn('理疗', 'physio', { pid: p.id }, 'sm');
      if (!street) h += X.Awards.inHof(S, p.id) ? UI.btn('更新名人堂', 'hofadd', { pid: p.id }, 'sm') : UI.btn('入选名人堂', 'hofadd', { pid: p.id }, 'sm');
      if (!street && P.isMaxed(p) && (p.star || 0) < X.STAR_MAX) h += UI.btn('升星', 'starup', { pid: p.id }, 'sm on');
      h += '</div>';
    }
    return h + '</div>';
  };

  // ===== 状态栏 =====
  UI.status = function () {
    var S = UI.S, pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var unread = S.msgs.filter(function (m) { return !m.read; }).length;
    return '<div class="st-l"><div class="st-date">' + W().dayLabel(S) + '</div><div class="muted small">' + esc(S.user.manager) + ' 经理</div></div>' +
      '<div class="st-m"><div>职业队：' + UI.teamLink(pro) + '　资金：' + UI.money(S.user.money) + '　游戏币：<b>' + S.user.coins + '</b></div>' +
      '<div>街球队：' + UI.teamLink(W().userStreet(S)) + '　街球等级：<b>' + S.user.streetLevel + '</b>　街球积分：<b>' + S.user.streetPts + '</b>　联赛：<b>' + esc(lg.name) + '</b>（' + pro.rec.w + '胜' + pro.rec.l + '负）</div></div>' +
      '<div class="st-r">' + UI.link('消息' + (unread ? '<b class="badge">' + unread + '</b>' : ''), 'go', { r: 'msgs' }) + UI.btn('进入下一天 ▶', 'advance', {}, 'big') + '</div>';
  };

  function routeOn(r) { return UI.route === r || (UI.route === 'match' && r === 'mymatches'); }
  UI.navCat = null;
  UI.navHtml = function () {
    // 宽屏：左侧竖排菜单
    var wide = UI.NAV.map(function (sec) {
      return '<div class="nav-sec"><div class="nav-h">' + sec.icon + ' ' + sec.title + '</div>' + sec.items.map(function (it) {
        return '<div class="nav-i' + (routeOn(it[0]) ? ' on' : '') + '" data-act="go" data-r="' + it[0] + '">' + it[1] + '</div>';
      }).join('') + '</div>';
    }).join('');
    // 窄屏：上排分类 + 下排子菜单
    var curCat = UI.navCat;
    if (curCat == null) {
      curCat = UI.NAV.findIndex(function (sec) { return sec.items.some(function (it) { return routeOn(it[0]); }); });
      if (curCat < 0) curCat = 0;
    }
    var cats = UI.NAV.map(function (sec, i) {
      var has = sec.items.some(function (it) { return routeOn(it[0]); });
      return '<div class="nc' + (i === curCat ? ' open' : '') + (has ? ' cur' : '') + '" data-act="navcat" data-i="' + i + '"><span class="nc-i">' + sec.icon + '</span><span class="nc-t">' + (sec.short || sec.title.slice(0, 2)) + '</span></div>';
    }).join('');
    var subs = UI.NAV[curCat].items.map(function (it) {
      return '<span class="ns' + (routeOn(it[0]) ? ' on' : '') + '" data-act="go" data-r="' + it[0] + '">' + it[1] + '</span>';
    }).join('');
    return '<div class="nav-wide">' + wide + '</div><div class="nav-narrow"><div class="nav-cats">' + cats + '</div><div class="nav-subs">' + subs + '</div></div>';
  };
  UI.acts.navcat = function (d) {
    UI.navCat = +d.i;
    document.getElementById('nav').innerHTML = UI.navHtml();
  };

  // ===== 渲染 =====
  UI.render = function () {
    var S = UI.S;
    var app = document.getElementById('app');
    if (!S || !S.user.onboarded) {
      app.innerHTML = '<div class="onboard-wrap">' + UI.views.onboard() + '</div>';
      UI.enhanceTables(app, 'onboard' + UI.ob.step);
      return;
    }
    var view = UI.views[UI.route] || UI.views.home;
    var main;
    try { main = view(UI.arg); } catch (e) { console.error(e); main = '<div class="err">页面出错：' + esc(e.message) + '</div>'; }
    if (!document.getElementById('main')) {
      app.innerHTML = '<header class="top"><div class="logo"><span class="logo-ball">🏀</span>XBA篮球经理<small>XTREME BASKETBALL ASSOCIATION · 单机复刻版</small></div></header>' +
        '<div class="statusbar" id="statusbar"></div><div class="body"><nav class="left" id="nav"></nav><main class="center" id="main"></main><aside class="right" id="card"></aside></div><div id="cardmask" data-act="closecard"></div>' +
        '<div id="toast"></div><div id="modal"></div>';
    }
    document.getElementById('statusbar').innerHTML = UI.status();
    document.getElementById('nav').innerHTML = UI.navHtml();
    document.getElementById('main').innerHTML = (UI.flash ? '<div class="flash ' + UI.flash.cls + '">' + UI.flash.html + '</div>' : '') + main;
    document.getElementById('card').innerHTML = UI.card();
    UI.flash = null;
    UI.enhanceTables(document.getElementById('main'), UI.route);
    if (UI.afterRender) { var f = UI.afterRender; UI.afterRender = null; f(); }
  };

  // ===== 表格排序：点击表头按该列排序（第一次从高到低，再点从低到高）=====
  UI.sorts = {};
  function cellKey(td) {
    if (!td) return { n: null, s: '' };
    var ds = td.getAttribute('data-sort');
    if (ds != null) return { n: +ds, s: ds };
    var t = td.textContent.trim();
    var stars = (t.match(/★/g) || []).length;
    if (stars && !/\d/.test(t)) return { n: stars, s: t };
    if (t === '今天') return { n: 0, s: t };
    if (/^第\s*\d+\s*轮/.test(t) || /^第\s*\d+\s*赛季/.test(t)) return { n: +t.match(/\d+/)[0], s: t };
    var m = t.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if (m && /^[^一-龥A-Za-z]*-?\d/.test(t.replace(/^(提示：|底价 |已出价 )/, ''))) return { n: parseFloat(m[0]), s: t };
    return { n: null, s: t };
  }
  function sortTable(tbl, col, dir) {
    var rows = Array.prototype.slice.call(tbl.rows);
    var head = rows.shift();
    var fixed = rows.filter(function (r) { return r.classList.contains('tot'); });
    var body = rows.filter(function (r) { return !r.classList.contains('tot'); });
    var keyed = body.map(function (r, i) { return { r: r, k: cellKey(r.cells[col]), i: i }; });
    keyed.sort(function (a, b) {
      var an = a.k.n, bn = b.k.n, c;
      // 没有数字的格子（如“-”）始终排在最后
      if (an != null && bn == null && /^[-—]?$/.test(b.k.s)) return -1;
      if (bn != null && an == null && /^[-—]?$/.test(a.k.s)) return 1;
      if (an != null && bn != null) c = an - bn;
      else if (an != null) c = -1;
      else if (bn != null) c = 1;
      else c = a.k.s.localeCompare(b.k.s, 'zh');
      if (c === 0) return a.i - b.i;
      return dir === 'desc' ? -c : c;
    });
    var parent = head.parentNode;
    keyed.forEach(function (x) { x.r.parentNode.appendChild(x.r); });
    fixed.forEach(function (r) { r.parentNode.appendChild(r); });
    Array.prototype.forEach.call(head.cells, function (th, i) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (i === col) th.classList.add(dir === 'desc' ? 'sort-desc' : 'sort-asc');
    });
  }
  UI.enhanceTables = function (root, route) {
    if (!root) return;
    var tabKey = Array.prototype.map.call(root.querySelectorAll('.tabs .tab.on'), function (t) { return t.textContent; }).join('/');
    Array.prototype.forEach.call(root.querySelectorAll('table.grid'), function (tbl, idx) {
      if (!tbl.rows.length || tbl.rows.length < 3) return;
      var head = tbl.rows[0];
      if (!head.cells.length || head.cells[0].tagName !== 'TH') return;
      var key = route + '|' + tabKey + '|' + idx + '|' + head.textContent;
      tbl.setAttribute('data-sortkey', key);
      Array.prototype.forEach.call(head.cells, function (th, i) {
        if (!th.textContent.trim()) return;
        th.classList.add('sortable');
        th.setAttribute('data-col', i);
        th.title = '点击排序';
      });
      var st = UI.sorts[key];
      if (st) sortTable(tbl, st.col, st.dir);
    });
  };
  document.addEventListener('click', function (e) {
    var th = e.target.closest('th.sortable');
    if (!th) return;
    var tbl = th.closest('table');
    var key = tbl.getAttribute('data-sortkey'), col = +th.getAttribute('data-col');
    var cur = UI.sorts[key];
    var dir = cur && cur.col === col && cur.dir === 'desc' ? 'asc' : 'desc';
    UI.sorts[key] = { col: col, dir: dir };
    sortTable(tbl, col, dir);
  });
  UI.renderCard = function () { var c = document.getElementById('card'); if (c) c.innerHTML = UI.card(); };

  UI.toast = function (msg, bad) {
    var t = document.getElementById('toast');
    if (!t) { alert(msg); return; }
    t.innerHTML = '<div class="toast' + (bad ? ' bad' : '') + '">' + esc(msg) + '</div>';
    clearTimeout(UI._tt);
    UI._tt = setTimeout(function () { t.innerHTML = ''; }, 2600);
  };
  UI.result = function (err, okMsg) {
    if (err) { UI.toast(err, true); return false; }
    if (okMsg) UI.toast(okMsg);
    UI.persist(); UI.render();
    return true;
  };

  UI.modal = function (title, html) {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="mask" data-act="closemodal"></div><div class="dlg"><div class="box-h">' + title + '<span class="x" data-act="closemodal">✕</span></div><div class="dlg-b">' + html + '</div></div>';
  };
  UI.closeModal = function () { var m = document.getElementById('modal'); if (m) m.innerHTML = ''; };

  UI.go = function (r, arg) {
    UI.route = r; UI.arg = arg || null;
    UI.render();
    var m = document.getElementById('main'); if (m) m.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  var saving = null;
  UI.persist = function () {
    if (!UI.S) return;
    clearTimeout(saving);
    saving = setTimeout(function () { X.Save.save(UI.S).catch(function () { UI.toast('自动保存失败，请在「存档设置」导出存档', true); }); }, 300);
  };

  // ===== 事件分发 =====
  UI.acts.go = function (d) { UI.navCat = null; UI.go(d.r, d.a); };
  UI.acts.tab = function (d) {
    UI.tab[d.key] = d.val;
    if (d.key === 'card') UI.renderCard(); else UI.render();
  };
  UI.acts.selp = function (d) { UI.sel = d.pid; UI.renderCard(); document.body.classList.add('card-open'); };
  UI.acts.closecard = function () { document.body.classList.remove('card-open'); };
  UI.acts.closemodal = function () { UI.closeModal(); };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var a = el.getAttribute('data-act');
    var fn = UI.acts[a];
    if (!fn) return;
    e.preventDefault();
    try { fn(el.dataset, el, e); } catch (err) { console.error(err); UI.toast('出错了：' + err.message, true); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (!el) return;
    var fn = UI.acts[el.getAttribute('data-change')];
    if (fn) { try { fn(el.dataset, el, e); } catch (err) { console.error(err); UI.toast('出错了：' + err.message, true); } }
  });
})(window.XBA);
