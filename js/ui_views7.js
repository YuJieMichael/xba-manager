// 页面：篮球联盟、全明星周末、季后赛对阵、宿敌、性格标签
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var AL = function () { return X.Alliance; };

  UI.personaTag = function (p) {
    var ps = P.persona(p);
    if (ps.id === 'calm') return '<div class="pers small">性格：' + ps.icon + ps.cn + '</div>';
    return '<div class="pers small" title="' + ps.desc + '">性格：<span class="pers-t">' + ps.icon + ps.cn + '</span> <span class="muted">' + ps.desc + '</span></div>';
  };

  // ===== 季后赛 =====
  UI.playoffToday = function (S) {
    var pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var L = S.playoffs && S.playoffs.season === S.season && S.playoffs.leagues[lg.id];
    var stage = X.Playoffs.stageOf(S.day);
    var label = X.Playoffs.label(S.day);
    var s = L && L.rounds[stage] && L.rounds[stage].find(function (x) { return x.a === pro.id || x.b === pro.id; });
    if (!L) return '<div class="next">今天开始' + label + '（常规赛前 8 名，三局两胜）。</div>';
    // 新一轮的对阵在比赛当天才生成：先用上一轮结果推算出对手
    if (!s && !L.rounds[stage] && stage > 0 && L.rounds[stage - 1]) {
      var prev = L.rounds[stage - 1], i = prev.findIndex(function (x) { return x.w === pro.id; });
      if (i >= 0) {
        var mineS = prev[i], sib = prev[i ^ 1];
        var mySeed = mineS.w === mineS.a ? mineS.sa : mineS.sb, opSeed = sib.w === sib.a ? sib.sa : sib.sb;
        s = mySeed <= opSeed ? { a: pro.id, b: sib.w, wa: 0, wb: 0 } : { a: sib.w, b: pro.id, wa: 0, wb: 0 };
      }
    }
    if (!s) return '<div class="next">今天是' + label + '，你的球队已经不在季后赛中。' + UI.link('看对阵', 'gopo') + '</div>';
    if (s.w) return '<div class="next">' + label + '：你们的系列赛已经结束（' + s.wa + ':' + s.wb + '），今天休息。' + UI.link('看对阵', 'gopo') + '</div>';
    var oppId = s.a === pro.id ? s.b : s.a, opp = S.teams[oppId];
    var g = X.Playoffs.gameOf(S.day), home = (g === 2 ? s.b : s.a) === pro.id;
    return '<div class="next">🏆 ' + label + '（' + (home ? '主场' : '客场') + '）：' + UI.teamLink(pro) + ' <b>VS</b> ' + UI.teamLink(opp) + '　系列赛 <b>' + (s.a === pro.id ? s.wa + ':' + s.wb : s.wb + ':' + s.wa) + '</b>' +
      (X.Rivals.isRival(S, oppId) ? ' <b class="red">🔥 宿敌</b>' : '') + '<br>' + UI.link('设置职业战术 →', 'go', { r: 'tac_pro' }) + '　' + UI.link('看季后赛对阵 →', 'gopo') + '</div>';
  };
  A.gopo = function () { UI.tab.league = 'po'; UI.leagueView = null; UI.go('league'); };
  UI.playoffsView = function (S, lg) {
    var L = S.playoffs && S.playoffs.season === S.season && S.playoffs.leagues[lg.id];
    var h = '<p class="tip">常规赛结束后，前 8 名打季后赛：1/4 决赛 → 半决赛 → 总决赛，每轮<b>三局两胜</b>，排名高的一方打第 1、3 场主场。总冠军拿冠军奖金和奖杯；升降级仍按常规赛排名。季后赛打完后才是赛季末休息日。</p>';
    if (!L) return h + '<span class="muted">常规赛第 26 轮结束后开始。</span>';
    var pro = W().userPro(S);
    if (L.champion) h += '<div class="big-result win">🏆 总冠军：' + UI.teamLink(S.teams[L.champion]) + '</div>';
    h += '<div class="bracket">' + L.rounds.map(function (round, ri) {
      return '<div class="br-col"><div class="br-h">' + X.Playoffs.STAGES[ri] + '</div>' + round.map(function (s) {
        var row = function (id, seed, w) { var t = S.teams[id]; return '<div class="br-t ' + (s.w ? (s.w === id ? 'w' : 'l') : '') + (id === pro.id ? ' me' : '') + '"><span>' + seed + '. ' + esc(t ? t.name : '?') + '</span><b>' + w + '</b></div>'; };
        var links = s.games.filter(function (g) { return g.mid && S.matches[g.mid]; }).map(function (g, i) { return UI.link('G' + (i + 1), 'go', { r: 'match', a: g.mid }); }).join(' ');
        return '<div class="br-m">' + row(s.a, s.sa, s.wa) + row(s.b, s.sb, s.wb) + (links ? '<div class="br-l">' + links + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
    return h;
  };

  // ===== 宿敌 =====
  UI.rivalsView = function (S) {
    var list = X.Rivals.list(S);
    var h = '<p class="tip">经常交手、比分咬得紧（5 分以内）、季后赛碰过面、输给对方，都会增加宿敌值。宿敌值最高的 3 队（≥' + X.Rivals.THRESHOLD + '）就是你的宿敌：宿敌对决门票和球衣收入 ×1.5，输赢对球迷影响翻倍，赢下宿敌还能提升士气。每个新赛季宿敌值会降一些。</p>';
    if (!list.length) return h + '<span class="muted">还没有和任何球队结下梁子。</span>';
    return h + '<table class="grid"><tr><th>球队</th><th>联赛</th><th>交手战绩</th><th>宿敌值</th><th></th></tr>' + list.slice(0, 15).map(function (x) {
      var t = S.teams[x.id], rival = X.Rivals.isRival(S, x.id);
      return '<tr class="' + (rival ? 'me' : '') + '"><td>' + UI.teamLink(t) + '</td><td>' + esc(W().league(S, t.leagueId).name) + '</td><td>' + x.r.w + ' 胜 ' + x.r.l + ' 负</td><td><div class="bar sm"><i style="width:' + Math.min(100, x.r.score / 20 * 100) + '%;background:#d0202e"></i></div> ' + x.r.score + '</td><td>' + (rival ? '<b class="red">🔥 宿敌</b>' : '') + '</td></tr>';
    }).join('') + '</table>';
  };

  // ===== 全明星周末 =====
  V.allstar = function () {
    var S = UI.S, all = S.allstar || {};
    var seasons = Object.keys(all).map(Number).sort(function (a, b) { return b - a; });
    var h = '<div class="wk-h">⭐ 全明星周末</div><p class="tip">每个赛季中间的休息日，在你所在的联赛举行全明星赛（东西部各 10 人，按本赛季数据入选）、三分大赛（三分最强的 8 人）和扣篮大赛（弹跳、身高、速度最好的 4 人）。你的球员入选或夺冠会增加球迷、奖励游戏币。</p>';
    if (!seasons.length) return h + '<span class="muted">本赛季的全明星周末在第 13 轮之后的休息日举行。</span>';
    var se = UI.asSeason && all[UI.asSeason] ? UI.asSeason : seasons[0], a = all[se];
    if (seasons.length > 1) h += '<p>赛季：<select data-change="asseason">' + seasons.map(function (s) { return '<option value="' + s + '"' + (s === se ? ' selected' : '') + '>第 ' + s + ' 赛季</option>'; }).join('') + '</select></p>';
    var m = S.matches[a.mid];
    var who = function (x) { var p = S.players[x.pid]; return (p ? UI.pname(p) : esc(x.name)) + ' <span class="muted small">' + esc(x.team) + '</span>' + (x.mine ? ' ⭐' : ''); };
    h += UI.box('全明星赛（' + esc(a.league) + '）', (m ? '<div class="big-result">东部全明星 <b>' + m.hs + ' : ' + m.as + '</b> 西部全明星　' + UI.link('战报', 'go', { r: 'match', a: a.mid }) + '</div>' : '') +
      '<p>全明星赛 MVP：<b>' + esc(a.mvpName) + '</b></p><div class="cols2"><div><b>东部</b><table class="grid">' + a.east.map(function (x) { return '<tr class="' + (x.mine ? 'me' : '') + '"><td>' + x.pos + '</td><td>' + who(x) + '</td></tr>'; }).join('') + '</table></div><div><b>西部</b><table class="grid">' + a.west.map(function (x) { return '<tr class="' + (x.mine ? 'me' : '') + '"><td>' + x.pos + '</td><td>' + who(x) + '</td></tr>'; }).join('') + '</table></div></div>');
    var t3 = a.three;
    h += UI.box('🎯 三分大赛　冠军：' + esc(t3.winner.name), '<p class="small muted">每人 5 个球架、每架 5 球，最后一个“花球”算 2 分（★），满分 30。首轮前 3 名进决赛。</p><b>决赛</b><table class="grid"><tr><th>球员</th><th>投篮</th><th>得分</th></tr>' + t3.fin.map(function (x) { return '<tr class="' + (x.mine ? 'me' : '') + '"><td>' + who(x) + '</td><td class="mono">' + x.racks + '</td><td><b>' + x.pts + '</b></td></tr>'; }).join('') + '</table>' +
      '<b>首轮</b><table class="grid"><tr><th>球员</th><th>投篮</th><th>得分</th></tr>' + t3.r1.map(function (x) { return '<tr class="' + (x.mine ? 'me' : '') + '"><td>' + who(x) + '</td><td class="mono">' + x.racks + '</td><td>' + x.pts + '</td></tr>'; }).join('') + '</table>');
    var dk = a.dunk;
    var dunkRows = function (list) { return list.map(function (x) { return '<tr class="' + (x.mine ? 'me' : '') + '"><td>' + who(x) + '</td><td>' + x.tries.map(function (t) { return esc(t.move) + ' <b>' + t.score + '</b>'; }).join('<br>') + '</td><td><b>' + x.pts + '</b></td></tr>'; }).join(''); };
    h += UI.box('💥 扣篮大赛　冠军：' + esc(dk.winner.name), '<p class="small muted">每人扣两次，每次评委打 30~50 分。首轮前 2 名进决赛。</p><b>决赛</b><table class="grid"><tr><th>球员</th><th>扣篮</th><th>总分</th></tr>' + dunkRows(dk.fin) + '</table><b>首轮</b><table class="grid"><tr><th>球员</th><th>扣篮</th><th>总分</th></tr>' + dunkRows(dk.r1) + '</table>');
    return h;
  };
  A.asseason = function (d, el) { UI.asSeason = +el.value; UI.render(); };

  // ===== 篮球联盟 =====
  V.alliance = function () {
    var S = UI.S;
    if (!S.alliances) X.Alliance.init(S);
    var mine = AL().mine(S), tab = UI.curTab('al', mine ? 'mine' : 'list');
    var h = UI.tabs('al', [['list', '联盟列表'], ['mine', '我的联盟'], ['challenge', '联盟挑战（压分）']], tab);
    if (tab === 'list') {
      h += '<p class="tip">联盟是经理们的组织，按威望排名。加入联盟后可以参加<b>联盟杯</b>（第 9 天，街球队，进四强拿至尊杯邀请函）、代表联盟参加<b>联盟至尊杯</b>（第 23 天），还能向其他联盟发起<b>挑战压分</b>。' + (mine ? '' : '　自己创建：<input id="al-name" maxlength="8" placeholder="联盟名称" style="width:110px"> ' + UI.btn('创建联盟', 'alcreate', {}, 'sm')) + '</p>';
      h += '<table class="grid"><tr><th>#</th><th>联盟</th><th>威望</th><th>成员</th><th></th></tr>' + AL().sorted(S).map(function (a, i) {
        return '<tr class="' + (a.user ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><b>' + esc(a.name) + '</b></td><td>' + a.prestige + '</td><td>' + (a.members.length + (a.user ? 1 : 0)) + ' 人</td><td>' + (a.user ? '<span class="tag ok">我的联盟</span>' : mine ? '' : UI.btn('加入', 'aljoin', { id: a.id }, 'sm')) + '</td></tr>';
      }).join('') + '</table>';
    } else if (tab === 'mine') {
      if (!mine) return h + '<span class="muted">你还没有加入联盟，去「联盟列表」加入一个或自己创建。</span>';
      var rank = AL().sorted(S).indexOf(mine) + 1;
      h += UI.box(esc(mine.name), '<p>威望 <b>' + mine.prestige + '</b>（排名第 ' + rank + '）　成员 ' + (mine.members.length + 1) + ' 人　' + UI.btn('退出联盟', 'alleave', {}, 'sm') + '</p>' +
        '<p>联盟杯：每赛季第 9 天（第 9 轮）举行，你的街球队参加，进入四强获得联盟至尊杯邀请函。<br>联盟至尊杯：每赛季第 23 天举行，持邀请函代表联盟出战。当前邀请函：' + (S.user.zunInvite ? '<b class="ok">有</b>' : '<span class="muted">无</span>') + '</p>');
      h += UI.box('联盟成员', '<table class="grid"><tr><th>球队</th><th>联赛</th><th>战绩</th></tr><tr class="me"><td>' + UI.teamLink(W().userPro(S)) + '（你）</td><td>' + esc(W().league(S, W().userPro(S).leagueId).name) + '</td><td>' + W().userPro(S).rec.w + '-' + W().userPro(S).rec.l + '</td></tr>' + mine.members.map(function (id) {
        var t = S.teams[id]; if (!t) return '';
        return '<tr><td>' + UI.teamLink(t) + '</td><td>' + esc(W().league(S, t.leagueId).name) + '</td><td>' + t.rec.w + '-' + t.rec.l + '</td></tr>';
      }).join('') + '</table>');
    } else {
      if (!mine) return h + '<span class="muted">加入联盟后才能发起挑战。</span>';
      var done = S.user.challengeDay === S.dayNo;
      h += '<p class="tip">压分：押上游戏币，派职业队挑战另一个联盟里和你同级别的球队（使用「表演赛/胜者为王战术板」，不消耗体力）。赢了拿走同样多的游戏币、联盟威望 +2；输了押的游戏币归对方。每天一次。当前游戏币：<b>' + S.user.coins + '</b></p>';
      h += done ? '<p class="muted">今天已经挑战过了，明天再来。</p>' : '<p>押 <input id="al-stake" type="number" min="10" max="1000" step="10" value="50" style="width:80px"> 游戏币</p>';
      h += '<table class="grid"><tr><th>联盟</th><th>威望</th><th>成员</th><th></th></tr>' + AL().sorted(S).filter(function (a) { return a !== mine; }).map(function (a) {
        return '<tr><td><b>' + esc(a.name) + '</b></td><td>' + a.prestige + '</td><td>' + a.members.length + '</td><td>' + (done ? '' : UI.btn('挑战', 'alchal', { id: a.id }, 'sm')) + '</td></tr>';
      }).join('') + '</table>';
    }
    return h;
  };
  A.aljoin = function (d) { UI.result(AL().join(UI.S, d.id), '已加入联盟'); };
  A.alleave = function () { UI.result(AL().leave(UI.S), '已退出联盟'); };
  A.alcreate = function () { UI.result(AL().create(UI.S, document.getElementById('al-name').value), '联盟创建成功！'); };
  A.alchal = function (d) {
    var r = AL().challenge(UI.S, d.id, +document.getElementById('al-stake').value);
    if (r.err) return UI.toast(r.err, true);
    UI.persist(); UI.toast(r.won ? '挑战成功！' : '挑战失败……');
    UI.tab.match = 'log'; UI.go('match', r.mid);
  };
})(window.XBA);
