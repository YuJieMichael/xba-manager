// 球员交易：和 AI 球队以人换人、加钱换人；交易截止日（第 20 天）后关闭；AI 也会主动来报价
(function (X) {
  var U = X.U, P = X.P, TR = {};
  X.Trade = TR;
  var W = function () { return X.World; };
  TR.DEADLINE = 20;
  TR.PRO_MAX = 12; TR.PRO_MIN = 8;

  TR.open = function (S) { return S.day < TR.DEADLINE; };

  // AI 对球员的估价：缺这个位置更想要，年轻加分、老将打折
  TR.aiValue = function (S, team, p, incoming) {
    var cnt = W().teamPlayers(S, team).filter(function (x) { return x.pos === p.pos; }).length - (incoming ? 0 : 1);
    var need = cnt < 2 ? 1.15 : cnt >= 3 ? 0.9 : 1;
    var age = p.age <= 23 ? 1.1 : p.age >= 31 ? 0.8 : 1;
    return P.value(p) * need * age;
  };

  // 打包估值：篮球是看上场那几个人的，两个替补换不来一个核心。
  // 最值钱的那个按全价，其余每人只按 60% 算（凑人头打折）
  TR.DEPTH_F = 0.6;
  TR.pkgValue = function (vals) {
    vals = vals.slice().sort(function (a, b) { return b - a; });
    return vals.length ? vals[0] + U.sum(vals.slice(1)) * TR.DEPTH_F : 0;
  };

  // give：用户送出的球员；take：用户要的球员；money：用户额外付出的资金（负数 = 对方给你钱）
  TR.evaluate = function (S, tid, give, take, money) {
    var team = S.teams[tid], pro = W().userPro(S);
    if (!TR.open(S)) return { err: '已过交易截止日（每赛季第 ' + TR.DEADLINE + ' 天），下赛季再来' };
    if (!give.length && !take.length) return { err: '请选择要交易的球员' };
    var gp = give.map(function (id) { return S.players[id]; }), tp = take.map(function (id) { return S.players[id]; });
    if (gp.some(function (p) { return !p || p.teamId !== pro.id || p.listing; }) || tp.some(function (p) { return !p || p.teamId !== tid || p.listing; })) return { err: '有球员已经不在原来的球队了' };
    var myCount = pro.playerIds.length - give.length + take.length, aiCount = team.playerIds.length - take.length + give.length;
    if (myCount > TR.PRO_MAX) return { err: '交易后你的职业队超过 ' + TR.PRO_MAX + ' 人' };
    if (myCount < TR.PRO_MIN) return { err: '交易后你的职业队少于 ' + TR.PRO_MIN + ' 人' };
    if (aiCount < 9 || aiCount > 13) return { err: '对方人数不合适（交易后需要 9~13 人）' };
    if (money > 0 && S.user.money < money) return { err: '资金不足' };
    var salOut = U.sum(gp.map(function (p) { return p.salary; })), salIn = U.sum(tp.map(function (p) { return p.salary; }));
    var payAfter = W().payroll(S, pro) - salOut + salIn;
    if (payAfter > W().cap(pro) && salIn > salOut) return { err: '交易后工资超过工资帽，超帽时只能换来总薪水更低的球员' };
    // 对方收到的人按打包估值（凑数的打折），对方送出的人每个都要足价
    var vin = TR.pkgValue(gp.map(function (p) { return TR.aiValue(S, team, p, true); })) + money;
    var vout = U.sum(tp.map(function (p) { return TR.aiValue(S, team, p, false); })) * 1.08;
    var gap = Math.round(vout - vin);
    return { ok: gap <= 0, gap: gap, vin: vin, vout: vout };
  };

  TR.execute = function (S, tid, give, take, money) {
    var team = S.teams[tid], pro = W().userPro(S);
    give.forEach(function (id) {
      var p = S.players[id];
      var loss = Math.round(pro.fans * p.support / 100 * 0.04);
      pro.fans = Math.max(300, pro.fans - loss);
      W().removeFromTeam(S, pro, p); W().addToTeam(S, team, p); p.green = false;
    });
    take.forEach(function (id) {
      var p = S.players[id];
      W().removeFromTeam(S, team, p); W().addToTeam(S, pro, p); p.green = false; p.joined = S.dayNo;
    });
    if (money > 0) W().spend(S, money, '交易补偿：' + team.name);
    if (money < 0) W().earn(S, -money, '交易补偿：' + team.name);
    W().refreshAITactics(S, team);
    var names = function (ids) { return ids.map(function (id) { return S.players[id].name; }).join('、') || '无'; };
    W().msg(S, '🔁 交易完成：与 ' + team.name + '，送出 ' + names(give) + '，得到 ' + names(take) + (money ? '，' + (money > 0 ? '你付出 ' : '对方付给你 ') + U.money(Math.abs(money)) : ''), 'market');
  };

  // AI 主动报价（截止日前，每天小概率）
  TR.daily = function (S) {
    S.tradeOffers = (S.tradeOffers || []).filter(function (o) { return o.expires > S.dayNo && S.players[o.want] && S.teams[o.team]; });
    if (!TR.open(S) || U.chance(0.85) || S.tradeOffers.length >= 3) return;
    var pro = W().userPro(S);
    var mine = W().teamPlayers(S, pro).filter(function (p) { return !p.listing; }).sort(function (a, b) { return P.value(b) - P.value(a); }).slice(0, 6);
    if (!mine.length) return;
    var want = U.pick(mine);
    var teams = Object.keys(S.teams).map(function (k) { return S.teams[k]; }).filter(function (t) { return !t.isUser && t.kind === 'pro' && Math.abs(t.level - pro.level) <= 1 && t.playerIds.length >= 10; });
    if (!teams.length) return;
    var team = U.pick(teams), wantV = P.value(want);
    // 报价至少要按你的视角（身价，凑数球员打折）给足，再多给一点溢价
    var target = Math.max(wantV, TR.aiValue(S, team, want, true)) * U.rf(1.0, 1.12);
    var pool = W().teamPlayers(S, team).filter(function (p) { return !p.listing; }).sort(function (a, b) { return P.value(b) - P.value(a); });
    // 必须有一个像样的核心球员（身价不低于你这名球员的 45%），否则不报价——不拿一堆替补 + 现金凑数
    var core = pool.find(function (p) { var v = P.value(p); return v >= wantV * 0.45 && v <= target * 1.05; });
    if (!core) return;
    var give = [core.id], sum = P.value(core);
    for (var i = 0; i < pool.length && give.length < 2; i++) {
      if (pool[i] === core) continue;
      var v = P.value(pool[i]) * TR.DEPTH_F;
      if (sum + v <= target * 1.02) { give.push(pool[i].id); sum += v; }
    }
    var money = Math.max(0, Math.ceil((target - sum) / 10000) * 10000);
    if (money > target * 0.4) return; // 现金占大头的报价没诚意，不发
    S.tradeOffers.push({ id: U.uid(S, 'to'), team: team.id, want: want.id, give: give, money: money, expires: S.dayNo + 3 });
    W().msg(S, '📨 ' + team.name + ' 想要你的 ' + want.name + '，给出了交易报价，去「转会 → 球员交易」看看', 'market');
  };

  TR.acceptOffer = function (S, oid) {
    var o = (S.tradeOffers || []).find(function (x) { return x.id === oid; });
    if (!o) return '报价已过期';
    var ev = TR.evaluate(S, o.team, [o.want], o.give, -o.money);
    if (ev.err) return ev.err;
    TR.execute(S, o.team, [o.want], o.give, -o.money);
    S.tradeOffers = S.tradeOffers.filter(function (x) { return x !== o; });
    return null;
  };
  TR.declineOffer = function (S, oid) { S.tradeOffers = (S.tradeOffers || []).filter(function (x) { return x.id !== oid; }); };
})(window.XBA);
