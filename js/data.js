const DB = {
  _key: 'qr_promo_data',

  _defaults() {
    return {
      promotions: [],
      participants: [],
      settings: {
        brandName: 'My Brand',
        primaryColor: '#6366f1',
      },
      scanLogs: [],
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (!raw) return this._defaults();
      return JSON.parse(raw);
    } catch {
      return this._defaults();
    }
  },

  save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  getPromotions() {
    return this.load().promotions;
  },

  getPromotion(id) {
    return this.load().promotions.find(p => p.id === id);
  },

  savePromotion(promo) {
    const data = this.load();
    const idx = data.promotions.findIndex(p => p.id === promo.id);
    if (idx >= 0) {
      data.promotions[idx] = promo;
    } else {
      data.promotions.push(promo);
    }
    this.save(data);
    return promo;
  },

  deletePromotion(id) {
    const data = this.load();
    data.promotions = data.promotions.filter(p => p.id !== id);
    data.participants = data.participants.filter(p => p.promotionId !== id);
    this.save(data);
  },

  getParticipants(promotionId) {
    const all = this.load().participants;
    if (promotionId) return all.filter(p => p.promotionId === promotionId);
    return all;
  },

  addParticipant(participant) {
    const data = this.load();
    data.participants.push(participant);
    const promo = data.promotions.find(p => p.id === participant.promotionId);
    if (promo) {
      promo.stats.conversions = (promo.stats.conversions || 0) + 1;
    }
    this.save(data);
  },

  logScan(promotionId) {
    const data = this.load();
    const promo = data.promotions.find(p => p.id === promotionId);
    if (promo) {
      promo.stats.totalScans = (promo.stats.totalScans || 0) + 1;
      promo.stats.uniqueScans = (promo.stats.uniqueScans || 0) + 1;
    }
    data.scanLogs.push({
      promotionId,
      timestamp: Date.now(),
    });
    this.save(data);
  },

  getStats() {
    const data = this.load();
    const promos = data.promotions;
    const now = Date.now();

    const totalPromos = promos.length;
    const activePromos = promos.filter(p => p.status === 'active').length;
    const totalScans = promos.reduce((s, p) => s + (p.stats.totalScans || 0), 0);
    const totalConversions = promos.reduce((s, p) => s + (p.stats.conversions || 0), 0);
    const totalParticipants = data.participants.length;
    const conversionRate = totalScans > 0 ? ((totalConversions / totalScans) * 100).toFixed(1) : '0.0';

    return {
      totalPromos,
      activePromos,
      totalScans,
      totalConversions,
      totalParticipants,
      conversionRate,
    };
  },

  getScanLogsByDay(days = 7) {
    const data = this.load();
    const now = Date.now();
    const msPerDay = 86400000;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * msPerDay;
      const dayEnd = now - i * msPerDay;
      const count = data.scanLogs.filter(l => l.timestamp >= dayStart && l.timestamp < dayEnd).length;
      const date = new Date(dayEnd);
      result.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count,
      });
    }
    return result;
  },

  getPromosByType() {
    const promos = this.load().promotions;
    const types = { coupon: 0, event: 0, landing: 0, redirect: 0 };
    promos.forEach(p => { if (types[p.type] !== undefined) types[p.type]++; });
    return types;
  },

  seedDemoData() {
    const data = this._defaults();
    const now = Date.now();
    const day = 86400000;

    const demoPromos = [
      {
        id: 'demo-1',
        title: '여름 시즌 20% 할인 쿠폰',
        type: 'coupon',
        status: 'active',
        createdAt: now - 10 * day,
        startDate: new Date(now - 10 * day).toISOString().split('T')[0],
        endDate: new Date(now + 20 * day).toISOString().split('T')[0],
        url: '',
        coupon: { code: 'SUMMER2026', discount: '20%', maxUses: 500, currentUses: 127 },
        event: null, landing: null, redirect: null,
        stats: { totalScans: 342, uniqueScans: 289, conversions: 127 },
      },
      {
        id: 'demo-2',
        title: '신제품 런칭 이벤트',
        type: 'event',
        status: 'active',
        createdAt: now - 5 * day,
        startDate: new Date(now - 5 * day).toISOString().split('T')[0],
        endDate: new Date(now + 25 * day).toISOString().split('T')[0],
        url: '',
        coupon: null,
        event: { description: '신제품 체험 후기를 남겨주신 분 중 10명에게 정품 증정!', maxParticipants: 200 },
        landing: null, redirect: null,
        stats: { totalScans: 218, uniqueScans: 195, conversions: 86 },
      },
      {
        id: 'demo-3',
        title: '브랜드 소개 페이지',
        type: 'landing',
        status: 'active',
        createdAt: now - 30 * day,
        startDate: new Date(now - 30 * day).toISOString().split('T')[0],
        endDate: new Date(now + 335 * day).toISOString().split('T')[0],
        url: '',
        coupon: null, event: null,
        landing: { headline: '우리 브랜드를 소개합니다', description: '최고 품질의 제품을 합리적인 가격에 제공합니다.', imageUrl: '', ctaText: '자세히 보기', ctaLink: '#' },
        redirect: null,
        stats: { totalScans: 561, uniqueScans: 432, conversions: 198 },
      },
      {
        id: 'demo-4',
        title: '공식 홈페이지 리다이렉트',
        type: 'redirect',
        status: 'active',
        createdAt: now - 60 * day,
        startDate: new Date(now - 60 * day).toISOString().split('T')[0],
        endDate: new Date(now + 300 * day).toISOString().split('T')[0],
        url: '',
        coupon: null, event: null, landing: null,
        redirect: { targetUrl: 'https://example.com' },
        stats: { totalScans: 892, uniqueScans: 654, conversions: 654 },
      },
      {
        id: 'demo-5',
        title: '봄 시즌 종료 이벤트',
        type: 'coupon',
        status: 'expired',
        createdAt: now - 90 * day,
        startDate: new Date(now - 90 * day).toISOString().split('T')[0],
        endDate: new Date(now - 10 * day).toISOString().split('T')[0],
        url: '',
        coupon: { code: 'SPRING2026', discount: '15%', maxUses: 300, currentUses: 300 },
        event: null, landing: null, redirect: null,
        stats: { totalScans: 450, uniqueScans: 380, conversions: 300 },
      },
    ];

    data.promotions = demoPromos;

    const names = ['김지수','박민호','이서연','정우진','최하은','강준혁','윤수빈','임채원','한도윤','송예진'];
    for (let i = 0; i < 30; i++) {
      data.participants.push({
        id: `part-${i}`,
        promotionId: demoPromos[i % 3].id,
        name: names[i % names.length],
        phone: `010-${String(Math.floor(Math.random()*9000)+1000)}-${String(Math.floor(Math.random()*9000)+1000)}`,
        email: `user${i}@example.com`,
        participatedAt: now - Math.floor(Math.random() * 10) * day,
        couponUsed: Math.random() > 0.5,
      });
    }

    for (let i = 0; i < 50; i++) {
      data.scanLogs.push({
        promotionId: demoPromos[Math.floor(Math.random() * demoPromos.length)].id,
        timestamp: now - Math.floor(Math.random() * 7) * day - Math.floor(Math.random() * day),
      });
    }

    this.save(data);
    return data;
  },
};

function generateId() {
  return 'promo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function formatNumber(n) {
  return n.toLocaleString('ko-KR');
}
