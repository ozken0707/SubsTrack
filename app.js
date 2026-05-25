/* ============================================================
   SubsTrack — app.js
============================================================ */

'use strict';

// ===================== State =====================
const STORAGE_KEY = 'substrack_v1';
let state = {
  subs: [],
  selectedColor: '#7c3aed',
  editingId: null,
  deletingId: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calSelectedDate: null,
  currentPage: 'dashboard',
};

const CATEGORY_COLORS = {
  'エンタメ': '#7c3aed',
  '音楽':     '#2563eb',
  '仕事':     '#0891b2',
  'クラウド': '#059669',
  '健康':     '#10b981',
  'ゲーム':   '#dc2626',
  '学習':     '#d97706',
  'その他':   '#64748b',
};

const CYCLE_LABEL = { monthly: '月払い', yearly: '年払い' };

// ===================== Service Icons =====================
// サービス名（小文字キーワード）→ ファビコン取得用ドメイン
const SERVICE_DOMAINS = {
  // 動画
  'netflix':          'netflix.com',
  'hulu':             'hulu.com',
  'disney':           'disneyplus.com',
  'disney+':          'disneyplus.com',
  'prime video':      'primevideo.com',
  'amazon prime':     'primevideo.com',
  'youtube':          'youtube.com',
  'youtube premium':  'youtube.com',
  'abema':            'abema.tv',
  'dazn':             'dazn.com',
  'apple tv':         'tv.apple.com',
  'u-next':           'video.unext.jp',
  'unext':            'video.unext.jp',
  'nhkプラス':        'plus.nhk.jp',
  'paravi':           'paravi.jp',
  // 音楽
  'spotify':          'spotify.com',
  'apple music':      'music.apple.com',
  'youtube music':    'music.youtube.com',
  'amazon music':     'music.amazon.co.jp',
  'line music':       'music.line.me',
  'awa':              'awa.fm',
  'rakuten music':    'music.rakuten.co.jp',
  // クラウド・仕事
  'icloud':           'icloud.com',
  'google one':       'one.google.com',
  'google workspace': 'workspace.google.com',
  'microsoft 365':    'microsoft.com',
  'office 365':       'microsoft.com',
  'office':           'microsoft.com',
  'dropbox':          'dropbox.com',
  'notion':           'notion.so',
  'slack':            'slack.com',
  'zoom':             'zoom.us',
  'adobe':            'adobe.com',
  'adobe cc':         'adobe.com',
  'figma':            'figma.com',
  'github':           'github.com',
  'aws':              'aws.amazon.com',
  'azure':            'azure.microsoft.com',
  'gcp':              'cloud.google.com',
  'chatgpt':          'openai.com',
  'openai':           'openai.com',
  // ゲーム・エンタメ
  'nintendo':         'nintendo.com',
  'nintendo switch':  'nintendo.com',
  'playstation':      'playstation.com',
  'ps plus':          'playstation.com',
  'xbox':             'xbox.com',
  'steam':            'store.steampowered.com',
  'epicgames':        'epicgames.com',
  // 学習
  'duolingo':         'duolingo.com',
  'coursera':         'coursera.org',
  'udemy':            'udemy.com',
  'kindle':           'amazon.co.jp',
  // SNS・通信
  'x':                'x.com',
  'twitter':          'twitter.com',
  'line':             'line.me',
};

/**
 * サービス名に対応するアイコンHTMLを返す。
 * マッチすればfaviconの<img>、なければイニシャルの<span>。
 * @param {object} sub - サブスクオブジェクト
 * @param {number} size - アイコンボックスのpxサイズ（デフォルト42）
 */
