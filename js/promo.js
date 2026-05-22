document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('유효하지 않은 링크입니다');
    return;
  }

  const data = loadData();
  const promo = data.promotions.find(p => p.id === id);

  if (!promo) {
    showError('존재하지 않는 프로모션입니다');
    return;
  }

  logScan(id, data);

  if (promo.status === 'expired' || (promo.endDate && new Date(promo.endDate) < new Date())) {
    showExpired(promo);
    return;
  }

  if (promo.status === 'inactive') {
    showError('현재 비활성 프로모션입니다');
    return;
  }

  if (promo.type === 'redirect' && promo.redirect?.targetUrl) {
    showRedirect(promo);
    return;
  }

  renderPromo(promo);
});

function loadData() {
  try {
    const raw = localStorage.getItem('qr_promo_data');
    return raw ? JSON.parse(raw) : { promotions: [], participants: [], scanLogs: [] };
  } catch {
    return { promotions: [], participants: [], scanLogs: [] };
  }
}

function saveData(data) {
  localStorage.setItem('qr_promo_data', JSON.stringify(data));
}

function logScan(promoId, data) {
  const promo = data.promotions.find(p => p.id === promoId);
  if (promo) {
    promo.stats.totalScans = (promo.stats.totalScans || 0) + 1;
    promo.stats.uniqueScans = (promo.stats.uniqueScans || 0) + 1;
  }
  data.scanLogs.push({ promotionId: promoId, timestamp: Date.now() });
  saveData(data);
}

function renderPromo(promo) {
  const container = document.querySelector('.promo-container');

  if (promo.type === 'coupon') renderCoupon(container, promo);
  else if (promo.type === 'event') renderEvent(container, promo);
  else if (promo.type === 'landing') renderLanding(container, promo);
}

function renderCoupon(container, promo) {
  const c = promo.coupon;
  container.innerHTML = `
    <div class="coupon-card">
      <div class="coupon-header">
        <div class="brand-name">${escapeHtml(promo.title)}</div>
        <h1>${escapeHtml(c.discount)} 할인</h1>
        <div class="subtitle">특별 할인 쿠폰</div>
      </div>
      <div class="coupon-divider"><div class="dashes"></div></div>
      <div class="coupon-body">
        <div class="coupon-code-box">
          <div class="label">쿠폰 코드</div>
          <div class="code" id="coupon-code">${escapeHtml(c.code)}</div>
        </div>
        <button class="coupon-copy-btn" id="copy-btn" onclick="copyCoupon()">쿠폰 코드 복사하기</button>
        <div class="coupon-info">
          <p>사용 기한: ${promo.endDate || '무제한'}</p>
          ${c.maxUses ? `<p>남은 수량: ${Math.max(0, c.maxUses - (c.currentUses || 0))}개</p>` : ''}
        </div>
      </div>
    </div>
    <div class="promo-footer">QR 프로모션</div>
  `;
}

function renderEvent(container, promo) {
  const e = promo.event;
  container.innerHTML = `
    <div class="event-card">
      <div class="event-banner">
        <div class="event-emoji">🎉</div>
      </div>
      <div class="event-body">
        <h1>${escapeHtml(promo.title)}</h1>
        <p class="event-desc">${escapeHtml(e.description)}</p>
        <div class="event-meta">
          <div class="event-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ~${promo.endDate || '미정'}
          </div>
          ${e.maxParticipants ? `
          <div class="event-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            선착순 ${e.maxParticipants}명
          </div>` : ''}
        </div>
        <div id="event-form-area">
          <form class="event-form" onsubmit="submitEvent(event, '${promo.id}')">
            <div class="form-field">
              <label>이름</label>
              <input type="text" id="evt-name" required placeholder="이름을 입력하세요">
            </div>
            <div class="form-field">
              <label>이메일</label>
              <input type="email" id="evt-email" required placeholder="email@example.com">
            </div>
            <div class="form-field">
              <label>전화번호</label>
              <input type="tel" id="evt-phone" required placeholder="010-0000-0000">
            </div>
            <button type="submit" class="event-submit-btn">참여하기</button>
          </form>
        </div>
      </div>
    </div>
    <div class="promo-footer">QR 프로모션</div>
  `;
}

