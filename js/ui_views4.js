// 页面：转会市场、职业选秀、道具商店、经理手册、存档设置；进入下一天
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var M = function () { return X.Market; };

  // ===== 转会市场 =====
  V.market = function () {
    var S = UI.S, tab = UI.curTab('market', 'free');
    var tabs = [['watch', '关注球员'], ['free', '街头自由球员'], ['sdraft', '街球选秀'], ['pro', '职业转会']];
    if (S.day >= 13 && S.day <= 26) tabs.push(['extreme', '极限球员']);
    tabs.push(['mine', '我的挂牌']);
    var h = UI.tabs('market', tabs, tab);
    var DESC = {
      free: '街头自由球员买到后进入<b>街球队</b>。暗拍：截止后，在不低于球员暗拍最低价的情况下，出价最高者得；你看不到别人的出价。每个球员只能出价一次。小秘书的提示价是“舍去”形式的（最低价 49999 也会提示“40000 以上”），保险起见多出一点。',
      sdraft: '街球选秀的球员进入<b>职业队</b>，暗拍。身材好的球员价格非常高。注意：这些球员再次出售只能得到市场价的 5%。',
      pro: '职业转会采用<b>明拍</b>：每次加价必须高于当前价 5%，截止时出价最高者得。截止前有人出价会延时。买入后进入职业队。经理拍卖出来的球员可以看到潜力星星。',
      extreme: '极限球员在赛季中期开放，都是高水平球员，暗拍，进入职业队。',
      watch: '你出过价或关注的球员。',
      mine: '你挂牌出售的球员。'
    };
    h += '<p class="tip">' + DESC[tab] + '　当前资金：' + UI.money(S.user.money) + '</p>';
    var list;
    if (tab === 'watch') list = S.market.filter(function (l) { return S.user.watch.indexOf(l.id) >= 0; });
    else if (tab === 'mine') list = S.market.filter(function (l) { return l.seller === 'user'; });
    else list = S.market.filter(function (l) { return l.mk === tab && l.seller !== 'user'; });
    if (!list.length) return h + '<span class="muted">暂无球员</span>';
    var showStars = tab === 'pro' || tab === 'watch';
    h += '<table class="grid"><tr><th>姓名</th><th>市场</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>综合</th>' + (showStars ? '<th>潜力</th>' : '') + '<th>截止</th><th>价格</th><th>状态</th><th>操作</th></tr>' + list.map(function (l) {
      var p = S.players[l.pid]; if (!p) return '';
      var days = l.end - S.dayNo;
      var price, status = '', ops = '';
      if (l.seller === 'user') {
        price = l.mk === 'auction' ? '游戏币竞价' : '底价 ' + U.money(l.price);
        status = '挂牌中';
        ops = UI.link('撤销', 'unlist', { id: l.id });
      } else if (l.open) {
        price = U.money(l.price);
        status = l.leader === 'user' ? '<b class="ok">你领先</b>' : l.leader === 'ai' ? '<span class="red">被超价</span>' : '起拍价';
        ops = l.leader === 'user' ? '' : UI.btn('出价', 'bid', { id: l.id }, 'sm');
      } else {
        price = '提示：' + U.money(M().hint(l.min)) + ' 以上';
        status = l.userBid ? '已出价 ' + U.money(l.userBid) : l.cancelled ? '已取消' : '';
        ops = l.userBid ? UI.link('取消出价', 'cancelbid', { id: l.id }) : l.cancelled ? '' : UI.btn('出价', 'bid', { id: l.id }, 'sm');
      }
      var watch = S.user.watch.indexOf(l.id) >= 0;
      if (l.seller !== 'user') ops += ' ' + UI.link(watch ? '取消关注' : '关注', 'watch', { id: l.id });
      return '<tr><td>' + UI.pname(p) + '</td><td class="small">' + M().NAMES[l.mk] + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td><b>' + UI.ovrTag(P.ovr(p)) + '</b></td>' + (showStars ? '<td>' + (l.mk === 'pro' ? UI.stars(P.stars(p)) : '-') + '</td>' : '') +
        '<td>' + (days <= 0 ? '今天' : days + ' 天后') + '</td><td>' + price + '</td><td>' + status + '</td><td>' + ops + '</td></tr>';
    }).join('') + '</table><p class="muted small">交易在「进入下一天」时结算，成交后球员到队。</p>';
    return h;
  };
  A.bid = function (d) {
    var S = UI.S, l = M().get(S, d.id), p = S.players[l.pid];
    var mb = M().minBid(S, l);
    var sug = l.open ? mb : Math.round(Math.max(l.min, M().hint(l.min) * 1.25) / 1000) * 1000;
    UI.sel = p.id; UI.renderCard();
    UI.modal('出价：' + esc(p.name), '<p>' + (l.open ? '明拍，当前价 ' + U.money(l.price) + '，最低出价 <b>' + U.money(mb) + '</b>' : '暗拍，小秘书提示：请您出价 <b>' + U.money(M().hint(l.min)) + '</b> 以上（只能出价一次）') + '</p>' +
      '<p>出价：<input id="bidv" type="number" step="1000" value="' + sug + '"></p><p>球员期望工资约 ' + U.money(P.salaryFor(p)) + '/轮</p><p>' + UI.btn('确认出价', 'biddo', { id: l.id }) + '</p>');
  };
  A.biddo = function (d) { var v = +document.getElementById('bidv').value; UI.closeModal(); UI.result(M().bid(UI.S, d.id, v), '出价成功'); };
  A.cancelbid = function (d) { UI.result(M().cancel(UI.S, d.id), '已取消出价（不能再次出价）'); };
  A.unlist = function (d) { UI.result(M().unlist(UI.S, d.id), '已撤销挂牌'); };
  A.watch = function (d) {
    var w = UI.S.user.watch, i = w.indexOf(d.id);
    if (i >= 0) w.splice(i, 1); else w.push(d.id);
    UI.persist(); UI.render();
  };

  // ===== 职业选秀 =====
  V.draft = function () {
    var S = UI.S, d = S.draft;
    var h = '<p class="tip">和 NBA 一样，每个赛季结束时按胜率由低到高的顺序选秀，每队一个签。职业选秀不花费资金。</p>';
    if (!d) return h + '<span class="muted">第一个赛季结束后才会举行选秀。</span>';
    if (!d.done && d.order[d.idx] === S.user.proId) {
      var pool = d.pool.map(function (id) { return S.players[id]; }).filter(function (p) { return p && !p.teamId; }).sort(function (a, b) { return P.ovr(b) - P.ovr(a); });
      h += UI.box('轮到你了！第 ' + (d.idx + 1) + ' 顺位', '<table class="grid"><tr><th>姓名</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>综合</th><th>潜力</th><th></th></tr>' + pool.slice(0, 40).map(function (p) {
        return '<tr><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td><b>' + UI.ovrTag(P.ovr(p)) + '</b></td><td>' + UI.stars(P.stars(p)) + '</td><td>' + UI.btn('选他', 'draftpick', { pid: p.id }, 'sm') + '</td></tr>';
      }).join('') + '</table><p>' + UI.btn('放弃本轮选秀', 'draftskip', {}, 'sm') + '</p>');
    } else if (d.done) h += '<div class="ok">本届选秀已结束。</div>';
    h += UI.box('选秀结果', '<table class="grid"><tr><th>顺位</th><th>球队</th><th>球员</th></tr>' + d.picks.map(function (x, i) {
      return '<tr class="' + (x.user ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(x.team) + '</td><td>' + (x.pid && S.players[x.pid] ? UI.pname(S.players[x.pid]) : esc(x.player)) + '</td></tr>';
    }).join('') + '</table>');
    return h;
  };
  A.draftpick = function (d) { UI.result(M().draftPick(UI.S, d.pid), '选秀成功！'); };
  A.draftskip = function () { M().draftSkip(UI.S); UI.result(null, '已放弃'); };

  // ===== 道具商店 =====
  V.shop = function () {
    var S = UI.S;
    var h = '<div class="sumline">游戏币：<b>' + S.user.coins + '</b>　<span class="muted">游戏币获得途径：胜者为王（王者积分 1:1 兑换）、街头竞价出售街球员</span>　会员：<b class="ok">已开通</b>（单机版免费：文字直播、色条 1 天显示、一键加点、税收优惠）</div>';
    h += UI.box('游戏币充值（单机版免费）', '<p>原版比例 1 元 = 100 游戏币。单机版不收钱，点一下直接到账。</p><p>' +
      [[100, '1 元'], [1000, '10 元'], [5000, '50 元'], [10000, '100 元']].map(function (x) { return UI.btn('充 ' + x[1] + '（' + x[0] + ' 游戏币）', 'recharge', { v: x[0] }, 'sm'); }).join(' ') +
      '　自定义：<input id="recharge-v" type="number" min="1" step="100" value="500" style="width:90px"> ' + UI.btn('充值', 'recharge', {}, 'sm') + '</p>');
    h += '<table class="grid"><tr><th>道具</th><th>说明</th><th>价格</th><th>拥有</th><th></th></tr>' + X.ITEMS.map(function (it) {
      var own = it.id === 'select' ? S.user.selectCards : (S.user.items[it.id] || 0);
      var use = '';
      if (it.id === 'fund' && own > 0) use = UI.btn('使用', 'usefund', {}, 'sm');
      if (it.id === 'reset' && own > 0) use = UI.btn('洗职业队', 'usereset', { t: 'pro' }, 'sm') + ' ' + UI.btn('洗街球队', 'usereset', { t: 'street' }, 'sm');
      if (it.id === 'double') use = UI.doubleWidget();
      return '<tr><td><b>' + it.cn + '</b></td><td class="small">' + it.desc + '</td><td>' + it.price + ' 游戏币</td><td>' + own + '</td><td>' + UI.btn('购买', 'buy', { id: it.id }, 'sm') + ' ' + use + '</td></tr>';
    }).join('') + '</table>';
    return h;
  };
  A.buy = function (d) {
    var S = UI.S, it = X.ITEMS.find(function (x) { return x.id === d.id; });
    if (S.user.coins < it.price) return UI.toast('游戏币不足', true);
    S.user.coins -= it.price;
    if (it.id === 'select') S.user.selectCards += 1; else S.user.items[it.id] = (S.user.items[it.id] || 0) + 1;
    UI.result(null, '购买了 ' + it.cn);
  };
  A.recharge = function (d) {
    var v = d.v ? +d.v : Math.round(+document.getElementById('recharge-v').value);
    if (!(v > 0)) return UI.toast('请输入充值数量', true);
    v = Math.min(v, 1000000);
    UI.S.user.coins += v;
    UI.result(null, '充值成功，获得 ' + v + ' 游戏币');
  };
  A.usefund = function () { var S = UI.S; S.user.items.fund--; W().earn(S, 1000000, '财富银卡兑换'); UI.result(null, '获得 100 万资金'); };
  A.usereset = function (d) {
    var S = UI.S, t = d.t === 'pro' ? W().userPro(S) : W().userStreet(S);
    S.user.items.reset--; t.prof = { off: {}, def: {} };
    UI.result(null, '战术熟练度已重置');
  };

  // ===== 经理手册 =====
  V.manual = function () {
    var sec = function (t, body) { return UI.box(t, body); };
    return sec('XBA 是什么', '<p>XBA篮球经理是一款模拟 NBA 俱乐部运作的篮球经营游戏。你同时拥有一支<b>街球队</b>（青年队，用来培养球员）和一支<b>职业队</b>（参加职业联赛）。比赛由系统根据球员能力和战术自动模拟，以文字直播呈现。</p><p>本单机版中，其他球队都由 AI 经理运营；点击右上角「进入下一天」推进时间，每天进行一轮职业联赛。</p>') +
      sec('一天里做什么', '<ol><li>街球队打<b>训练赛</b>/报名<b>杯赛</b>赚训练点，用训练点给街球员加点。</li><li>给职业队员安排训练项目（第二天生效）。</li><li>检查职业队体力，调整<b>阵容战术</b>（每节的阵容和战术）。</li><li>逛转会市场，出价买人；招募职员；调整票价、签广告。</li><li>进入下一天，观看联赛现场文字直播。</li></ol>') +
      sec('球员能力', '<p>11 项能力：速度、弹跳、强壮、耐力（体质能力）；投篮、三分、运球、传球、篮板、抢断、封盖（技术能力）。另有进攻意识、防守意识、团队意识、领导能力、毅力等隐藏属性。</p><p>属性条颜色代表潜力（上限与现值的差）：绿色空间大，红色、灰色接近上限。综合能力按位置加权：中锋看重强壮、篮板、封盖；组织后卫看重速度、运球、传球、抢断。</p><p>球员老化后速度、弹跳、强壮、耐力衰退约 10%，技术能力衰退约 5%，意识不衰退。职业球员 28-42 岁退役。</p>') +
      sec('比赛引擎', '<p>决定胜负的因素：首先是球员能力（含体力），其次是战术，然后是阵容状态（主力工资超出工资帽越多越差）。</p><p>每次进攻会按进攻战术选择一种进攻方式（共 14 种），再选出进攻核心出手；防守战术通过克制进攻方式来克制进攻战术。实力接近时，战术就成了主要因素。体力低于 80 能力下降且容易受伤。</p><p>花式进攻（隔人扣篮、风车灌篮等）由出手球员的身高、弹跳、速度和进攻意识决定。</p>') +
      sec('联赛与杯赛', '<p>职业联赛每联赛 14 队，每天一轮，一个赛季 26 轮（第 13 轮后休息一天，赛季末再休息一天）。前 2 名升级，后 4 名降级。联赛分 4 个等级，像金字塔一样。</p><p>街球杯赛：新人杯（需邀请函、街球 1 级）、小杯赛（按街球等级）、大杯赛（每赛季两次）。胜者为王：最多 9 连胜的职业淘汰赛，赢游戏币。</p>') +
      sec('经营', '<p>收入：主场门票、球衣销售、广告、比赛奖金。支出：球员工资（每轮）、职员（雇佣时一次付清）、球场建设、奢侈税（3000 + 超出工资帽部分 × 5）、赛季所得税（净利润的 25%，会员优惠）。</p><p>可悬挂广告数 = 球迷数 / 4000 + 1。球队成绩越好，球迷越多。</p>') +
      sec('球员特长', '<p>能力练到一定程度会自动解锁特长，比赛中真实生效（对手的球员也有）。超出门槛越多，特长等级越高：铜 → 银 → 金 → 名人堂。每名球员只有 3 个徽章槽（每升 2 星多 1 个，最多 5 个），等级最高的几个特长才会生效。</p><table class="grid"><tr><th>特长</th><th>解锁条件</th><th>效果</th></tr>' + X.TRAITS.map(function (t) { return '<tr><td>' + t.icon + ' ' + t.cn + '</td><td>' + t.need + '</td><td>' + t.desc + '</td></tr>'; }).join('') + '</table>') +
      sec('转会', '<p>只有用选拔卡提拔的本土球员（绿色名字）能按市场价出售，其他球员只能按 5% 出售——游戏鼓励自主培养。从第二个职业赛季起，每赛季发 1 张街球选拔卡。</p>');
  };

  // ===== 存档设置 =====
  V.settings = function () {
    var S = UI.S;
    var size = Math.round(X.Save.serialize(S).length / 1024);
    return UI.box('存档', '<p>游戏进度会<b>自动保存</b>在本浏览器中（IndexedDB）。存档大小约 ' + size + ' KB。换浏览器或清理浏览器数据会丢失存档，建议定期导出备份。</p><p>' +
      UI.btn('立即保存', 'savenow') + ' ' + UI.btn('导出存档文件', 'exportsave') + ' ' + UI.btn('导入存档文件', 'importsave') + '</p>') +
      UI.box('重新开始', '<p>删除当前存档并开始新游戏。</p><p>' + UI.btn('开始新游戏', 'resetgame') + '</p>') +
      UI.box('关于', '<p>本作是对 2006 年网页游戏《XBA篮球经理》玩法的单机复刻，规则参数参考了当年的《经理手册》（比赛引擎的进攻方式比率表、防守克制表、位置能力侧重表等）。仅供个人怀旧娱乐。</p>');
  };
  A.savenow = function () { X.Save.save(UI.S).then(function () { UI.toast('已保存'); }); };
  A.exportsave = function () { X.Save.exportFile(UI.S); };
  A.importsave = function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var S = JSON.parse(r.result);
          if (!S.players || !S.teams || !S.user) throw new Error('不是有效的 XBA 存档');
          UI.S = S; UI.persist(); UI.go('home'); UI.toast('存档已导入');
        } catch (e) { UI.toast('导入失败：' + e.message, true); }
      };
      r.readAsText(f);
    };
    inp.click();
  };
  A.resetgame = function () {
    UI.modal('开始新游戏', '<p class="red">当前存档将被删除且无法恢复（除非你导出过）。确定吗？</p><p>' + UI.btn('确定删除并重新开始', 'resetdo') + ' ' + UI.btn('取消', 'closemodal') + '</p>');
  };
  A.resetdo = function () {
    UI.closeModal();
    X.Save.clear().then(function () { UI.S = null; UI.route = 'home'; document.getElementById('app').innerHTML = ''; UI.render(); });
  };

  // ===== 进入下一天 =====
  A.advance = function () {
    var S = UI.S;
    if (UI.busy) return;
    var warn = [];
    if (S.draft && !S.draft.done && S.draft.order[S.draft.idx] === S.user.proId) warn.push('职业选秀还没选人，将自动为你选择最好的新秀');
    var pro = W().userPro(S);
    var hurt = 0;
    pro.boards.league.presets.forEach(function (pr, i) { if (pro.boards.league.config.q.indexOf(i) >= 0) pr.lineup.forEach(function (id) { var p = S.players[id]; if (!id || (p && p.inj > 0)) hurt++; }); });
    if (W().roundOfDay(S.day) && hurt) warn.push('联赛阵容中有空位或伤病球员，比赛时系统会自动用替补顶上');
    if (warn.length && !UI._confirmAdv) {
      UI._confirmAdv = true;
      UI.modal('确认进入下一天', '<ul>' + warn.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul><p>' + UI.btn('继续', 'advance') + ' ' + UI.btn('取消', 'advcancel') + '</p>');
      return;
    }
    UI._confirmAdv = false;
    UI.closeModal();
    UI.busy = true;
    var label = W().dayLabel(S);
    var lastMsg = S.msgs[0] && S.msgs[0].id;
    var main = document.getElementById('main');
    if (main) main.innerHTML = '<div class="loading">🏀 比赛进行中……<br><span class="muted small">' + esc(label) + '</span></div>';
    setTimeout(function () {
      try {
        var out = W().advance(S, UI._pre);
        UI._pre = null;
        var news = [];
        for (var i = 0; i < S.msgs.length && S.msgs[i].id !== lastMsg; i++) news.push(S.msgs[i]);
        out.label = label; out.news = news;
        UI.lastReport = out;
        X.Save.save(S).catch(function () { UI.toast('自动保存失败', true); });
        UI.busy = false;
        UI.go('report');
      } catch (e) {
        UI.busy = false; console.error(e); UI.toast('推进出错：' + e.message, true); UI.render();
      }
    }, 30);
  };
  A.advcancel = function () { UI._confirmAdv = false; UI.closeModal(); };
})(window.XBA);