function serviceIcon(sub, size = 42) {
  const key = sub.name.toLowerCase().trim();
  // 完全一致→部分一致の順で検索
  let domain = SERVICE_DOMAINS[key];
  if (!domain) {
    for (const [k, d] of Object.entries(SERVICE_DOMAINS)) {
      if (key.includes(k) || k.includes(key)) { domain = d; break; }
    }
  }
  const fontSize = size >= 40 ? 16 : 11;
  const borderRadius = size >= 40 ? 10 : 6;
  const base = `width:${size}px;height:${size}px;border-radius:${borderRadius}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;`;
  if (domain) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    return `<div class="sub-icon" style="background:${sub.color};${base}">
      <img src="${faviconUrl}" width="${Math.round(size*0.6)}" height="${Math.round(size*0.6)}" alt="${esc(sub.name)}"
        style="object-fit:contain;border-radius:4px;"
        onerror="this.parentElement.innerHTML='<span style=\'font-size:${fontSize}px;font-weight:700;color:#fff;\'>${initials(sub.name)}</span>'" />
    </div>`;
  }
  return `<div class="sub-icon" style="background:${sub.color};${base};font-size:${fontSize}px;font-weight:700;color:#fff;">${initials(sub.name)}</div>`;
}

// ===================== Storage =====================
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.subs = JSON.parse(raw);
  } catch (e) { state.subs = []; }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.subs));
}

// ===================== Auto-advance dates =====================
/**
 * 次回更新日が過去になっているサブスクを、
 * 課金サイクルに合わせて自動的に未来日付へ進める。
 * アプリ起動時と日付変更時（日またぎ）に実行。
 */
function autoAdvanceDates() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let count = 0;

  state.subs.forEach(sub => {
    const d = new Date(sub.nextDate); d.setHours(0, 0, 0, 0);
    if (d >= today) return; // まだ未来 → スキップ

    // 過去になっているので、サイクル分ずつ未来へ進める
    while (d < today) {
      if (sub.cycle === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setFullYear(d.getFullYear() + 1);
      }
    }
    sub.nextDate = d.toISOString().split('T')[0];
    count++;
  });

  if (count > 0) {
    saveData();
    toast(`${count}件の更新日を自動更新しました`, 'info');
  }
}

// 日またぎ検知: 毎分チェックして日付が変わったら再実行
let _lastDate = new Date().toDateString();
setInterval(() => {
  const today = new Date().toDateString();
  if (today !== _lastDate) {
    _lastDate = today;
    autoAdvanceDates();
    checkUpcomingNotifications(); // 日またぎ時に通知チェック
    render();
  }
}, 60_000);

// ===================== Utils =====================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}
function toMonthly(sub) {
  return sub.cycle === 'yearly' ? sub.amount / 12 : sub.amount;
}
function daysUntil(dateStr) {
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}
function urgencyClass(days) {
  if (days < 0)   return 'urgent';
  if (days <= 3)  return 'urgent';
  if (days <= 7)  return 'soon';
  return 'ok';
}
function badgeClass(days) {
  if (days <= 3) return 'badge-urgent';
  if (days <= 7) return 'badge-soon';
  return 'badge-ok';
}
function badgeLabel(days) {
  if (days < 0)  return '期限切れ';
  if (days === 0) return '今日更新';
  if (days <= 3) return `あと${days}日`;
  if (days <= 7) return `あと${days}日`;
  return `${days}日後`;
}
function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

// ===================== Toast =====================
function toast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  tc.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); }, 3000);
}

