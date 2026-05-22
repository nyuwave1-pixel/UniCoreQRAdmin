let currentSection = 'dashboard';
let editingPromoId = null;
let lineChart = null;
let doughnutChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (DB.getPromotions().length === 0) {
    DB.seedDemoData();
  }
  initNav();
  showSection('dashboard');
});

function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) showSection(section);
      document.querySelector('.sidebar').classList.remove('open');
    });
  });

  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
}

function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-section="${name}"]`)?.classList.add('active');
  document.querySelector('.header-title').textContent = getSectionTitle(name);

  if (name === 'dashboard') renderDashboard();
  else if (name === 'promotions') renderPromotions();
  else if (name === 'qrcodes') renderQRCodes();
  else if (name === 'participants') renderParticipants();
}

function getSectionTitle(name) {
  const map = {
    dashboard: '대시보드',
    promotions: '프로모션 관리',
    qrcodes: 'QR코드 관리',
    participants: '참여자 관리',
  };
  return map[name] || '';
}

/* ============ DASHBOARD ============ */
function renderDashboard() {
  const stats = DB.getStats();

  document.getElementById('stat-total-scans').textContent = formatNumber(stats.totalScans);
  document.getElementById('stat-active-promos').textContent = formatNumber(stats.activePromos);
  document.getElementById('stat-participants').textContent = formatNumber(stats.totalParticipants);
  document.getElementById('stat-conversion').textContent = stats.conversionRate + '%';

  renderLineChart();
  renderDoughnutChart();
  renderRecentActivity();
}

function renderLineChart() {
  const ctx = document.getElementById('scanChart');
  if (!ctx) return;
  const logs = DB.getScanLogsByDay(7);

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: logs.map(l => l.label),
      datasets: [{
        label: '스캔 수',
        data: logs.map(l => l.count),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,.1)',
        fill: true,
        tension: .4,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderDoughnutChart() {
  const ctx = document.getElementById('typeChart');
  if (!ctx) return;
  const types = DB.getPromosByType();

  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['쿠폰', '이벤트', '랜딩', '리다이렉트'],
      datasets: [{
        data: [types.coupon, types.event, types.landing, types.redirect],
        backgroundColor: ['#f59e0b', '#8b5cf6', '#0ea5e9', '#22c55e'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
      },
    },
  });
}

function renderRecentActivity() {
  const promos = DB.getPromotions().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const tbody = document.getElementById('recent-activity-body');
  if (!tbody) return;

  tbody.innerHTML = promos.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td><span class="badge badge-${p.type}">${getTypeName(p.type)}</span></td>
      <td><span class="badge badge-${p.status}">${getStatusName(p.status)}</span></td>
      <td>${formatNumber(p.stats.totalScans)}</td>
      <td>${formatDate(p.createdAt)}</td>
    </tr>
  `).join('');
}

