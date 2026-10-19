// 存档：IndexedDB（容量大），失败时退回 localStorage；支持导出/导入
(function (X) {
  var SV = {};
  X.Save = SV;
  var DB = 'xba-manager', STORE = 'saves', KEY = 'main';

  SV.serialize = function (S) {
    return JSON.stringify(S, function (k, v) {
      if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 100) / 100;
      return v;
    });
  };

  function open() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  SV.save = function (S) {
    var data = SV.serialize(S);
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(data, KEY);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).catch(function () {
      try { localStorage.setItem('xba-save', data); } catch (e) { console.warn('保存失败', e); throw e; }
    });
  };

  SV.load = function () {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readonly');
        var r = tx.objectStore(STORE).get(KEY);
        r.onsuccess = function () { res(r.result || null); };
        r.onerror = function () { rej(r.error); };
      });
    }).catch(function () {
      try { return localStorage.getItem('xba-save'); } catch (e) { return null; }
    }).then(function (data) { return data ? JSON.parse(data) : null; });
  };

  SV.clear = function () {
    try { localStorage.removeItem('xba-save'); } catch (e) { /* ignore */ }
    return open().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { res(); };
      });
    }).catch(function () { });
  };

  SV.exportFile = function (S) {
    var blob = new Blob([SV.serialize(S)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xba-存档-第' + S.season + '赛季.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
})(window.XBA);
