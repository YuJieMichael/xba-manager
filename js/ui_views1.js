// 页面：新手学堂、首页、球员管理、球员训练、职员、球场、财政、消息、荣誉
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var M = function () { return X.Market; };

  // ===== 新手学堂 =====
  UI.ob = { step: 1, manager: '', teamName: '', color: '#c8102e', pro: {}, street: {} };
  V.onboard = function () {
    var S = UI.S, ob = UI.ob;
    var h = '<div class="ob"><div class="ob-logo">🏀 XBA篮球经理 <small>单机复刻版</small></div><div class="ob-steps">' +
      ['球队命名', '挑选职业队', '挑选街球队', '领取资格证'].map(function (s, i) { return '<span class="' + (ob.step === i + 1 ? 'on' : ob.step > i + 1 ? 'done' : '') + '">' + (i + 1) + '. ' + s + '</span>'; }).join('') + '</div>';
    if (!S) {
      h += '<div class="box"><div class="box-h">新手学堂</div><div class="box-b"><p>欢迎来到 XBA！这是 2006 年网页游戏《XBA篮球经理》的单机复刻版，其他球队由 AI 经理运营。</p>' +
        '<p>' + UI.btn('开始新游戏', 'obnew', {}, 'big') + '</p><p class="muted">已有存档？到「存档设置」可导入；或刷新页面自动读取浏览器中的存档。</p>' +
        '<p>' + UI.btn('导入存档文件', 'importsave') + '</p></div></div></div>';
      return h;
    }
    var cand = S.onboard;
    if (ob.step === 1) {
      h += UI.box('第一步：注册你的第一支球队', '<div class="form">' +
        '<label>经理名称 <input id="ob-mgr" maxlength="12" value="' + esc(ob.manager) + '" placeholder="例如：巨石阵"></label>' +
        '<label>球队名称 <input id="ob-team" maxlength="12" value="' + esc(ob.teamName) + '" placeholder="例如：青岛海鸥"></label>' +
        '<div>球衣颜色 <div class="colors">' + X.JERSEY_COLORS.map(function (c) {
          return '<span class="swatch' + (ob.color === c.c ? ' on' : '') + '" style="background:' + c.c + '" title="' + c.cn + '" data-act="obcolor" data-c="' + c.c + '"></span>';
        }).join('') + '</div></div>' +
        '<p>' + UI.btn('下一步：挑选球员', 'obnext', { s: 2 }, 'big') + '</p></div>');
    } else if (ob.step === 2 || ob.step === 3) {
      var pro = ob.step === 2;
      var ids = pro ? cand.pro : cand.street, chosen = pro ? ob.pro : ob.street;
      var need = pro ? 8 : 4, budget = pro ? cand.proBudget : cand.streetBudget;
      var spent = U.sum(Object.keys(chosen).map(function (id) { return S.players[id].price; }));
      var n = Object.keys(chosen).length;
      var rows = ids.map(function (id) {
        var p = S.players[id], on = !!chosen[id];
        return '<tr class="' + (on ? 'sel' : '') + '"><td><input type="checkbox" data-change="obpick" data-pid="' + id + '"' + (on ? ' checked' : '') + '></td><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td><b>' + UI.ovrTag(P.ovr(p)) + '</b></td><td>' + UI.stars(P.stars(p)) + '</td>' + (pro ? '<td>' + U.money(P.salaryFor(p)) + '</td>' : '') + '<td>' + U.money(p.price) + '</td></tr>';
      }).join('');
      h += UI.box((pro ? '第二步：挑选职业队球员（需 ' + need + ' 名）' : '第三步：挑选街球队球员（需 ' + need + ' 名）'),
        '<p class="tip">' + (pro ? '选人时要综合考虑身体条件、综合水平和年龄。和 NBA 一样，XBA 最奇缺的是<b>中锋</b>！这笔选人资金系统只给一次，尽量花光。' : '街球队用于培养年轻球员。年轻球员可塑性强，能力相近时一定选年龄小的。潜力星级越高，成长空间越大。') + '</p>' +
        '<div class="ob-budget">已选 <b>' + n + '</b>/' + need + '　花费 ' + UI.money(spent) + ' / 预算 ' + UI.money(budget) + '　剩余 <b class="' + (spent > budget ? 'red' : '') + '">' + U.money(budget - spent) + '</b></div>' +
        '<table class="grid"><tr><th></th><th>姓名</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>综合</th><th>潜力</th>' + (pro ? '<th>薪水/轮</th>' : '') + '<th>价格</th></tr>' + rows + '</table>' +
        '<p>' + UI.btn('上一步', 'obnext', { s: ob.step - 1 }) + ' ' + UI.btn('下一步', 'obnext', { s: ob.step + 1 }, 'big') + '</p>');
    } else {
      var pc = '#c8102e';
      h += UI.box('第四步：领取《XBA篮球经理资格证》', '<div class="cert"><div class="cert-t">XBA 篮球经理资格证</div><p>兹证明 <b>' + esc(ob.manager) + '</b> 经理</p><p>执掌职业队 <b style="color:' + ob.color + '">' + esc(ob.teamName) + '</b></p><p>街球队 <b>' + esc(ob.teamName) + '街球队</b></p><p class="muted">启动资金 50 万 · 新人杯邀请函 20 张</p></div>' +
        '<p>' + UI.btn('上一步', 'obnext', { s: 3 }) + ' ' + UI.btn('领取资格证，开始游戏！', 'obfinish', {}, 'big') + '</p>');
    }
    return h + '</div>';
  };
  A.obnew = function () {
    var name = '经理';
    UI.S = W().newGame(name);
    UI.ob = { step: 1, manager: '', teamName: '', color: '#c8102e', pro: {}, street: {} };
    UI.render();
  };
  A.obcolor = function (d) { saveOb1(); UI.ob.color = d.c; UI.render(); };
  function saveOb1() {
    var m = document.getElementById('ob-mgr'), t = document.getElementById('ob-team');
    if (m) UI.ob.manager = m.value.trim();
    if (t) UI.ob.teamName = t.value.trim();
  }
  A.obpick = function (d, el) {
    var key = UI.ob.step === 2 ? 'pro' : 'street';
    if (el.checked) UI.ob[key][d.pid] = 1; else delete UI.ob[key][d.pid];
    UI.render();
  };
  A.obnext = function (d) {
    var ob = UI.ob, S = UI.S, s = +d.s;
    if (ob.step === 1) {
      saveOb1();
      if (!ob.manager || !ob.teamName) return UI.toast('请填写经理名称和球队名称', true);
    }
    if (s > ob.step && (ob.step === 2 || ob.step === 3)) {
      var pro = ob.step === 2, chosen = pro ? ob.pro : ob.street, need = pro ? 8 : 4;
      var budget = pro ? S.onboard.proBudget : S.onboard.streetBudget;
      var spent = U.sum(Object.keys(chosen).map(function (id) { return S.players[id].price; }));
      if (Object.keys(chosen).length !== need) return UI.toast('请选择 ' + need + ' 名球员', true);
      if (spent > budget) return UI.toast('超出预算了', true);
    }
    ob.step = s; UI.render();
  };
  A.obfinish = function () {
    var ob = UI.ob;
    W().finishOnboard(UI.S, { manager: ob.manager, teamName: ob.teamName, color: ob.color, pro: Object.keys(ob.pro), street: Object.keys(ob.street) });
    UI.persist();
    UI.go('home');
  };

  // ===== 首页 =====
  V.home = function () {
    var S = UI.S, pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var round = W().roundOfDay(S.day), h = '';
    var next = '';
    if (round) {
      var g = (lg.schedule[round - 1] || []).find(function (x) { return x[0] === pro.id || x[1] === pro.id; });
      if (g) {
        var home = g[0] === pro.id, opp = S.teams[home ? g[1] : g[0]];
        var rank = W().standings(S, lg).indexOf(opp) + 1;
        next = '<div class="next">今日联赛（第 ' + round + ' 轮，' + (home ? '主场' : '客场') + '）：' + UI.teamLink(pro) + ' <b>VS</b> ' + UI.teamLink(opp) + '　对手排名第 ' + rank + '（' + opp.rec.w + '胜' + opp.rec.l + '负）' + (X.Rivals.isRival(S, opp.id) ? ' <b class="red">🔥 宿敌对决！门票和球衣收入 ×1.5</b>' : '') + '<br>' +
          UI.link('设置职业战术 →', 'go', { r: 'tac_pro' }) + '　' + UI.link('查看对手比赛录像 →', 'go', { r: 'league', a: 'video:' + opp.id }) + '</div>';
      }
    } else if (X.Playoffs.isDay(S.day)) next = UI.playoffToday(S);
    else next = '<div class="next">今天是' + (S.day === 13 ? '赛季中休息日：「极限球员」市场开放，并将举行<b>全明星周末</b>（全明星赛、三分大赛、扣篮大赛）' : '赛季末休息日') + '，没有联赛。</div>';
    if (W().roundOfDay(S.day) || X.Playoffs.isDay(S.day)) next += '<div>' + UI.coachToggle(S) + '</div>';
    h += UI.box('今日赛程', next + '<div class="muted small">点击右上角「进入下一天」进行今天的比赛（职业联赛 9:00 开赛，会员可观看现场文字直播）。</div>');
    h += UI.goalsBox ? UI.goalsBox(S) : '';
    if (S.highlights && S.highlights.list) h += UI.highlightsBox(S.highlights.list, '📺 最近五佳球');
    if ((S.tradeOffers || []).length) h += UI.box('📨 交易报价', '有 ' + S.tradeOffers.length + ' 份交易报价等你回复 ' + UI.link('去看看', 'go', { r: 'trade' }));
    var mg = S.user.mgr; if (mg && mg.pts > 0) h += '<div class="tip">🎓 你有 ' + mg.pts + ' 个经理技能点没用 ' + UI.link('去加点', 'go', { r: 'manager' }) + '</div>';
    // 待办
    var todo = [];
    var stp = W().teamPlayers(S, W().userStreet(S));
    var tp = S.user.streetTP || 0;
    if (tp >= 10) todo.push('街球队还有 <b>' + tp + '</b> 训练点没用 ' + UI.link('去训练', 'go', { r: 'training' }));
    var noTrain = W().teamPlayers(S, pro).filter(function (p) { return !p.train; }).length;
    if (noTrain) todo.push(noTrain + ' 名职业队员没有安排训练项目 ' + UI.link('去安排', 'go', { r: 'training' }));
    ['trainer', 'nutri', 'doctor'].forEach(function (t) { if (!pro.staff[t]) todo.push('职业队缺少' + X.STAFF_TYPES[t] + ' ' + UI.link('去招募', 'go', { r: 'staff' })); });
    var exp = W().teamPlayers(S, pro).filter(function (p) { return p.contract < 10; });
    if (exp.length) todo.push(exp.map(function (p) { return esc(p.name); }).join('、') + ' 合同即将到期 ' + UI.link('去续约', 'go', { r: 'players' }));
    if (S.cups.some(function (c) { return !c.registered && (c.type !== 'newbie' || (S.user.streetLevel === 1 && S.user.items.newbie > 0)); })) todo.push('今天有可报名的街球杯赛 ' + UI.link('去报名', 'go', { r: 'cups' }));
    if (S.draft && !S.draft.done) todo.push('<b class="red">职业选秀轮到你选人了！</b> ' + UI.link('去选秀', 'go', { r: 'draft' }));
    if (S.user.selectCards > 0) todo.push('你有 ' + S.user.selectCards + ' 张街球选拔卡 ' + UI.link('去选拔', 'go', { r: 'players' }));
    var pay = W().payroll(S, pro), cap = W().cap(pro);
    if (pay > cap) todo.push('<b class="red">工资总额超过工资帽，需缴奢侈税且不能购买新球员</b>');
    h += UI.box('经理待办', todo.length ? '<ul class="todo">' + todo.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '<span class="muted">一切就绪！</span>');
    // 积分榜简表
    var st = W().standings(S, lg);
    h += '<div class="cols2"><div>' + UI.box(esc(lg.name) + ' 排名', standingsTable(S, st, true), UI.link('完整排名', 'go', { r: 'league' })) + '</div><div>' +
      UI.box('最新消息', S.msgs.slice(0, 10).map(function (m) { return '<div class="msg-line ' + m.type + '"><span class="muted">[' + m.season + '-' + (m.day + 1) + ']</span> ' + esc(m.txt) + '</div>'; }).join('') || '<span class="muted">暂无</span>', UI.link('全部', 'go', { r: 'msgs' })) + '</div></div>';
    // 最近比赛
    var recent = S.myMatches.slice(0, 6).map(function (id) { return S.matches[id]; }).filter(Boolean);
    h += UI.box('最近比赛', recent.length ? matchList(S, recent) : '<span class="muted">还没有比赛</span>');
    return h;
  };

  function standingsTable(S, st, compact) {
    return '<table class="grid"><tr><th>#</th><th>球队</th><th>胜</th><th>负</th><th>净胜</th>' + (compact ? '' : '<th>得分</th><th>失分</th><th>球迷</th>') + '</tr>' + st.map(function (t, i) {
      var cls = i < 2 ? 'up' : i >= st.length - 4 ? 'down' : '';
      return '<tr class="' + cls + (t.isUser ? ' me' : '') + '"><td>' + (i + 1) + '</td><td>' + UI.teamLink(t) + '</td><td>' + t.rec.w + '</td><td>' + t.rec.l + '</td><td>' + (t.rec.pf - t.rec.pa) + '</td>' + (compact ? '' : '<td>' + t.rec.pf + '</td><td>' + t.rec.pa + '</td><td>' + U.money(t.fans) + '</td>') + '</tr>';
    }).join('') + '</table>';
  }
  UI.standingsTable = standingsTable;

  var TYPE_CN = { league: '职业联赛', cup: '街球杯赛', train: '训练赛', friendly: '友谊赛', show: '表演赛', wk: '胜者为王', xcup: 'XBA杯', playoff: '季后赛', allstar: '全明星赛', challenge: '联盟挑战' };
  function matchList(S, list) {
    return '<table class="grid"><tr><th>时间</th><th>类型</th><th>主队</th><th>比分</th><th>客队</th><th></th></tr>' + list.map(function (m) {
      var meH = S.teams[m.home.id] && S.teams[m.home.id].isUser, meA = S.teams[m.away.id] && S.teams[m.away.id].isUser;
      var won = (meH && m.hs > m.as) || (meA && m.as > m.hs);
      return '<tr><td>' + m.season + '-' + (m.day + 1) + '</td><td>' + (TYPE_CN[m.type] || m.type) + (m.cup ? '<br><span class="muted small">' + esc(m.cup) + '</span>' : '') + '</td><td>' + esc(m.home.name) + '</td><td class="' + (won ? 'win' : 'lose') + '"><b>' + m.hs + ' : ' + m.as + '</b></td><td>' + esc(m.away.name) + '</td><td>' + UI.link('战报', 'go', { r: 'match', a: m.id }) + '</td></tr>';
    }).join('') + '</table>';
  }
  UI.matchList = matchList;
  UI.TYPE_CN = TYPE_CN;

  // ===== 球员管理 =====
  V.players = function () {
    var S = UI.S, tab = UI.curTab('players', 'pro');
    var h = UI.tabs('players', [['pro', '职业队'], ['street', '街球队']], tab);
    if (tab === 'pro') {
      var pro = W().userPro(S), ps = W().teamPlayers(S, pro).sort(function (a, b) { return P.ovr(b) - P.ovr(a); });
      var pay = W().payroll(S, pro), cap = W().cap(pro);
      var inLu = {};
      pro.boards.league.presets.forEach(function (pr) { pr.lineup.forEach(function (id) { if (id) inLu[id] = 1; }); });
      h += '<table class="grid"><tr><th>姓名</th><th>号码</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>体力</th><th>综合</th><th>薪水</th><th>合同</th><th>球迷支持</th><th>操作</th></tr>' + ps.map(function (p) {
        var ops = [];
        if (p.listing) ops.push('<span class="tag">挂牌中</span>');
        else ops.push(UI.link('出售', 'sellpro', { pid: p.id }));
        if (p.contract < 10) ops.push(UI.link('续约', 'renew', { pid: p.id }, 'hot'));
        if (P.isMaxed(p) && (p.star || 0) < X.STAR_MAX) ops.push(UI.link('升星', 'starup', { pid: p.id }, 'hot'));
        return '<tr><td>' + UI.pname(p) + '</td><td>' + p.num + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td>' + UI.stam(p.st) + '</td><td><b>' + UI.ovrTag(P.ovr(p)) + '</b></td><td>' + U.money(p.salary) + '</td><td class="' + (p.contract < 10 ? 'red' : '') + '">' + p.contract + '</td><td>' + Math.round(p.support) + '</td><td>' + ops.join(' ') + '</td></tr>';
      }).join('') + '</table>';
      h += '<div class="sumline">球员工资总额：' + UI.money(pay) + '/轮　工资帽：' + UI.money(cap) + '　阵容状态：<b>' + Math.round(W().lineupStatus(S, pro) * 100) + '%</b>　化学反应：<b title="由球员性格决定：领袖、老好人加分，刺头多了扣分">' + Math.round(P.chemistry(ps) * 100) + '%</b>　人数 ' + ps.length + '/' + M().PRO_MAX + '（最少 ' + M().PRO_MIN + '）' +
        (pay > cap ? '　<b class="red">已超工资帽！奢侈税 = 3000 + 超出额×5</b>' : '　<span class="ok">未达工资帽</span>') + '</div>';
      h += '<p class="tip">绿色名字 = 用选拔卡提拔的本土球员，可按市场价出售；其他途径得到的球员只能以市场价的 5% 出售（不流入市场）。</p>';
      h += '<p>球员奖金（下一轮发放，提高士气）：' + [0, 5000, 20000, 50000].map(function (v) { return UI.btn(v ? U.money(v) : '不发', 'bonus', { v: v }, 'sm' + (pro.bonus === v ? ' on' : '')); }).join(' ') + '</p>';
    } else {
      var st = W().userStreet(S), sp = W().teamPlayers(S, st).sort(function (a, b) { return P.ovr(b) - P.ovr(a); });
      h += '<table class="grid"><tr><th>姓名</th><th>号码</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>体力</th><th>心情</th><th>综合</th><th>潜力</th><th>操作</th></tr>' + sp.map(function (p) {
        var ops = [];
        if (p.listing) ops.push('<span class="tag">竞价中</span>');
        else {
          if (p.age >= 18) ops.push(UI.link('选拔', 'promote', { pid: p.id }, S.user.selectCards > 0 ? 'hot' : ''));
          if (p.age >= 18) ops.push(UI.link('选秀', 'sdraft', { pid: p.id }));
          ops.push(UI.link('挂牌', 'sellst', { pid: p.id }));
          ops.push(UI.link('下放', 'release', { pid: p.id }));
        }
        return '<tr><td>' + UI.pname(p) + '</td><td>' + p.num + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td>' + UI.stam(p.st) + '</td><td>' + UI.stam(p.mood) + '</td><td><b>' + UI.ovrTag(P.ovr(p)) + '</b></td><td>' + (P.potVisible(S, p) ? UI.stars(P.stars(p)) : '<span class="muted">?</span>') + '</td><td>' + ops.join(' ') + '</td></tr>';
      }).join('') + '</table>';
      h += '<div class="sumline">人数 ' + sp.length + '/' + M().ST_MAX + '（最少 ' + M().ST_MIN + '）　街球选拔卡：<b>' + S.user.selectCards + '</b> 张　' + UI.btn('雇用球探（' + (S.user.items.scout > 0 ? '道具×' + S.user.items.scout : '30 游戏币') + '）', 'scout', {}, 'sm') + '　自动球探，直到出现 <select id="scout-target">' + M().GRADES.map(function (g, i) { return '<option value="' + i + '"' + (i === (UI.scoutTarget == null ? 2 : UI.scoutTarget) ? ' selected' : '') + '>' + g.cn + '·' + g.name + (i < 3 ? ' 或更好' : '') + '</option>'; }).join('') + '</select> ' + UI.btn('开始', 'scoutauto', {}, 'sm') + ' <span class="muted small">每次 30 游戏币，找到后自动签下</span></div>';
      h += '<p class="tip">选拔：用选拔卡把 18 岁以上街球员提拔到职业队，潜力上限会提高（现值越接近上限、年龄越小，提升越多）。选秀：参加职业选秀离队，你只得到几万资金。挂牌：在街头竞价出售，获得游戏币。下放：球员结束篮球生涯。</p>';
      if (S.scout) {
        h += UI.box('球探报告', '<table class="grid"><tr><th>姓名</th><th>年龄</th><th>位置</th><th>身高</th><th>体重</th><th>综合</th><th></th></tr>' + S.scout.map(function (id) {
          var p = S.players[id];
          return '<tr><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + p.h + '</td><td>' + p.w + '</td><td>' + UI.ovrTag(P.ovr(p)) + '</td><td>' + UI.btn('签约', 'signscout', { pid: id }, 'sm nowrap') + '</td></tr>';
        }).join('') + '</table><div class="muted small">三选一。签约后球探才会告诉你他的潜力评价：' + M().GRADES.map(function (g) { return '<span class="grade" style="background:' + g.c + '">' + g.cn + '</span>'; }).join(' &lt; ') + '，红色是难得一见的天才。</div>');
      }
    }
    return h;
  };

  A.renew = function (d) {
    var S = UI.S, p = S.players[d.pid];
    var sal = P.salaryFor(p);
    UI.modal('续约 ' + esc(p.name), '<p>当前工资 ' + U.money(p.salary) + '/轮，剩余合同 ' + p.contract + ' 轮。</p><p>球员要求的新工资：<b>' + U.money(sal) + '</b>/轮（长约 52 轮需多付 5%）</p><p>' +
      [13, 26, 52].map(function (r) { return UI.btn('续约 ' + r + ' 轮', 'renewdo', { pid: p.id, r: r }); }).join(' ') + '</p>');
  };
  A.renewdo = function (d) { UI.closeModal(); UI.result(W().renewContract(UI.S, UI.S.players[d.pid], +d.r), '续约成功'); };
  A.sellpro = function (d) {
    var S = UI.S, p = S.players[d.pid];
    var v = P.value(p);
    if (!p.green) {
      UI.modal('出售 ' + esc(p.name), '<p>该球员不是本土培养的球员（非绿色名字），只能以市场价的 <b>5%</b> 出售，约 <b>' + U.money(Math.round(v * 0.05)) + '</b>，球员不流入转会市场。</p><p class="muted">出售会流失部分支持该球员的球迷。</p><p>' + UI.btn('确认出售', 'sellprodo', { pid: p.id }) + ' ' + UI.btn('取消', 'closemodal') + '</p>');
    } else {
      UI.modal('挂牌出售 ' + esc(p.name), '<p>本土球员可在职业转会市场以明拍出售，挂牌 2 天。市场估价约 ' + U.money(v) + '。</p><p>拍卖底价：<input id="reserve" type="number" value="' + Math.round(v * 0.6 / 1000) * 1000 + '" step="1000"></p><p>' + UI.btn('确认挂牌', 'sellprodo', { pid: p.id }) + '</p>');
    }
  };
  A.sellprodo = function (d) {
    var r = document.getElementById('reserve');
    UI.closeModal();
    UI.result(M().sellPro(UI.S, d.pid, r ? +r.value : 0), '操作成功');
  };
  A.sellst = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('街头竞价 ' + esc(p.name), '<p>挂牌后由其他经理用游戏币竞价，次日成交。会员获得成交价 70% 的游戏币。</p><p>' + UI.btn('确认挂牌', 'sellstdo', { pid: p.id }) + '</p>');
  };
  A.sellstdo = function (d) { UI.closeModal(); UI.result(M().sellStreet(UI.S, d.pid), '已挂牌'); };
  A.release = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('下放 ' + esc(p.name), '<p>下放后该球员将<b>结束篮球生涯</b>，无法恢复。确定吗？</p><p>' + UI.btn('确定下放', 'releasedo', { pid: p.id }) + ' ' + UI.btn('取消', 'closemodal') + '</p>');
  };
  A.releasedo = function (d) { UI.closeModal(); UI.result(M().release(UI.S, d.pid), '已下放'); };
  A.sdraft = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('参加选秀 ' + esc(p.name), '<p>球员参加职业选秀后离队，你只能获得部分系统定价资金（几万）。确定吗？</p><p>' + UI.btn('确定', 'sdraftdo', { pid: p.id }) + ' ' + UI.btn('取消', 'closemodal') + '</p>');
  };
  A.sdraftdo = function (d) { UI.closeModal(); UI.result(M().streetDraft(UI.S, d.pid), '球员已参加选秀'); };
  A.promote = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('选拔 ' + esc(p.name), '<p>使用 1 张街球选拔卡，将 ' + esc(p.name) + '（' + p.age + '岁，综合 ' + UI.ovrTag(P.ovr(p)) + '）提拔到职业队？</p><p class="muted">提拔后潜力上限提高，名字变为绿色（可按市场价出售）。剩余选拔卡：' + UI.S.user.selectCards + '</p><p>' + UI.btn('确定选拔', 'promotedo', { pid: p.id }) + '</p>');
  };
  A.promotedo = function (d) { UI.closeModal(); UI.result(M().promote(UI.S, d.pid), '选拔成功！'); };
  A.scout = function () { UI.result(M().scout(UI.S), '球探带回了 3 名年轻球员的报告'); };
  A.scoutauto = function () {
    var S = UI.S, t = +document.getElementById('scout-target').value;
    UI.scoutTarget = t;
    var r = M().scoutUntil(S, t);
    if (r.err) { UI.persist(); UI.render(); return UI.toast(r.err, true); }
    UI.persist(); UI.render();
    UI.revealScout(S.players[r.pid], '自动球探找了 ' + r.tries + ' 次' + (r.coins ? '，花费 ' + r.coins + ' 游戏币' : '') + (r.items ? '，用掉 ' + r.items + ' 张球探卡' : ''));
  };
  A.signscout = function (d) {
    var err = M().signScout(UI.S, d.pid);
    if (!UI.result(err)) return;
    UI.revealScout(UI.S.players[d.pid]);
  };
  UI.revealScout = function (p, note) {
    var g = M().GRADES[p.scoutGrade];
    UI.sel = p.id; UI.renderCard();
    UI.modal('球探评价', '<div class="reveal">' + UI.avatar(p, W().userStreet(UI.S).color, 72) + '<div><div class="reveal-n">' + esc(p.name) + ' 已加入街球队</div><div>球探对他的潜力评价：</div><div class="grade big" style="background:' + g.c + '">' + g.cn + ' · ' + g.name + '</div></div></div>' + (note ? '<p class="muted small">' + esc(note) + '</p>' : '') + '<p>' + UI.btn('知道了', 'closemodal') + '</p>');
  };
  A.bonus = function (d) { W().setBonus(UI.S, +d.v); UI.result(null, +d.v ? '下一轮将发放奖金，士气提升' : '已取消奖金'); };

  A.hidden = function (d) {
    var S = UI.S, p = S.players[d.pid];
    if (S.user.items.hidden > 0) S.user.items.hidden--; else if (S.user.coins >= 5) S.user.coins -= 5; else return UI.toast('需要「查看隐藏属性」道具或 5 游戏币', true);
    p.seen.hidden = true; UI.result(null, '已显示隐藏属性');
  };
  A.physio = function (d) {
    var S = UI.S, p = S.players[d.pid];
    if (S.user.items.physio <= 0) return UI.toast('没有理疗道具', true);
    S.user.items.physio--; p.st = 100; p.mood = 100;
    UI.result(null, p.name + ' 已恢复最佳状态');
  };
  // 全队理疗：先用理疗卡，不够时自动花游戏币买（15 个一张）
  A.physioall = function (d) {
    var S = UI.S, team = d.t === 'pro' ? W().userPro(S) : W().userStreet(S);
    var need = W().teamPlayers(S, team).filter(function (p) { return p.st < 100 || p.mood < 100; });
    if (!need.length) return UI.toast('全队都已是最佳状态');
    var done = 0, bought = 0;
    for (var i = 0; i < need.length; i++) {
      if (S.user.items.physio > 0) S.user.items.physio--;
      else if (S.user.coins >= 15) { S.user.coins -= 15; bought++; }
      else break;
      need[i].st = 100; need[i].mood = 100; done++;
    }
    if (!done) return UI.toast('没有理疗卡，游戏币也不足 15', true);
    UI.result(null, '理疗了 ' + done + ' 名球员' + (bought ? '（自动购买 ' + bought + ' 张理疗卡）' : '') + (done < need.length ? '，还有 ' + (need.length - done) + ' 人没轮到' : ''));
  };
  A.editp = function (d) {
    var p = UI.S.players[d.pid];
    UI.modal('修改 ' + esc(p.name), '<div class="form"><label>姓名 <input id="ep-name" maxlength="16" value="' + esc(p.name) + '"></label><label>位置 <select id="ep-pos">' + X.POS.map(function (x) { return '<option' + (x === p.pos ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label>号码 <input id="ep-num" type="number" min="0" max="99" value="' + p.num + '"></label><p>' + UI.btn('保存', 'editpdo', { pid: p.id }) + '</p></div>' +
      '<p class="muted small">位置只影响显示与综合能力计算；比赛中按场上位置发挥。</p>');
  };
  A.editpdo = function (d) {
    var S = UI.S, p = S.players[d.pid];
    var num = +document.getElementById('ep-num').value, pos = document.getElementById('ep-pos').value;
    var t = S.teams[p.teamId];
    if (W().teamPlayers(S, t).some(function (x) { return x !== p && x.num === num; })) return UI.toast('号码已被占用', true);
    var name = document.getElementById('ep-name').value.trim();
    if (!name) return UI.toast('姓名不能为空', true);
    p.name = name; p.num = num; p.pos = pos; UI.closeModal(); UI.result(null, '已修改');
  };
  A.talk = function (d) {
    var p = UI.S.players[d.pid];
    var cn = { off: '进攻意识', def: '防守意识', team: '团队意识' };
    UI.modal('与 ' + esc(p.name) + ' 谈话', '<p>经理只能通过谈话让球员在以后的比赛中着重提高某一项意识。训练其中一项时，另外两项会略有下降（但总体在增长）。</p><p>当前侧重：<b>' + cn[p.focus] + '</b></p><p>' +
      ['off', 'def', 'team'].map(function (k) { return UI.btn('多注意' + cn[k], 'talkdo', { pid: p.id, f: k }, p.focus === k ? 'on' : ''); }).join(' ') + '</p>');
  };
  A.talkdo = function (d) { UI.S.players[d.pid].focus = d.f; UI.closeModal(); UI.result(null, '谈话完成'); };

  // ===== 球员训练 =====
  V.training = function () {
    var S = UI.S, tab = UI.curTab('training', 'street');
    var h = UI.tabs('training', [['street', '街球队'], ['pro', '职业队']], tab);
    if (tab === 'street') {
      var st = W().userStreet(S), ps = W().teamPlayers(S, st);
      var tr = st.staff.trainer;
      var cost = Math.max(5, Math.round(10 * (1 - 0.045 * (tr ? tr.eff : 0))));
      h += '<p class="tip">街球队员训练消耗<b>全队共用的街球训练点</b>（每次 ' + cost + ' 点' + (tr ? '，训练员 ' + esc(tr.name) + ' 帮你节省' : '') + '），一次最多提升单项 3 点；会消耗体力、影响心情。训练点来自新人杯、小杯赛、大杯赛和训练赛。' + '<br>' + UI.doubleWidget() + '</p>';
      var spool = S.user.streetTP || 0;
      h += '<div class="sumline">街球训练点：<b class="money">' + spool + '</b>　' + UI.btn('全队一键加点', 'autotrainall', {}, 'big') + ' ' + UI.btn('全队理疗', 'physioall', { t: 'street' }) + ' <span class="muted small">理疗卡 ' + S.user.items.physio + ' 张，不够自动花 15 游戏币买</span></div>' + UI.tpExchange(S);
      h += '<table class="grid train"><tr><th>姓名</th><th>年龄</th><th>体力</th><th>心情</th><th>综合</th>' + X.ATTRS.map(function (k) { return '<th>' + X.ATTR_CN[k] + '</th>'; }).join('') + '<th></th></tr>' + ps.map(function (p) {
        var vis = P.potVisible(S, p);
        return '<tr><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + UI.stam(p.st) + '</td><td>' + UI.stam(p.mood) + '</td><td><b class="ovr">' + UI.ovrTag(P.ovr(p)) + '</b></td>' + X.ATTRS.map(function (k) {
          var gap = p.m[k] - p.a[k], band = P.potBand(gap);
          return '<td><span class="tv" style="border-bottom:3px solid ' + (vis ? X.POT_COLORS[band] : '#ccc') + '">' + p.a[k].toFixed(1) + '</span><br>' + (spool >= cost ? '<a class="plus" data-act="trainst" data-pid="' + p.id + '" data-k="' + k + '">+</a>' : '') + '</td>';
        }).join('') + '<td>' + (spool >= cost ? UI.btn('一键加点', 'autotrain', { pid: p.id }, 'sm nowrap') : '') + '</td></tr>';
      }).join('') + '</table>';
      h += '<p class="muted small">属性下方的颜色条代表潜力：绿色 = 成长空间大，红色/灰色 = 接近上限。一键加点会按球员位置的重要能力自动分配训练点。</p>';
      if (UI.lastTrain) h += UI.box('训练结果', UI.lastTrain.map(function (m) { return '<div>' + esc(m) + '</div>'; }).join(''));
    } else {
      var pro = W().userPro(S), pps = W().teamPlayers(S, pro);
      var ptr = pro.staff.trainer, pcost = P.proTrainCost(ptr), pool = S.user.proTP || 0;
      h += '<p class="tip">职业队每场比赛（联赛、XBA杯、表演赛）会按上场时间和表现获得训练点，全部汇总到<b>职业队训练点</b>里，由你分给任意球员加点（每次 ' + pcost + ' 点，一次最多 +3）。另外每名球员还可以安排一个<b>每日训练项目</b>，第二天自动生效。' + (ptr ? '训练员 ' + esc(ptr.name) + '（' + ptr.level + '级）会提高训练效果、节省训练点。' : '<b class="red">没有训练员，训练效果较差。</b>') + '</p>';
      h += '<div class="sumline">职业队训练点：<b class="money">' + pool + '</b>　' + UI.btn('全队一键加点', 'proautoall', {}, 'big') + ' ' + UI.btn('全队理疗', 'physioall', { t: 'pro' }, 'sm') + '　每日训练：' + UI.btn('按位置重点', 'protrainall', { k: 'auto' }, 'sm') + ' ' + UI.btn('全部休息', 'protrainall', { k: 'rest' }, 'sm') + '</div>' + UI.tpExchange(S);
      h += '<table class="grid train"><tr><th>姓名</th><th>年龄</th><th>位置</th><th>体力</th><th>综合</th>' + X.ATTRS.map(function (k) { return '<th>' + X.ATTR_CN[k] + '</th>'; }).join('') + '<th>每日训练</th><th>潜力剩余</th><th></th></tr>' + pps.map(function (p) {
        var vis = P.potVisible(S, p);
        var opts = '<option value="">（未安排）</option><option value="rest"' + (p.train === 'rest' ? ' selected' : '') + '>休息</option>' + X.ATTRS.map(function (k) {
          var full = p.m[k] - p.a[k] < 0.05;
          return '<option value="' + k + '"' + (p.train === k ? ' selected' : '') + '>' + X.ATTR_CN[k] + (vis && full ? '（已满）' : '') + '</option>';
        }).join('');
        return '<tr><td>' + UI.pname(p) + '</td><td>' + p.age + '</td><td>' + p.pos + '</td><td>' + UI.stam(p.st) + '</td><td><b class="ovr">' + UI.ovrTag(P.ovr(p)) + '</b></td>' + X.ATTRS.map(function (k) {
          var band = P.potBand(p.m[k] - p.a[k]);
          return '<td><span class="tv" style="border-bottom:3px solid ' + (vis ? X.POT_COLORS[band] : '#ccc') + '">' + p.a[k].toFixed(1) + '</span><br>' + (pool >= pcost ? '<a class="plus" data-act="trainpro" data-pid="' + p.id + '" data-k="' + k + '">+</a>' : '') + '</td>';
        }).join('') + '<td><select data-change="protrain" data-pid="' + p.id + '">' + opts + '</select></td><td>' + (P.isMaxed(p) && (p.star || 0) < X.STAR_MAX ? UI.btn('升星', 'starup', { pid: p.id }, 'sm on nowrap') : P.isMaxed(p) ? '<span class="pstar">满星</span>' : P.potRemain(p).toFixed(1)) + '</td><td>' + (pool >= pcost ? UI.btn('一键加点', 'proauto', { pid: p.id }, 'sm nowrap') : '') + '</td></tr>';
      }).join('') + '</table>';
      if (UI.lastTrain) h += UI.box('训练结果', UI.lastTrain.map(function (m) { return '<div>' + esc(m) + '</div>'; }).join(''));
    }
    return h;
  };
  function autoTrainPro(S, p, maxClicks) {
    var tr = W().userPro(S).staff.trainer, ranks = X.POS_ATTR_RANK[p.pos], gains = {}, used = 0, stop = '';
    var order = X.ATTRS.map(function (k, i) { return { k: k, r: ranks[i] }; });
    for (var n = 0; n < (maxClicks || 1000); n++) {
      var cands = order.filter(function (o) { return p.m[o.k] - p.a[o.k] > 0.05; });
      if (!cands.length) { stop = (p.star || 0) < X.STAR_MAX ? '已训满，可以升星了' : '已满星满级'; break; }
      var o = cands[U.wpick(cands.map(function (c) { return Math.pow(12 - c.r, 2) * (p.m[c.k] - p.a[c.k]); }))];
      var r = P.proTrainClick(S, p, o.k, tr);
      if (!r.gain) { if (r.cost === 0 && /训练点|体力|养伤/.test(r.msg)) { stop = r.msg.replace(p.name + ' ', ''); break; } continue; }
      gains[o.k] = (gains[o.k] || 0) + r.gain; used += r.cost;
    }
    return { gains: gains, used: used, stop: stop };
  }
  function trainSummary(p, r) {
    var parts = X.ATTRS.filter(function (k) { return r.gains[k]; }).map(function (k) { return X.ATTR_CN[k] + '+' + r.gains[k].toFixed(1); });
    return p.name + '：' + (parts.length ? parts.join(' ') + '（用掉 ' + r.used + ' 训练点）' : '没有加点') + (r.stop ? '　' + r.stop : '');
  }
  A.trainpro = function (d) {
    var S = UI.S, p = S.players[d.pid];
    var r = P.proTrainClick(S, p, d.k, W().userPro(S).staff.trainer);
    UI.lastTrain = [r.msg];
    if (!r.gain) UI.toast(r.msg, true);
    UI.persist(); UI.render();
  };
  A.proauto = function (d) {
    var p = UI.S.players[d.pid];
    UI.lastTrain = [trainSummary(p, autoTrainPro(UI.S, p))];
    UI.persist(); UI.render();
  };
  // 全队一键加点：轮流给每人加一次，直到训练点用完或全员练满
  A.proautoall = function () {
    var S = UI.S, ps = W().teamPlayers(S, W().userPro(S)), acc = {};
    ps.forEach(function (p) { acc[p.id] = { gains: {}, used: 0, stop: '' }; });
    var active = ps.slice();
    while (active.length) {
      active = active.filter(function (p) {
        var r = autoTrainPro(S, p, 1), a = acc[p.id];
        for (var k in r.gains) a.gains[k] = (a.gains[k] || 0) + r.gains[k];
        a.used += r.used;
        if (r.stop) { a.stop = r.stop; return false; }
        return r.used > 0;
      });
      if ((S.user.proTP || 0) < P.proTrainCost(W().userPro(S).staff.trainer)) break;
    }
    UI.lastTrain = ps.map(function (p) { return trainSummary(p, acc[p.id]); });
    UI.persist(); UI.render();
  };
  A.trainst = function (d) {
    var S = UI.S, p = S.players[d.pid], st = W().userStreet(S);
    var r = P.streetTrain(S, p, d.k, st.staff.trainer);
    UI.lastTrain = [r.msg];
    if (!r.gain) UI.toast(r.msg, true);
    UI.persist(); UI.render();
  };
  // 一键加点（街球队共用训练点）：maxClicks 控制每次加几下，便于全队轮流
  function autoStreet(S, p, maxClicks) {
    var st = W().userStreet(S), ranks = X.POS_ATTR_RANK[p.pos], gains = {}, used = 0, stop = '';
    var order = X.ATTRS.map(function (k, i) { return { k: k, r: ranks[i] }; });
    for (var n = 0; n < (maxClicks || 1000); n++) {
      var cands = order.filter(function (o) { return p.m[o.k] - p.a[o.k] > 0.05; });
      if (!cands.length) { stop = '所有能力都已练满' + (p.age >= 18 ? '，可以用选拔卡提拔到职业队' : ''); break; }
      var o = cands[U.wpick(cands.map(function (c) { return Math.pow(12 - c.r, 2) * (p.m[c.k] - p.a[c.k]); }))];
      var r = P.streetTrain(S, p, o.k, st.staff.trainer);
      if (!r.gain) { if (r.cost === 0 && /训练点|体力|养伤/.test(r.msg)) { stop = r.msg.replace(p.name + ' ', ''); break; } continue; }
      gains[o.k] = (gains[o.k] || 0) + r.gain; used += r.cost;
    }
    return { gains: gains, used: used, stop: stop };
  }
  function sumLine(p, r) {
    var parts = X.ATTRS.filter(function (k) { return r.gains[k]; }).map(function (k) { return X.ATTR_CN[k] + '+' + r.gains[k].toFixed(1); });
    return p.name + '：' + (parts.length ? parts.join(' ') + '（用掉 ' + r.used + ' 训练点）' : '没有加点') + (r.stop ? '　' + r.stop : '');
  }
  A.autotrain = function (d) {
    var p = UI.S.players[d.pid];
    UI.lastTrain = [sumLine(p, autoStreet(UI.S, p))];
    UI.persist(); UI.render();
  };
  // 全队一键加点：轮流每人加一下，直到训练点用完
  A.autotrainall = function () {
    var S = UI.S, ps = W().teamPlayers(S, W().userStreet(S)), acc = {}, active = ps.slice();
    ps.forEach(function (p) { acc[p.id] = { gains: {}, used: 0, stop: '' }; });
    while (active.length) {
      active = active.filter(function (p) {
        var r = autoStreet(S, p, 1), x = acc[p.id];
        for (var k in r.gains) x.gains[k] = (x.gains[k] || 0) + r.gains[k];
        x.used += r.used;
        if (r.stop) { x.stop = r.stop; return false; }
        return r.used > 0;
      });
    }
    UI.lastTrain = ps.map(function (p) { return sumLine(p, acc[p.id]); });
    UI.persist(); UI.render();
  };
  // 街球 ⇄ 职业 训练点互通
  UI.tpExchange = function (S) {
    return '<div class="tpx">🔁 训练点互通：街球 <b class="money">' + (S.user.streetTP || 0) + '</b> ⇄ 职业 <b class="money">' + (S.user.proTP || 0) + '</b>　数量 <input id="tpx-n" type="number" min="1" step="10" value="50" style="width:70px"> ' +
      UI.btn('街球 → 职业', 'tpx', { d: 'sp' }, 'sm') + ' ' + UI.btn('职业 → 街球', 'tpx', { d: 'ps' }, 'sm') + ' ' + UI.btn('全部 → 职业', 'tpx', { d: 'sp', all: 1 }, 'sm') + ' ' + UI.btn('全部 → 街球', 'tpx', { d: 'ps', all: 1 }, 'sm') + '</div>';
  };
  A.tpx = function (d) {
    var S = UI.S, from = d.d === 'sp' ? 'streetTP' : 'proTP', to = d.d === 'sp' ? 'proTP' : 'streetTP';
    var have = S.user[from] || 0, n = d.all ? have : Math.round(+document.getElementById('tpx-n').value || 0);
    n = Math.min(n, have);
    if (n <= 0) return UI.toast('训练点不足', true);
    S.user[from] = have - n; S.user[to] = (S.user[to] || 0) + n;
    UI.result(null, '已转移 ' + n + ' 训练点');
  };
  // ===== 升星 =====
  A.starup = function (d) {
    var S = UI.S, p = S.players[d.pid];
    UI.sel = p.id; UI.renderCard();
    var star = p.star || 0, need = P.starCost(p), own = S.user.items.starcard || 0;
    var err = P.canStarUp(S, p);
    UI.modal('升星：' + esc(p.name), '<p>当前星级：<span class="pstar">' + (star ? '★'.repeat(star) : '无') + '</span>　→　<span class="pstar">' + '★'.repeat(star + 1) + '</span></p>' +
      '<p>' + esc(p.name) + (P.isMaxed(p) ? ' 已经训满。' : ' 训满后才能升星。') + '升星会突破他的潜力上限：位置重要的能力上限 +10~14，次要能力 +6~9，其他 +4~6（最高可到 ' + X.ATTR_CAP + '）。</p>' +
      '<p>需要升星卡 <b>' + need + '</b> 张，你有 <b class="' + (own < need ? 'red' : 'ok') + '">' + own + '</b> 张。' + (own < need ? '（可在道具商店购买，50 游戏币一张）' : '') + '</p>' +
      '<p>' + (err ? '<span class="red">' + esc(err) + '</span> ' + UI.btn('去道具商店', 'go', { r: 'shop' }, 'sm') : UI.btn('确认升星', 'starupdo', { pid: p.id }, 'big')) + '</p>');
  };
  A.starupdo = function (d) {
    var S = UI.S, p = S.players[d.pid];
    var r = P.starUp(S, p);
    if (r.err) return UI.toast(r.err, true);
    X.World.msg(S, p.name + ' 升星成功！达到 ' + p.star + ' 星，潜力上限突破', 'player');
    UI.persist(); UI.render();
    UI.modal('升星成功！', '<div class="reveal">' + UI.avatar(p, W().userPro(S).color, 64) + '<div><div class="reveal-n">' + esc(p.name) + '</div><div class="grade big" style="background:#8a3fc4">' + '★'.repeat(p.star) + ' ' + p.star + ' 星</div></div></div>' +
      '<table class="mini"><tr><th>能力</th><th>新上限提升</th></tr>' + X.ATTRS.map(function (k) { return '<tr><td>' + X.ATTR_CN[k] + '</td><td class="ok">+' + r.gains[k].toFixed(1) + '</td></tr>'; }).join('') + '</table>' +
      '<p class="muted small">潜力重新打开了，到「球员训练 → 职业队」继续安排训练把他练上去吧。</p><p>' + UI.btn('知道了', 'closemodal') + '</p>');
  };
  A.protrain = function (d, el) { UI.S.players[d.pid].train = el.value; UI.persist(); UI.render(); };
  A.protrainall = function (d) {
    var S = UI.S;
    W().teamPlayers(S, W().userPro(S)).forEach(function (p) {
      if (d.k === 'rest') { p.train = 'rest'; return; }
      var ranks = X.POS_ATTR_RANK[p.pos], best = null, bs = -1;
      X.ATTRS.forEach(function (k, i) { var s = (12 - ranks[i]) * Math.min(6, p.m[k] - p.a[k]); if (s > bs) { bs = s; best = k; } });
      p.train = best || 'rest';
    });
    UI.result(null, '已为全队安排训练');
  };

  // ===== 职员管理 =====
  V.staff = function () {
    var S = UI.S, pro = W().userPro(S), st = W().userStreet(S);
    var desc = {
      trainer: ['提高职业队训练效果', '节省街球训练点；提高21岁以下球员潜力（与切合度有关）'],
      nutri: ['帮助职业队员恢复体力', '帮助21岁以下街球员长身高、恢复体力'],
      doctor: ['减少伤病停赛轮数，恢复体力', '减少伤病停赛，恢复体力']
    };
    function slots(team, isPro) {
      return '<table class="grid"><tr><th>职位</th><th>姓名</th><th>级别</th><th>工资/轮</th><th>剩余合同</th><th>作用</th><th></th></tr>' + ['trainer', 'nutri', 'doctor'].map(function (t) {
        var s = team.staff[t];
        return '<tr><td>' + X.STAFF_TYPES[t] + '</td>' + (s ? '<td>' + esc(s.name) + '（' + s.age + '岁）</td><td>' + s.level + ' 级</td><td>' + U.money(s.salary) + '</td><td>' + s.contract + ' 天</td>' : '<td colspan="4" class="muted">空缺</td>') +
          '<td class="small">' + desc[t][isPro ? 0 : 1] + '</td><td>' + (s ? UI.link('续约', 'staffrenew', { t: team.id, type: t }) + ' ' + UI.link('解雇', 'stafffire', { t: team.id, type: t }) : '') + '</td></tr>';
      }).join('') + '</table>';
    }
    var h = UI.box('职业队职员', slots(pro, true)) + UI.box('街球队职员', slots(st, false));
    h += UI.box('职员中心（待业职员）', '<p class="tip">雇佣时需一次性支付合同内的全部工资。级别越高能力越强，但低级（1-4级）职员中约有 10% 会发挥出远超其级别的能力，全凭运气。会员续约时工资上涨 10%。</p>' +
      '<table class="grid"><tr><th>职位</th><th>姓名</th><th>年龄</th><th>级别</th><th>工资/轮</th><th>合同</th><th>总费用</th><th>雇佣到</th></tr>' + S.staffPool.slice().sort(function (a, b) { return a.type < b.type ? -1 : a.type > b.type ? 1 : b.level - a.level; }).map(function (s) {
        return '<tr><td>' + X.STAFF_TYPES[s.type] + '</td><td>' + esc(s.name) + '</td><td>' + s.age + '</td><td>' + '★'.repeat(Math.ceil(s.level / 2)) + ' ' + s.level + '级</td><td>' + U.money(s.salary) + '</td><td>' + s.contract + '天</td><td>' + U.money(s.salary * s.contract) + '</td><td>' +
          UI.btn('职业队', 'hire', { sid: s.id, t: pro.id }, 'sm') + ' ' + UI.btn('街球队', 'hire', { sid: s.id, t: st.id }, 'sm') + '</td></tr>';
      }).join('') + '</table>');
    return h;
  };
  A.hire = function (d) { UI.result(X.Staff.hire(UI.S, UI.S.teams[d.t], d.sid), '雇佣成功'); };
  A.stafffire = function (d) { X.Staff.fire(UI.S, UI.S.teams[d.t], d.type); UI.result(null, '已解雇（已付工资不退）'); };
  A.staffrenew = function (d) { UI.result(X.Staff.renew(UI.S, UI.S.teams[d.t], d.type), '续约 20 天成功'); };

  // ===== 球场建设 =====
  V.arena = function () {
    var S = UI.S, t = W().userPro(S), tab = UI.curTab('arena', 'info');
    var ar = X.ARENA[t.arena.lv - 1], next = X.ARENA[t.arena.lv];
    var h = UI.tabs('arena', [['info', '基本信息'], ['ads', '球场广告'], ['fans', '球迷俱乐部']], tab);
    if (tab === 'info') {
      var att = W().attendance(S, t);
      h += UI.box('球场信息', '<table class="kv"><tr><th>体育馆等级</th><td>' + t.arena.lv + ' 级' + (t.arena.build ? '<span class="muted">（正在升级到 ' + t.arena.build.to + ' 级，还需 ' + t.arena.build.days + ' 天）</span>' : '') + '</td></tr>' +
        '<tr><th>座位数量</th><td>' + U.money(ar.seats) + '</td></tr><tr><th>广告栏个数</th><td>' + ar.slots + '</td></tr><tr><th>球迷人数</th><td>' + U.money(t.fans) + '</td></tr>' +
        '<tr><th>上轮主场上座</th><td>' + (t.lastAtt != null ? U.money(t.lastAtt) + ' 人' : '-') + '</td></tr><tr><th>预计上座</th><td>' + U.money(att) + ' 人（上座率 ' + Math.round(att / ar.seats * 100) + '%）</td></tr></table>' +
        (next ? '<p>升级到 ' + next.lv + ' 级：座位 ' + U.money(next.seats) + '，广告位 ' + next.slots + '，费用 ' + UI.money(next.cost) + '，工期 ' + next.days + ' 天（施工期间不影响上座）　' + (t.arena.build ? '' : UI.btn('升级球场', 'arenaup')) + '</p>' : '<p>已是最高等级球馆</p>'));
      h += UI.box('球票价格', '<p>当前票价：<input id="ticket" type="number" min="1" value="' + t.ticket + '" style="width:80px"> 元　' + UI.btn('设置', 'setticket', {}, 'sm') + '</p>' +
        '<p class="muted small">票价太高会降低上座率，太低则浪费座位。球队成绩越好，球迷越愿意买票。预计门票收入：' + U.money(att * t.ticket) + '/主场</p>');
    } else if (tab === 'ads') {
      var capn = W().adCapacity(t);
      h += UI.box('当前广告（' + t.ads.length + '/' + capn + '）', t.ads.length ? '<table class="grid"><tr><th>广告商</th><th>总金额</th><th>每轮</th><th>剩余轮数</th></tr>' + t.ads.map(function (a) {
        return '<tr><td>' + esc(a.brand) + '</td><td>' + U.money(a.total) + '</td><td>' + U.money(a.total / a.rounds) + '</td><td>' + a.left + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">暂无广告</span>');
      h += UI.box('广告商报价', '<p class="tip">可悬挂广告数 = 球迷数量 / 4000 + 1，且不能超过球场广告位（' + X.ARENA[t.arena.lv - 1].slots + '）。广告商根据你的球迷数量报价，每轮支付。</p><table class="grid"><tr><th>广告商</th><th>合同轮数</th><th>赞助总额</th><th>每轮</th><th></th></tr>' + S.adOffers.map(function (a) {
        return '<tr><td>' + esc(a.brand) + '</td><td>' + a.rounds + '</td><td>' + U.money(a.total) + '</td><td>' + U.money(a.total / a.rounds) + '</td><td>' + UI.btn('签约', 'ad', { id: a.id }, 'sm') + '</td></tr>';
      }).join('') + '</table>');
    } else {
      var ps = W().teamPlayers(S, t).sort(function (a, b) { return b.support - a.support; });
      h += UI.box('球员球迷支持率', '<p class="tip">球迷对表现好的球员支持率更高，支持率高的球员球衣卖得好。出售支持率高的球员会流失球迷——想卖人时最好先把他换出主力阵容。</p><table class="grid"><tr><th>球员</th><th>支持率</th><th>预计每主场球衣收入</th></tr>' + ps.map(function (p) {
        return '<tr><td>' + UI.pname(p) + '</td><td><div class="bar sm"><i style="width:' + p.support + '%;background:#e8762b"></i></div> ' + Math.round(p.support) + '</td><td>' + U.money(p.support / 100 * t.fans) + '</td></tr>';
      }).join('') + '</table>');
    }
    return h;
  };
  A.arenaup = function () { UI.result(W().upgradeArena(UI.S), '球场开始升级'); };
  A.setticket = function () { var v = Math.max(1, Math.round(+document.getElementById('ticket').value)); W().userPro(UI.S).ticket = v; UI.result(null, '票价已设为 ' + v + ' 元'); };
  A.ad = function (d) { UI.result(W().acceptAd(UI.S, d.id), '广告签约成功'); };

  // ===== 球队财政 =====
  V.finance = function () {
    var S = UI.S, tab = UI.curTab('fin', 'cur');
    var h = UI.tabs('fin', [['cur', '本赛季财政'], ['all', '所有赛季财政']], tab);
    if (tab === 'cur') {
      var L = S.user.ledger[S.season] || { days: {}, inc: 0, exp: 0 };
      var days = Object.keys(L.days).map(Number).sort(function (a, b) { return b - a; });
      h += '<div class="sumline">本赛季收入 ' + UI.money(L.inc) + '　支出 ' + UI.money(L.exp) + '　净利润 <b class="' + (L.inc - L.exp < 0 ? 'red' : 'ok') + '">' + U.money(L.inc - L.exp) + '</b>　<span class="muted">赛季末对净利润征收 25%（会员优惠）所得税</span></div>';
      h += days.map(function (d) {
        var items = L.days[d], net = U.sum(items.map(function (x) { return x.v; }));
        var r = W().roundOfDay(d);
        return '<details><summary>' + (r ? '第 ' + r + ' 轮' : d === 13 ? '赛季中休息日' : '赛季末') + '　<b class="' + (net < 0 ? 'red' : 'ok') + '">' + (net >= 0 ? '+' : '') + U.money(net) + '</b></summary><table class="grid">' + items.map(function (x) {
          return '<tr><td>' + esc(x.t) + '</td><td class="' + (x.v < 0 ? 'red' : 'ok') + '">' + (x.v >= 0 ? '+' : '') + U.money(x.v) + '</td></tr>';
        }).join('') + '</table></details>';
      }).join('') || '<span class="muted">暂无记录</span>';
    } else {
      h += '<table class="grid"><tr><th>赛季</th><th>总收入</th><th>总支出</th><th>净利润</th></tr>' + Object.keys(S.user.ledger).sort(function (a, b) { return b - a; }).map(function (s) {
        var L = S.user.ledger[s];
        return '<tr><td>第 ' + s + ' 赛季</td><td>' + U.money(L.inc) + '</td><td>' + U.money(L.exp) + '</td><td class="' + (L.inc - L.exp < 0 ? 'red' : 'ok') + '">' + U.money(L.inc - L.exp) + '</td></tr>';
      }).join('') + '</table>';
    }
    return h;
  };

  // ===== 消息 =====
  V.msgs = function () {
    var S = UI.S, f = UI.curTab('msgs', 'all');
    var types = [['all', '全部'], ['sys', '系统'], ['player', '球员'], ['inj', '伤病'], ['market', '转会'], ['fin', '财政'], ['cup', '比赛'], ['staff', '职员']];
    var list = S.msgs.filter(function (m) { return f === 'all' || m.type === f; });
    var h = UI.tabs('msgs', types, f) + '<div class="msgs">' + (list.map(function (m) {
      return '<div class="msg-line ' + m.type + (m.read ? '' : ' unread') + '"><span class="muted">第' + m.season + '赛季 第' + (m.day + 1) + '天</span> ' + esc(m.txt) + '</div>';
    }).join('') || '<span class="muted">暂无消息</span>') + '</div>';
    S.msgs.forEach(function (m) { m.read = true; });
    UI.persist();
    return h;
  };

  // ===== 荣誉室 =====
  V.trophies = function () {
    var S = UI.S;
    var h = UI.box('我的荣誉', S.user.trophies.length ? '<div class="trophies">' + S.user.trophies.slice().reverse().map(function (t) {
      return '<div class="trophy">🏆<div>' + esc(t.name) + '</div><span class="muted">第 ' + t.season + ' 赛季</span></div>';
    }).join('') + '</div>' : '<span class="muted">还没有奖杯，加油！</span>');
    h += UI.box('历届联赛冠军', S.history.length ? '<table class="grid"><tr><th>赛季</th><th>XBA 超级联赛冠军</th></tr>' + S.history.map(function (x) {
      return '<tr><td>第 ' + x.season + ' 赛季</td><td>' + esc(x.champions[0].team) + (x.champions[0].isUser ? ' 🏆' : '') + '</td></tr>';
    }).join('') + '</table>' : '<span class="muted">第一个赛季还没结束</span>');
    return h;
  };
})(window.XBA);
