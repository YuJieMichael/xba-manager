// 静态数据：属性、位置、战术矩阵（来自原版《经理手册》）、名字库等
var XBA = window.XBA || {};
window.XBA = XBA;

XBA.ATTRS = ['spd', 'jmp', 'str', 'sta', 'sht', 'thr', 'dri', 'pas', 'reb', 'stl', 'blk'];
XBA.ATTR_CN = { spd: '速度', jmp: '弹跳', str: '强壮', sta: '耐力', sht: '投篮', thr: '三分', dri: '运球', pas: '传球', reb: '篮板', stl: '抢断', blk: '封盖' };
XBA.PHYS = ['spd', 'jmp', 'str', 'sta'];
XBA.POS = ['C', 'PF', 'SF', 'SG', 'PG'];
XBA.POS_CN = { C: '中锋', PF: '大前锋', SF: '小前锋', SG: '得分后卫', PG: '组织后卫' };

// 球员能力侧重表：1=最重要 … 11=最不重要（顺序同 ATTRS）
XBA.POS_ATTR_RANK = {
  C:  [7, 4, 1, 3, 4, 11, 9, 6, 1, 6, 1],
  PF: [5, 3, 1, 3, 3, 11, 8, 5, 1, 4, 2],
  SF: [3, 1, 3, 3, 2, 4, 4, 4, 3, 3, 5],
  SG: [1, 2, 5, 3, 1, 1, 2, 3, 9, 2, 11],
  PG: [1, 5, 7, 3, 2, 3, 1, 1, 10, 1, 11]
};

// 潜力颜色条：差值（上限-现值）落在哪一档
XBA.POT_BANDS = [25, 20, 16, 12.5, 9.5, 7, 4.8, 3, 1.5, 0.7, 0];
XBA.POT_COLORS = ['#0a7d12', '#2f9e1c', '#62b81f', '#9acb1d', '#cfd51a', '#f2c414', '#f39a12', '#ee6f12', '#e2471a', '#c82727', '#8a8a8a'];
// 潜力星级（潜力剩余）
XBA.STAR_BANDS = [2, 4, 7, 10, 13, 17, 21, 25, 30];

// 14 种基本进攻方式
XBA.METHODS = [
  { id: 'in_iso', cn: '内线单打', zone: 'in', kind: 'iso' },
  { id: 'in_pass', cn: '接传球内线', zone: 'in', kind: 'pass' },
  { id: 'in_pr', cn: '挡拆内线', zone: 'in', kind: 'pr' },
  { id: 'mid_iso', cn: '单打中投', zone: 'mid', kind: 'iso' },
  { id: 'mid_pass', cn: '接传球中投', zone: 'mid', kind: 'pass' },
  { id: 'mid_pr', cn: '挡拆中投', zone: 'mid', kind: 'pr' },
  { id: 'drv_iso', cn: '单打突破', zone: 'drv', kind: 'iso' },
  { id: 'drv_pass', cn: '接传球突破', zone: 'drv', kind: 'pass' },
  { id: 'drv_pr', cn: '挡拆突破', zone: 'drv', kind: 'pr' },
  { id: 'thr_iso', cn: '单打三分', zone: 'thr', kind: 'iso' },
  { id: 'thr_pass', cn: '接传球三分', zone: 'thr', kind: 'pass' },
  { id: 'thr_pr', cn: '挡拆三分', zone: 'thr', kind: 'pr' },
  { id: 'fb', cn: '普通快攻', zone: 'fb', kind: 'fb' },
  { id: 'stl_fb', cn: '抄球快攻', zone: 'fb', kind: 'fb' }
];