// ===================== Notification =====================
let notifGranted = false;
async function requestNotify() {
  if (!('Notification' in window)) return toast('このブラウザは通知をサポートしていません', 'error');
  const perm = await Notification.requestPermission();
  notifGranted = perm === 'granted';
  updateNotifyBtn();
  if (notifGranted) {
    toast('通知が有効になりました ✅', 'success');
    checkUpcomingNotifications();
  } else {
    toast('通知が拒否されました', 'error');
  }
}
function updateNotifyBtn() {
  const label = document.getElementById('notify-label');
  if (notifGranted) {
    label.textContent = '通知: ON';
  } else {
    label.textContent = '通知を有効にする';
  }
}
function checkUpcomingNotifications() {
  if (!notifGranted) return;

  const today = new Date().toISOString().split('T')[0];
  const NOTIF_LOG_KEY = 'substrack_notif_log';

  // 通知ログ読み込み（形式: { "subId_YYYY-MM-DD": true, ... }）
  let notifLog = {};
  try { notifLog = JSON.parse(localStorage.getItem(NOTIF_LOG_KEY) || '{}'); } catch(e) {}

  // 30日以上前のログを掃除
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  Object.keys(notifLog).forEach(k => {
    const datePart = k.split('_').pop(); // "YYYY-MM-DD"
    if (new Date(datePart) < cutoff) delete notifLog[k];
  });

  let fired = false;
  state.subs.forEach(sub => {
    const days = daysUntil(sub.nextDate);
    if (days < 0 || days > 7) return; // 7日以内のみ対象

    // 今日すでに通知済みならスキップ
    const logKey = `${sub.id}_${today}`;
    if (notifLog[logKey]) return;

    const msg = days === 0
      ? `${sub.name} の更新日は今日です！ (${fmt(sub.amount)})`
      : `${sub.name} の更新まであと${days}日です (${fmt(sub.amount)})`;

    new Notification('SubsTrack 更新アラート', { body: msg, icon: 'icon.png' });
    notifLog[logKey] = true;
    fired = true;
  });

  if (fired) localStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(notifLog));
}

