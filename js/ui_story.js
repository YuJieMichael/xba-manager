// 页面：今日揭晓 / 明日预告 / 待你决定；新秀卡、主场与球迷、名宿、传承与流派
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var ST = function () { return X.Story; };

  // 导航
  function addNav(sec, item, after) {
    var s = UI.NAV.find(function (x) { return x.title === sec; }); if (!s) return;
    var i = s.items.findIndex(function (x) { return x[0] === after; });
    s.items.splice(i < 0 ? s.items.length : i + 1, 0, item);
  }
  addNav('俱乐部', ['heritage', '传承与流派'], 'manager');
  addNav('球队管理', ['atmo', '主场与球迷'], 'arena');
  addNav('球队管理', ['alumni', '名宿'], 'staff');
  addNav('转会市场', ['prospects', '新秀卡'], 'draft');

  function txt(s) { return esc(s).replace(/\n/g, '<br>'); }

  // ===== 小组件 =====
  UI.revealsBox = function (list) {
    if (!list || !list.length) return '';
    return UI.box('✨ 今日揭晓', list.map(function (r) {
      return '<div class="rv"><span class="rv-i">' + r.icon + '</span><div><b>' + esc(r.title) + '</b><div class="small">' + txt(r.text) + '</div></div></div>';
    }).join(''));
  };
  UI.asksBox = function (S) {
    var asks = (S.story && S.story.asks) || [];
    if (!asks.length) return '';
    return UI.box('❓ 待你决定（' + asks.length + '）', asks.map(function (a) {
      return '<div class="ask"><div><b>' + a.icon + ' ' + esc(a.title) + '</b> <span class="muted small">还有 ' + Math.max(1, a.exp - S.dayNo) + ' 天</span></div><div class="small">' + esc(a.text) + '</div><div class="ask-o">' +
        a.opts.map(function (o, i) { return '<div>' + UI.btn(esc(o.t), 'stchoose', { id: a.id, i: i }, 'sm' + (i === 0 ? ' on' : '')) + ' <span class="muted small">' + esc(o.d) + '</span></div>'; }).join('') + '</div></div>';
    }).join(''));
  };
  UI.teaserBox = function (S) {
    var t = ST().teasers(S);
    if (!t.length) return '';
    return UI.box('🔮 下一天', '<ul class="teaser">' + t.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>');
  };
  A.stchoose = function (d) {
    var err = ST().choose(UI.S, d.id, +d.i);
    UI.result(err, UI.S.story.lastMsg || '已决定');
  };

  // ===== 战报：揭晓放最前，预告放最后 =====
  var origReport = V.report;
  V.report = function () {
    var h = origReport(), r = UI.lastReport, S = UI.S;
    if (!r) return h;
    var top = UI.revealsBox(r.reveals);
    if (r.heritage) {
      top += UI.box('🌳 本赛季传承结算：+' + r.heritage.pts + ' 传承点', '<ul>' + r.heritage.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
        (r.heritage.styles.length ? '<p>本赛季流派：<b>' + esc(r.heritage.styles.join('、')) + '</b></p>' : '<p class="muted">本赛季没有形成鲜明的流派。</p>') + '<p>' + UI.btn('去传承树加点', 'go', { r: 'heritage' }, 'big') + '</p>');
    }
    h = h.replace(/(<div class="report-h">[\s\S]*?<\/div>)/, '$1' + top);
    var tail = UI.asksBox(S) + UI.teaserBox(S);
    var k = h.lastIndexOf('<p>');
    return k >= 0 ? h.slice(0, k) + tail + h.slice(k) : h + tail;
  };
  // ===== 首页：待决定 + 下一天 =====
  var origHome = V.home;
  V.home = function () { var S = UI.S; return UI.asksBox(S) + UI.teaserBox(S) + origHome(); };

  // ===== 新秀卡 =====
  function card(S, p) {
    var R = ST().RARITY, hid = ST().cardHidden(p), potOpen = p.card.r.pot, rar = potOpen ? R[ST().rarity(p)] : null;
    var rows = Object.keys(ST().CARD_KEYS).map(function (k) {
      return '<div class="pc-r">' + (p.card.r[k] ? esc(ST().cardText(S, p, k)) : '<span class="pc-q">' + ST().CARD_KEYS[k] + ' ？</span>') + '</div>';
    }).join('');
    return '<div class="pcard' + (rar ? ' r' + ST().rarity(p) : '') + '" style="border-color:' + (rar ? rar.c : '#c9b48a') + '">' +
      '<div class="pc-h">' + (rar ? '<span class="pc-rar" style="background:' + rar.c + '">' + rar.cn + '</span>' : '<span class="pc-rar unk">？？</span>') + UI.pname(p) + '</div>' +
      '<div class="small muted">' + p.pos + ' · ' + p.age + ' 岁 · ' + p.h + 'cm' + (p.heir ? ' · 🧬 ' + esc(p.heir) + ' 之子' : '') + '</div>' + rows +
      (hid.length ? '<div class="pc-b">' + UI.btn('翻一张', 'cardflip', { pid: p.id }, 'sm') + '</div>' : '<div class="pc-b ok small">已全部翻开</div>') + '</div>';
  }
  V.prospects = function () {
    var S = UI.S, list = ST().prospects(S);
    var h = '<p class="tip">本届新秀会在赛季结束后参加职业选秀。卡片一开始都是背面朝上：球探每天会自动传回 <b>' + ST().flipsPerDay(S) + '</b> 张（越稀有的越容易先传回来），你也可以自己翻（先用每天的免费考察次数 ' + (S.user.scoutPts || 0) + ' 次，用完后要花钱）。<b>潜力</b>那一格总是最后才翻开——稀有度也藏在里面。</p>';
    if (!list.length) return h + '<span class="muted">本届新秀名单还没出来（选秀结束后会生成下一届）。</span>';
    var sort = UI.curTab('pc', 'rar');
    h += UI.tabs('pc', [['rar', '按已知稀有度'], ['pos', '按位置'], ['new', '没翻开的']], sort);
    var l = list.slice();
    if (sort === 'rar') l.sort(function (a, b) { return ((b.card.r.pot ? ST().rarity(b) : -1) - (a.card.r.pot ? ST().rarity(a) : -1)) || (Object.keys(b.card.r).length - Object.keys(a.card.r).length); });
    else if (sort === 'pos') l.sort(function (a, b) { return X.POS.indexOf(a.pos) - X.POS.indexOf(b.pos); });
    else l = l.filter(function (p) { return !Object.keys(p.card.r).length; });
    return h + '<div class="pcards">' + l.map(function (p) { return card(S, p); }).join('') + '</div>';
  };
  A.cardflip = function (d) {
    var r = ST().flip(UI.S, d.pid);
    if (typeof r === 'string') return UI.toast(r, true);
    UI.result(null, '🃏 ' + r.p.name + '：' + ST().cardText(UI.S, r.p, r.k));
  };

  // ===== 主场与球迷 =====
  V.atmo = function () {
    var S = UI.S, pro = W().userPro(S), F = ST().fac(S), a = S.user.atmo;
    var h = '';
    h += UI.box('👥 球迷派系（球迷总数 ' + U.money(pro.fans) + '）', '<p class="tip">三派球迷想要的东西不一样。上座需求和球衣收入由各派的占比和心情决定；你的决定、战绩、票价、主场氛围都会让他们高兴或生气。</p>' +
      '<table class="grid"><tr><th>派系</th><th>占比</th><th>心情</th><th>在意什么</th></tr>' + ['hard', 'casual', 'star'].map(function (k) {
        var f = F[k], d = ST().FACTIONS[k];
        return '<tr><td>' + d.icon + ' ' + d.cn + '</td><td>' + Math.round(f.s * 100) + '%</td><td><div class="bar sm"><i style="width:' + Math.round(f.m) + '%;background:' + (f.m >= 60 ? '#2e9b2e' : f.m >= 40 ? '#e69a12' : '#d23a2a') + '"></i></div> ' + Math.round(f.m) + '</td><td class="small">' + d.desc + '</td></tr>';
      }).join('') + '</table>' +
      '<p class="small">上座需求 ×' + ST().demandMul(S, pro).toFixed(2) + '　球衣收入 ×' + ST().jerseyMul(S, pro).toFixed(2) + (S.user.nick ? '　球队外号：<b>「' + esc(S.user.nick) + '」</b>' : '') + (S.story.streak ? '　当前' + (S.story.streak > 0 ? S.story.streak + ' 连胜' : (-S.story.streak) + ' 连败') : '') + '</p>');
    h += UI.box('🎪 主场氛围（主场优势 +' + ((ST().homeAdv(S) - 1) * 100).toFixed(1) + '%）', '<p class="tip">每样设施买一次永久有效。主场比赛日会带来加成，也会冒出各种「主场夜」事件——第二天在战报里揭晓。</p><table class="grid"><tr><th>设施</th><th>效果</th><th>价格</th><th></th></tr>' + ST().ATMO.map(function (x) {
      var own = a[x.id];
      return '<tr><td>' + x.icon + ' ' + x.cn + (x.id === 'mascot' && own ? '<br><span class="small">「' + esc(own.name) + '」</span>' : '') + '</td><td class="small">' + x.per + '</td><td>' + U.money(ST().atmoCost(S, x)) + '</td><td>' + (own ? '<span class="tag ok">已拥有</span>' : UI.btn('购买', 'atmobuy', { id: x.id }, 'sm')) + '</td></tr>';
    }).join('') + '</table>');
    return h;
  };
  A.atmobuy = function (d) { UI.result(ST().buyAtmo(UI.S, d.id), '主场氛围升级！'); };

  // ===== 名宿 =====
  V.alumni = function () {
    var S = UI.S, list = S.user.alumni || [], slots = ST().slots(S);
    var h = '<p class="tip">你的职业队员退役时，会问你要不要请他留队。名宿不要工资，带着他的性格和巅峰实力，每种岗位最多 ' + slots + ' 人。重生时名宿也会跟着你。</p>';
    h += UI.box('岗位', '<table class="grid"><tr><th>岗位</th><th>作用</th><th>名宿</th></tr>' + Object.keys(ST().ROLES).map(function (r) {
      var R = ST().ROLES[r], who = ST().alumniRole(S, r);
      return '<tr><td>' + R.icon + ' ' + R.cn + '</td><td class="small">' + R.per + '</td><td>' + (who.length ? who.map(function (a) { return '<b>' + esc(a.name) + '</b> <span class="small muted">' + a.pos + ' 巅峰 ' + a.peak + ' · ' + P.persona(a).icon + P.persona(a).cn + '</span> ' + UI.link('请他离开', 'alumnibye', { id: a.id }); }).join('<br>') : '<span class="muted">空缺</span>') + '</td></tr>';
    }).join('') + '</table>');
    if (!list.length) h += '<p class="muted">还没有名宿。效力多年的老将退役时，记得留住他们。</p>';
    return h;
  };
  A.alumnibye = function (d) { UI.result(ST().dismiss(UI.S, d.id), '名宿离开了球队'); };

  // ===== 传承与流派 =====
  V.heritage = function () {
    var S = UI.S, H = S.user.heritage, acc = ST().styleSnapshot(S);
    var h = '<p class="tip">每个赛季结束都会按名次、升级、夺冠、赛季目标、流派结算<b>传承点</b>。传承树的加成立刻生效，<b>重生</b>时也会跟着你。打出鲜明的流派并用它升级、夺冠，能拿大量传承点。</p>';
    h += UI.box('🌳 传承树 · 可用 ' + H.pts + ' 点（累计获得 ' + H.total + '）', '<div class="htree">' + ST().TREE.map(function (n) {
      var cur = H.tree[n.id] || 0;
      return '<div class="hn' + (cur ? ' on' : '') + '"><div><b>' + n.icon + ' ' + n.cn + '</b> <span class="sk-l">' + '●'.repeat(cur) + '○'.repeat(n.max - cur) + '</span></div><div class="small">' + n.per + '</div><div>' + (cur < n.max ? UI.btn('解锁（' + n.cost + ' 点）', 'hbuy', { id: n.id }, 'sm' + (H.pts >= n.cost ? ' on' : '')) : '<span class="tag ok">已满级</span>') + '</div></div>';
    }).join('') + '</div>');
    var g = acc.games;
    h += UI.box('🎯 本赛季流派进度（已打 ' + g + ' 场联赛）', g < 6 ? '<span class="muted">打满 6 场联赛后开始判定。</span>' : '<table class="grid"><tr><th>流派</th><th>条件</th><th>进度</th></tr>' + ST().STYLES.map(function (s) {
      var pr = Math.min(1, s.prog(acc)), ok = s.test(acc, S);
      return '<tr><td>' + s.icon + ' ' + s.cn + '</td><td class="small">' + s.rule + '</td><td><div class="bar sm"><i style="width:' + Math.round(pr * 100) + '%;background:' + (ok ? '#2e9b2e' : '#c9b48a') + '"></i></div> ' + (ok ? '<b class="ok">已成型</b>' : Math.round(pr * 100) + '%') + '</td></tr>';
    }).join('') + '</table>');
    h += UI.box('📖 流派图鉴', '<div class="sdex">' + ST().STYLES.map(function (s) {
      var r = H.styles[s.id];
      return '<div class="sd' + (r ? ' on' : '') + '"><div class="sd-i">' + (r ? s.icon : '❔') + '</div><b>' + (r ? s.cn : '？？？') + '</b><div class="small">' + (r ? '确立 ' + r.n + ' 次' : '未解锁') + '</div><div>' + (r && r.up ? '⬆️' : '▫️') + (r && r.champ ? '🏆' : '▫️') + '</div></div>';
    }).join('') + '</div><p class="muted small">每个流派三枚勋章：确立（+3 点）、用它升级（⬆️ +5 点）、用它夺得联赛冠军（🏆 +10 点），都只在第一次拿到时给点数。</p>');
    return h;
  };
  A.hbuy = function (d) { UI.result(ST().buy(UI.S, d.id), '传承解锁！'); };
})(window.XBA);
