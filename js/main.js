// 启动：读取存档、注册离线缓存、检测新版本
(function (X) {
  var UI = X.UI;

  function boot() {
    X.Save.load().then(function (S) {
      if (X.Migrate.valid(S)) {
        if (X.Migrate.tooNew(S)) {
          // 旧页面读到了新版本的存档：不读档，避免把存档写坏
          document.getElementById('app').innerHTML = '<div class="loading">这个存档来自更新的游戏版本。<br>' + '<button class="btn" onclick="location.reload()">刷新页面获取新版本</button></div>';
          return;
        }
        UI.S = X.Migrate.run(S);
        UI.persist();
      }
      UI.route = 'home';
      document.getElementById('app').innerHTML = '';
      UI.render();
    }).catch(function (e) {
      console.error(e);
      document.getElementById('app').innerHTML = '';
      UI.render();
      UI.reportError(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // ===== 离线缓存（只在 http/https 下可用，双击打开的 file:// 不注册）=====
  var online = /^https?:$/.test(location.protocol);
  if (online && 'serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('离线缓存注册失败', e); }); });

  // ===== 新版本检测：比较 version.json 和当前页面的版本号 =====
  var shown = false;
  function checkUpdate() {
    if (!online || shown) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.version || j.version === X.VERSION || shown) return;
      shown = true;
      var bar = document.createElement('div');
      bar.className = 'update-bar';
      bar.innerHTML = '🆕 新版本 ' + j.version + ' 已发布（当前 ' + X.VERSION + '）<button class="btn sm on">刷新更新</button><button class="btn sm">稍后</button>';
      bar.querySelectorAll('button')[0].onclick = function () {
        var go = function () { location.reload(); };
        if (UI.S) X.Save.save(UI.S).then(go, go); else go();
      };
      bar.querySelectorAll('button')[1].onclick = function () { bar.remove(); };
      document.body.appendChild(bar);
    }).catch(function () { /* 离线时忽略 */ });
  }
  window.addEventListener('load', function () { setTimeout(checkUpdate, 3000); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkUpdate(); });
  setInterval(checkUpdate, 30 * 60 * 1000);
})(window.XBA);
