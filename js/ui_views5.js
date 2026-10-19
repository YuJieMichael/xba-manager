// 页面：XBA杯、荣誉室（我的荣誉 / 赛季颁奖 / 名人堂 / 历届冠军）
(function (X) {
  var U = X.U, P = X.P, UI = X.UI, V = UI.views, A = UI.acts, esc = U.esc;
  var W = function () { return X.World; };
  var XC = function () { return X.XCup; };

  function tname(S, id) { var t = S.teams[id]; return t ? UI.teamLink(t) : '<span class="muted">（已解散）</span>'; }

  // ===== XBA杯 =====
  V.xcup = function () {
    var S = UI.S, xc = S.xcup;
    var h = '<div class="wk-h">🏆 XBA杯职业大赛 <small>第 ' + (xc ? xc.season : S.season) + ' 赛季</small></div>';
    h += '<p class="tip">48 支受邀球队分 8 组进行<b>分组预赛</b>（单循环 5 轮），每组前 3 名进入<b>分组决赛</b>，后 3 名打<b>参赛杯</b>。分组决赛每组前 3 名进入<b>冠军杯</b>，后 3 名打<b>优胜杯</b>。杯赛都是单场淘汰。' +
      '比赛日：预赛第 2-6 轮、决赛第 8-12 轮、淘汰赛第 14-18 轮，与联赛同一天进行，<b>不消耗体力、不会受伤</b>，使用「XBA杯战术板」。邀请函发给每个联赛的前三名。</p>';
    if (!xc) return h + '<span class="muted">本赛季没有 XBA杯（下赛季开始时举行）。</span>';
    h += '<div class="sumline">当前阶段：<b>' + XC().stageName(xc) + '</b>　' + (xc.user ? '你的球队：' + (xc.result ? '<b>' + esc(xc.result) + '</b>' : '<span class="ok">参赛中</span>') : '<span class="muted">你的球队本届没有受邀</span>') + '</div>';
    var tabs = [['pre', '分组预赛']];
    if (xc.fin) tabs.push(['fin', '分组决赛']);
    if (xc.ko.champ) tabs.push(['champ', '冠军杯'], ['win', '优胜杯']);
    if (xc.ko.part) tabs.push(['part', '参赛杯']);
    var def = xc.stage === 'pre' ? 'pre' : xc.stage === 'fin' ? 'fin' : 'champ';
    var tab = UI.curTab('xcup', def);
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = def;
    h += UI.tabs('xcup', tabs, tab);
    if (tab === 'pre' || tab === 'fin') {
      var stage = xc[tab], mine = XC().groupOf(stage, S.user.proId);
      var order = stage.groups.map(function (g, i) { return i; });
      if (mine >= 0) { order.splice(mine, 1); order.unshift(mine); }
      h += '<div class="cols2">' + order.map(function (gi) {
        var tbl = XC().groupTable(S, stage, gi);
        var games = stage.res[gi].length;
        var body = '<table class="grid"><tr><th>#</th><th>球队</th><th>胜</th><th>负</th><th>净胜</th></tr>' + tbl.map(function (r, i) {
          var t = S.teams[r.id];
          return '<tr class="' + (i < 3 ? 'up' : 'down') + (t && t.isUser ? ' me' : '') + '"><td>' + (i + 1) + '</td><td>' + tname(S, r.id) + (t ? ' <span class="muted small">' + t.level + '级</span>' : '') + '</td><td>' + r.w + '</td><td>' + r.l + '</td><td>' + (r.pf - r.pa) + '</td></tr>';
        }).join('') + '</table>';
        if (gi === mine) {
          body += '<div class="small" style="margin-top:6px">' + stage.res[gi].map(function (round, ri) {
            var g = round.find(function (x) { return x.h === S.user.proId || x.a === S.user.proId; });
            if (!g) return '';
            return '<div>第' + (ri + 1) + '轮：' + esc(S.teams[g.h] ? S.teams[g.h].name : '?') + ' <b>' + g.hs + ':' + g.as + '</b> ' + esc(S.teams[g.a] ? S.teams[g.a].name : '?') + (g.mid && S.matches[g.mid] ? ' ' + UI.link('战报', 'go', { r: 'match', a: g.mid }) : '') + '</div>';
          }).join('') + '</div>';
        }
        return UI.box('第 ' + (gi + 1) + ' 组' + (gi === mine ? '（你的小组）' : '') + '　已赛 ' + games + '/5 轮', body);
      }).join('') + '</div>';
    } else {
      var ko = xc.ko[tab];
      if (ko.done) h += '<div class="big-result win">🏆 ' + XC().CUPS[tab].cn + '冠军：' + tname(S, ko.champion) + '</div>';
      h += '<div class="bracket">' + ko.rounds.map(function (round, ri) {
        return '<div class="br-col"><div class="br-h">' + XC().koRoundName(ko, ri) + '</div>' + round.map(function (m) {
          var cls = function (id) { return (m.w && m.w === id ? 'w' : m.w ? 'l' : '') + (id === S.user.proId ? ' me' : ''); };
          var row = function (id, sc) { return '<div class="br-t ' + cls(id) + '">' + (id ? esc(S.teams[id] ? S.teams[id].name : '（已解散）') : '<span class="muted">轮空</span>') + '<b>' + (sc != null ? sc : '') + '</b></div>'; };
          return '<div class="br-m">' + row(m.a, m.as) + row(m.b, m.bs) + (m.mid && S.matches[m.mid] ? '<div class="br-l">' + UI.link('战报', 'go', { r: 'match', a: m.mid }) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
      h += '<p class="muted small">奖金：' + XC().CUPS[tab].prize.map(function (v, i) { return ['冠军', '亚军', '四强', '八强', '十六强', '三十二强'][i] + ' ' + U.wan(v); }).join('，') + '</p>';
    }
    return h;
  };

  // ===== 荣誉室 =====
  V.trophies = function () {
    var S = UI.S, tab = UI.curTab('troph', 'mine');
    var h = UI.tabs('troph', [['mine', '我的荣誉'], ['awards', '赛季颁奖'], ['hof', '名人堂'], ['champs', '历届冠军']], tab);
    if (tab === 'mine') {
      h += S.user.trophies.length ? '<div class="trophies">' + S.user.trophies.slice().reverse().map(function (t) {
        var icon = /MVP|王|阵容/.test(t.name) ? '🏅' : /升级/.test(t.name) ? '⬆️' : '🏆';
        return '<div class="trophy">' + icon + '<div>' + esc(t.name) + '</div><span class="muted">第 ' + t.season + ' 赛季</span></div>';
      }).join('') + '</div>' : '<span class="muted">还没有奖杯，加油！</span>';
    } else if (tab === 'awards') {
      var seasons = Object.keys(S.awards || {}).map(Number).sort(function (a, b) { return b - a; });
      if (!seasons.length) return h + '<span class="muted">第一个赛季结束后举行颁奖。</span>';
      var se = UI.awardSeason && S.awards[UI.awardSeason] ? UI.awardSeason : seasons[0];
      var list = S.awards[se];
      var myLg = W().league(S, W().userPro(S).leagueId);
      var lgName = UI.awardLeague || (list.some(function (x) { return x.league === myLg.name; }) ? myLg.name : list[0].league);
      var rec = list.find(function (x) { return x.league === lgName; }) || list[0];
      h += '<p>赛季：<select data-change="awseason">' + seasons.map(function (s) { return '<option value="' + s + '"' + (s === se ? ' selected' : '') + '>第 ' + s + ' 赛季</option>'; }).join('') + '</select>　联赛：<select data-change="awleague">' +
        list.map(function (x) { return '<option' + (x.league === rec.league ? ' selected' : '') + '>' + esc(x.league) + '</option>'; }).join('') + '</select></p>';
      var who = function (e) { var p = S.players[e.pid]; return (p ? UI.pname(p) : esc(e.name)) + ' <span class="muted small">' + esc(e.team) + '</span>' + (e.user ? ' ⭐' : ''); };
      h += UI.box('个人奖项', '<table class="grid"><tr><th>奖项</th><th>球员</th><th>位置</th><th>场均</th></tr>' + rec.list.map(function (e) {
        var cat = X.Awards.CATS.find(function (c) { return c.cn === e.award; });
        return '<tr class="' + (e.user ? 'me' : '') + '"><td><b>' + e.award + '</b></td><td>' + who(e) + '</td><td>' + e.pos + '</td><td>' + e.val + ' ' + (cat ? cat.unit : '') + '</td></tr>';
      }).join('') + '</table>');
      h += UI.box('最佳阵容', '<table class="grid"><tr><th>位置</th><th>球员</th><th>场均综合</th></tr>' + rec.team.map(function (e) {
        return '<tr class="' + (e.user ? 'me' : '') + '"><td>' + X.POS_CN[e.award] + '</td><td>' + who(e) + '</td><td>' + e.val + '</td></tr>';
      }).join('') + '</table><p class="muted small">至少出场 13 场才有评奖资格。MVP 按场均得分+篮板+助攻+抢断+盖帽评选，获奖后潜力可能小幅提升。</p>');
    } else if (tab === 'hof') {
      var hof = (S.hof || []).slice().sort(function (a, b) { return b.peak - a.peak; });
      h += '<p class="tip">名人堂保留你最难忘的球员。本队球员退役时，如果拿过奖项、效力过 3 个赛季以上或升到 3 星以上，会自动入选；也可以在右侧职业球员的球员卡上点「入选名人堂」手动添加（最多 ' + X.Awards.HOF_MAX + ' 人）。</p>';
      h += hof.length ? '<div class="hof">' + hof.map(function (e) {
        var t = e.tot, g = t.gp || 1, alive = S.players[e.pid];
        return '<div class="hof-c"><div class="hof-n' + (e.green ? ' green' : '') + '">' + esc(e.name) + (e.star ? ' <span class="pstar">' + e.star + '★</span>' : '') + '</div>' +
          '<div class="muted small">' + e.pos + ' · ' + e.h + 'cm · 巅峰综合 <b>' + e.peak + '</b>' + (alive ? '' : ' · 已退役') + '</div>' +
          '<div class="small">' + t.seasons + ' 个赛季 ' + t.gp + ' 场，场均 ' + U.r1(t.pts / g) + ' 分 ' + U.r1(t.reb / g) + ' 板 ' + U.r1(t.ast / g) + ' 助</div>' +
          (e.awards.length ? '<div class="hof-a">' + e.awards.slice(-6).map(function (a) { return '<span class="tag">' + esc(a.replace(/^第\d+赛季 /, '')) + '</span>'; }).join('') + (e.awards.length > 6 ? ' 等 ' + e.awards.length + ' 项' : '') + '</div>' : '') +
          '<div class="muted small">' + esc(e.team) + ' · 第 ' + e.season + ' 赛季入选' + (e.why ? '（' + esc(e.why) + '）' : '') + ' ' + UI.link('移出', 'hofdel', { pid: e.pid }) + '</div></div>';
      }).join('') + '</div>' : '<span class="muted">名人堂还空着。</span>';
    } else {
      h += S.history.length ? '<table class="grid"><tr><th>赛季</th><th>XBA 超级联赛冠军</th><th>XBA杯冠军杯冠军</th></tr>' + S.history.map(function (x) {
        return '<tr><td>第 ' + x.season + ' 赛季</td><td>' + esc(x.champions[0].team) + (x.champions[0].isUser ? ' 🏆' : '') + '</td><td>' + esc(x.xcup || '-') + '</td></tr>';
      }).join('') + '</table>' : '<span class="muted">第一个赛季还没结束</span>';
    }
    return h;
  };
  A.awseason = function (d, el) { UI.awardSeason = +el.value; UI.render(); };
  A.awleague = function (d, el) { UI.awardLeague = el.value; UI.render(); };
  A.hofadd = function (d) {
    var S = UI.S, p = S.players[d.pid], was = X.Awards.inHof(S, p.id);
    UI.result(X.Awards.addHof(S, p, '经理推荐'), was ? '名人堂资料已更新' : p.name + ' 入选名人堂！');
  };
  A.hofdel = function (d) { X.Awards.removeHof(UI.S, d.pid); UI.result(null, '已移出名人堂'); };
})(window.XBA);