// 职业进攻战术 → 各进攻方式出现比率（1 高 … 11 低），顺序同 METHODS
XBA.OFF_TACTICS = [
  { id: 'inside', cn: '强打内线', rank: [1, 2, 2, 10, 8, 8, 4, 5, 4, 11, 11, 11, 11, 11], desc: '有强劲中锋和大前锋能起到不错的效果' },
  { id: 'post', cn: '中锋策应', rank: [9, 3, 3, 8, 6, 3, 4, 4, 2, 9, 9, 6, 11, 11], desc: '中锋个人能力和全队整体配合比较突出有不错的效果' },
  { id: 'outside', cn: '外线投篮', rank: [11, 11, 11, 3, 3, 3, 6, 4, 4, 1, 1, 1, 11, 11], desc: '外线队员能力是考虑的重点' },
  { id: 'pnr', cn: '挡拆配合', rank: [10, 3, 1, 10, 3, 1, 10, 3, 1, 10, 3, 1, 11, 11], desc: '强调球队的意识和整体' },
  { id: 'motion', cn: '整体进攻', rank: [11, 1, 2, 11, 1, 2, 11, 1, 2, 11, 1, 2, 10, 10], desc: '强调球队的整体运作，对球员综合能力要求较高' },
  { id: 'fast', cn: '快速进攻', rank: [11, 10, 9, 9, 9, 9, 5, 5, 10, 8, 8, 10, 1, 1], desc: '球员速度及传球能力是成败关键' }
];

// 职业防守战术 → 对各进攻方式的克制（1 高 … 11 低）
XBA.DEF_TACTICS = [
  { id: 'z23', cn: '2-3联防', rank: [3, 1, 2, 11, 9, 10, 4, 2, 3, 11, 9, 10, 11, 11], zone: true, desc: '要求球员间配合较好，主要控制篮下区域' },
  { id: 'z32', cn: '3-2联防', rank: [11, 9, 10, 3, 1, 2, 8, 8, 8, 3, 1, 2, 11, 11], zone: true, desc: '要求球员间配合较好，主要控制外线区域' },
  { id: 'z212', cn: '2-1-2联防', rank: [6, 4, 5, 8, 4, 5, 6, 4, 5, 6, 4, 5, 11, 11], zone: true, desc: '要求球员间配合较好，对内有较好中锋，防守较均衡' },
  { id: 'm_in', cn: '盯人内线', rank: [1, 3, 2, 9, 11, 10, 3, 4, 4, 9, 11, 10, 9, 9], zone: false, desc: '要求球员个人能力突出，侧重对内线的防守' },
  { id: 'm_out', cn: '盯人外线', rank: [9, 11, 10, 1, 3, 2, 7, 8, 9, 1, 3, 2, 7, 7], zone: false, desc: '要求球员个人能力突出，侧重对外线的防守' },
  { id: 'man', cn: '盯人防守', rank: [5, 7, 6, 5, 7, 6, 5, 7, 7, 5, 7, 6, 1, 1], zone: false, desc: '要求球员个人能力突出，是常见的防守战术' }
];

// 街球战术（进攻、防守各 4 套）
XBA.STREET_OFF = ['inside', 'post', 'outside', 'motion'];
XBA.STREET_DEF = ['m_in', 'm_out', 'man', 'z212'];
XBA.STREET_DEF_CN = { z212: '区域联防' };

// 不同进攻方式对场上位置的倚重（列：C PF SF SG PG）
XBA.METHOD_POS_RANK = {
  in_iso: [1, 2, 6, 8, 11], in_pass: [2, 3, 4, 8, 2], in_pr: [1, 2, 4, 8, 8],
  mid_iso: [9, 7, 4, 1, 3], mid_pass: [10, 8, 4, 2, 2], mid_pr: [3, 4, 5, 2, 2],
  drv_iso: [6, 4, 2, 3, 4], drv_pass: [7, 6, 4, 4, 3], drv_pr: [3, 4, 3, 3, 4],
  thr_iso: [11, 10, 6, 1, 3], thr_pass: [11, 10, 6, 2, 2], thr_pr: [9, 7, 4, 2, 2],
  fb: [11, 9, 5, 3, 2], stl_fb: [11, 9, 5, 2, 1]
};