function renderLanding(container, promo) {
  const l = promo.landing;
  container.innerHTML = `
    <div class="landing-card">
      <div class="landing-hero">
        <h1>${escapeHtml(l.headline || promo.title)}</h1>
      </div>
      <div class="landing-body">
        <p class="desc">${escapeHtml(l.description)}</p>
        <div class="landing-features">
          <div class="landing-feature">
            <div class="feature-icon">✨</div>
            <div class="feature-text">최고 품질의 제품과 서비스</div>
          </div>
          <div class="landing-feature">
            <div class="feature-icon">🚀</div>
            <div class="feature-text">빠르고 안전한 배송</div>
          </div>
          <div class="landing-feature">
            <div class="feature-icon">💬</div>
            <div class="feature-text">24시간 고객 지원</div>
          </div>
        </div>
        <a href="${escapeHtml(l.ctaLink || '#')}" class="landing-cta">${escapeHtml(l.ctaText || '자세히 보기')}</a>
      </div>
    </div>
    <div class="promo-footer">QR 프로모션</div>
  `;
}

function showRedirect(promo) {
  const container = document.querySelector('.promo-container');
  const url = promo.redirect.targetUrl;
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:32px;margin-bottom:16px">🔗</div>
      <h2 style="margin-bottom:8px">리다이렉트 중...</h2>
      <p style="color:#64748b;font-size:14px;margin-bottom:20px">${escapeHtml(url)}</p>
      <a href="${escapeHtml(url)}" style="color:#6366f1;font-size:14px">바로 이동하기</a>
    </div>
  `;
  setTimeout(() => { window.location.href = url; }, 1500);
}

function showExpired(promo) {
  const container = document.querySelector('.promo-container');
  container.innerHTML = `
    <div class="expired-card">
      <div class="icon">⏰</div>
      <h2>종료된 프로모션</h2>
      <p>${escapeHtml(promo.title)}<br>이 프로모션은 ${promo.endDate || ''}에 종료되었습니다.</p>
    </div>
  `;
}

function showError(msg) {
  const container = document.querySelector('.promo-container');
  container.innerHTML = `
    <div class="expired-card">
      <div class="icon">❌</div>
      <h2>오류</h2>
      <p>${escapeHtml(msg)}</p>
    </div>
  `;
}

function copyCoupon() {
  const code = document.getElementById('coupon-code')?.textContent;
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '복사 완료!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '쿠폰 코드 복사하기';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    prompt('쿠폰 코드를 복사하세요:', code);
  });
}

function submitEvent(e, promoId) {
  e.preventDefault();

  const name = document.getElementById('evt-name').value.trim();
  const email = document.getElementById('evt-email').value.trim();
  const phone = document.getElementById('evt-phone').value.trim();

  if (!name || !email || !phone) return;

  const data = loadData();
  data.participants.push({
    id: 'part-' + Date.now().toString(36),
    promotionId: promoId,
    name,
    email,
    phone,
    participatedAt: Date.now(),
    couponUsed: false,
  });

  const promo = data.promotions.find(p => p.id === promoId);
  if (promo) {
    promo.stats.conversions = (promo.stats.conversions || 0) + 1;
  }

  saveData(data);

  document.getElementById('event-form-area').innerHTML = `
    <div class="event-success">
      <div class="check-icon">✅</div>
      <h2>참여 완료!</h2>
      <p style="color:#64748b;font-size:14px;margin-top:8px">이벤트에 성공적으로 참여하셨습니다.<br>결과는 이메일로 안내드리겠습니다.</p>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
