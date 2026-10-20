// 页面：王朝纪录、传奇挑战赛、重生（二周目）、难度显示
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };

  UI.TYPE_CN.legend = '传奇挑战赛';

  // 荣誉室加两个标签
  var origTrophies = V.trophies;
  V.trophies = function () {
    var S = UI.S, tab = UI.curTab('troph', 'mine');
    var tabs = [['mine', '我的荣誉'], ['ach', '成就'], ['records', '历史纪录'], ['legend', '传奇挑战'], ['awards', '赛季颁奖'], ['hof', '名人堂'], ['champs', '历届冠军']];
    if (tab !== 'records' && tab !== 'legend') {
      var h0 = origTrophies();
      return h0.replace(/<div class="tabs">[\s\S]*?<\/div>/, UI.tabs('troph', tabs, tab));
    }
    var h = UI.tabs('troph', tabs, tab);
    if (tab === 'records') {
      var R = S.records || {};
      h += '<p class="tip">全联盟（所有级别联赛和季后赛）的历史纪录。你的球队或球员打破纪录时会收到消息，第一次从别人手里抢到纪录还会进荣誉室。</p>';
      h += '<table class="grid"><tr><th>纪录</th><th>数值</th><th>保持者</th><th>球队</th><th>创造于</th></tr>' + X.Records.DEFS.map(function (d) {
        var r = R[d.id];
        if (!r) return '<tr><td>' + d.cn + '</td><td colspan="4" class="muted">暂无</td></tr>';
        return '<tr class="' + (r.user ? 'me' : '') + '"><td><b>' + d.cn + '</b></td><td><b>' + r.val + '</b> ' + d.unit + '</td><td>' + esc(r.who || '-') + '</td><td>' + esc(r.team) + (r.user ? ' ⭐' : '') + '</td><td>第 ' + r.season + ' 赛季</td></tr>';
      }).join('') + '</table>';
    } else {
      var L = X.Legend;
      h += '<p class="tip">赛季末休息日，你的职业队会自动挑战<b>名人堂全明星队</b>：成员来自你的名人堂球员和历代传奇，起步 130 级，每赢一次下次 +5 级，最高 150 级。赢了奖励 500 游戏币和专属奖杯。</p>';
      h += '<div class="sumline">' + (L.unlocked(S) ? '<span class="ok">已解锁</span>' : '<span class="muted">未解锁：职业队前 8 人平均综合达到 85，或打进超级联赛</span>') + '　下次对手：<b>' + L.level(S) + ' 级</b>　已击败 ' + L.tier(S) + ' 次</div>';
      var list = S.legends || [];
      h += list.length ? '<table class="grid"><tr><th>赛季</th><th>对手等级</th><th>比分</th><th>结果</th><th></th></tr>' + list.map(function (x) {
        return '<tr><td>第 ' + x.season + ' 赛季</td><td>' + x.level + ' 级</td><td>' + x.hs + ' : ' + x.as + '</td><td class="' + (x.won ? 'win' : 'lose') + '">' + (x.won ? '胜利' : '失利') + '</td><td>' + (S.matches[x.mid] ? UI.link('战报', 'go', { r: 'match', a: x.mid }) : '') + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">还没有挑战记录。</span>';
    }
    return h;
  };

  // 经理生涯页加“重生”
  var origManager = V.manager;
  V.manager = function () {
    var S = UI.S, h = origManager();
    var lg = S.user.legacy;
    h += UI.box('🔁 重生（二周目）', (lg ? '<p>已重生 <b>' + lg.count + '</b> 次　永久加成：' + lg.bonuses.map(function (b) { return W().BONUSES[b].cn; }).join('、') + (lg.legends.length ? '　传奇职员：' + lg.legends.map(function (x) { return esc(x.name); }).join('、') : '') + '</p>' : '') +
      '<p>当前难度：<b>' + W().diff(S).cn + '</b>。拿到<b>XBA 超级联赛总冠军</b>后可以重生：从 4 级联赛重新开始，难度提升一档（最高地狱），每次重生 AI 再强 2 点。保留经理等级和技能、成就、荣誉、名人堂、联盟纪录和游戏币；带走一名名人堂球员当终身训练员，再选一项永久加成（可以叠加）。</p>' +
      (W().canRebirth(S) ? UI.btn('我要重生', 'rebirth', {}, 'big') : '<span class="muted">还没拿到超级联赛总冠军。</span>'));
    return h;
  };
  A.rebirth = function () {
    var S = UI.S;
    var hof = (S.hof || []).filter(function (x) { return x.kind !== 'street'; });
    var idx = X.DIFF_ORDER.indexOf(S.difficulty || 'normal'), next = X.DIFFS[X.DIFF_ORDER[Math.min(3, idx + 1)]];
    UI.modal('重生', '<div class="form"><label>带走的传奇（成为新档职业队终身训练员）<select id="rb-hof"><option value="">（不带）</option>' + hof.map(function (x) { return '<option value="' + x.pid + '">' + esc(x.name) + '（' + x.pos + '，巅峰 ' + x.peak + '）</option>'; }).join('') + '</select></label>' +
      '<label>永久加成 <select id="rb-bonus">' + Object.keys(W().BONUSES).map(function (k) { var n = W().legacyCount(S, k); return '<option value="' + k + '">' + W().BONUSES[k].cn + (n ? '（已有 ' + n + ' 次）' : '') + '</option>'; }).join('') + '</select></label></div>' +
      '<p>新档难度：<b>' + next.cn + '</b>（' + next.desc + '）</p><p class="red">当前世界会被新世界替换，建议先到「存档设置」导出备份。</p><p>' + UI.btn('确认重生', 'rebirthdo', {}, 'big') + ' ' + UI.btn('取消', 'closemodal') + '</p>');
  };
  A.rebirthdo = function () {
    var S = UI.S, S2 = W().rebirth(S, document.getElementById('rb-hof').value, document.getElementById('rb-bonus').value);
    UI.closeModal();
    UI.S = S2;
    UI.ob = { step: 1, manager: S.user.manager, teamName: '', color: '#c8102e', pro: {}, street: {} };
    UI.route = 'home';
    document.getElementById('app').innerHTML = '';
    UI.render();
  };

  // 状态栏显示难度
  var origStatus = UI.status;
  UI.status = function () {
    var S = UI.S, h = origStatus();
    var tag = '<span class="tag diff-' + (S.difficulty || 'normal') + '">' + W().diff(S).cn + (S.rebirths ? ' · 重生' + S.rebirths : '') + '</span>';
    return h.replace('经理</div>', '经理 ' + tag + '</div>');
  };

  // 战报：传奇挑战赛
  var origReport = V.report;
  V.report = function () {
    var h = origReport(), r = UI.lastReport;
    if (r && r.legend && UI.S.matches[r.legend]) {
      var m = UI.S.matches[r.legend], won = m.hs > m.as;
      h = h.replace('<div class="box"><div class="box-h">今日消息', UI.box('👑 传奇挑战赛', '<div class="big-result ' + (won ? 'win' : 'lose') + '">' + esc(m.home.name) + ' <b>' + m.hs + ' : ' + m.as + '</b> 名人堂全明星队　' + (won ? '胜利！' : '失利') + '</div><p>' + UI.link('看战报', 'go', { r: 'match', a: m.id }) + '</p>') + '<div class="box"><div class="box-h">今日消息');
    }
    return h;
  };
})(window.XBA);