// 不同位置在防守中的能力倚重（列：C PF SF SG PG）
XBA.DEF_POS_RANK = {
  spd: [5, 4, 3, 2, 1], jmp: [1, 2, 3, 4, 4], str: [1, 2, 3, 6, 8], sta: [3, 3, 3, 3, 3],
  reb: [1, 1, 3, 6, 8], stl: [3, 4, 5, 2, 2], blk: [1, 2, 3, 5, 8], defIQ: [1, 1, 1, 1, 1]
};

// 秩次→权重
XBA.rankW = function (r) { return (12 - r) / 11; };

// 联赛金字塔
XBA.LEVELS = [
  { level: 1, leagues: 1, cap: 300000, avg: 70, prize: [100000000, 30000000, 15000000] },
  { level: 2, leagues: 2, cap: 200000, avg: 58, prize: [20000000, 8000000, 4000000] },
  { level: 3, leagues: 4, cap: 140000, avg: 46, prize: [5000000, 2000000, 1000000] },
  { level: 4, leagues: 8, cap: 95000, avg: 32, prize: [1000000, 500000, 250000] }
];
XBA.LEAGUE_TEAMS = 14;
XBA.ROUNDS = 26;
XBA.SEASON_DAYS = 28; // 26 轮 + 赛季中休息日 + 赛季末休息日

XBA.ARENA = [
  { lv: 1, seats: 3000, slots: 1, cost: 0, days: 0 },
  { lv: 2, seats: 5000, slots: 2, cost: 400000, days: 3 },
  { lv: 3, seats: 8000, slots: 3, cost: 1000000, days: 5 },
  { lv: 4, seats: 12000, slots: 4, cost: 2500000, days: 7 },
  { lv: 5, seats: 17000, slots: 5, cost: 5000000, days: 9 },
  { lv: 6, seats: 23000, slots: 6, cost: 10000000, days: 12 },
  { lv: 7, seats: 30000, slots: 8, cost: 20000000, days: 15 },
  { lv: 8, seats: 40000, slots: 10, cost: 40000000, days: 20 }
];

XBA.STAFF_TYPES = { trainer: '训练员', nutri: '营养师', doctor: '队医' };

XBA.ITEMS = [
  { id: 'double', cn: '双倍训练卡', price: 20, desc: '使用后 3 天内，街球训练赛/杯赛获得双倍训练点；可开启自动续约' },
  { id: 'physio', cn: '理疗中心', price: 15, desc: '使一名球员立刻恢复最佳状态（体力100、心情100）' },
  { id: 'scout', cn: '球探', price: 30, desc: '雇用球探为你寻找年轻球员，签约后直接进入街球队' },
  { id: 'reset', cn: '战术洗点', price: 50, desc: '重置一支球队的全部战术熟练度' },
  { id: 'hidden', cn: '查看隐藏属性', price: 5, desc: '查看一名球员的进攻/防守/团队意识、领导、毅力' },
  { id: 'newbie', cn: '新人杯邀请函', price: 5, desc: '报名新人杯所需（街球等级1级可用）' },
  { id: 'fund', cn: '财富银卡', price: 100, desc: '兑换 100 万球队资金' },
  { id: 'select', cn: '街球选拔卡', price: 100, desc: '将一名 18 岁以上的街球员提拔到职业队（绿色名字，潜力上限提高）。在「球员管理 → 街球队」点「选拔」使用' }
];

XBA.STREET_LEVELS = [0, 300, 900, 2000, 4000, 7000, 11000, 16000, 23000, 32000];

