// 页面：球员评分、热区、今日五佳球、经理生涯、球员交易、选秀（乐透/试训/模拟选秀）
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var M = function () { return X.Market; };
  var TR = function () { return X.Trade; };
  var MG = function () { return X.Manager; };

  // ===== 单场评分（A+ ~ F）=====
  UI.gradeScore = function (b) {
    if (!b.min) return -99;
    return Math.round((b.eff + (b.pts - (b.fga - b.fgm)) * 0.15) * Math.pow(30 / Math.max(b.min, 10), 0.25) * 10) / 10;
  };
  UI.grade = function (b) {
    if (!b.min) return '<span class="muted">-</span>';
    var s = UI.gradeScore(b);
    var g = s >= 30 ? 'A+' : s >= 24 ? 'A' : s >= 19 ? 'A-' : s >= 15 ? 'B+' : s >= 12 ? 'B' : s >= 9 ? 'B-' : s >= 6 ? 'C+' : s >= 3 ? 'C' : s >= 0 ? 'D' : 'F';
    return '<span class="grd g' + g.charAt(0) + '">' + g + '</span>';
  };

  // ===== 热区（本赛季各区域命中率，与联盟平均相比）=====
  var ZONES = [['in', '内线', 0.53], ['drv', '突破', 0.49], ['mid', '中投', 0.41], ['thr', '三分', 0.35], ['fb', '快攻', 0.64]];
  UI.hotZones = function (zn) {
    if (!zn || !Object.keys(zn).length) return '';
    return '<div class="hz"><div class="hz-h">🔥 本赛季热区</div>' + ZONES.map(function (z) {
      var d = zn[z[0]];
      if (!d || d[1] < 5) return '<div class="hz-z cold0"><b>' + z[1] + '</b><span>' + (d ? d[0] + '/' + d[1] : '-') + '</span></div>';
      var pct = d[0] / d[1], diff = pct - z[2];
      var cls = diff >= 0.06 ? 'hot2' : diff >= 0.02 ? 'hot1' : diff <= -0.06 ? 'cold2' : diff <= -0.02 ? 'cold1' : 'avg';
      return '<div class="hz-z ' + cls + '" title="联盟平均约 ' + Math.round(z[2] * 100) + '%"><b>' + z[1] + '</b><span>' + Math.round(pct * 100) + '%</span><i>' + d[0] + '/' + d[1] + '</i></div>';
    }).join('') + '</div>';
  };

  // ===== 今日五佳球 =====
  UI.highlightsBox = function (list, title) {
    if (!list || !list.length) return '';
    return UI.box(title || '📺 今日五佳球', '<ol class="hl">' + list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>');
  };
  var origReport = V.report;
  V.report = function () {
    var h = origReport();
    var r = UI.lastReport;
    if (r && r.highlights) h = h.replace('<div class="box"><div class="box-h">今日消息', UI.highlightsBox(r.highlights) + '<div class="box"><div class="box-h">今日消息');
    return h;
  };

  // ===== 经理生涯 =====
  V.manager = function () {
    var S = UI.S, m = MG().get(S), need = MG().need(m.lv);
    var h = '<div class="mgr"><div class="mgr-lv">' + esc(S.user.manager) + ' 经理 <b>Lv.' + m.lv + '</b></div><div class="bar"><i style="width:' + Math.min(100, m.xp / need * 100) + '%;background:#4a8fd8"></i></div><div class="small muted">经验 ' + m.xp + ' / ' + need + '　可用技能点 <b class="money">' + m.pts + '</b></div></div>';
    h += '<p class="tip">经验来源：联赛胜 +12 / 负 +4，季后赛胜 +20，XBA杯胜 +8，街球杯赛每场 +1~3，完成赛季目标 +80，达成成就 +40，每赛季结束 +60。每升一级得 1 个技能点。</p>';
    h += '<div class="skills">' + MG().SKILLS.map(function (sk) {
      var lv = m.skills[sk.id] || 0;
      return '<div class="sk' + (lv ? ' on' : '') + '"><div class="sk-n">' + sk.icon + ' ' + sk.cn + ' <span class="sk-l">' + '●'.repeat(lv) + '○'.repeat(sk.max - lv) + '</span></div><div class="small">' + sk.per + (sk.id === 'eye' ? '' : '（每级）') + '</div>' +
        (lv < sk.max ? UI.btn('升级', 'mgrlearn', { id: sk.id }, 'sm' + (m.pts > 0 ? ' on' : '')) : '<span class="tag ok">已满级</span>') + '</div>';
    }).join('') + '</div>';
    h += '<p>' + UI.btn('技能洗点（100 游戏币）', 'mgrreset', {}, 'sm') + '</p>';
    return h;
  };
  A.mgrlearn = function (d) { UI.result(MG().learn(UI.S, d.id), '技能升级了'); };
  A.mgrreset = function () { UI.result(MG().reset(UI.S), '技能点已返还'); };

  // ===== 球员交易 =====
  UI.trade = { tid: null, give: {}, take: {}, money: 0, ev: null };
  V.trade = function () {
    var S = UI.S, T = UI.trade, pro = W().userPro(S);
    var h = '<p class="tip">可以和其他职业队以人换人，也可以加钱或要钱。对方会按自己的需要估价：缺这个位置更想要，年轻球员加分、老将打折，而且总想稍微占点便宜。<b>每赛季第 ' + TR().DEADLINE + ' 天是交易截止日</b>，之后不能交易。交易后球员都不算本土球员（不再是绿名）。</p>';
    if (!TR().open(S)) h += '<div class="sumline red">已过本赛季交易截止日，下赛季开始后再来。</div>';
    else h += '<div class="sumline">距离交易截止日还有 <b>' + (TR().DEADLINE - S.day) + '</b> 天</div>';
    var offers = (S.tradeOffers || []).filter(function (o) { return S.teams[o.team] && S.players[o.want]; });
    if (offers.length) h += UI.box('📨 收到的报价', offers.map(function (o) {
      var t = S.teams[o.team], want = S.players[o.want];
      return '<div class="offer">' + UI.teamLink(t) + ' 想要 ' + UI.pname(want) + '（身价 ' + U.wan(P.value(want)) + '），给你：' + (o.give.map(function (id) { var p = S.players[id]; return p ? UI.pname(p) + '（' + p.pos + ' ' + UI.ovrTag(P.ovr(p)) + '，身价 ' + U.wan(P.value(p)) + '）' : ''; }).join(' + ') || '') + (o.money ? (o.give.length ? ' + ' : '') + U.money(o.money) + ' 资金' : '') +
        '　' + UI.btn('接受', 'tradeaccept', { id: o.id }, 'sm on') + ' ' + UI.btn('拒绝', 'tradedecline', { id: o.id }, 'sm') + ' <span class="muted small">' + (o.expires - S.dayNo) + ' 天内有效</span></div>';
    }).join(''));
    if (!TR().open(S)) return h;
    var teams = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && Math.abs(t.level - pro.level) <= 1; })
      .sort(function (a, b) { return a.level - b.level || a.name.localeCompare(b.name, 'zh'); });
    if (!T.tid || !S.teams[T.tid]) T.tid = teams[0] && teams[0].id;
    h += '<p>交易对象：<select data-change="tradeteam">' + teams.map(function (t) { return '<option value="' + t.id + '"' + (t.id === T.tid ? ' selected' : '') + '>' + esc(t.name) + '（' + esc(W().league(S, t.leagueId).name) + '）</option>'; }).join('') + '</select></p>';
    var other = S.teams[T.tid];
    var list = function (team, sel, act) {
      return '<table class="grid"><tr><th></th><th>球员</th><th>年龄</th><th>位置</th><th>综合</th><th>薪水</th><th>身价</th></tr>' + W().teamPlayers(S, team).sort(function (a, b) { return P.ovr(b) - P.ovr(a); }).map(function (p) {
        return '<tr class="' + (sel[p.id] ? 'sel' : '') + '"><td><input type="checkbox" data-change="' + act + '" data-pid="' + p.id + '"' + (sel[p.id] ? ' checked' : '') + (p.listing ? ' disabled' : '') + '></td><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + UI.ovrTag(P.ovr(p)) + '</td><td>' + U.money(p.salary) + '</td><td>' + U.wan(P.value(p)) + '</td></tr>';
      }).join('') + '</table>';
    };
    h += '<div class="cols2"><div>' + UI.box('我送出（' + esc(pro.name) + '）', list(pro, T.give, 'tradegive')) + '</div><div>' + UI.box('我想要（' + esc(other.name) + '）', list(other, T.take, 'tradetake')) + '</div></div>';
    h += '<div class="sumline">资金：<input id="trade-money" type="number" step="10000" value="' + T.money + '" style="width:120px"> <span class="muted small">正数 = 你额外付钱，负数 = 要对方付钱</span>　' + UI.btn('问问对方', 'tradeeval', {}, 'sm') + '</div>';
    if (T.ev) {
      var ev = T.ev;
      if (ev.err) h += '<div class="tip red">' + esc(ev.err) + '</div>';
      else if (ev.ok) h += '<div class="tip ok">对方：“成交！”　' + UI.btn('确认交易', 'tradego', {}, 'big') + '</div>';
      else {
        var ask = Math.ceil(ev.gap / 10000) * 10000;
        h += '<div class="tip">对方：' + (ev.gap > ev.vout * 0.5 ? '“差得太远了，别开玩笑。”' : '“再加 ' + U.money(ask) + ' 资金就成交。”　' + UI.btn('接受还价', 'tradecounter', { add: ask }, 'sm on')) + '</div>';
      }
    }
    return h;
  };
  function pick(map, d, el) { if (el.checked) map[d.pid] = 1; else delete map[d.pid]; UI.trade.ev = null; UI.render(); }
  A.tradeteam = function (d, el) { UI.trade = { tid: el.value, give: UI.trade.give, take: {}, money: 0, ev: null }; UI.render(); };
  A.tradegive = function (d, el) { pick(UI.trade.give, d, el); };
  A.tradetake = function (d, el) { pick(UI.trade.take, d, el); };
  function readMoney() { var el = document.getElementById('trade-money'); UI.trade.money = el ? Math.round(+el.value || 0) : UI.trade.money; }
  A.tradeeval = function () {
    var T = UI.trade; readMoney();
    T.ev = TR().evaluate(UI.S, T.tid, Object.keys(T.give), Object.keys(T.take), T.money);
    UI.render();
  };
  A.tradecounter = function (d) { UI.trade.money += +d.add; UI.trade.ev = TR().evaluate(UI.S, UI.trade.tid, Object.keys(UI.trade.give), Object.keys(UI.trade.take), UI.trade.money); UI.render(); };
  A.tradego = function () {
    var T = UI.trade, S = UI.S;
    var ev = TR().evaluate(S, T.tid, Object.keys(T.give), Object.keys(T.take), T.money);
    if (ev.err || !ev.ok) { T.ev = ev; return UI.render(); }
    TR().execute(S, T.tid, Object.keys(T.give), Object.keys(T.take), T.money);
    UI.trade = { tid: T.tid, give: {}, take: {}, money: 0, ev: null };
    UI.result(null, '交易完成！');
  };
  A.tradeaccept = function (d) { UI.result(TR().acceptOffer(UI.S, d.id), '交易完成！'); };
  A.tradedecline = function (d) { TR().declineOffer(UI.S, d.id); UI.result(null, '已拒绝'); };

  // ===== 职业选秀（乐透、试训、模拟选秀）=====
  V.draft = function () {
    var S = UI.S, d = S.draft;
    var h = '<p class="tip">赛季结束后，胜率最低的 14 支球队抽乐透决定前 4 顺位（越差中签率越高），其余按胜率由低到高。轮到你时可以用<b>试训</b>看清新秀的真实潜力，也可以参考「预测顺位」（其他球队大概会怎么选）。职业选秀不花钱。</p>';
    if (S.lottery && S.lottery.season === S.season - 1) {
      h += UI.box('🎰 本届乐透结果', '<table class="grid"><tr><th>战绩倒数</th><th>球队</th><th>中签率</th><th>抽到顺位</th></tr>' + S.lottery.entries.map(function (e) {
        return '<tr class="' + (e.tid === S.user.proId ? 'me' : '') + '"><td>' + e.seed + '</td><td>' + esc(e.name) + '</td><td>' + e.odds + '%</td><td>' + (e.pick <= 4 ? '<b class="ok">第 ' + e.pick + ' 顺位</b>' : '第 ' + e.pick + ' 顺位') + '</td></tr>';
      }).join('') + '</table>');
    }
    if (!d) return h + '<span class="muted">第一个赛季结束后才会举行选秀。</span>';
    if (!d.done && d.order[d.idx] === S.user.proId) {
      var wo = d.wo || { pts: 0, seen: {} }, mock = M().mockRank(S);
      var pool = d.pool.map(function (id) { return S.players[id]; }).filter(function (p) { return p && !p.teamId; }).sort(function (a, b) { return mock[a.id] - mock[b.id]; });
      h += UI.box('轮到你了！第 ' + (d.idx + 1) + ' 顺位　剩余试训 ' + wo.pts + ' 次', '<table class="grid"><tr><th>预测顺位</th><th>姓名</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>综合</th><th>潜力</th><th></th></tr>' + pool.slice(0, 40).map(function (p) {
        var seen = wo.seen[p.id];
        return '<tr class="' + (seen ? 'sel' : '') + '"><td>#' + mock[p.id] + '</td><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td>' + UI.ovrTag(P.ovr(p)) + '</td><td>' + (seen ? UI.stars(P.stars(p)) + ' <span class="small">剩余 ' + P.potRemain(p).toFixed(1) + '</span>' : '<span class="muted">？</span>') + '</td><td>' +
          (seen ? '' : UI.btn('试训', 'workout', { pid: p.id }, 'sm')) + ' ' + UI.btn('选他', 'draftpick', { pid: p.id }, 'sm on') + '</td></tr>';
      }).join('') + '</table><p>' + UI.btn('放弃本轮选秀', 'draftskip', {}, 'sm') + '</p>');
    } else if (d.done) h += '<div class="ok">本届选秀已结束。</div>';
    h += UI.box('选秀结果', '<table class="grid"><tr><th>顺位</th><th>球队</th><th>球员</th></tr>' + d.picks.map(function (x, i) {
      return '<tr class="' + (x.user ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(x.team) + '</td><td>' + (x.pid && S.players[x.pid] ? UI.pname(S.players[x.pid]) : esc(x.player)) + '</td></tr>';
    }).join('') + '</table>');
    return h;
  };
  A.workout = function (d) {
    var err = M().workout(UI.S, d.pid);
    if (err) return UI.toast(err, true);
    UI.sel = d.pid; UI.result(null, '试训完成，潜力已显示');
  };
})(window.XBA);
