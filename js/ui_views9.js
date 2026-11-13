// 页面：王朝纪录、传奇挑战赛、难度显示
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

  // 经理生涯页：高难挑战
  var CH = function () { return X.Challenge; };
  UI.challengeBox = function (S) {
    var c = CH().cur(S), edit = CH().canEdit(S), pick = UI.chalPick || (c ? c.mods.slice() : []);
    var h = '<p>打进<b>篮途超级联赛</b>后，每赛季前 ' + CH().OPEN_DAYS + ' 天可以自选难度词条，只影响本赛季的联赛和季后赛。拿下联赛总冠军获得 <b>难度 × 150 游戏币</b>、<b>难度 × 1 张升星卡</b>和荣誉；没拿到冠军没有惩罚。你的球员本身不会被削弱。</p>';
    if (!CH().eligible(S)) return h + '<p class="muted">还没打进篮途超级联赛。</p>';
    h += '<table class="grid"><tr><th></th><th>词条</th><th>效果</th><th>难度</th></tr>' + CH().MODS.map(function (m) {
      var on = pick.indexOf(m.id) >= 0;
      return '<tr><td><input type="checkbox" data-change="chalpick" data-id="' + m.id + '"' + (on ? ' checked' : '') + (edit ? '' : ' disabled') + '></td><td><b>' + m.cn + '</b></td><td class="small">' + m.desc + '</td><td>+' + m.pts + '</td></tr>';
    }).join('') + '</table>';
    var pts = CH().points(pick), r = CH().reward(pts);
    h += '<p>已选难度：<b class="red">' + pts + ' 级</b>　夺冠奖励：' + r.coins + ' 游戏币 + ' + r.cards + ' 张升星卡' + (S.user.chalBest ? '　历史最高：' + S.user.chalBest + ' 级' : '') + '</p>';
    if (edit) h += '<p>' + UI.btn(c ? '修改本赛季挑战' : '开启本赛季挑战', 'chalset', {}, 'on') + ' <span class="small muted">第 ' + CH().OPEN_DAYS + ' 天之后锁定</span></p>';
    else h += '<p class="muted">' + (c ? '本赛季挑战已锁定：' + c.mods.map(function (id) { return CH().mod(id).cn; }).join('、') : '本赛季没有开启挑战，下赛季前 ' + CH().OPEN_DAYS + ' 天可以选择。') + '</p>';
    return h;
  };
  var origManager = V.manager;
  V.manager = function () { return origManager() + UI.box('🔥 高难挑战', UI.challengeBox(UI.S)); };
  A.chalpick = function (d, el) {
    var c = CH().cur(UI.S), pick = UI.chalPick || (c ? c.mods.slice() : []);
    pick = pick.filter(function (x) { return x !== d.id; });
    if (el.checked) pick.push(d.id);
    // 去掉前置词条时，依赖它的词条一起去掉
    for (var i = 0; i < 3; i++) pick = pick.filter(function (x) { var m = CH().mod(x); return !m.need || pick.indexOf(m.need) >= 0; });
    UI.chalPick = pick; UI.render();
  };
  A.chalset = function () {
    var pick = UI.chalPick || [], err = CH().set(UI.S, pick);
    if (err) return UI.toast(err, true);
    UI.chalPick = null;
    UI.result(null, pick.length ? '本赛季高难挑战：' + CH().points(pick) + ' 级' : '已取消本赛季挑战');
  };

  // 状态栏显示难度
  var origStatus = UI.status;
  UI.status = function () {
    var S = UI.S, h = origStatus();
    var c = X.Challenge.cur(S);
    var tag = '<span class="tag diff-' + (S.difficulty || 'normal') + '">' + W().diff(S).cn + '</span>' + (c ? ' <span class="tag" style="background:#d0202e;color:#fff">🔥挑战' + c.pts + '级</span>' : '');
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