// ===================== Chart =====================
let chart = null;
function renderChart() {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;
  const grouped = {};
  state.subs.forEach(s => {
    grouped[s.category] = (grouped[s.category] || 0) + toMonthly(s);
  });
  const labels = Object.keys(grouped);
  const data   = Object.values(grouped);
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#64748b');
  const total  = data.reduce((a, b) => a + b, 0);
  document.getElementById('chart-center-val').textContent = fmt(total);

  if (chart) chart.destroy();
  if (labels.length === 0) {
    chart = null;
    document.getElementById('chart-legend').innerHTML = '';
    return;
  }
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderColor: 'transparent', hoverOffset: 20 }] },
    options: {
      cutout: '72%',
      layout: { padding: 20 },
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}/月` }
      }},
      animation: { duration: 600, easing: 'easeInOutQuart' },
    }
  });

  const leg = document.getElementById('chart-legend');
  leg.innerHTML = labels.map((l, i) =>
    `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l}</div>`
  ).join('');
}

// ===================== Dashboard =====================
function renderDashboard() {
  const monthly = state.subs.reduce((s, x) => s + toMonthly(x), 0);
  const yearly  = monthly * 12;
  const alerts  = state.subs.filter(s => daysUntil(s.nextDate) <= 7).length;

  document.getElementById('total-monthly').textContent = fmt(monthly);
  document.getElementById('total-yearly').textContent  = fmt(yearly);
  document.getElementById('count-alert').textContent   = alerts + '件';
  document.getElementById('count-active').textContent  = state.subs.length + '件';

  renderChart();

  // Upcoming list — 30日以内、日付昇順
  const ul = document.getElementById('upcoming-list');
  const upcoming = state.subs
    .map(s => ({ ...s, days: daysUntil(s.nextDate) }))
    .filter(s => s.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  if (upcoming.length === 0) {
    ul.innerHTML = '<li class="empty-state">更新予定のサービスはありません</li>';
    return;
  }
  ul.innerHTML = upcoming.map(s => `
    <li class="upcoming-item ${urgencyClass(s.days)}">
      ${serviceIcon(s, 28)}
      <div class="upcoming-info">
        <div class="upcoming-name">${esc(s.name)}</div>
        <div class="upcoming-date">${s.nextDate} (${s.days < 0 ? '期限切れ' : s.days === 0 ? '今日' : `あと${s.days}日`})</div>
      </div>
      <span class="upcoming-amount">${fmt(toMonthly(s))}</span>
    </li>
  `).join('');
}

// ===================== List =====================
function renderList() {
  const query    = document.getElementById('search-input').value.toLowerCase();
  const catF     = document.getElementById('filter-category').value;
  const cycleF   = document.getElementById('filter-cycle').value;
  const grid     = document.getElementById('subs-grid');
  const empty    = document.getElementById('list-empty');

  // populate category filter
  const cats = [...new Set(state.subs.map(s => s.category))];
  const catSel = document.getElementById('filter-category');
  const cur = catSel.value;
  catSel.innerHTML = '<option value="">すべてのカテゴリ</option>' +
    cats.map(c => `<option value="${c}"${c===cur?' selected':''}>${c}</option>`).join('');

  let filtered = state.subs.filter(s => {
    if (query && !s.name.toLowerCase().includes(query)) return false;
    if (catF   && s.category !== catF)   return false;
    if (cycleF && s.cycle    !== cycleF) return false;
    return true;
  });

  if (state.subs.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-dim);padding:24px 0">条件に一致するサービスがありません</p>';
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const days = daysUntil(s.nextDate);
    const urg = days <= 3 ? 'urgent-card' : '';
    return `
      <div class="sub-card ${urg}" style="--card-color:${s.color}">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${s.color};border-radius:14px 14px 0 0;"></div>
        <div class="sub-card-header">
          ${serviceIcon(s, 42)}
          <div class="sub-info">
            <div class="sub-name">${esc(s.name)}</div>
            <div class="sub-category">${s.category} · ${CYCLE_LABEL[s.cycle]}</div>
          </div>
          <div class="sub-card-actions">
            <button class="btn-icon" onclick="openEdit('${s.id}')" title="編集">✎</button>
            <button class="btn-icon btn-del" onclick="openDelete('${s.id}')" title="削除">✕</button>
          </div>
        </div>
        <div class="sub-amount">${fmt(s.amount)}</div>
        <div class="sub-cycle">${CYCLE_LABEL[s.cycle]} · 月換算 ${fmt(toMonthly(s))}</div>
        <div class="sub-next">
          <span>次回 ${s.nextDate}</span>
          <span class="sub-next-badge ${badgeClass(days)}">${badgeLabel(days)}</span>
        </div>
        ${s.memo ? `<div style="margin-top:8px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:8px;">${esc(s.memo)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== Calendar =====================
function renderCalendar() {
  const { calYear, calMonth } = state;
  const label = new Date(calYear, calMonth, 1)
    .toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  document.getElementById('cal-month-label').textContent = label;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  // Events map  day -> [sub, ...]
  const events = {};
  state.subs.forEach(s => {
    const d = new Date(s.nextDate);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      if (!events[day]) events[day] = [];
      events[day].push(s);
    }
  });

  // カレンダーグリッドのアイコン (最大3件)
  const calIcon = (s) => {
    const key = s.name.toLowerCase().trim();
    let domain = SERVICE_DOMAINS[key];
    if (!domain) {
      for (const [k, d] of Object.entries(SERVICE_DOMAINS)) {
        if (key.includes(k) || k.includes(key)) { domain = d; break; }
      }
    }
    if (domain) {
      const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      return `<div class="cal-icon-chip" style="background:${s.color}" title="${esc(s.name)}">
        <img src="${url}" width="11" height="11" style="object-fit:contain;border-radius:2px;"
          onerror="this.parentElement.innerHTML='<span style=\'font-size:8px;font-weight:700;color:#fff;\'>${s.name.slice(0,1).toUpperCase()}</span>'" />
      </div>`;
    }
    return `<div class="cal-icon-chip" style="background:${s.color}" title="${esc(s.name)}">
      <span style="font-size:8px;font-weight:700;color:#fff;">${s.name.slice(0,1).toUpperCase()}</span>
    </div>`;
  };

  const headers = ['日','月','火','水','木','金','土'];
  const grid = document.getElementById('calendar-grid');
  let html = headers.map(h => `<div class="cal-day-header">${h}</div>`).join('');

  // empty cells
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const isToday = date.getTime() === today.getTime();
    const isSel   = state.calSelectedDate === `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEv   = !!events[d];
    const cls     = ['cal-day', isToday?'today':'', isSel?'selected':'', hasEv?'has-event':''].filter(Boolean).join(' ');
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evList  = events[d] || [];
    const chips   = evList.slice(0, 3).map(s => calIcon(s)).join('');
    const more    = evList.length > 3 ? `<div class="cal-more">+${evList.length - 3}</div>` : '';
    html += `
      <div class="${cls}" onclick="selectCalDay('${dateStr}')">
        <div class="cal-date">${d}</div>
        <div class="cal-chips">${chips}${more}</div>
      </div>`;
  }
  grid.innerHTML = html;
  renderCalDetail();
}

