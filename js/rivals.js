// 宿敌：经常交手、比分咬得紧、季后赛碰过的球队，宿敌值越高越“结仇”
(function (X) {
  var R = {};
  X.Rivals = R;
  var W = function () { return X.World; };
  R.THRESHOLD = 8;

  R.afterGame = function (S, oppId, margin, kind) {
    var h = S.user.h2h = S.user.h2h || {};
    var r = h[oppId] = h[oppId] || { w: 0, l: 0, score: 0 };
    var was = R.isRival(S, oppId);
    if (margin > 0) r.w++; else r.l++;
    r.score += 1 + (Math.abs(margin) <= 5 ? 2 : 0) + (kind === 'playoff' ? 3 : 0) + (margin < 0 ? 1 : 0);
    var t = S.teams[oppId];
    if (!was && R.isRival(S, oppId) && t) W().msg(S, '🔥 ' + t.name + ' 成为你的宿敌！以后的宿敌对决门票和球衣收入 ×1.5，输赢对球迷影响翻倍', 'sys');
    if (was && margin > 0) { var pro = W().userPro(S); pro.morale = Math.min(1.05, (pro.morale || 1) + 0.02); }
  };
  R.list = function (S) {
    var h = S.user.h2h || {};
    return Object.keys(h).filter(function (id) { return S.teams[id]; }).map(function (id) { return { id: id, r: h[id] }; })
      .sort(function (a, b) { return b.r.score - a.r.score; });
  };
  // 宿敌：宿敌值最高的 3 队，且达到门槛
  R.isRival = function (S, tid) {
    return R.list(S).slice(0, 3).some(function (x) { return x.id === tid && x.r.score >= R.THRESHOLD; });
  };
  R.seasonDecay = function (S) {
    var h = S.user.h2h || {};
    Object.keys(h).forEach(function (id) { h[id].score = Math.round(h[id].score * 0.6 * 10) / 10; if (!S.teams[id]) delete h[id]; });
  };
})(window.XBA);