/* ============ PROMOTIONS ============ */
function renderPromotions(filter = 'all', search = '') {
  let promos = DB.getPromotions();
  if (filter !== 'all') promos = promos.filter(p => p.type === filter);
  if (search) {
    const q = search.toLowerCase();
    promos = promos.filter(p => p.title.toLowerCase().includes(q));
  }
  promos.sort((a, b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('promo-table-body');
  if (!tbody) return;

  if (promos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:40px">
      <h3>프로모션이 없습니다</h3>
      <p>새 프로모션을 만들어 보세요</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = promos.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td><span class="badge badge-${p.type}">${getTypeName(p.type)}</span></td>
      <td><span class="badge badge-${p.status}">${getStatusName(p.status)}</span></td>
      <td>${formatDate(p.startDate)} ~ ${formatDate(p.endDate)}</td>
      <td>${formatNumber(p.stats.totalScans)}</td>
      <td>${formatNumber(p.stats.conversions)}</td>
      <td>
        <div class="actions">
          <button class="action-btn" title="미리보기" onclick="previewPromo('${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-btn" title="수정" onclick="editPromo('${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn danger" title="삭제" onclick="deletePromo('${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreatePromoModal() {
  editingPromoId = null;
  document.getElementById('modal-title').textContent = '새 프로모션 만들기';
  document.getElementById('promo-form').reset();
  selectPromoType('coupon');
  showModal('promo-modal');
}

function editPromo(id) {
  const promo = DB.getPromotion(id);
  if (!promo) return;

  editingPromoId = id;
  document.getElementById('modal-title').textContent = '프로모션 수정';

  document.getElementById('promo-title').value = promo.title;
  document.getElementById('promo-start').value = promo.startDate;
  document.getElementById('promo-end').value = promo.endDate;
  document.getElementById('promo-status').value = promo.status;

  selectPromoType(promo.type);

  if (promo.type === 'coupon' && promo.coupon) {
    document.getElementById('coupon-code').value = promo.coupon.code;
    document.getElementById('coupon-discount').value = promo.coupon.discount;
    document.getElementById('coupon-max-uses').value = promo.coupon.maxUses;
  } else if (promo.type === 'event' && promo.event) {
    document.getElementById('event-description').value = promo.event.description;
    document.getElementById('event-max-participants').value = promo.event.maxParticipants;
  } else if (promo.type === 'landing' && promo.landing) {
    document.getElementById('landing-headline').value = promo.landing.headline;
    document.getElementById('landing-description').value = promo.landing.description;
    document.getElementById('landing-cta-text').value = promo.landing.ctaText;
    document.getElementById('landing-cta-link').value = promo.landing.ctaLink;
  } else if (promo.type === 'redirect' && promo.redirect) {
    document.getElementById('redirect-url').value = promo.redirect.targetUrl;
  }

  showModal('promo-modal');
}

function savePromotion() {
  const title = document.getElementById('promo-title').value.trim();
  if (!title) { toast('프로모션 이름을 입력하세요', 'error'); return; }

  const type = document.querySelector('.type-option.selected')?.dataset.type || 'coupon';
  const startDate = document.getElementById('promo-start').value;
  const endDate = document.getElementById('promo-end').value;
  const status = document.getElementById('promo-status').value;

  let coupon = null, event = null, landing = null, redirect = null;

  if (type === 'coupon') {
    coupon = {
      code: document.getElementById('coupon-code').value.trim() || generateCouponCode(),
      discount: document.getElementById('coupon-discount').value.trim() || '10%',
      maxUses: parseInt(document.getElementById('coupon-max-uses').value) || 100,
      currentUses: 0,
    };
  } else if (type === 'event') {
    event = {
      description: document.getElementById('event-description').value.trim(),
      maxParticipants: parseInt(document.getElementById('event-max-participants').value) || 100,
    };
  } else if (type === 'landing') {
    landing = {
      headline: document.getElementById('landing-headline').value.trim(),
      description: document.getElementById('landing-description').value.trim(),
      imageUrl: '',
      ctaText: document.getElementById('landing-cta-text').value.trim() || '자세히 보기',
      ctaLink: document.getElementById('landing-cta-link').value.trim() || '#',
    };
  } else if (type === 'redirect') {
    redirect = {
      targetUrl: document.getElementById('redirect-url').value.trim() || 'https://example.com',
    };
  }

  const existing = editingPromoId ? DB.getPromotion(editingPromoId) : null;

  const promo = {
    id: editingPromoId || generateId(),
    title,
    type,
    status,
    createdAt: existing?.createdAt || Date.now(),
    startDate,
    endDate,
    url: '',
    coupon,
    event,
    landing,
    redirect,
    stats: existing?.stats || { totalScans: 0, uniqueScans: 0, conversions: 0 },
  };

  DB.savePromotion(promo);
  closeModal('promo-modal');
  renderPromotions();
  toast(editingPromoId ? '프로모션이 수정되었습니다' : '프로모션이 생성되었습니다', 'success');
  editingPromoId = null;
}

function deletePromo(id) {
  if (!confirm('이 프로모션을 삭제하시겠습니까?')) return;
  DB.deletePromotion(id);
  renderPromotions();
  toast('프로모션이 삭제되었습니다');
}

function previewPromo(id) {
  const promo = DB.getPromotion(id);
  if (!promo) return;
  const promoUrl = `promo/index.html?id=${id}`;
  window.open(promoUrl, '_blank', 'width=420,height=700');
}

function selectPromoType(type) {
  document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.type-option[data-type="${type}"]`)?.classList.add('selected');

  document.querySelectorAll('.type-fields').forEach(f => f.style.display = 'none');
  const fields = document.getElementById(`fields-${type}`);
  if (fields) fields.style.display = 'block';
}

/* ============ QR CODES ============ */
function renderQRCodes() {
  const promos = DB.getPromotions().filter(p => p.status === 'active');
  const grid = document.getElementById('qr-grid');
  if (!grid) return;

  if (promos.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <h3>활성 프로모션이 없습니다</h3>
      <p>프로모션을 먼저 생성해주세요</p>
    </div>`;
    return;
  }

  grid.innerHTML = promos.map(p => `
    <div class="qr-card" id="qr-card-${p.id}">
      <div id="qr-${p.id}" style="display:flex;justify-content:center;margin-bottom:12px"></div>
      <div class="qr-title">${escapeHtml(p.title)}</div>
      <span class="badge badge-${p.type}" style="margin-bottom:8px">${getTypeName(p.type)}</span>
      <div style="margin-top:8px;display:flex;gap:4px;justify-content:center">
        <button class="btn btn-sm btn-primary" onclick="downloadQR('${p.id}')">다운로드</button>
        <button class="btn btn-sm btn-secondary" onclick="copyQRLink('${p.id}')">링크 복사</button>
      </div>
    </div>
  `).join('');

  promos.forEach(p => {
    const container = document.getElementById(`qr-${p.id}`);
    if (container) {
      container.innerHTML = '';
      const promoUrl = getPromoUrl(p.id);
      new QRCode(container, {
        text: promoUrl,
        width: 140,
        height: 140,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    }
  });
}

function getPromoUrl(id) {
  const base = window.location.origin + window.location.pathname.replace('index.html', '');
  return base + 'promo/index.html?id=' + id;
}

function downloadQR(id) {
  const container = document.getElementById(`qr-${id}`);
  const canvas = container?.querySelector('canvas');
  if (!canvas) return;

  const promo = DB.getPromotion(id);
  const link = document.createElement('a');
  link.download = `QR_${promo?.title || id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('QR 코드가 다운로드되었습니다', 'success');
}

function copyQRLink(id) {
  const url = getPromoUrl(id);
  navigator.clipboard.writeText(url).then(() => {
    toast('링크가 복사되었습니다', 'success');
  }).catch(() => {
    prompt('링크를 복사하세요:', url);
  });
}

/* ============ PARTICIPANTS ============ */
function renderParticipants(promoFilter = 'all', search = '') {
  let participants = DB.getParticipants();
  if (promoFilter !== 'all') {
    participants = participants.filter(p => p.promotionId === promoFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    participants = participants.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }
  participants.sort((a, b) => b.participatedAt - a.participatedAt);

  const tbody = document.getElementById('participants-table-body');
  if (!tbody) return;

  if (participants.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="padding:40px">
      <h3>참여자가 없습니다</h3>
    </td></tr>`;
    return;
  }

  const promos = DB.getPromotions();

  tbody.innerHTML = participants.map(p => {
    const promo = promos.find(pr => pr.id === p.promotionId);
    return `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${promo ? escapeHtml(promo.title) : '-'}</td>
      <td>${formatDate(p.participatedAt)}</td>
      <td><span class="badge ${p.couponUsed ? 'badge-active' : 'badge-inactive'}">${p.couponUsed ? '사용' : '미사용'}</span></td>
    </tr>`;
  }).join('');

  updateParticipantFilter();
}

function updateParticipantFilter() {
  const select = document.getElementById('participant-promo-filter');
  if (!select) return;
  const promos = DB.getPromotions();
  const current = select.value;
  select.innerHTML = '<option value="all">전체 프로모션</option>' +
    promos.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  select.value = current || 'all';
}

function exportParticipants() {
  const participants = DB.getParticipants();
  const promos = DB.getPromotions();
  let csv = '﻿이름,이메일,전화번호,프로모션,참여일,쿠폰사용\n';
  participants.forEach(p => {
    const promo = promos.find(pr => pr.id === p.promotionId);
    csv += `${p.name},${p.email},${p.phone},"${promo?.title || '-'}",${formatDate(p.participatedAt)},${p.couponUsed ? '사용' : '미사용'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `participants_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  toast('CSV 파일이 다운로드되었습니다', 'success');
}

/* ============ HELPERS ============ */
function showModal(id) {
  document.getElementById(id)?.classList.add('show');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
}

function toast(message, type = '') {
  const container = document.querySelector('.toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function getTypeName(type) {
  return { coupon: '쿠폰', event: '이벤트', landing: '랜딩', redirect: '리다이렉트' }[type] || type;
}

function getStatusName(status) {
  return { active: '활성', inactive: '비활성', expired: '만료' }[status] || status;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
