// 每日悬念：伏笔与揭晓、待你决定的事件、明日预告
// 以及挂在上面的四个系统：新秀卡（抽卡式选秀）、主场氛围、球迷派系、名宿（退役第二人生）
// 和局外成长：传承点、传承树、流派图鉴
(function (X) {
  var U = X.U, P = X.P, ST = {};
  X.Story = ST;
  var W = function () { return X.World; };
  var O = function () { return X.Ops; };

  // ================= 初始化 / 存档字段 =================
  ST.init = function (S) {
    S.story = S.story || { hooks: [], asks: [], streak: 0, flags: {} };
    S.story.flags = S.story.flags || {};
    var u = S.user;
    u.heritage = u.heritage || { pts: 0, total: 0, tree: {}, styles: {} };
    u.atmo = u.atmo || {};
    u.alumni = u.alumni || [];
    var pro = S.user.proId && S.teams[S.user.proId];
    if (pro && !pro.fac) pro.fac = { hard: { s: 0.35, m: 60 }, casual: { s: 0.45, m: 60 }, star: { s: 0.2, m: 60 } };
    if (!u.styleAcc || u.styleAcc.season !== S.season) u.styleAcc = { season: S.season, off: {}, games: 0, pts: 0, pa: 0, tpa: 0, fga: 0, done: {} };
    return S.story;
  };
  function H(S) { return S.user.heritage; }
  function lv(S, id) { return (H(S).tree[id] || 0); }
  ST.lv = lv;

  // ================= 伏笔与揭晓 =================
  // hook：今天埋下，due 那天揭晓；tease 是「明日预告」里显示的悬念文字
  ST.hook = function (S, days, kind, data, tease) {
    S.story.hooks.push({ id: U.uid(S, 'hk'), due: S.dayNo + days, kind: kind, data: data || {}, tease: tease || '' });
  };
  // ask：需要你做决定的事件；过期按默认选项处理
  ST.ask = function (S, kind, o) {
    if (S.story.asks.some(function (a) { return a.kind === kind; })) return null;
    // 同一类事件至少隔 10 天再出现
    var cd = S.story.flags['cd_' + kind] || 0;
    if (cd > S.dayNo) return null;
    S.story.flags['cd_' + kind] = S.dayNo + 10;
    var a = Object.assign({ id: U.uid(S, 'ak'), kind: kind, exp: S.dayNo + (o.days || 3), def: o.def || 0 }, o);
    S.story.asks.push(a);
    return a;
  };
  var RES = {}, CHO = {};

  ST.choose = function (S, id, i) {
    var a = S.story.asks.find(function (x) { return x.id === id; });
    if (!a) return '这个事件已经过去了';
    var opt = a.opts[i]; if (!opt) return '选项无效';
    var r = CHO[a.kind] ? CHO[a.kind](S, a, i) : '';
    if (r && r.err) return r.err;
    S.story.asks = S.story.asks.filter(function (x) { return x !== a; });
    S.story.lastMsg = (typeof r === 'string' && r) || '已决定：' + opt.t;
    return null;
  };

  // 进入下一天之后调用
  ST.daily = function (S, out) {
    ST.init(S);
    var rv = out.reveals = out.reveals || [];
    var pro = W().userPro(S);
    // 1. 今天的比赛对球迷、氛围的影响
    var m = out.userGame && S.matches[out.userGame];
    if (m) afterUserGame(S, m, rv);
    // 2. 到期的伏笔揭晓
    var due = S.story.hooks.filter(function (h) { return h.due <= S.dayNo; });
    S.story.hooks = S.story.hooks.filter(function (h) { return h.due > S.dayNo; });
    due.forEach(function (h) { var r = RES[h.kind] && RES[h.kind](S, h); if (r) rv.push(r); });
    // 3. 过期没决定的事件按默认处理
    S.story.asks.slice().forEach(function (a) {
      if (a.exp <= S.dayNo) {
        var r = CHO[a.kind] && CHO[a.kind](S, a, a.def, true);
        S.story.asks = S.story.asks.filter(function (x) { return x !== a; });
        rv.push({ icon: '⌛', title: a.title + '（没来得及决定）', text: '按「' + a.opts[a.def].t + '」处理。' + (typeof r === 'string' ? r : '') });
        // 过期时默认选项要是没成功（比如名宿岗位满了），就当作放弃
      }
    });
    // 4. 各系统每日
    factionDaily(S, pro, rv);
    alumniDaily(S, rv);
    prospectDaily(S, rv);
    styleDaily(S, rv);
    if (S.story.boycott > 0 && m && m.home.id === pro.id) S.story.boycott--;
  };

  // ================= 明日预告 =================
  ST.teasers = function (S) {
    ST.init(S);
    var t = [], pro = W().userPro(S), round = W().roundOfDay(S.day);
    if (round) {
      var lg = W().league(S, pro.leagueId), g = (lg.schedule[round - 1] || []).find(function (x) { return x[0] === pro.id || x[1] === pro.id; });
      if (g) {
        var home = g[0] === pro.id, opp = S.teams[home ? g[1] : g[0]];
        var s = '🏀 联赛第 ' + round + ' 轮 ' + (home ? '主场' : '客场') + '对 ' + opp.name + (X.Rivals.isRival(S, opp.id) ? '（🔥 宿敌）' : '');
        if (S.story.streak >= 2) s += '，冲击 ' + (S.story.streak + 1) + ' 连胜';
        if (S.story.streak <= -2) s += '，必须止住 ' + (-S.story.streak) + ' 连败';
        t.push(s);
        if (home) {
          var ev = [];
          if (S.user.atmo.mascot) ev.push('吉祥物');
          if (S.user.atmo.lights) ev.push('灯光秀');
          if (S.user.atmo.food) ev.push('美食街');
          if (ev.length) t.push('🎪 主场夜：' + ev.join('、') + '可能整出点动静');
          if (S.story.boycott > 0) t.push('😠 铁杆球迷还在抵制主场（剩 ' + S.story.boycott + ' 场）');
        }
      }
    } else if (X.Playoffs.isDay(S.day)) t.push('🏆 季后赛日');
    if (S.day === 13) t.push('⭐ 全明星周末，极限球员市场开放');
    if (S.day === X.SEASON_END) t.push('🏁 赛季末结算：奖金、颁奖、流派确立、传承点');
    if (S.day === X.Trade.DEADLINE - 1) t.push('⏰ 明天之后交易窗口关闭');
    S.story.hooks.filter(function (h) { return h.due <= S.dayNo + 1 && h.tease; }).forEach(function (h) { t.push('🔮 ' + h.tease); });
    S.story.hooks.filter(function (h) { return h.due > S.dayNo + 1 && h.tease; }).forEach(function (h) { t.push('⏳ ' + h.tease + '（' + (h.due - S.dayNo) + ' 天后揭晓）'); });
    S.story.asks.forEach(function (a) { t.push('❓ ' + a.title + ' —— 还有 ' + Math.max(1, a.exp - S.dayNo) + ' 天做决定'); });
    var pc = prospectList(S), hidden = pc.filter(function (p) { return cardHidden(p).length; }).length;
    if (pc.length && hidden) t.push('🃏 球探会传回 ' + flipsPerDay(S) + ' 张新秀卡（本届还有 ' + hidden + ' 张没翻完）');
    return t;
  };

  // ================= 球迷派系 =================
  ST.FACTIONS = {
    hard: { cn: '铁杆派', icon: '🛡', desc: '输球也会来，但讨厌高票价、讨厌你卖掉老将' },
    casual: { cn: '看热闹派', icon: '🍿', desc: '赢球就来，连败就走；喜欢热闹的主场' },
    star: { cn: '追星派', icon: '🌟', desc: '只认球星，买球衣最大方' }
  };
  function fac(S) { var p = W().userPro(S); ST.init(S); return p.fac; }
  ST.fac = fac;
  function bump(S, k, d) { var f = fac(S)[k]; f.m = U.clamp(f.m + d, 0, 100); }
  function shift(S, k, d) {
    var F = fac(S); F[k].s = U.clamp(F[k].s + d, 0.1, 0.7);
    var tot = F.hard.s + F.casual.s + F.star.s;
    ['hard', 'casual', 'star'].forEach(function (x) { F[x].s /= tot; });
  }
  ST.demandMul = function (S, team) {
    if (!team.fac) return 1;
    var F = team.fac, v = 0;
    ['hard', 'casual', 'star'].forEach(function (k) { v += F[k].s * (0.7 + 0.5 * F[k].m / 100); });
    if (S.user.atmo && S.user.atmo.cheer) v *= 1.05;
    if (S.story && S.story.boycott > 0) v *= 0.85;
    return v;
  };
  ST.jerseyMul = function (S, team) {
    if (!team.fac) return 1;
    var st = team.fac.star;
    return 0.7 + 1.5 * st.s * (0.6 + 0.8 * st.m / 100);
  };
  function topStar(S) {
    return W().teamPlayers(S, W().userPro(S)).filter(function (p) { return p.inj <= 0; }).sort(function (a, b) { return b.support - a.support; })[0];
  }

  function afterUserGame(S, m, rv) {
    var pro = W().userPro(S), home = m.home.id === pro.id, won = home ? m.hs > m.as : m.as > m.hs;
    if (m.type !== 'league' && m.type !== 'playoff') return;
    var st = S.story;
    st.streak = won ? Math.max(0, st.streak) + 1 : Math.min(0, st.streak) - 1;
    bump(S, 'casual', won ? 4 : -5); bump(S, 'hard', won ? 1 : -1);
    var box = (home ? m.box.h : m.box.a) || [], star = topStar(S);
    var sb = star && box.find(function (b) { return b.pid === star.id; });
    bump(S, 'star', sb && sb.pts >= 20 ? 3 : won ? 1 : -1);
    if (st.streak === 3) { shift(S, 'casual', 0.03); rv.push({ icon: '🍿', title: '三连胜！看热闹的来了', text: '城里开始讨论你的球队，看热闹派球迷占比上升。' }); }
    if (st.streak === 6) { shift(S, 'casual', 0.04); O().hype(S, 6); rv.push({ icon: '🔥', title: '六连胜，全城沸腾', text: '热度 +6，看热闹派继续涌入。' }); }
    if (st.streak === -3 && fac(S).hard.m >= 45 && !st.flags['banner' + S.season]) {
      st.flags['banner' + S.season] = 1;
      pro.morale = Math.min(1.08, (pro.morale || 1) + 0.03);
      rv.push({ icon: '🛡', title: '铁杆球迷打出横幅：「输也陪你」', text: '三连败后铁杆派站了出来，球队士气 +3%。' });
    }
    if (st.streak === -4) { shift(S, 'casual', -0.03); rv.push({ icon: '🍿', title: '看热闹的走了', text: '四连败，看热闹派球迷占比下降，上座要受影响了。' }); }
    if (home) homeNight(S, m, won, rv);
  }

  function factionDaily(S, pro, rv) {
    var F = fac(S), amb = alumniRole(S, 'amb').length, target = 60 + 8 * amb;
    ['hard', 'casual', 'star'].forEach(function (k) { F[k].m += (target - F[k].m) * 0.04; });
    var ref = W().TICKET_REF[pro.level];
    if (pro.ticket > ref * 1.2) bump(S, 'hard', -0.8);
    else if (pro.ticket < ref * 0.85) bump(S, 'hard', 0.4);
    if (S.dayNo % 7 === 0) {
      var g = pro.rec.w + pro.rec.l, wr = g ? pro.rec.w / g : 0.5, star = topStar(S);
      shift(S, 'casual', (wr - 0.5) * 0.04 + ((S.user.hype || 20) - 30) / 3000 + (S.user.atmo.screen ? 0.006 : 0));
      if (star) shift(S, 'star', (star.support - 50) / 2500);
    }
    // 派系事件（每天最多冒出一个）
    if (Math.random() < 0.16) {
      var opts = [];
      if (pro.ticket > ref * 1.15 && F.hard.m < 58) opts.push(evBoycott);
      var star2 = topStar(S); if (star2 && F.star.s > 0.14) opts.push(evMeet);
      if (F.casual.m > 70) opts.push(evNickname);
      if (opts.length) U.pick(opts)(S, pro, ref, star2);
    }
  }
  function evBoycott(S, pro, ref) {
    ST.ask(S, 'boycott', {
      icon: '😠', title: '铁杆球迷发起票价抵制', days: 3, def: 1,
      text: '铁杆派在论坛发帖：票价 ' + pro.ticket + ' 元太黑了，要求降回 ' + ref + ' 元，否则抵制接下来的主场。',
      opts: [{ t: '降到 ' + ref + ' 元', d: '铁杆心情 +12' }, { t: '坚持现价', d: '可能被抵制两个主场（上座 -15%）' }], data: { ref: ref }
    });
  }
  CHO.boycott = function (S, a, i) {
    if (i === 0) { W().userPro(S).ticket = a.data.ref; bump(S, 'hard', 12); return '铁杆派满意了。'; }
    ST.hook(S, 1, 'boycott', {}, '铁杆球迷会不会真的抵制？');
    return '';
  };
  RES.boycott = function (S) {
    if (Math.random() < 0.65) { S.story.boycott = 2; bump(S, 'hard', -10); return { icon: '😠', title: '抵制开始了', text: '铁杆球迷宣布抵制接下来两个主场，上座需求 -15%，铁杆心情 -10。' }; }
    bump(S, 'hard', -3); return { icon: '😮‍💨', title: '抵制没成气候', text: '帖子吵了两天就沉了，铁杆派只是有点不爽（心情 -3）。' };
  };
  function evMeet(S, pro, ref, star) {
    ST.ask(S, 'meet', {
      icon: '🌟', title: '追星族想见 ' + star.name, days: 2, def: 1,
      text: '追星派球迷联名请求 ' + star.name + ' 参加一场球迷见面会。',
      opts: [{ t: '安排见面会', d: star.name + ' 体力 -20，追星派心情 +15，可能卖出一批签名球衣' }, { t: '婉拒', d: '追星派心情 -6' }], data: { pid: star.id }
    });
  }
  CHO.meet = function (S, a, i) {
    if (i === 1) { bump(S, 'star', -6); return '追星派有点失望。'; }
    var p = S.players[a.data.pid]; if (p) p.st = Math.max(30, p.st - 20);
    bump(S, 'star', 15);
    ST.hook(S, 1, 'meet', { pid: a.data.pid }, '见面会能来多少人？');
    return '';
  };
  RES.meet = function (S, h) {
    var p = S.players[h.data.pid], pro = W().userPro(S);
    var n = Math.round(pro.fans * fac(S).star.s * U.rf(0.05, 0.25)), money = n * U.ri(40, 90);
    W().earn(S, money, '球迷见面会：签名球衣');
    if (n > pro.fans * 0.04) shift(S, 'star', 0.02);
    return { icon: '✍', title: '见面会来了 ' + n + ' 人', text: (p ? p.name : '球星') + ' 签了一下午，签名球衣卖了 ' + U.money(money) + '。' + (n > pro.fans * 0.04 ? '追星派占比上升！' : '') };
  };
  var NICKS = ['海港铁军', '夜行狼群', '红色风暴', '闪电部队', '城市之光', '烈火战车', '钢铁兄弟', '飞天猛虎'];
  function evNickname(S) {
    var n = U.pick(NICKS);
    ST.ask(S, 'nick', {
      icon: '🍿', title: '球迷投票给球队起外号', days: 3, def: 1,
      text: '看热闹派发起投票，票数最高的外号是「' + n + '」。',
      opts: [{ t: '官方认证「' + n + '」', d: '看热闹派心情 +8，热度 +5；铁杆觉得有点俗（-3）' }, { t: '不理会', d: '没有影响' }], data: { n: n }
    });
  }
  CHO.nick = function (S, a, i) {
    if (i !== 0) return '';
    S.user.nick = a.data.n; bump(S, 'casual', 8); bump(S, 'hard', -3); O().hype(S, 5);
    return '球队有了外号「' + a.data.n + '」。';
  };
  // 卖掉老将：铁杆派不高兴
  ST.onSold = function (S, p) {
    if (p.joined == null || S.dayNo - p.joined < X.SEASON_DAYS * 2) return;
    bump(S, 'hard', -10);
    W().msg(S, '🛡 铁杆球迷对卖掉效力多年的 ' + p.name + ' 很不满（铁杆心情 -10）', 'fin');
  };

  // ================= 主场氛围 =================
  ST.ATMO = [
    { id: 'drums', cn: '鼓手看台', icon: '🥁', cost: 100000, per: '主场优势 +1%；每个主场铁杆心情 +2' },
    { id: 'cheer', cn: '啦啦队', icon: '💃', cost: 200000, upkeep: 5000, per: '主场上座需求 +5%；每个主场看热闹派心情 +2（每主场开销 5,000）' },
    { id: 'mascot', cn: '吉祥物', icon: '🐯', cost: 150000, per: '每个主场追星派、看热闹派心情 +1；有机会在网上走红' },
    { id: 'food', cn: '特色美食街', icon: '🍜', cost: 250000, per: '每个主场额外收入 = 上座人数 × 3；偶尔出爆款' },
    { id: 'screen', cn: '大屏幕', icon: '📺', cost: 350000, per: '主场优势 +0.5%；看热闹派占比慢慢上升' },
    { id: 'lights', cn: '灯光秀', icon: '🎆', cost: 600000, per: '每个主场热度 +1；开场秀可能惊艳全城，也可能出洋相' }
  ];
  var MASCOTS = ['大头虎', '篮篮', '海鸥仔', '暴走熊', '闪电兔', '铁锅侠'];
  ST.atmoCost = function (S, a) { return Math.round(a.cost * (lv(S, 'atmo') ? 0.75 : 1)); };
  ST.buyAtmo = function (S, id) {
    var a = ST.ATMO.find(function (x) { return x.id === id; }); if (!a) return '没有这个设施';
    if (S.user.atmo[id]) return '已经有了';
    var c = ST.atmoCost(S, a);
    if (S.user.money < c) return '资金不足，需要 ' + U.money(c);
    W().spend(S, c, '主场氛围：' + a.cn);
    S.user.atmo[id] = id === 'mascot' ? { name: U.pick(MASCOTS) } : 1;
    return null;
  };
  ST.homeAdv = function (S) {
    var a = (S.user && S.user.atmo) || {};
    return 1.02 + (a.drums ? 0.01 : 0) + (a.screen ? 0.005 : 0);
  };
  function homeNight(S, m, won, rv) {
    var a = S.user.atmo, pro = W().userPro(S), att = pro.lastAtt || 0;
    if (a.drums) bump(S, 'hard', 2);
    if (a.cheer) { bump(S, 'casual', 2); W().spend(S, 5000, '啦啦队演出费'); }
    if (a.mascot) { bump(S, 'star', 1); bump(S, 'casual', 1); }
    if (a.lights) O().hype(S, 1);
    if (a.food && att) {
      var extra = att * 3, hit = Math.random() < 0.15;
      if (hit) { extra *= U.ri(2, 4); rv.push({ icon: '🍜', title: '美食街出爆款了', text: '今晚的招牌小吃卖到断货，美食街收入 ' + U.money(extra) + '。' }); }
      W().earn(S, extra, '美食街收入');
    }
    if (a.mascot && Math.random() < 0.18) ST.hook(S, 1, 'viral', { name: a.mascot.name }, '吉祥物「' + a.mascot.name + '」的暂停舞蹈视频正在网上发酵……');
    if (a.lights && Math.random() < 0.2) ST.hook(S, 1, 'lights', {}, '昨晚灯光秀的现场视频，网友怎么评价？');
  }
  RES.viral = function (S, h) {
    var pro = W().userPro(S), r = Math.random();
    if (r < 0.45) {
      var n = Math.round(pro.fans * U.rf(0.03, 0.08)); pro.fans += n; O().hype(S, 8); bump(S, 'casual', 6); shift(S, 'casual', 0.01);
      return { icon: '🐯', title: '「' + h.data.name + '」火了！', text: '视频播放破千万，球迷 +' + n + '，热度 +8。' };
    }
    if (r < 0.9) { O().hype(S, 2); return { icon: '🐯', title: '「' + h.data.name + '」小火了一把', text: '有点热度但没出圈，热度 +2。' }; }
    bump(S, 'hard', -4); return { icon: '🐯', title: '「' + h.data.name + '」翻车了', text: '跳舞时摔进了客队替补席，被做成了表情包……铁杆觉得丢人（-4）。' };
  };
  RES.lights = function (S) {
    if (Math.random() < 0.65) { O().hype(S, 8); bump(S, 'casual', 6); var pro = W().userPro(S); pro.fans += Math.round(pro.fans * 0.02); return { icon: '🎆', title: '灯光秀惊艳全城', text: '开场秀被各大媒体转发，热度 +8，球迷 +2%。' }; }
    O().hype(S, -3); bump(S, 'hard', -2); return { icon: '🎆', title: '灯光秀出洋相', text: '开场时灯光全灭了五分钟，网友笑疯了，热度 -3。' };
  };

  // ================= 名宿（退役第二人生）=================
  ST.ROLES = {
    coach: { cn: '助理教练', icon: '🧑‍🏫', per: '全队训练效果提升（巅峰越高越多）；隔几天给年轻队员加练' },
    scout: { cn: '球探', icon: '🔭', per: '每天多翻 1 张新秀卡；偶尔力荐一名高潜新秀' },
    tv: { cn: '解说员', icon: '🎙', per: '每天热度 +1；偶尔在解说席上替队员造势' },
    amb: { cn: '球队大使', icon: '🤝', per: '三个球迷派系的心情都向更高的水平回归' }
  };
  ST.slots = function (S) { return 1 + lv(S, 'alumni'); };
  function alumniRole(S, role) { return (S.user.alumni || []).filter(function (a) { return a.role === role; }); }
  ST.alumniRole = alumniRole;
  // 你的职业队员退役时调用
  ST.onRetire = function (S, p) {
    ST.init(S);
    var info = { id: p.id, name: p.name, pos: p.pos, peak: U.r1(Math.max(p.peak || 0, P.ovr(p))), persona: p.persona, age: p.age, season: S.season };
    var free = Object.keys(ST.ROLES).filter(function (r) { return alumniRole(S, r).length < ST.slots(S); });
    var opts = free.map(function (r) { return { t: '请他当' + ST.ROLES[r].cn, d: ST.ROLES[r].per, role: r }; });
    opts.push({ t: '让他好好休息', d: '不留队', role: null });
    var a = { id: U.uid(S, 'ak'), kind: 'alumni', icon: '🎖', title: p.name + ' 退役了，要请他留队吗？', text: p.name + '（' + p.pos + '，巅峰综合 ' + info.peak + '，' + P.persona(p).cn + '）想继续为球队做点什么。', opts: opts, def: opts.length - 1, exp: S.dayNo + 10, data: info };
    S.story.asks.push(a);
  };
  CHO.alumni = function (S, a, i) {
    var r = a.opts[i].role; if (!r) return '';
    if (alumniRole(S, r).length >= ST.slots(S)) return { err: '这个岗位已经满了' };
    var x = Object.assign({}, a.data, { role: r, since: S.season });
    S.user.alumni.push(x);
    W().msg(S, '🎖 名宿 ' + x.name + ' 成为球队' + ST.ROLES[r].cn, 'staff');
    return '';
  };
  ST.dismiss = function (S, id) {
    S.user.alumni = S.user.alumni.filter(function (a) { return a.id !== id; });
    return null;
  };
  ST.trainMul = function (S, p) {
    var c = alumniRole(S, 'coach'), m = 1 + 0.03 * lv(S, 'train');
    c.forEach(function (a) { m *= 1 + 0.02 + a.peak / 2000; });
    return m;
  };
  function alumniDaily(S, rv) {
    var pro = W().userPro(S), ps = W().teamPlayers(S, pro);
    alumniRole(S, 'tv').forEach(function (a) {
      O().hype(S, 1);
      if (Math.random() < 0.1 && ps.length) {
        var p = U.pick(ps);
        ST.hook(S, 1, 'tvhype', { pid: p.id, name: a.name }, '名宿 ' + a.name + ' 在解说席上说要「爆个料」');
      }
    });
    alumniRole(S, 'coach').forEach(function (a) {
      if (S.dayNo % 4 !== 0 || Math.random() > 0.6) return;
      var young = ps.filter(function (p) { return p.age <= 25; });
      if (!young.length) return;
      var p = U.pick(young);
      ST.hook(S, 1, 'extra', { pid: p.id, name: a.name }, '名宿 ' + a.name + ' 拉着 ' + p.name + ' 加练到深夜');
    });
  }
  RES.tvhype = function (S, h) {
    var p = S.players[h.data.pid]; if (!p || p.teamId !== S.user.proId) return null;
    p.mor = Math.min(1.1, (p.mor || 1) + 0.04); p.morDays = 5; O().hype(S, 3);
    return { icon: '🎙', title: h.data.name + ' 的爆料', text: '「' + p.name + ' 是我见过最像年轻时的我的人。」' + p.name + ' 信心大增（接下来 5 天发挥 +4%），热度 +3。' };
  };
  RES.extra = function (S, h) {
    var p = S.players[h.data.pid]; if (!p || p.teamId !== S.user.proId) return null;
    var keys = X.ATTRS.filter(function (k) { return p.m[k] - p.a[k] > 0.3; });
    if (!keys.length) return { icon: '🧑‍🏫', title: '加练成果', text: p.name + ' 已经练到头了，' + h.data.name + ' 拍拍他肩膀说：「剩下的靠比赛。」' };
    var k = U.pick(keys), g = Math.min(p.m[k] - p.a[k], U.rf(0.4, 1.2));
    p.a[k] += g;
    return { icon: '🧑‍🏫', title: '加练成果', text: h.data.name + ' 的私人加练让 ' + p.name + ' 的' + X.ATTR_CN[k] + ' +' + g.toFixed(1) + '。' };
  };

  // ================= 新秀卡（抽卡式选秀）=================
  ST.RARITY = [
    { cn: '普通', c: '#9aa0a6' }, { cn: '稀有', c: '#3b82f6' }, { cn: '史诗', c: '#a855f7' }, { cn: '传说', c: '#f59e0b' }
  ];
  ST.CARD_KEYS = { ovr: '综合', pot: '潜力', trait: '特长', persona: '性格' };
  var CITIES = ['老城区', '港口夜市', '山区中学', '大学联赛', '海外训练营', '城中村球场', '少体校'];
  function prospectList(S) { return ((S.prospects && S.prospects.ids) || []).map(function (id) { return S.players[id]; }).filter(function (p) { return p && !p.teamId; }); }
  ST.prospects = prospectList;
  function cardHidden(p) { var r = (p.card && p.card.r) || {}; return Object.keys(ST.CARD_KEYS).filter(function (k) { return !r[k]; }); }
  ST.cardHidden = cardHidden;
  function flipsPerDay(S) { return 1 + lv(S, 'scout') + alumniRole(S, 'scout').length; }
  ST.flipsPerDay = flipsPerDay;
  ST.rarity = function (p) { return (p.card && p.card.rar) || 0; };

  ST.newClass = function (S) {
    var ids = [], n = 30;
    var heirs = (S.hof || []).concat(S.user.alumni || []);
    var heir = lv(S, 'blood') && heirs.length && Math.random() < 0.5 ? U.pick(heirs) : null;
    for (var i = 0; i < n; i++) {
      var tier = U.chance(0.06) ? 18 : U.chance(0.25) ? 8 : 0;
      var p = P.gen(S, { pos: X.POS[i % 5], age: U.ri(19, 21), ovr: U.rf(22, 38) + tier });
      if (heir && i === 0) {
        p.name = heir.name + ' 二世'; p.pos = heir.pos || p.pos; if (heir.persona) p.persona = heir.persona;
        X.ATTRS.forEach(function (k) { p.a[k] = Math.min(p.m[k], p.a[k] + 3); p.m[k] = Math.min(X.ATTR_CAP, p.m[k] + 6); });
        p.heir = heir.name;
      }
      p.draft = true;
      var stars = P.stars(p);
      p.card = { r: {}, rar: stars >= 9 ? 3 : stars >= 7 ? 2 : stars >= 5 ? 1 : 0 };
      if (p.heir) p.card.rar = Math.max(2, p.card.rar);
      ids.push(p.id);
    }
    S.prospects = { season: S.season, ids: ids, rumor: false };
    var list = prospectList(S);
    if (heir) W().msg(S, '🧬 传奇血脉：名宿 ' + heir.name + ' 的儿子出现在本届新秀名单里！', 'market');
    if (lv(S, 'prophet')) {
      var best = list.slice().sort(function (a, b) { return P.stars(b) - P.stars(a); })[0];
      if (best) { reveal(S, best, 'pot'); W().msg(S, '🔮 选秀先知：本届最有潜力的新秀是 ' + best.name, 'market'); }
    }
  };
  // 选秀开始时把这批新秀交给选秀池
  ST.takeProspects = function (S) {
    var ids = prospectList(S).map(function (p) { return p.id; });
    S.prospects = null;
    return ids;
  };
  function reveal(S, p, k) {
    p.card = p.card || { r: {}, rar: 0 }; p.card.r[k] = 1;
    if (k === 'pot') { p.seen = p.seen || {}; p.seen.pot = true; }
    if (k === 'ovr') { S.scouted = S.scouted || {}; S.scouted[p.id] = 3; }
  }
  ST.cardText = function (S, p, k) {
    if (k === 'ovr') return '综合 ' + P.ovr(p).toFixed(1);
    if (k === 'pot') return '潜力 ' + '★'.repeat(Math.ceil(P.stars(p) / 2)) + '（' + ST.RARITY[ST.rarity(p)].cn + '）';
    if (k === 'trait') { var t = P.allTraits(p)[0]; return t ? '特长 ' + t.t.icon + t.t.cn : '暂无特长'; }
    if (k === 'persona') { var ps = P.persona(p); return '性格 ' + ps.icon + ps.cn; }
    return '';
  };
  ST.flip = function (S, pid, free) {
    var p = S.players[pid]; if (!p || !p.card) return '找不到这张卡';
    var hid = cardHidden(p); if (!hid.length) return '这张卡已经全部翻开';
    if (!free) {
      if ((S.user.scoutPts || 0) > 0) S.user.scoutPts--;
      else { var cost = 8000 + 4000 * (ST.rarity(p)); if (S.user.money < cost) return '资金不足（翻一张要 ' + U.money(cost) + '）'; W().spend(S, cost, '新秀考察：' + p.name); }
    }
    // 潜力最后翻，留悬念
    var k = hid.length > 1 ? U.pick(hid.filter(function (x) { return x !== 'pot'; })) : hid[0];
    reveal(S, p, k);
    return { p: p, k: k };
  };
  function prospectDaily(S, rv) {
    if ((!S.prospects || S.prospects.season !== S.season) && (!S.draft || S.draft.done)) ST.newClass(S);
    var list = prospectList(S); if (!list.length) return;
    var out = [];
    for (var i = 0; i < flipsPerDay(S); i++) {
      var cand = list.filter(function (p) { return cardHidden(p).length; });
      if (!cand.length) break;
      // 越稀有、翻得越少的卡越容易被球探传回来
      var p = cand[U.wpick(cand.map(function (x) { return (1 + ST.rarity(x)) * cardHidden(x).length; }))];
      var r = ST.flip(S, p.id, true);
      if (r && r.p) out.push(p.name + '（' + p.pos + '，' + p.age + ' 岁）→ ' + ST.cardText(S, p, r.k));
    }
    if (out.length) rv.push({ icon: '🃏', title: '球探传回新秀卡', text: out.join('\n') });
    // 传闻：过两天揭晓一张高稀有度卡的潜力
    var scoutBoost = alumniRole(S, 'scout').length ? 0.08 : 0;
    if (!S.prospects.rumor && Math.random() < 0.1 + scoutBoost) {
      var hot = list.filter(function (p) { return ST.rarity(p) >= 2 && !p.card.r.pot; });
      if (hot.length) {
        var t = U.pick(hot); S.prospects.rumor = true;
        ST.hook(S, 2, 'rumor', { pid: t.id }, '球探在' + U.pick(CITIES) + '发现一名「' + (ST.rarity(t) === 3 ? '怪物级' : '很有天赋') + '」的新秀，正在写完整报告');
      }
    }
  }
  RES.rumor = function (S, h) {
    if (S.prospects) S.prospects.rumor = false;
    var p = S.players[h.data.pid]; if (!p || p.teamId) return null;
    Object.keys(ST.CARD_KEYS).forEach(function (k) { reveal(S, p, k); });
    var R = ST.RARITY[ST.rarity(p)];
    return { icon: '📜', title: '球探报告：' + R.cn + '新秀 ' + p.name, text: p.pos + '，' + p.age + ' 岁，' + ['ovr', 'pot', 'trait', 'persona'].map(function (k) { return ST.cardText(S, p, k); }).join('，') + '。去「新秀卡」看看他吧。' };
  };

  // ================= 流派 =================
  ST.STYLES = [
    { id: 'run', cn: '跑轰流', icon: '💨', rule: '快速进攻占进攻 35% 以上', test: function (a) { return share(a, ['fast']) >= 0.35; }, prog: function (a) { return share(a, ['fast']) / 0.35; } },
    { id: 'three', cn: '三分雨', icon: '🎯', rule: '外线投篮占 35% 以上，或三分出手占投篮 38% 以上', test: function (a) { return share(a, ['outside']) >= 0.35 || (a.fga && a.tpa / a.fga >= 0.38); }, prog: function (a) { return Math.max(share(a, ['outside']) / 0.35, a.fga ? a.tpa / a.fga / 0.38 : 0); } },
    { id: 'paint', cn: '内线铁塔', icon: '🗼', rule: '强打内线 + 中锋策应占 50% 以上', test: function (a) { return share(a, ['inside', 'post']) >= 0.5; }, prog: function (a) { return share(a, ['inside', 'post']) / 0.5; } },
    { id: 'pnr', cn: '挡拆艺术', icon: '🧱', rule: '挡拆配合占 35% 以上', test: function (a) { return share(a, ['pnr']) >= 0.35; }, prog: function (a) { return share(a, ['pnr']) / 0.35; } },
    { id: 'wall', cn: '防守大闸', icon: '🛡', rule: '场均失分全联赛最少', test: function (a, S) { return a.wallRank === 1; }, prog: function (a) { return a.wallRank ? 1 / a.wallRank : 0; } },
    { id: 'youth', cn: '青春风暴', icon: '🌱', rule: '主力 8 人平均年龄 ≤ 23.5', test: function (a) { return a.age && a.age <= 23.5; }, prog: function (a) { return a.age ? 23.5 / a.age : 0; } },
    { id: 'vets', cn: '老将俱乐部', icon: '🧓', rule: '主力 8 人平均年龄 ≥ 30', test: function (a) { return a.age >= 30; }, prog: function (a) { return (a.age || 0) / 30; } },
    { id: 'kaleido', cn: '万花筒', icon: '🌀', rule: '没有一套进攻超过 28%，且至少 4 套用到 10% 以上', test: function (a) { return kale(a); }, prog: function (a) { return kale(a) ? 1 : 0.5; } }
  ];
  function share(a, ids) {
    var tot = 0, s = 0; for (var k in a.off) { tot += a.off[k]; if (ids.indexOf(k) >= 0) s += a.off[k]; }
    return tot ? s / tot : 0;
  }
  function kale(a) {
    var tot = 0, k; for (k in a.off) tot += a.off[k]; if (!tot) return false;
    var big = 0, used = 0; for (k in a.off) { var v = a.off[k] / tot; if (v > 0.28) big++; if (v >= 0.1) used++; }
    return !big && used >= 4;
  }
  // 联赛每场：累计你的打法
  ST.leagueGame = function (S, res, h, a) {
    if (!h.isUser && !a.isUser) return;
    ST.init(S);
    var side = h.isUser ? 'h' : 'a', acc = S.user.styleAcc, used = res.used && res.used[side];
    if (used && used.off) for (var k in used.off) acc.off[k] = (acc.off[k] || 0) + used.off[k];
    acc.games++; acc.pts += h.isUser ? res.hs : res.as; acc.pa += h.isUser ? res.as : res.hs;
    ((res.box && res.box[side]) || []).forEach(function (b) { acc.tpa += b.tpa || 0; acc.fga += b.fga || 0; });
  };
  ST.styleSnapshot = function (S) {
    var acc = S.user.styleAcc, pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    var top = W().teamPlayers(S, pro).sort(function (x, y) { return P.ovr(y) - P.ovr(x); }).slice(0, 8);
    acc.age = top.length ? U.r1(U.avg(top.map(function (p) { return p.age; }))) : 0;
    var pa = lg.teamIds.map(function (id) { var t = S.teams[id], g = t.rec.w + t.rec.l; return { id: id, v: g ? t.rec.pa / g : 999 }; }).sort(function (x, y) { return x.v - y.v; });
    acc.wallRank = acc.games ? pa.findIndex(function (x) { return x.id === pro.id; }) + 1 : 0;
    return acc;
  };
  ST.currentStyles = function (S) {
    var acc = ST.styleSnapshot(S);
    if (acc.games < 6) return [];
    return ST.STYLES.filter(function (s) { return s.test(acc, S); });
  };
  function styleDaily(S, rv) {
    var acc = S.user.styleAcc; if (!acc || acc.games < 8 || S.dayNo % 2) return;
    ST.currentStyles(S).forEach(function (s) {
      if (acc.done[s.id]) return;
      acc.done[s.id] = 1;
      rv.push({ icon: s.icon, title: '流派成型：' + s.cn, text: '照这个打法打到赛季末，就能在流派图鉴里点亮「' + s.cn + '」，拿传承点。' });
    });
  }

  // ================= 传承点 / 传承树 =================
  ST.TREE = [
    { id: 'seed', cn: '启动资金', icon: '💰', cost: 4, max: 3, per: '每级立刻 +30 万资金；重生开局也有' },
    { id: 'scout', cn: '球探世家', icon: '🔭', cost: 6, max: 2, per: '每天多翻 1 张新秀卡' },
    { id: 'atmo', cn: '主场基因', icon: '🎪', cost: 6, max: 1, per: '主场氛围设施 7.5 折' },
    { id: 'hard', cn: '铁杆传统', icon: '🛡', cost: 5, max: 1, per: '铁杆派占比 +10%，心情 +10' },
    { id: 'train', cn: '训练传统', icon: '🏋', cost: 8, max: 3, per: '每级训练效果 +3%' },
    { id: 'prophet', cn: '选秀先知', icon: '🔮', cost: 8, max: 1, per: '每届新秀一出来，就翻开最有潜力那张卡的潜力' },
    { id: 'alumni', cn: '名宿召回', icon: '🎖', cost: 10, max: 1, per: '每种名宿岗位多 1 个名额' },
    { id: 'blood', cn: '传奇血脉', icon: '🧬', cost: 12, max: 1, per: '名人堂球员和名宿的儿子有一半机会出现在每届新秀里（继承性格，潜力更高）' }
  ];
  ST.buy = function (S, id) {
    var n = ST.TREE.find(function (x) { return x.id === id; }); if (!n) return '没有这个节点';
    var h = H(S), cur = h.tree[id] || 0;
    if (cur >= n.max) return '已经满级';
    if (h.pts < n.cost) return '传承点不够（需要 ' + n.cost + '）';
    h.pts -= n.cost; h.tree[id] = cur + 1;
    applyNode(S, id);
    return null;
  };
  function applyNode(S, id) {
    if (id === 'seed') W().earn(S, 300000, '传承：启动资金');
    if (id === 'hard') { shift(S, 'hard', 0.1); bump(S, 'hard', 10); }
  }
  // 新档 / 重生开局
  ST.onNewCareer = function (S) {
    ST.init(S);
    var h = H(S);
    for (var i = 0; i < (h.tree.seed || 0); i++) W().earn(S, 300000, '传承：启动资金');
    if (h.tree.hard) { shift(S, 'hard', 0.1); bump(S, 'hard', 10); }
  };

  // 赛季末结算（在 W.seasonEnd 前后调用）
  ST.beforeSeasonEnd = function (S) {
    ST.init(S);
    var pro = W().userPro(S), lg = W().league(S, pro.leagueId);
    return { rank: W().standings(S, lg).indexOf(pro) + 1, level: pro.level, lgName: lg.name, troph: S.user.trophies.length, styles: ST.currentStyles(S), goals: ((S.user.goals && S.user.goals.list) || []).filter(function (g) { return g.done; }).length };
  };
  ST.afterSeasonEnd = function (S, b, out) {
    var h = H(S), pro = W().userPro(S), lines = [], pts = 2;
    lines.push('完成一个赛季 +2');
    var rp = b.rank === 1 ? 6 : b.rank <= 3 ? 4 : b.rank <= 6 ? 2 : 0;
    if (rp) { pts += rp; lines.push('联赛第 ' + b.rank + ' 名 +' + rp); }
    var up = pro.level < b.level, champ = S.user.trophies.slice(b.troph).some(function (t) { return t.name === b.lgName + ' 冠军'; });
    if (up) { pts += 4; lines.push('升级 +4'); }
    if (champ) { pts += 6; lines.push('联赛冠军 +6'); }
    if (b.goals) { pts += b.goals * 2; lines.push('完成 ' + b.goals + ' 个赛季目标 +' + b.goals * 2); }
    b.styles.forEach(function (s) {
      var rec = h.styles[s.id] = h.styles[s.id] || { n: 0, up: false, champ: false };
      if (!rec.n) { pts += 3; lines.push(s.icon + '首次确立「' + s.cn + '」+3'); }
      rec.n++;
      if (up && !rec.up) { rec.up = true; pts += 5; lines.push(s.icon + '「' + s.cn + '」首次升级 +5'); }
      if (champ && !rec.champ) { rec.champ = true; pts += 10; lines.push(s.icon + '「' + s.cn + '」首次夺冠 +10'); }
    });
    h.pts += pts; h.total += pts;
    out.heritage = { pts: pts, lines: lines, styles: b.styles.map(function (s) { return s.icon + s.cn; }) };
    W().msg(S, '🌳 本赛季获得 ' + pts + ' 传承点（共 ' + h.pts + ' 点可用），去「传承与流派」看看', 'sys');
    S.user.styleAcc = { season: S.season, off: {}, games: 0, pts: 0, pa: 0, tpa: 0, fga: 0, done: {} };
    S.story.streak = 0;
  };

  // ================= 挂到游戏流程上 =================
  var W0 = X.World;
  var origAdvance = W0.advance;
  W0.advance = function (S, pre) {
    var before = null;
    if (S.user && S.user.onboarded) { ST.init(S); if (S.day === X.SEASON_END) before = ST.beforeSeasonEnd(S); }
    S._stBefore = before;
    var out = origAdvance.call(this, S, pre);
    if (S.user && S.user.onboarded) ST.daily(S, out);
    return out;
  };
  var origSeasonEnd = W0.seasonEnd;
  W0.seasonEnd = function (S, out) {
    var b = S._stBefore || (S.user.onboarded ? ST.beforeSeasonEnd(S) : null);
    origSeasonEnd.call(this, S, out);
    if (b) ST.afterSeasonEnd(S, b, out);
    S._stBefore = null;
  };
  var origFinish = W0.finishOnboard;
  W0.finishOnboard = function (S, info) {
    origFinish.call(this, S, info);
    ST.init(S); ST.onNewCareer(S); ST.newClass(S);
  };
  var origRebirth = W0.rebirth;
  W0.rebirth = function (S, hofPid, bonus) {
    var S2 = origRebirth.call(this, S, hofPid, bonus);
    var h = JSON.parse(JSON.stringify(H(S)));
    S2.user.heritage = h;
    // 名宿跟着你重生（继续当原来的岗位）
    S2.user.alumni = JSON.parse(JSON.stringify(S.user.alumni || []));
    return S2;
  };
  var origRemove = W0.removeFromTeam;
  W0.removeFromTeam = function (S, team, p) {
    if (team && team.isUser && team.kind === 'pro' && !S._retiring && S.user.onboarded) ST.onSold(S, p);
    return origRemove.apply(this, arguments);
  };
  var origLeagueGame = X.Records.leagueGame;
  X.Records.leagueGame = function (S, res, h, a) { origLeagueGame.apply(this, arguments); ST.leagueGame(S, res, h, a); };
  var origOnRetire = X.Awards.onRetire;
  X.Awards.onRetire = function (S, p, team) {
    origOnRetire.apply(this, arguments);
    if (team && team.isUser && team.kind === 'pro') { ST.onRetire(S, p); S._retiring = p.id; }
  };
  var origDelete = W0.deletePlayer;
  W0.deletePlayer = function (S, p) { var r = origDelete.apply(this, arguments); if (S._retiring === p.id) S._retiring = null; return r; };
})(window.XBA);