window.selectCalDay = function(dateStr) {
  state.calSelectedDate = dateStr;
  renderCalendar();
};

function renderCalDetail() {
  const title = document.getElementById('cal-detail-title');
  const list  = document.getElementById('cal-detail-list');
  if (!state.calSelectedDate) {
    title.textContent = '日付を選択してください';
    list.innerHTML = '';
    return;
  }
  const evs = state.subs.filter(s => s.nextDate === state.calSelectedDate);
  const d = new Date(state.calSelectedDate);
  title.textContent = d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) + ' の更新';
  if (evs.length === 0) {
    list.innerHTML = '<li style="color:var(--text-dim);font-size:13px;padding:8px 0">この日に更新予定のサービスはありません</li>';
    return;
  }
  list.innerHTML = evs.map(s => `
    <li class="cal-detail-item">
      ${serviceIcon(s, 28)}
      <span class="cal-detail-name">${esc(s.name)}</span>
      <span class="cal-detail-amount">${fmt(s.amount)}</span>
    </li>
  `).join('');
}

// ===================== Modal =====================
function openAdd() {
  state.editingId = null;
  document.getElementById('modal-title').textContent = 'サブスクを追加';
  document.getElementById('btn-submit').textContent = '追加する';
  document.getElementById('sub-form').reset();
  document.getElementById('form-id').value = '';
  // default date = today
  document.getElementById('form-next-date').value = new Date().toISOString().split('T')[0];
  selectColor('#7c3aed');
  showModal(true);
}

function openEdit(id) {
  const sub = state.subs.find(s => s.id === id);
  if (!sub) return;
  state.editingId = id;
  document.getElementById('modal-title').textContent = 'サブスクを編集';
  document.getElementById('btn-submit').textContent = '保存する';
  document.getElementById('form-id').value = id;
  document.getElementById('form-name').value      = sub.name;
  document.getElementById('form-amount').value    = sub.amount;
  document.getElementById('form-cycle').value     = sub.cycle;
  document.getElementById('form-category').value  = sub.category;
  document.getElementById('form-next-date').value = sub.nextDate;
  document.getElementById('form-memo').value      = sub.memo || '';
  selectColor(sub.color);
  showModal(true);
}
window.openEdit = openEdit;

function openDelete(id) {
  const sub = state.subs.find(s => s.id === id);
  if (!sub) return;
  state.deletingId = id;
  document.getElementById('delete-msg').textContent = `「${sub.name}」を削除しますか？この操作は取り消せません。`;
  document.getElementById('delete-overlay').classList.remove('hidden');
}
window.openDelete = openDelete;

function showModal(show) {
  document.getElementById('modal-overlay').classList.toggle('hidden', !show);
}