XBA.FIRST = 'A B C D E F G H I J K L M N O P R S T V W'.split(' ');
XBA.LAST = ('Brewer Atkins Collison Evans Rush Duprée Battier Bremer Johnson Smith Williams Brown Jones Miller Davis Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Thompson White Harris ' +
  'Clark Lewis Robinson Walker Young Allen King Wright Scott Green Baker Adams Nelson Hill Campbell Mitchell Roberts Carter Phillips Turner Parker Collins Edwards Stewart Morris Murphy Cook ' +
  'Rogers Morgan Cooper Peterson Reed Bailey Bell Kelly Howard Ward Cox Richardson Wood Watson Brooks Bennett Gray James Hughes Price Sanders Myers Long Ross Foster Powell Jenkins Perry ' +
  'Russell Sullivan Butler Barnes Fisher Henderson Coleman Simmons Patterson Jordan Reynolds Hamilton Graham Wallace Gibson Ellis Hayes Ford Marshall Owens Webb Tucker Porter Hunter Hicks ' +
  'Crawford Boyd Mason Warren Dixon Burns Gordon Shaw Holmes Rice Hunt Black Daniels Palmer Mills Grant Knight Ferguson Stone Hawkins Dunn Perkins Hudson Spencer Gardner Stephens Payne ' +
  'Pierce Berry Matthews Arnold Wagner Willis Ray Watkins Olson Carroll Duncan Snyder Hart Cunningham Bradley Lane Andrews Ruiz Harper Fox Riley Armstrong Carpenter Weaver Greene ' +
  'Lawrence Elliott Chavez Sims Austin Peters Kelley Franklin Lawson Fields Ryan Schmidt Carr Castillo Wheeler Chapman Oliver Montgomery Richards Williamson Johnston Banks Meyer Bishop ' +
  'McCoy Howell Morrison Hansen Harvey Little Burton Stanley Nguyen George Jacobs Reid Fuller Lynch Dean Gilbert Garrett Romero Welch Larson Frazier Burke Hanson Mendoza Moreno Bowman ' +
  'Medina Fowler Brewer Hoffman Carlson Silva Pearson Holland Douglas Fleming Jensen Vargas Byrd Davidson Hopkins May Terry Herrera Wade Soto Walters Curtis Neal Caldwell Lowe Jennings ' +
  'Barnett Graves Jimenez Horton Shelton Barrett Obrien Castro Sutton Gregory McKinney Lucas Miles Craig Rodriquez Chambers Holt Lambert Fletcher Watts Bates Hale Rhodes Pena Beck Newman ' +
  'Haynes McDaniel Mendez Bush Vaughn Parks Dawson Santiago Norris Hardy Love Steele Curry Powers Schultz Barker Guzman Page Munoz Ball Keller Chandler Weber Leonard Walsh Lyons Ramsey ' +
  'Wolfe Schneider Mullins Benson Sharp Bowen Daniel Barber Cummings Hines Baldwin Griffith Valdez Hubbard Salazar Reeves Warner Stevenson Burgess Santos Tate Cross Garner Mann Mack Moss ' +
  'Thornton Dennis McGee Farmer Delgado Aguilar Vega Glover Manning Cohen Harmon Rodgers Robbins Newton Todd Blair Higgins Ingram Reese Cannon Strickland Townsend Potter Goodwin Walton').split(' ');

XBA.TEAM_CITY = ['北京', '上海', '广州', '深圳', '天津', '重庆', '成都', '武汉', '南京', '杭州', '西安', '沈阳', '大连', '青岛', '济南', '长沙', '郑州', '福州', '厦门', '昆明',
  '哈尔滨', '长春', '石家庄', '太原', '合肥', '南昌', '南宁', '贵阳', '兰州', '银川', '西宁', '乌鲁木齐', '拉萨', '呼和浩特', '海口', '三亚', '苏州', '无锡', '宁波', '温州',
  '佛山', '东莞', '珠海', '汕头', '泉州', '烟台', '潍坊', '洛阳', '徐州', '常州', '绍兴', '嘉兴', '台州', '金华', '扬州', '镇江', '南通', '盐城', '襄阳', '宜昌', '株洲', '岳阳',
  '赣州', '九江', '桂林', '柳州', '遵义', '大理', '丽江', '包头', '鞍山', '吉林', '大庆', '齐齐哈尔', '牡丹江', '唐山', '保定', '秦皇岛', '邯郸', '廊坊', '芜湖', '蚌埠', '安庆',
  '淄博', '威海', '日照', '临沂', '开封', '新乡', '南阳', '湛江', '江门', '惠州', '中山', '肇庆', '绵阳', '宜宾', '南充', '泸州', '宝鸡', '延安', '天水', '酒泉', '香港', '澳门',
  '台北', '高雄', '台中', '基隆'];
