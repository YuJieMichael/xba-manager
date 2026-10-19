// 启动：读取存档
(function (X) {
  var UI = X.UI;
  // 旧存档补字段
  function migrate(S) {
    S.awards = S.awards || {};
    S.hof = S.hof || [];
    if (S.user.doubleActive) S.user.doubleUntil = (S.dayNo || 0) + 3;
    delete S.user.doubleActive;
    // 名人堂只收职业球员
    S.hof = S.hof.filter(function (h) { var p = S.players[h.pid], t = p && p.teamId && S.teams[p.teamId]; return h.kind ? h.kind === 'pro' : !(t && t.kind === 'street'); });
    if (S.user.onboarded) {
      var pro = S.teams[S.user.proId];
      if (pro && !pro.boards.cup) pro.boards.cup = JSON.parse(JSON.stringify(pro.boards.league));
      if (!S.xcup && S.day <= 1) X.XCup.setup(S, true);
      if (!S.user.goals || S.user.goals.season !== S.season) X.Goals.newSeason(S);
    }
  }
  function boot() {
    X.Save.load().then(function (S) {
      if (S && S.user && S.players) { UI.S = S; migrate(S); }
      UI.route = 'home';
      document.getElementById('app').innerHTML = '';
      UI.render();
    }).catch(function (e) {
      console.error(e);
      document.getElementById('app').innerHTML = '';
      UI.render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.XBA);
