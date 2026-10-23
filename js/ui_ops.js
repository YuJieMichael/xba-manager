// 页面：俱乐部运营（董事会/设施/热度媒体/赛季版本）、个人生活、承诺、球探迷雾、手感、擅长战术、赛前 BP
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, E = X.Engine, esc = U.esc;
  var W = function () { return X.World; };
  var O = function () { return X.Ops; };

  // ===== 球探迷雾：综合显示 =====
  UI.ovrFog = function (p) {
    var S = UI.S, o = P.ovr(p), r = O().range(S, p, o, 'ovr');
    if (!r) return UI.ovrTag(o);
    return '<span class="fog" data-sort="' + Math.round((r[0] + r[1]) / 2) + '" title="还没看清，派球探考察能缩小范围">' + r[0] + '~' + r[1] + '</span>';
  };

  // 球员名字后面加手感图标
  var origPname = UI.pname;
  UI.pname = function (p, opt) { return origPname(p, opt) + (p ? O().formTag(p) : ''); };

  // 属性条：看不清的球员显示范围
  var origAttrRows = UI.attrRows;
  UI.attrRows = function (S, p) {
    if (O().knowLevel(S, p) >= 3) return origAttrRows(S, p);
    return '<table class="attrs">' + X.ATTRS.map(function (k) {
      var r = O().range(S, p, p.a[k], k);
      return '<tr><td class="an">' + X.ATTR_CN[k] + '</td><td class="ab"><div class="bar"><i style="margin-left:' + U.clamp(r[0], 0, 100) + '%;width:' + U.clamp(r[1] - r[0], 1, 100) + '%;background:#c9b48a"></i></div></td><td class="av fog">' + r[0] + '~' + r[1] + '</td></tr>';
    }).join('') + '<tr class="ovr-row"><td class="an"><b>综合</b></td><td class="ab"></td><td class="av"><b>' + UI.ovrFog(p) + '</b></td></tr></table>';
  };

  // 球员卡：性格后面加手感、擅长战术、承诺、考察
  var origCard = UI.card;
  UI.card = function () {
    var S = UI.S, h = origCard(), p = UI.sel && S.players[UI.sel];
    if (!p) return h;
    var t = p.teamId && S.teams[p.teamId], mine = t && t.isUser;
    var extra = '<div class="small card-extra">';
    var f = p.form || 0;
    extra += '手感：' + (f >= 2 ? '<b class="red">🔥 火热 +' + f * 2 + '%</b>' : f <= -2 ? '<b style="color:#1d63c5">❄ 低迷 ' + f * 2 + '%</b>' : f ? (f > 0 ? '不错 +' : '一般 ') + f * 2 + '%' : '正常');
    if (p.mor && p.mor !== 1) extra += '　士气 ' + (p.mor > 1 ? '+' : '') + Math.round((p.mor - 1) * 100) + '%';
    if (p.unhappy) extra += '　<b class="red">不满</b>';
    extra += '<br>擅长：' + P.favs(p).map(function (id) { return E.OFF[id].cn; }).join('、');
    var pr = (S.user.promises || []).find(function (x) { return x.pid === p.id && !x.done; });
    if (pr) extra += '<br>🤝 承诺中：' + O().PROMISES.find(function (x) { return x.id === pr.type; }).cn;
    extra += '</div>';
    var btns = '';
    if (mine && t.kind === 'pro' && !pr) btns += UI.btn('许下承诺', 'promise', { pid: p.id }, 'sm');
    if (!mine && O().knowLevel(S, p) < 3) btns += UI.btn('派球探考察' + ((S.user.scoutPts || 0) > 0 ? '（免费 ' + S.user.scoutPts + ' 次）' : '（' + U.wan(5000 * (O().knowLevel(S, p) + 1)) + '）'), 'scoutp', { pid: p.id }, 'sm');
    h = h.replace('<div class="minitabs">', extra + (btns ? '<div class="card-acts">' + btns + '</div>' : '') + '<div class="minitabs">');
    return h;
  };
  A.scoutp = function (d) {
    var err = O().scoutPlayer(UI.S, d.pid);
    if (err) return UI.toast(err, true);
    UI.persist(); UI.renderCard(); UI.toast('考察完成，看得更清楚了');
  };
  A.promise = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('对 ' + esc(p.name) + ' 许下承诺', '<p>许诺会让他立刻干劲十足（发挥 +3%），兑现了他会更忠诚（续约更便宜），食言了他会公开抱怨（发挥 -7%、球队化学反应下降、董事会不满）。</p>' +
      O().PROMISES.map(function (x) { return '<p>' + UI.btn(x.cn, 'promisedo', { pid: p.id, t: x.id }, 'sm') + ' <span class="small muted">' + x.desc + '</span></p>'; }).join(''));
  };
  A.promisedo = function (d) { UI.closeModal(); UI.result(O().promise(UI.S, d.pid, d.t), '已许下承诺'); };

  // ===== 俱乐部运营 =====
  V.ops = function () {
    var S = UI.S, tab = UI.curTab('ops', 'board');
    var h = UI.tabs('ops', [['board', '董事会'], ['fac', '球队设施'], ['media', '热度与媒体'], ['meta', '赛季版本']], tab);
    if (tab === 'board') {
      var b = O().board(S), tr = Math.round(b.trust);
      h += '<div class="trust"><b>董事会信任</b><div class="bar"><i style="width:' + tr + '%;background:' + (tr >= 60 ? '#2e9b2e' : tr >= 30 ? '#e0a100' : '#d0202e') + '"></i></div><span>' + tr + ' / 100</span></div>';
      h += '<p class="tip">赢球信任慢慢上升，输球慢慢下降；赛季末按赛季目标结算：完成联赛排名目标 +15，没完成 -20，赛季亏损 -8。<b>信任低于 10，赛季结束时会被解雇</b>，你得去接手一支更弱的球队。' + (S.difficulty === 'easy' ? '（简单难度下扣分减半）' : '') + '</p>';
      if (b.fired) h += '<p class="red">你已经被解雇过 ' + b.fired + ' 次。</p>';
      h += UI.goalsBox(S);
    } else if (tab === 'fac') {
      h += '<p class="tip">设施升级需要资金和施工时间，最高 5 级。资金：' + UI.money(S.user.money) + '</p><div class="facs">' + O().FAC.map(function (f) {
        var c = (S.user.fac || {})[f.id] || { lv: 1 }, lv = c.lv || 1;
        return '<div class="fac"><div class="fac-n">' + f.icon + ' ' + f.cn + ' <b>' + lv + ' 级</b></div><div class="small">' + f.per + '（每级）</div>' +
          (c.build ? '<div class="small muted">施工中，还需 ' + c.build + ' 天</div>' : lv < 5 ? UI.btn('升级（' + U.wan(O().FAC_COST[lv]) + '，' + O().FAC_DAYS[lv] + ' 天）', 'facup', { id: f.id }, 'sm') : '<span class="tag ok">满级</span>') + '</div>';
      }).join('') + '</div>';
    } else if (tab === 'media') {
      var hy = Math.round(S.user.hype || 20);
      h += '<div class="trust"><b>球队热度</b><div class="bar"><i style="width:' + hy + '%;background:#e8762b"></i></div><span>' + hy + ' / 100</span></div>';
      h += '<p class="tip">热度越高，门票需求和广告报价越高（热度 100 时约 +33%）。赢球、进五佳球、发布会、球员直播都会涨热度，每天自然下降 1 点。</p>';
      h += UI.pressBox(S, true);
      var pro = W().userPro(S);
      h += UI.box('球员商业活动（每人每天一次，当天不参加每日训练）', '<table class="grid"><tr><th>球员</th><th>综合</th><th>球迷支持</th><th>体力</th>' + O().STREAMS.map(function (k) { return '<th title="' + k.desc + '">' + k.cn + '</th>'; }).join('') + '</tr>' +
        W().teamPlayers(S, pro).sort(function (a, b) { return b.support - a.support; }).map(function (p) {
          var done = p.streamDay === S.dayNo;
          return '<tr><td>' + UI.pname(p) + '</td><td>' + UI.ovrTag(P.ovr(p)) + '</td><td>' + Math.round(p.support) + '</td><td>' + UI.stam(p.st) + '</td>' + O().STREAMS.map(function (k) { return '<td>' + (done ? '<span class="muted small">已安排</span>' : UI.btn(k.cn, 'stream', { pid: p.id, k: k.id }, 'sm nowrap')) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table><p class="small muted">' + O().STREAMS.map(function (k) { return k.cn + '：' + k.desc; }).join('；') + '。名气越大的球员（综合高、球迷支持高）效果越好。</p>');
    } else {
      h += UI.box('第 ' + S.season + ' 赛季版本', '<p><b>' + esc(O().rulesText(S) || '无') + '</b></p><p class="small muted">每个赛季开始时随机更新两条规则，强势的战术和球员类型会跟着变。</p>');
      h += UI.box('所有可能的规则', '<table class="grid"><tr><th>规则</th><th>影响</th></tr>' + O().RULES.map(function (r) { var on = S.meta && S.meta.ids.indexOf(r.id) >= 0; return '<tr class="' + (on ? 'me' : '') + '"><td>' + r.cn + '</td><td>' + r.desc + '</td></tr>'; }).join('') + '</table>');
    }
    return h;
  };
  A.facup = function (d) { UI.result(O().upgradeFac(UI.S, d.id), '开始施工'); };
  A.stream = function (d) { UI.result(O().stream(UI.S, d.pid, d.k), '活动完成，热度上升'); };

  UI.pressBox = function (S, always) {
    var pr = S.press;
    if (!pr || pr.day !== S.dayNo) return always ? UI.box('🎤 新闻发布会', '<span class="muted">今天没有发布会（有比赛的日子大约一半会有）。</span>') : '';
    if (pr.answered != null) return UI.box('🎤 新闻发布会', '<p>记者：' + esc(pr.q) + '</p><p>你：<b>' + esc(pr.a[pr.answered].t) + '</b>（' + pr.a[pr.answered].d + '）</p>');
    return UI.box('🎤 赛前新闻发布会', '<p>记者：<b>' + esc(pr.q) + '</b></p>' + pr.a.map(function (a, i) { return '<p>' + UI.btn(a.t, 'press', { i: i }, 'sm') + ' <span class="small muted">' + a.d + '</span></p>'; }).join(''));
  };
  A.press = function (d) { UI.result(O().answer(UI.S, +d.i), '回答完毕'); };

  // 首页：发布会、版本、董事会警告、热度
  var origHome = V.home;
  V.home = function () {
    var S = UI.S, h = origHome();
    var add = UI.pressBox(S, false);
    var tr = O().board(S).trust;
    add += '<div class="sumline small">📢 本赛季版本：' + esc(O().rulesText(S)) + '　🔥 热度 ' + Math.round(S.user.hype || 20) + '　🏛 董事会信任 <b class="' + (tr < 25 ? 'red' : '') + '">' + Math.round(tr) + '</b>　⚡ 精力 ' + Math.round(O().life(S).energy) + '　' + UI.link('俱乐部运营', 'go', { r: 'ops' }) + '</div>';
    var i = h.indexOf('<div class="box"><div class="box-h">经理待办');
    return i >= 0 ? h.slice(0, i) + add + h.slice(i) : add + h;
  };

  // 经理生涯：个人生活
  var origManager = V.manager;
  V.manager = function () {
    var S = UI.S, L = O().life(S), h = origManager();
    var item = function (list, kind) {
      return list.map(function (x, i) { return '<span class="life-i' + (L[kind] === i ? ' on' : L[kind] > i ? ' past' : '') + '">' + x[0] + (i > L[kind] ? ' ' + UI.btn(U.wan(x[1]), 'lifebuy', { k: kind, i: i }, 'sm') : '') + '</span>'; }).join('');
    };
    var life = '<p>个人存款 <b class="money">' + U.money(L.cash) + '</b>（每轮薪水 ' + U.money(O().salary(S)) + '，由俱乐部支付）　名气 <b>' + Math.round(L.fame) + '</b></p>' +
      '<div class="trust"><b>精力</b><div class="bar"><i style="width:' + L.energy + '%;background:#4a8fd8"></i></div><span>' + Math.round(L.energy) + '</span></div>' +
      '<p class="small muted">精力每天消耗 3，亲自执教一场再多消耗 6，房子越好每天恢复越多。精力低于 40 时训练和执教效果打折；名气越高，签约和续约工资越便宜。</p>' +
      '<p>🏠 住所：' + item(O().HOUSES, 'house') + '</p><p>🚗 座驾：' + item(O().CARS, 'car') + '</p><p>' + UI.btn('去度假（2 万，精力回满）', 'vacation', {}, 'sm') + '</p>';
    var i = h.indexOf('<div class="box"><div class="box-h">🔁 重生');
    var box = UI.box('🏡 个人生活', life);
    return i >= 0 ? h.slice(0, i) + box + h.slice(i) : h + box;
  };
  A.lifebuy = function (d) { UI.result(O().buy(UI.S, d.k, +d.i), '买下了！'); };
  A.vacation = function () { UI.result(O().vacation(UI.S), '度假回来，精神饱满'); };

  // ===== 赛前 BP（亲自执教的开赛前）=====
  var origCoach = V.coach;
  V.coach = function () {
    var S = UI.S, C = UI.coachGame;
    if (!C) return origCoach();
    var st = C.G.state();
    if (st.q > 0 || st.inQuarter || C.bp) return (C.bp ? '<div class="tip">BP：' + C.bp + '</div>' : '') + origCoach();
    var meKey = C.key, opKey = meKey === 'h' ? 'a' : 'h', op = st[opKey];
    var oppTeam = S.teams[opKey === 'h' ? C.h : C.a];
    var prof = X.Coach.profile(S, oppTeam);
    var oppPlayers = op.players.slice().sort(function (a, b) { return P.ovr(S.players[b.id] || {}) - P.ovr(S.players[a.id] || {}); });
    var h = origCoach().split('<div class="coach-ctl">')[0];
    h += UI.box('🎯 赛前 BP（禁用 + 包夹）', '<p class="small">像电竞的 Ban/Pick：先<b>禁用</b>对手一套进攻战术（这场他不能用），再<b>包夹</b>对手一名球员（他整场发挥 -8%）。对手也会对你做同样的事。</p>' +
      '<label>禁用对手的进攻战术 <select id="bp-ban">' + X.OFF_TACTICS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === prof.off ? ' selected' : '') + '>' + t.cn + (t.id === prof.off ? '（他最常用）' : '') + '</option>'; }).join('') + '</select></label><br>' +
      '<label>包夹对手球员 <select id="bp-focus">' + oppPlayers.slice(0, 8).map(function (p) { var pl = S.players[p.id]; return '<option value="' + p.id + '"' + (prof.star && prof.star.id === p.id ? ' selected' : '') + '>' + esc(p.name) + '（' + p.pos + (pl ? ' ' + Math.round(P.ovr(pl)) : '') + (prof.star && prof.star.id === p.id ? '，头号得分手' : '') + '）</option>'; }).join('') + '</select></label>' +
      '<p>' + UI.btn('确认 BP，开始比赛', 'bpgo', {}, 'big') + ' ' + UI.btn('跳过 BP', 'bpskip', {}, 'sm') + '</p>');
    return h;
  };
  function aiBP(S, C) {
    // AI 禁你当前战术板最主要的进攻战术，包夹你本赛季场均得分最高的人
    var me = W().userPro(S), board = me.boards.league || me.boards.cup;
    var ban = board.presets[board.config.q[0]].off;
    var best = null, bv = -1;
    W().teamPlayers(S, me).forEach(function (p) { if (p.inj > 0) return; var v = p.stats.gp ? p.stats.pts / p.stats.gp : P.ovr(p) / 4; if (v > bv) { bv = v; best = p; } });
    return { ban: ban, focus: best && best.id };
  }
  A.bpgo = function () {
    var S = UI.S, C = UI.coachGame; if (!C) return;
    var mine = { ban: document.getElementById('bp-ban').value, focus: document.getElementById('bp-focus').value };
    var ai = aiBP(S, C), bp = {};
    bp[C.key] = mine; bp[C.key === 'h' ? 'a' : 'h'] = ai;
    C.G.applyBP(bp);
    var fp = S.players[mine.focus], ap = ai.focus && S.players[ai.focus];
    C.bp = '你禁用了【' + E.OFF[mine.ban].cn + '】、包夹 ' + (fp ? fp.name : '?') + '；对手禁用了你的【' + E.OFF[ai.ban].cn + '】、包夹 ' + (ap ? ap.name : '?');
    C.G.run(0);
    UI.render();
  };
  A.bpskip = function () { var C = UI.coachGame; if (!C) return; C.bp = '跳过'; UI.render(); };

  // 执教消耗精力；精力太低少一次暂停
  var origFinish = A.coachfinish;
  A.coachfinish = function () {
    var S = UI.S, L = O().life(S);
    L.energy = Math.max(0, L.energy - 6);
    return origFinish();
  };
})(window.XBA);