XBA.TEAM_NICK = ['猛龙', '飞虎', '雄狮', '猎鹰', '火箭', '闪电', '雷霆', '风暴', '黑豹', '战狼', '金牛', '神鹰', '巨人', '骑士', '勇士', '魔术', '太阳', '烈火', '冰川', '旋风',
  '野马', '海豚', '蛟龙', '狂鲨', '银狐', '铁熊', '天马', '凤凰', '麒麟', '猛犸', '黄蜂', '老鹰', '公牛', '国王', '快船', '湖人', '凯尔特', '开拓者', '掘金', '马刺', '灰熊', '鹈鹕',
  '奇才', '活塞', '尼克斯', '篮网', '步行者', '雄鹿', '森林狼', '爵士', '小牛', '超音速', '山猫', '猛禽', '蓝鲸', '赤兔', '飞龙', '战神', '先锋', '虎鲸'];

XBA.STREET_NICK = ['街头霸王', '野球帮', '弄堂少年', '天台队', '夜光队', '铁笼', '水泥地', '三分侠', '飞人帮', '胡同', '小巷', '球场边', '老街', '东城', '西关', '南门', '北站', '码头', '广场', '公园'];

XBA.INJURIES = [
  { cn: '脚踝扭伤', min: 1, max: 3 }, { cn: '手指挫伤', min: 1, max: 2 }, { cn: '大腿拉伤', min: 2, max: 5 },
  { cn: '膝盖扭伤', min: 3, max: 8 }, { cn: '背部痉挛', min: 1, max: 3 }, { cn: '肩部挫伤', min: 2, max: 4 },
  { cn: '跟腱炎', min: 4, max: 10 }, { cn: '十字韧带撕裂', min: 15, max: 26 }, { cn: '鼻梁骨折', min: 2, max: 4 }, { cn: '腹股沟拉伤', min: 3, max: 6 }
];

XBA.JERSEY_COLORS = [
  { id: 'red', cn: '红色', c: '#c8102e' }, { id: 'blue', cn: '蓝色', c: '#1d428a' }, { id: 'yellow', cn: '金黄', c: '#fdb927' },
  { id: 'green', cn: '绿色', c: '#007a33' }, { id: 'purple', cn: '紫色', c: '#552583' }, { id: 'black', cn: '黑色', c: '#222222' },
  { id: 'white', cn: '白色', c: '#f0f0f0' }, { id: 'orange', cn: '橙色', c: '#f58426' }, { id: 'teal', cn: '青色', c: '#00788c' }
];

// 能力上限：普通生成的球员潜力最多到 GEN_CAP，升星突破后最高可到 ATTR_CAP
XBA.GEN_CAP = 112;
XBA.ATTR_CAP = 150;
XBA.STAR_MAX = 5;
XBA.ITEMS.push({ id: 'starcard', cn: '升星卡', price: 50, desc: '职业队球员训满（潜力用尽）后，用升星卡突破潜力上限，星级 +1（最高 5 星）。升到第 N 星需要 N 张' });