function selectColor(color) {
  state.selectedColor = color;
  document.querySelectorAll('.color-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

// Form submit
document.getElementById('sub-form').addEventListener('submit', e => {
  e.preventDefault();
  const name    = document.getElementById('form-name').value.trim();
  const amount  = parseFloat(document.getElementById('form-amount').value);
  const cycle   = document.getElementById('form-cycle').value;
  const category= document.getElementById('form-category').value;
  const nextDate= document.getElementById('form-next-date').value;
  const memo    = document.getElementById('form-memo').value.trim();

  if (!name || !amount || !nextDate) return toast('必須項目を入力してください', 'error');

  if (state.editingId) {
    const idx = state.subs.findIndex(s => s.id === state.editingId);
    if (idx !== -1) state.subs[idx] = { ...state.subs[idx], name, amount, cycle, category, nextDate, memo, color: state.selectedColor };
    toast(`「${name}」を更新しました`, 'success');
  } else {
    state.subs.push({ id: uid(), name, amount, cycle, category, nextDate, memo, color: state.selectedColor });
    toast(`「${name}」を追加しました 🎉`, 'success');
  }
  saveData();
  showModal(false);
  render();
});

// Color swatches
document.getElementById('color-picker').addEventListener('click', e => {
  const sw = e.target.closest('.color-swatch');
  if (sw) selectColor(sw.dataset.color);
});

// Close modal
document.getElementById('modal-close').addEventListener('click', () => showModal(false));
document.getElementById('btn-cancel').addEventListener('click',  () => showModal(false));
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) showModal(false);
});

// Delete modal
document.getElementById('delete-confirm').addEventListener('click', () => {
  const sub = state.subs.find(s => s.id === state.deletingId);
  state.subs = state.subs.filter(s => s.id !== state.deletingId);
  saveData();
  document.getElementById('delete-overlay').classList.add('hidden');
  if (sub) toast(`「${sub.name}」を削除しました`, 'info');
  render();
});
document.getElementById('delete-close').addEventListener('click', () => {
  document.getElementById('delete-overlay').classList.add('hidden');
});
document.getElementById('delete-cancel').addEventListener('click', () => {
  document.getElementById('delete-overlay').classList.add('hidden');
});
document.getElementById('delete-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('delete-overlay'))
    document.getElementById('delete-overlay').classList.add('hidden');
});

// ===================== Navigation =====================
function showPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = { dashboard: 'ダッシュボード', list: 'サブスク一覧', calendar: 'カレンダー' };
  document.getElementById('page-title').textContent = titles[page] || page;
  render();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    showPage(btn.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});

// ===================== CSV Export =====================
document.getElementById('btn-export').addEventListener('click', () => {
  if (state.subs.length === 0) return toast('エクスポートするデータがありません', 'error');
  const header = 'サービス名,金額,課金周期,カテゴリ,次回更新日,メモ';
  const rows   = state.subs.map(s =>
    [s.name, s.amount, CYCLE_LABEL[s.cycle], s.category, s.nextDate, s.memo||'']
      .map(v => `"${String(v).replace(/"/g,'""')}"`)
      .join(',')
  );
  const csv  = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'substrack_export.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSVをエクスポートしました', 'success');
});

// ===================== Add button =====================
document.getElementById('btn-add').addEventListener('click', openAdd);
document.getElementById('btn-add-empty')?.addEventListener('click', () => {
  showPage('list');
  setTimeout(openAdd, 100);
});

// ===================== Hamburger =====================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===================== Notification button =====================
document.getElementById('btn-notify').addEventListener('click', requestNotify);

// ===================== Calendar nav =====================
document.getElementById('cal-prev').addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  state.calSelectedDate = null;
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  state.calSelectedDate = null;
  renderCalendar();
});

// ===================== Search / Filter =====================
document.getElementById('search-input').addEventListener('input', renderList);
document.getElementById('filter-category').addEventListener('change', renderList);
document.getElementById('filter-cycle').addEventListener('change', renderList);

// ===================== Render All =====================
function render() {
  const p = state.currentPage;
  if (p === 'dashboard') renderDashboard();
  if (p === 'list')      renderList();
  if (p === 'calendar')  renderCalendar();
}

// ===================== Init =====================
(function init() {
  loadData();
  autoAdvanceDates(); // 起動時に過去日付を自動更新

  // Check notification permission
  if ('Notification' in window && Notification.permission === 'granted') {
    notifGranted = true;
    updateNotifyBtn();
    checkUpcomingNotifications();
  }

  // Initial btn-add-empty listener (page not rendered yet)
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-add-empty') { showPage('list'); setTimeout(openAdd, 50); }
  });

  showPage('dashboard');
})();