// 球员特长：能力达到条件后解锁，比赛中生效
XBA.TRAITS = [
  { id: 'sniper', cn: '三分射手', icon: '🎯', desc: '三分出手能力 +7%', ok: function (p) { return p.a.thr >= 55 && p.a.sht >= 45; }, need: '三分≥55 且 投篮≥45' },
  { id: 'shooter', cn: '神投手', icon: '🏹', desc: '中投能力 +6%', ok: function (p) { return p.a.sht >= 60; }, need: '投篮≥60' },
  { id: 'post', cn: '内线霸主', icon: '🦍', desc: '内线进攻能力 +6%', ok: function (p) { return p.a.str >= 55 && p.a.reb >= 50 && p.h >= 205; }, need: '强壮≥55、篮板≥50、身高≥205' },
  { id: 'slasher', cn: '突破手', icon: '⚡', desc: '突破能力 +6%', ok: function (p) { return p.a.spd >= 57 && p.a.dri >= 55; }, need: '速度≥57 且 运球≥55' },
  { id: 'playmaker', cn: '组织大师', icon: '🧠', desc: '传球/挡拆助攻时进攻 +8%', ok: function (p) { return p.a.pas >= 60 && p.iq.team >= 46; }, need: '传球≥60 且 团队意识≥46' },
  { id: 'blocker', cn: '盖帽专家', icon: '🖐', desc: '盖帽几率 +40%', ok: function (p) { return p.a.blk >= 55 && p.a.jmp >= 50; }, need: '封盖≥55 且 弹跳≥50' },
  { id: 'thief', cn: '抢断高手', icon: '🦊', desc: '全队抢断几率提高', ok: function (p) { return p.a.stl >= 55 && p.a.spd >= 50; }, need: '抢断≥55 且 速度≥50' },
  { id: 'glass', cn: '篮板怪', icon: '🧲', desc: '篮板能力 +8%', ok: function (p) { return p.a.reb >= 60; }, need: '篮板≥60' },
  { id: 'ironman', cn: '铁人', icon: '🔋', desc: '比赛体力消耗 -25%', ok: function (p) { return p.a.sta >= 65; }, need: '耐力≥65' },
  { id: 'clutch', cn: '关键先生', icon: '🔥', desc: '第四节最后 5 分钟和加时、分差 5 分内，出手能力 +8%', ok: function (p) { return p.lead >= 50 && p.iq.off >= 46; }, need: '领导≥50 且 进攻意识≥46' },
  { id: 'lockdown', cn: '防守大闸', icon: '🛡', desc: '防守能力 +6%', ok: function (p) { return p.iq.def >= 46 && (p.a.stl + p.a.blk) / 2 >= 45; }, need: '防守意识≥46 且 抢断封盖均值≥45' },
  { id: 'jet', cn: '快攻箭头', icon: '🚀', desc: '快攻能力 +8%', ok: function (p) { return p.a.spd >= 65; }, need: '速度≥65' },
  { id: 'dunker', cn: '扣篮王', icon: '💥', desc: '内线 +3%，更容易打出隔人暴扣', ok: function (p) { return p.a.jmp >= 65 && p.h >= 195; }, need: '弹跳≥65 且 身高≥195' }
];

// 球员性格：生成时随机决定，影响训练、伤病、关键时刻和球队化学反应
XBA.PERSONAS = [
  { id: 'calm', cn: '平常心', icon: '🙂', w: 40, desc: '没有特别的影响' },
  { id: 'leader', cn: '领袖', icon: '👑', w: 7, desc: '在场上时队友发挥 +2%；提升球队化学反应' },
  { id: 'glue', cn: '老好人', icon: '🤝', w: 9, desc: '更衣室润滑剂，提升球队化学反应' },
  { id: 'hothead', cn: '刺头', icon: '😤', w: 8, desc: '自己发挥 +3%；队里刺头超过一个就会降低化学反应' },
  { id: 'gymrat', cn: '训练狂', icon: '🏋', w: 8, desc: '训练效果 +20%' },
  { id: 'lazy', cn: '懒散', icon: '😴', w: 7, desc: '训练效果 -20%，但体力恢复更快' },
  { id: 'bigheart', cn: '大心脏', icon: '💓', w: 7, desc: '关键时刻（第四节最后 5 分钟、加时分差 5 分内）发挥 +5%' },
  { id: 'glass', cn: '玻璃人', icon: '🥚', w: 6, desc: '受伤几率 ×1.8' },
  { id: 'iron', cn: '铁打', icon: '🪨', w: 8, desc: '受伤几率减半' }
];
