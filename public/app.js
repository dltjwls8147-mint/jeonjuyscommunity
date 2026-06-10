/* ── 전주영생고등학교 커뮤니티 SPA ── */

const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const headerNav = $('#headerNav');
const headerAuth = $('#headerAuth');

let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

function updateVoteUi(post) {
  const upBtn = $('#upvoteBtn');
  const downBtn = $('#downvoteBtn');
  const metaUp = $('#metaUp');
  const metaDown = $('#metaDown');

  if (upBtn) {
    upBtn.innerHTML = `👍 개념추천 <span id="upvoteCount">${post.concept_recommends ?? 0}</span>`;
    upBtn.disabled = !!post.myVote?.up;
    upBtn.classList.toggle('active', !!post.myVote?.up);
  }

  if (downBtn) {
    downBtn.innerHTML = `👎 싫어요 <span id="downvoteCount">${post.dislikes ?? 0}</span>`;
    downBtn.disabled = !!post.myVote?.down;
    downBtn.classList.toggle('active', !!post.myVote?.down);
  }

  if (metaUp) metaUp.textContent = `👍 개념추천 ${post.concept_recommends ?? 0}`;
  if (metaDown) metaDown.textContent = `👎 싫어요 ${post.dislikes ?? 0}`;
}

let boards = [];
let chatRefreshTimer = null;
const COMMENT_EMOJIS = ['😀','😂','😍','👍','🎉','😅','😢','😡','🤔','👏'];

function insertTextAtCursor(el, text) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const value = el.value || '';
  el.value = value.slice(0, start) + text + value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.focus();
}

function isAdmin() {
  return currentUser?.role === 'admin';
}

function stopChatRefresh() {
  if (chatRefreshTimer) {
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = null;
  }
}

function localDateValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 한진욱 ─ 학교 정보 저장 (학년, 반)
const SCHOOL_STORAGE_KEY = 'schoolInfoSettings';

function getSavedSchoolInfo() {
  try {
    return JSON.parse(localStorage.getItem(SCHOOL_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveSchoolInfo({ grade, classNm }) {
  try {
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify({ grade, classNm }));
  } catch {
    // ignore storage errors
  }
}

function cleanMealText(text = '') {
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s*\([0-9.]+\)/g, '')
    .trim();
}

const SCHEDULE_DATA = {
  academic: [
    { date: '05.20', title: '관리자 기능 점검', description: '게시판 운영 도구와 계정 관리 기능을 확인합니다.' },
    { date: '05.24', title: '동아리 활동', description: '방과 후 동아리별 활동 기록을 공유합니다.' },
    { date: '05.31', title: '학급 공지 확인', description: '학급별 전달사항과 게시판 안내를 정리합니다.' },
  ],
  clubs: [
    { day: '월', club: '축구부', time: '16:30', place: '운동장' },
    { day: '수', club: '코딩반', time: '16:30', place: '컴퓨터실' },
    { day: '금', club: '밴드부', time: '17:00', place: '음악실' },
  ],
  gradeEvents: [
    { grade: '1학년', event: '학급 커뮤니티 안내', date: '05.22' },
    { grade: '2학년', event: '진로 활동 공유', date: '05.27' },
    { grade: '3학년', event: '입시 정보 정리', date: '05.29' },
  ],
};

// ── 라우터 ──
function navigate(hash) {
  location.hash = hash;
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  try {
    boards = await api('/api/boards');
    renderAuth();
    renderNav();
    setupLogoEasterEgg();
    setupSearch();
    route();
  } catch (e) {
    app.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
});

function setupLogoEasterEgg() {
  const logo = document.getElementById('logo');
  const catModal = document.getElementById('catModal');
  const catImage = document.getElementById('catImage');
  const closeCatModal = document.getElementById('closeCatModal');
  const catModalBackdrop = document.getElementById('catModalBackdrop');

  if (!logo || !catModal || !catImage || !closeCatModal || !catModalBackdrop) {
    return;
  }

  const openModal = (event) => {
    event.preventDefault();
    catImage.src = '/assest/logo-easter-egg.svg';
    catImage.alt = '고양이 사진';
    catModal.classList.remove('hidden');
  };

  const closeModal = () => {
    catModal.classList.add('hidden');
    catImage.src = '';
  };

  logo.addEventListener('contextmenu', openModal);
  closeCatModal.addEventListener('click', closeModal);
  catModalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !catModal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

// --- Language support ---
const SUPPORTED_LANGS = {
  ko: { name: '한국어' },
  en: { name: 'English' },
  ar: { name: 'العربية' },
  he: { name: 'עברית' },
  ja: { name: '日本語' },
  zh: { name: '中文' },
};

const TRANSLATIONS = {
  ko: {
    more: '🔗 더보기', neis: '📱 나이스 플러스', official: '🏫 공식 사이트', riro: '📚 리로스쿨', minigame: '🎮 미니게임',
    schedule: '🗓 일정', schoolInfo: '🍱 급식·시간표', chat: '💬 실시간 채팅',
    searchPlaceholder: '글 검색', heroTitle: '오늘 필요한 학교 소식과 이야기를 한곳에서', heroDesc: '게시판, 급식, 시간표, 실시간 채팅까지 바로 연결되는 운영형 커뮤니티입니다.',
    miniGameTitle: '🎮 미니게임', tabTarget: '타깃', tabMemory: '지뢰찾기', tabReaction: '반응 속도',
    start: '시작', close: '닫기', instructions: '조작법: 모바일 - 길게 누르기: 깃발, 컴퓨터 - 스페이스바 또는 마우스 길게 누르기: 깃발, 좌클릭: 열기'
  },
  en: {
    more: '🔗 More', neis: '📱 NEIS Plus', official: '🏫 Official Site', riro: '📚 RiroSchool', minigame: '🎮 Mini Games',
    schedule: '🗓 Schedule', schoolInfo: '🍱 Meals & Timetable', chat: '💬 Live Chat',
    searchPlaceholder: 'Search posts', heroTitle: 'All school news and conversations in one place', heroDesc: 'Boards, meals, timetables, and live chat connected in one community.',
    miniGameTitle: '🎮 Mini Games', tabTarget: 'Target', tabMemory: 'Minesweeper', tabReaction: 'Reaction',
    start: 'Start', close: 'Close', instructions: 'Controls: Mobile - long press to flag; Desktop - Space or long press to flag; Left click to reveal'
  },
  ar: {
    more: '🔗 المزيد', neis: '📱 نيس بلس', official: '🏫 الموقع الرسمي', riro: '📚 ريرو سكول', minigame: '🎮 الألعاب',
    schedule: '🗓 التقويم', schoolInfo: '🍱 الوجبات والجدول', chat: '💬 الدردشة المباشرة',
    searchPlaceholder: 'بحث في المنشورات', heroTitle: 'أخبار المدرسة والمحادثات في مكان واحد', heroDesc: 'المنتديات والوجبات والجداول والدردشة المباشرة كلها متصلة.',
    miniGameTitle: '🎮 الألعاب', tabTarget: 'الهدف', tabMemory: 'الألغام', tabReaction: 'الاستجابة',
    start: 'ابدأ', close: 'إغلاق', instructions: 'التحكم: الهاتف - اضغط مطولًا للعلم؛ الكمبيوتر - مسافة أو ضغط مطول؛ اضغط يسار لفتح'
  },
  he: {
    more: '🔗 עוד', neis: '📱 NEIS פלוס', official: '🏫 האתר הרשמי', riro: '📚 RiroSchool', minigame: '🎮 משחקים',
    schedule: '🗓 לוח זמנים', schoolInfo: '🍱 ארוחות ולוח זמנים', chat: "💬 צ'אט חי",
    searchPlaceholder: 'חפש פוסטים', heroTitle: 'כל חדשות ובית ספר ושיחות במקום אחד', heroDesc: 'לוחות, ארוחות, לוחות זמנים וצ׳אט חי מחוברים בקהילה אחת.',
    miniGameTitle: '🎮 משחקים', tabTarget: 'טארגט', tabMemory: 'אפקט', tabReaction: 'תגובה',
    start: 'התחל', close: 'סגור', instructions: 'בקרות: מובייל - לחיצה ארוכה לדגל; שולחן עבודה - רווח או לחיצה ארוכה לדגל; לחיצה שמאלית לפתיחה'
  },
  ja: {
    more: '🔗 もっと見る', neis: '📱 NEISプラス', official: '🏫 公式サイト', riro: '📚 RiroSchool', minigame: '🎮 ミニゲーム',
    schedule: '🗓 スケジュール', schoolInfo: '🍱 給食・時間割', chat: '💬 ライブチャット',
    searchPlaceholder: '投稿を検索', heroTitle: '学校のニュースと会話を一箇所で', heroDesc: '掲示板、給食、時間割、ライブチャットがつながるコミュニティです。',
    miniGameTitle: '🎮 ミニゲーム', tabTarget: 'ターゲット', tabMemory: 'マインスイーパー', tabReaction: '反応速度',
    start: '開始', close: '閉じる', instructions: '操作: モバイル - 長押しで旗、PC - スペースまたは長押しで旗、左クリックで開く'
  },
  zh: {
    more: '🔗 更多', neis: '📱 NEIS Plus', official: '🏫 官方网站', riro: '📚 RiroSchool', minigame: '🎮 迷你游戏',
    schedule: '🗓 日程', schoolInfo: '🍱 饮食与课表', chat: '💬 实时聊天',
    searchPlaceholder: '搜索文章', heroTitle: '一处查看学校新闻与讨论', heroDesc: '论坛、餐食、课表、实时聊天一站式社区。',
    miniGameTitle: '🎮 迷你游戏', tabTarget: 'Target', tabMemory: '扫雷', tabReaction: '反应',
    start: '开始', close: '关闭', instructions: '操作：移动端-长按标旗；电脑-空格或长按标旗；左键打开'
  }
};

function getSavedLang() {
  return localStorage.getItem('site_lang') || 'ko';
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) lang = 'ko';
  localStorage.setItem('site_lang', lang);
  applyTranslations(lang);
}

function t(key) {
  const lang = getSavedLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['ko'][key] || '';
}

window.t = t; // expose for other scripts

function applyTranslations(lang) {
  const tr = TRANSLATIONS[lang] || TRANSLATIONS['ko'];
  document.title = (lang === 'en') ? 'Jeonju Youngsaeng High School Community' : document.title;
  // header more button
  const linksBtn = document.getElementById('linksMenuBtn');
  if (linksBtn) linksBtn.innerText = tr.more + ' ';
  // dropdown items
  const aNeis = document.getElementById('linkNeis'); if (aNeis) aNeis.textContent = tr.neis;
  const aOff = document.getElementById('linkOfficial'); if (aOff) aOff.textContent = tr.official;
  const aRiro = document.getElementById('linkRiro'); if (aRiro) aRiro.textContent = tr.riro;
  const gameBtn = document.getElementById('openGameBtn'); if (gameBtn) gameBtn.textContent = tr.minigame;
  const langBtn = document.getElementById('langBtn'); if (langBtn) langBtn.textContent = '🌐 ' + (tr.more.includes('More') ? 'Language' : '언어 지원');
  // search placeholder
  const searchInput = document.getElementById('searchInput'); if (searchInput) searchInput.placeholder = tr.searchPlaceholder;
  // chat link
  const chatLink = document.querySelector('.chat-link'); if (chatLink) chatLink.textContent = tr.chat;
  // hero texts if present
  const kicker = document.querySelector('.home-hero .hero-kicker'); if (kicker) kicker.textContent = '전주영생고등학교 학생 커뮤니티';
  const h1 = document.querySelector('.home-hero h1'); if (h1) h1.textContent = tr.heroTitle;
  const p = document.querySelector('.home-hero p'); if (p) p.textContent = tr.heroDesc;
  // nav will use t() when rendering
}

// language modal
function openLanguageModal() {
  const modal = document.createElement('div');
  modal.className = 'cat-modal';
  modal.innerHTML = `
    <div class="cat-modal-backdrop"></div>
    <div class="cat-modal-card">
      <button class="cat-modal-close">✕</button>
      <div style="padding:14px">
        <h3>언어 설정 / Language</h3>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px" id="langList"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const list = modal.querySelector('#langList');
  Object.keys(SUPPORTED_LANGS).forEach((code) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost';
    btn.textContent = `${SUPPORTED_LANGS[code].name} (${code})`;
    btn.addEventListener('click', () => { setLanguage(code); modal.remove(); });
    list.appendChild(btn);
  });
  modal.querySelector('.cat-modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.cat-modal-backdrop').addEventListener('click', () => modal.remove());
}

// hook language button
document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('langBtn'); if (langBtn) langBtn.addEventListener('click', openLanguageModal);
  // apply saved language on load
  applyTranslations(getSavedLang());
});

function parseHash() {
  const rawHash = location.hash.slice(1) || '/';
  const [pathPart, queryString = ''] = rawHash.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryString);
  return { parts, params };
}

// 검색 기능 한진욱
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  if (!searchInput || !searchButton) return;

  const submitSearch = () => {
    const query = searchInput.value.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  searchButton.addEventListener('click', submitSearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitSearch();
  });
}

function route() {
  stopChatRefresh();
  const { parts, params } = parseHash();

  if (parts[0] === 'board' && parts[2] === 'write') return renderWrite(parts[1]);
  if (parts[0] === 'board' && parts[1]) return renderBoard(parts[1]);
  if (parts[0] === 'post' && parts[1]) return renderPost(parts[1]);
  if (parts[0] === 'search' && parts[1] === 'hashtag' && parts[2]) return renderHashtagSearch(parts[2]);
  if (parts[0] === 'search') return renderSearch(params.get('q') || '', parseInt(params.get('page')) || 1);
  if (parts[0] === 'schedule') return renderSchedule();
  if (parts[0] === 'school-info') return renderSchoolInfo();
  if (parts[0] === 'chat') return renderChat();
  if (parts[0] === 'admin') return renderAdmin();
  renderHome();
}

// ── API Helper ──
async function api(url, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  if (currentUser?.token) {
    headers.Authorization = `Bearer ${currentUser.token}`;
  }

  const res = await fetch(url, {
    ...opts,
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '오류가 발생했습니다');
  return data;
}

// ── 네비게이션 ──
function renderNav() {
  headerNav.innerHTML = `
    <a href="#/schedule" data-board="schedule">🗓 일정</a>
    <a href="#/school-info" data-board="school-info">🍱 급식·시간표</a>
    ${boards.map((b) => `<a href="#/board/${b.id}" data-board="${b.id}">${b.icon} ${b.name}</a>`).join('')}
    ${isAdmin() ? '<a href="#/admin" data-board="admin">🛡 관리자</a>' : ''}
  `;
}

function updateActiveNav(boardId) {
  headerNav.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.board === boardId);
  });
}

// ── 시간 포맷 ──
function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── 이스케이프 ──
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function attr(str) {
  return esc(str).replace(/"/g, '&quot;');
}

// ── 홈 ──
async function renderHome() {
  updateActiveNav('');
  app.innerHTML = `
    <div class="home-hero">
      <div class="hero-kicker">전주영생고등학교 학생 커뮤니티</div>
      <h1>오늘 필요한 학교 소식과 이야기를 한곳에서</h1>
      <p>게시판, 급식, 시간표, 실시간 채팅까지 바로 연결되는 운영형 커뮤니티입니다.</p>
      <div class="home-actions">
        <a class="btn btn-primary" href="#/school-info">🍱 급식·시간표</a>
        <a class="btn btn-ghost hero-ghost" href="#/chat">💬 실시간 채팅</a>
        ${isAdmin() ? '<a class="btn btn-ghost hero-ghost" href="#/admin">🛡 관리자</a>' : ''}
      </div>
    </div>

    <!-- 인기글 랭킹 -->
    <div class="home-section">
      <div class="section-title">
        <h2>🏆 인기글 TOP 10</h2>
      </div>
      <div id="ranking" class="ranking-list">로딩 중...</div>
    </div>

    <!-- 해시태그 클라우드 -->
    <div class="home-section">
      <div id="hashtags" class="hashtag-cloud">로딩 중...</div>
    </div>

    <div class="home-schedule-preview">
      <div class="home-preview-card">
        <div class="preview-header">
          <h2>🗓 다음 일정</h2>
          <p>학사 일정, 동아리 활동, 학년별 행사를 빠르게 확인하세요.</p>
        </div>
        <ul class="schedule-preview-list">
          ${SCHEDULE_DATA.academic.slice(0, 3).map((event) => `
            <li>
              <strong>${event.date}</strong>
              <span>${esc(event.title)}</span>
            </li>
          `).join('')}
        </ul>
        <a class="btn btn-primary" href="#/schedule">전체 일정 보기</a>
      </div>
    </div>

    <!-- 게시판별 최근글 -->
    <div class="section-title">
      <h2>📰 게시판별 최근글</h2>
    </div>
    <div class="board-grid" id="boardGrid">로딩 중...</div>
  `;

  try {
    // 인기글 로드
    const rankingData = await api('/api/ranking/posts');
    const rankingHtml = rankingData.posts.map((p, i) => `
      <div class="ranking-item">
        <span class="ranking-number">${i + 1}</span>
        <div class="ranking-content">
          <a href="#/post/${p.id}" class="ranking-title">${esc(p.title)}</a>
          <div class="ranking-meta">
            <span>${esc(p.author)}</span>
            <span>👍 ${(p.concept_recommends ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `).join('');
    $('#ranking').innerHTML = rankingHtml || '<div style="color:var(--text-muted)">아직 글이 없습니다</div>';

    // 해시태그 로드
    const tagsData = await api('/api/hashtags');
    if (tagsData.tags.length > 0) {
      const maxCount = Math.max(...tagsData.tags.map(t => t.count));
      const tagsHtml = tagsData.tags.map(t => {
        const size = 12 + (t.count / maxCount) * 20;
        return `<a href="#/search/hashtag/${t.tag.substring(1)}" class="hashtag-tag" style="font-size: ${size}px">${t.tag}</a>`;
      }).join('');
      $('#hashtags').innerHTML = tagsHtml;
    } else {
      $('#hashtags').innerHTML = '<div style="color:var(--text-muted)">아직 해시태그가 없습니다</div>';
    }
  } catch (e) {
    console.log('랭킹/해시태그 로드 실패:', e);
  }

  // 게시판별 최근글
  const grid = $('#boardGrid');
  const cards = await Promise.all(
    boards.map(async (b) => {
      const data = await api(`/api/boards/${b.id}/posts?page=1`);
      const recentHtml = data.posts.slice(0, 3).map((p) => `
        <div class="recent-item">
          <a class="ri-title" href="#/post/${p.id}">${esc(p.title)} ${p.popular ? '<span class="popular-pill"><span class="icon"><img src="https://i.namu.wiki/i/T9N7d24l3tACrcPak9mZf6WulfJ2tfIB6PPX0dKkHVtdt8GlD7xbJZ-coghDDnI25dgrio5Wc_ND1MLJMT4E3Q.svg" alt="인기"></span> 많이 받은 글</span>' : ''}</a>
          <span class="ri-date">${fmtDate(p.created_at)}</span>
        </div>
      `).join('') || '<div class="recent-item"><span class="ri-title" style="color:var(--text-muted)">아직 글이 없습니다</span></div>';

      return `
        <div class="board-card" onclick="location.hash='#/board/${b.id}'">
          <div class="card-head">
            <span class="card-icon">${b.icon}</span>
            <span class="card-name">${b.name}</span>
            <span class="card-posts">${data.total}개의 글</span>
          </div>
          ${recentHtml}
        </div>
      `;
    })
  );
  grid.innerHTML = cards.join('');
}

// ── 게시판 목록 ──
function renderSchedule() {
  updateActiveNav('schedule');

  app.innerHTML = `
    <div class="schedule-header">
      <div>
        <h2>🗓 일정 / 달력</h2>
        <p>학사 일정, 동아리 활동, 학년별 행사를 한 페이지에서 확인할 수 있습니다.</p>
      </div>
      <a class="btn btn-ghost" href="#/">← 홈으로</a>
    </div>

    <div class="schedule-grid">
      <section class="schedule-card">
        <h3>📚 학사 일정</h3>
        <div class="schedule-list">
          ${SCHEDULE_DATA.academic.map((item) => `
            <div class="schedule-item">
              <strong>${item.date}</strong>
              <div>
                <div class="schedule-title">${esc(item.title)}</div>
                <div class="schedule-desc">${esc(item.description)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="schedule-card">
        <h3>🎯 동아리 활동</h3>
        <div class="schedule-table">
          <table>
            <thead>
              <tr>
                <th>요일</th>
                <th>동아리</th>
                <th>시간</th>
                <th>장소</th>
              </tr>
            </thead>
            <tbody>
              ${SCHEDULE_DATA.clubs.map((item) => `
                <tr>
                  <td>${esc(item.day)}</td>
                  <td>${esc(item.club)}</td>
                  <td>${esc(item.time)}</td>
                  <td>${esc(item.place)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="schedule-card">
        <h3>🏫 학년별 행사</h3>
        <div class="grade-grid">
          ${SCHEDULE_DATA.gradeEvents.map((item) => `
            <div class="grade-card">
              <strong>${esc(item.grade)}</strong>
              <div class="grade-event">${esc(item.event)}</div>
              <div class="grade-date">${esc(item.date)}</div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderSchoolInfo() {
  updateActiveNav('school-info');
  const today = localDateValue();

  app.innerHTML = `
    <div class="schedule-header">
      <div>
        <h2>🍱 급식 / 시간표</h2>
        <p>NEIS API 기준 전주영생고등학교 급식과 고등학교 시간표를 불러옵니다.</p>
      </div>
      <a class="btn btn-ghost" href="#/">← 홈으로</a>
    </div>

    <div class="school-controls">
      <label>날짜 <input id="schoolDate" type="date" value="${today}" /></label>
      <label>학년
        <select id="schoolGrade">
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
        </select>
      </label>
      <label>반 <input id="schoolClass" type="number" min="1" max="20" value="1" /></label>
      <button class="btn btn-primary" id="schoolLoad">불러오기</button>
    </div>

    <div class="school-grid">
      <section class="school-panel">
        <h3>오늘의 급식</h3>
        <div id="mealResult" class="info-list">로딩 중...</div>
      </section>
      <section class="school-panel">
        <h3>시간표</h3>
        <div id="timetableResult" class="info-list">로딩 중...</div>
      </section>
    </div>
  `;

  const load = async () => {
    const date = $('#schoolDate').value;
    const grade = $('#schoolGrade').value;
    const classNm = $('#schoolClass').value || '1';
    saveSchoolInfo({ grade, classNm });
    $('#mealResult').innerHTML = '로딩 중...';
    $('#timetableResult').innerHTML = '로딩 중...';

    try {
      const [mealData, timetableData] = await Promise.all([
        api(`/api/school/meals?date=${encodeURIComponent(date)}`),
        api(`/api/school/timetable?date=${encodeURIComponent(date)}&grade=${encodeURIComponent(grade)}&classNm=${encodeURIComponent(classNm)}`),
      ]);

      $('#mealResult').innerHTML = mealData.meals.length
        ? mealData.meals.map((meal) => `
          <div class="info-item">
            <strong>${esc(meal.type || '급식')}</strong>
            <pre>${esc(cleanMealText(meal.menu || ''))}</pre>
            <span>${esc(meal.calories || '')}</span>
          </div>
        `).join('')
        : '<div class="empty-inline">해당 날짜 급식 정보가 없습니다.</div>';

      const lessons = Array.isArray(timetableData.lessons) ? timetableData.lessons : [];

      $('#timetableResult').innerHTML = lessons.length
        ? lessons.map((lesson) => `
          <div class="lesson-row">
            <strong>${lesson.period}교시</strong>
            <span>${esc(lesson.subject || '내용 없음')}</span>
          </div>
        `).join('')
        : '<div class="empty-inline">해당 학급 시간표 정보가 없습니다.</div>';
    } catch (e) {
      $('#mealResult').innerHTML = `<div class="empty-inline">${esc(e.message)}</div>`;
      $('#timetableResult').innerHTML = `<div class="empty-inline">${esc(e.message)}</div>`;
    }
  };

  const savedSchoolInfo = getSavedSchoolInfo();
  if (savedSchoolInfo.grade) $('#schoolGrade').value = savedSchoolInfo.grade;
  if (savedSchoolInfo.classNm) $('#schoolClass').value = savedSchoolInfo.classNm;

  $('#schoolLoad').addEventListener('click', load);
  load();
}

function renderChat() {
  updateActiveNav('chat');
  app.innerHTML = `
    <div class="chat-page">
      <div class="chat-header">
        <div>
          <h2>💬 실시간 채팅</h2>
          <p>학교 커뮤니티 안에서 가볍게 이야기할 수 있는 공개 채팅입니다.</p>
        </div>
        <a class="btn btn-ghost" href="#/">← 홈으로</a>
      </div>
      <div class="chat-box">
        <div id="chatMessages" class="chat-messages">로딩 중...</div>
        <div class="chat-compose">
          <input id="chatAuthor" maxlength="20" value="${attr(currentUser?.username || localStorage.getItem('chatAuthor') || '')}" placeholder="닉네임" />
          <input id="chatContent" maxlength="500" placeholder="메시지를 입력하세요" />
          <button id="chatSend" class="btn btn-primary">전송</button>
        </div>
      </div>
    </div>
  `;

  const renderMessages = (messages) => {
    $('#chatMessages').innerHTML = messages.length
      ? messages.map((message) => `
        <div class="chat-message">
          <strong>${esc(message.author)}</strong>
          <span>${esc(message.content)}</span>
          <time>${fmtDate(message.created_at)}</time>
        </div>
      `).join('')
      : '<div class="empty-inline">아직 채팅이 없습니다.</div>';
    $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  };

  const load = async () => {
    try {
      const data = await api('/api/chat/messages');
      renderMessages(data.messages);
    } catch (e) {
      $('#chatMessages').innerHTML = `<div class="empty-inline">${esc(e.message)}</div>`;
    }
  };

  const send = async () => {
    const author = ($('#chatAuthor').value || '').trim() || '익명';
    const content = ($('#chatContent').value || '').trim();
    if (!content) return;

    localStorage.setItem('chatAuthor', author);
    await api('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ author, content }),
    });
    $('#chatContent').value = '';
    load();
  };

  $('#chatSend').addEventListener('click', send);
  $('#chatContent').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });

  load();
  chatRefreshTimer = setInterval(load, 3000);
}

async function renderBoard(boardId, page = 1) {
  const board = boards.find((b) => b.id === boardId);
  if (!board) return renderHome();
  updateActiveNav(boardId);

  const introHtml = board.id === 'game'
    ? `<p class="board-intro">🎮 게임게시판: 게임 추천, 공략, 스쿨 팀전, 이벤트 아이디어를 자유롭게 나누는 공간입니다.</p>`
    : '';

  app.innerHTML = `
    <div class="board-header">
      <div>
        <h2>${board.icon} ${board.name}</h2>
        ${introHtml}
      </div>
      <a class="btn btn-primary" href="#/board/${boardId}/write">✏️ 글쓰기</a>
    </div>
    <div class="post-table" id="postTable">로딩 중...</div>
    <div class="pagination" id="pagination"></div>
  `;

  const data = await api(`/api/boards/${boardId}/posts?page=${page}`);

  if (data.posts.length === 0) {
    $('#postTable').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>아직 작성된 글이 없습니다.<br>첫 번째 글을 작성해보세요!</p>
      </div>
    `;
  } else {
    $('#postTable').innerHTML = `
      <table>
        <thead>
          <tr>
            <th class="col-id">번호</th>
            <th>제목</th>
            <th class="col-author">글쓴이</th>
            <th class="col-date">날짜</th>
            <th class="col-views">조회</th>
          </tr>
        </thead>
        <tbody>
          ${data.posts.map((p) => `
            <tr>
              <td class="col-id">${p.id}</td>
              <td class="col-title" onclick="location.hash='#/post/${p.id}'">
                ${esc(p.title)}
                ${p.comment_count > 0 ? `<span class="comment-badge">${p.comment_count}</span>` : ''}
                ${p.popular ? '<span class="popular-label">🔥 많이 받은 글</span>' : ''}
              </td>
              <td class="col-author">${esc(p.author)}</td>
              <td class="col-date">${fmtDate(p.created_at)}</td>
              <td class="col-views">${p.views}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (data.totalPages > 1) {
    let pHtml = '';
    for (let i = 1; i <= data.totalPages; i++) {
      pHtml += `<button class="${i === page ? 'active' : ''}" onclick="window._goPage('${boardId}',${i})">${i}</button>`;
    }
    $('#pagination').innerHTML = pHtml;
  }
}

window._goPage = (boardId, page) => renderBoard(boardId, page);

// ── 글쓰기 ──
function renderWrite(boardId) {
  const board = boards.find((b) => b.id === boardId);
  if (!board) return renderHome();
  updateActiveNav(boardId);

  app.innerHTML = `
    <div class="write-form">
      <h2>${board.icon} ${board.name} - 글쓰기</h2>
      <div class="form-row">
        <div class="form-group">
          <label>닉네임</label>
          <input id="wAuthor" maxlength="20" value="${attr(currentUser?.username || '')}" placeholder="닉네임을 입력하세요" />
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input id="wPassword" type="password" maxlength="50" placeholder="삭제 시 필요합니다" />
        </div>
      </div>
      <div class="form-group" style="margin-bottom:14px">
        <label>제목</label>
        <input id="wTitle" maxlength="100" placeholder="제목을 입력하세요" />
      </div>
      <div class="form-group">
        <label>내용</label>
        <textarea id="wContent" maxlength="10000" placeholder="내용을 입력하세요&#10;💡 팁: 내용에 #를 붙이면 자동으로 해시태그가 됩니다 (예: #자유 #토론)"></textarea>
      </div>
      <div class="form-actions">
        <a class="btn btn-ghost" href="#/board/${boardId}">취소</a>
        <button class="btn btn-primary" id="wSubmit">등록</button>
      </div>
    </div>
  `;

  

  $('#wSubmit').addEventListener('click', async () => {
    try {
      const result = await api(`/api/boards/${boardId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          title: $('#wTitle').value,
          author: $('#wAuthor').value,
          password: $('#wPassword').value,
          content: $('#wContent').value,
        }),
      });
      navigate(`/post/${result.id}`);
    } catch (e) {
      alert(e.message);
    }
  });
}

// ── 글 상세 ──
async function renderPost(postId) {
  try {
    const { post, comments, hashtags } = await api(`/api/posts/${postId}`);
    const board = boards.find((b) => b.id === post.board_id);
    updateActiveNav(post.board_id);

    const hashtagsHtml = hashtags && hashtags.length > 0 
      ? `<div class="post-hashtags">${hashtags.map(t => `<a href="#/search/hashtag/${t.substring(1)}" class="hashtag-link">${t}</a>`).join(' ')}</div>`
      : '';

    app.innerHTML = `
      <div style="margin-bottom:12px">
        <a class="btn btn-ghost" href="#/board/${post.board_id}">← ${board ? board.name : '목록'}으로</a>
      </div>

      <div class="post-detail">
        <div class="post-detail-header">
          <h1>${esc(post.title)} ${post.popular ? '<span class="popular-label">🔥 많이 받은 글</span>' : ''}</h1>
          <div class="post-meta">
            <span>👤 ${esc(post.author)}</span>
            <span>📅 ${post.created_at}</span>
            <span>👁 조회 ${post.views}</span>
            <span id="metaUp">👍 개념추천 ${post.concept_recommends ?? 0}</span>
            <span id="metaDown">👎 싫어요 ${post.dislikes ?? 0}</span>
          </div>
        </div>
        <div class="post-detail-body">${esc(post.content)}</div>
        ${hashtagsHtml}
        <div class="post-detail-actions">
          <button class="btn btn-like" id="upvoteBtn">👍 개념추천 <span id="upvoteCount">${post.concept_recommends ?? 0}</span></button>
          <button class="btn btn-dislike" id="downvoteBtn">👎 싫어요 <span id="downvoteCount">${post.dislikes ?? 0}</span></button>
          <button class="btn btn-warning" id="reportBtn">⚠️ 신고</button>
          <button class="btn btn-danger" id="deletePostBtn">🗑 삭제</button>
        </div>
      </div>

      <!-- 댓글 -->
      <div class="comments-section">
        <h3>💬 댓글 ${comments.length}개</h3>
        <div class="comment-list" id="commentList">
          ${comments.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">아직 댓글이 없습니다</div>' : ''}
          ${comments.map((c) => `
            <div class="comment-item">
              <div class="comment-head">
                <span>
                  <span class="comment-author">${esc(c.author)}</span>
                  <span class="comment-date">${fmtDate(c.created_at)}</span>
                </span>
                <button class="comment-delete" data-id="${c.id}">삭제</button>
              </div>
              <div class="comment-body">${esc(c.content)}</div>
            </div>
          `).join('')}
        </div>

        <div class="comment-form">
          <div class="form-row">
            <div class="form-group">
              <input id="cAuthor" maxlength="20" placeholder="닉네임" />
            </div>
            <div class="form-group">
              <input id="cPassword" type="password" maxlength="50" placeholder="비밀번호" />
            </div>
          </div>
          <div class="emoji-picker">
            ${COMMENT_EMOJIS.map((emoji) => `<button type="button" class="emoji-swatch" data-emoji="${emoji}">${emoji}</button>`).join('')}
          </div>
          <textarea id="cContent" maxlength="1000" placeholder="댓글을 입력하세요"></textarea>
          <div style="text-align:right;margin-top:8px">
            <button class="btn btn-primary" id="cSubmit">댓글 등록</button>
          </div>
        </div>
      </div>
    `;

    // 개념추천/싫어요
    updateVoteUi(post);

    $('#upvoteBtn').addEventListener('click', async () => {
      try {
        const data = await api(`/api/posts/${postId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ type: 'up' }),
        });
        post.concept_recommends = data.concept_recommends;
        post.dislikes = data.dislikes;
        post.myVote = { ...(post.myVote || {}), up: true };
        updateVoteUi(post);
      } catch (e) {
        alert(e.message);
      }
    });

    $('#downvoteBtn').addEventListener('click', async () => {
      try {
        const data = await api(`/api/posts/${postId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ type: 'down' }),
        });
        post.concept_recommends = data.concept_recommends;
        post.dislikes = data.dislikes;
        post.myVote = { ...(post.myVote || {}), down: true };
        updateVoteUi(post);
      } catch (e) {
        alert(e.message);
      }
    });

    // 글 삭제
    $('#deletePostBtn').addEventListener('click', () => showDeleteModal('post', postId, post.board_id));

    // 신고
    $('#reportBtn').addEventListener('click', async () => {
      try {
        const reason = prompt('신고 사유를 간단히 입력해주세요 (선택)');
        const data = await api(`/api/posts/${postId}/report`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        if (data.deleted) {
          alert('신고 누적으로 글이 삭제되었습니다.');
          if (data.banned) alert('작성자가 사이트 차단되었습니다.');
          navigate(`/board/${post.board_id}`);
          return;
        }
        alert(`신고가 접수되었습니다 (현재 신고 수: ${data.reports})`);
      } catch (e) {
        alert(e.message);
      }
    });

    // 댓글 삭제
    document.querySelectorAll('.comment-delete').forEach((btn) => {
      btn.addEventListener('click', () => showDeleteModal('comment', btn.dataset.id, postId));
    });

    // 댓글 이모지 삽입
    document.querySelectorAll('.emoji-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        insertTextAtCursor($('#cContent'), btn.dataset.emoji);
      });
    });

    // 댓글 작성
    $('#cSubmit').addEventListener('click', async () => {
      try {
        await api(`/api/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            author: $('#cAuthor').value,
            password: $('#cPassword').value,
            content: $('#cContent').value,
          }),
        });
        renderPost(postId);
      } catch (e) {
        alert(e.message);
      }
    });

  } catch (e) {
    app.innerHTML = `<div class="empty-state"><div class="empty-icon">😢</div><p>${esc(e.message)}</p></div>`;
  }
}

// ── 해시태그 검색 ──
async function renderHashtagSearch(tag, page = 1) {
  const searchTag = '#' + tag;
  
  app.innerHTML = `
    <div class="board-header">
      <h2>🔍 ${esc(searchTag)} - 검색 결과</h2>
      <a class="btn btn-ghost" href="#/">← 홈으로</a>
    </div>
    <div class="post-table" id="postTable">로딩 중...</div>
    <div class="pagination" id="pagination"></div>
  `;

  try {
    const data = await api(`/api/hashtags/${tag}/posts?page=${page}`);

    if (data.posts.length === 0) {
      $('#postTable').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>'${esc(searchTag)}' 해시태그가 붙은 글이 없습니다.</p>
        </div>
      `;
    } else {
      $('#postTable').innerHTML = `
        <table>
          <thead>
            <tr>
              <th class="col-id">번호</th>
              <th>제목</th>
              <th class="col-author">글쓴이</th>
              <th class="col-date">날짜</th>
              <th class="col-views">조회</th>
            </tr>
          </thead>
          <tbody>
            ${data.posts.map((p) => `
              <tr>
                <td class="col-id">${p.id}</td>
                <td class="col-title" onclick="location.hash='#/post/${p.id}'">
                  ${esc(p.title)}
                  ${p.comment_count > 0 ? `<span class="comment-badge">${p.comment_count}</span>` : ''}
                  ${p.popular ? '<span class="popular-label">🔥 많이 받은 글</span>' : ''}
                </td>
                <td class="col-author">${esc(p.author)}</td>
                <td class="col-date">${fmtDate(p.created_at)}</td>
                <td class="col-views">${p.views}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // 페이지네이션
    if (data.totalPages > 1) {
      let pHtml = '';
      for (let i = 1; i <= data.totalPages; i++) {
        pHtml += `<button class="${i === page ? 'active' : ''}" onclick="window._goHashtagPage('${tag}',${i})">${i}</button>`;
      }
      $('#pagination').innerHTML = pHtml;
    }
  } catch (e) {
    $('#postTable').innerHTML = `<div class="empty-state"><div class="empty-icon">😢</div><p>${esc(e.message)}</p></div>`;
  }
}

window._goHashtagPage = (tag, page) => renderHashtagSearch(tag, page);
window._goSearchPage = (query, page) => renderSearch(query, page);

async function renderSearch(query = '', page = 1) {
  updateActiveNav('');
  app.innerHTML = `
    <div class="board-header">
      <div>
        <h2>🔎 글 검색</h2>
        <p>제목, 내용, 작성자로 검색할 수 있습니다.</p>
      </div>
      <a class="btn btn-ghost" href="#/">← 홈으로</a>
    </div>
    <div class="search-summary" style="margin-bottom:16px; font-size:14px; color:var(--text-muted);">
      ${query ? `검색어: <strong>${esc(query)}</strong>` : '검색어를 입력하고 검색 버튼을 눌러주세요.'}
    </div>
    <div class="post-table" id="postTable">로딩 중...</div>
    <div class="pagination" id="pagination"></div>
  `;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = query;

  if (!query) {
    $('#postTable').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>검색어를 입력해주세요.</p>
      </div>
    `;
    $('#pagination').innerHTML = '';
    return;
  }

  try {
    const data = await api(`/api/search/posts?q=${encodeURIComponent(query)}&page=${page}`);

    if (data.posts.length === 0) {
      $('#postTable').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>'${esc(query)}' 검색 결과가 없습니다.</p>
        </div>
      `;
    } else {
      $('#postTable').innerHTML = `
        <table>
          <thead>
            <tr>
              <th class="col-id">번호</th>
              <th>제목</th>
              <th class="col-author">글쓴이</th>
              <th class="col-date">날짜</th>
              <th class="col-views">조회</th>
            </tr>
          </thead>
          <tbody>
            ${data.posts.map((p) => `
              <tr>
                <td class="col-id">${p.id}</td>
                <td class="col-title" onclick="location.hash='#/post/${p.id}'">
                  ${esc(p.title)}
                  ${p.comment_count > 0 ? `<span class="comment-badge">${p.comment_count}</span>` : ''}
                  ${p.popular ? '<span class="popular-label">🔥 많이 받은 글</span>' : ''}
                </td>
                <td class="col-author">${esc(p.author)}</td>
                <td class="col-date">${fmtDate(p.created_at)}</td>
                <td class="col-views">${p.views}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (data.totalPages > 1) {
      let pHtml = '';
      for (let i = 1; i <= data.totalPages; i++) {
        pHtml += `<button class="${i === page ? 'active' : ''}" onclick="window._goSearchPage(${JSON.stringify(query)},${i})">${i}</button>`;
      }
      $('#pagination').innerHTML = pHtml;
    } else {
      $('#pagination').innerHTML = '';
    }
  } catch (e) {
    $('#postTable').innerHTML = `<div class="empty-state"><div class="empty-icon">😢</div><p>${esc(e.message)}</p></div>`;
    $('#pagination').innerHTML = '';
  }
}

// ── 관리자 대시보드 ──
async function renderAdmin() {
  updateActiveNav('admin');

  if (!isAdmin()) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛡</div>
        <p>관리자 로그인이 필요합니다.<br>데모 관리자 계정으로 로그인해 주세요.</p>
        <button class="btn btn-primary" onclick="showLoginModal()">로그인</button>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="admin-page">
      <div class="admin-header">
        <div>
          <h2>🛡 관리자 대시보드</h2>
          <p>게시물 수정/삭제, IP 확인, 게시자 확인, 비밀번호 변경, 유저 관리를 한 화면에서 처리합니다.</p>
        </div>
        <button class="btn btn-ghost" id="adminRefresh">새로고침</button>
      </div>

      <div id="adminStats" class="admin-stats">로딩 중...</div>

      <section class="admin-panel">
        <div class="panel-head">
          <h3>게시물 관리</h3>
          <span>최근 100개</span>
        </div>
        <div id="adminPosts" class="admin-table-wrap">로딩 중...</div>
      </section>

      <section class="admin-panel">
        <div class="panel-head">
          <h3>유저 관리</h3>
          <span>권한, 차단, 비밀번호 변경</span>
        </div>
        <div id="adminUsers" class="admin-table-wrap">로딩 중...</div>
      </section>
    </div>
  `;

  const load = async () => {
    const [overviewData, postsData, usersData] = await Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/posts?limit=100'),
      api('/api/admin/users'),
    ]);

    $('#adminStats').innerHTML = Object.entries(overviewData.overview).map(([key, value]) => `
      <div class="stat-card">
        <span>${adminStatLabel(key)}</span>
        <strong>${Number(value).toLocaleString()}</strong>
      </div>
    `).join('');

    renderAdminPosts(postsData.posts, load);
    renderAdminUsers(usersData.users, load);
  };

  $('#adminRefresh').addEventListener('click', load);

  try {
    await load();
  } catch (e) {
    app.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function adminStatLabel(key) {
  return {
    posts: '게시물',
    comments: '댓글',
    users: '유저',
    reports: '신고',
    chats: '채팅',
  }[key] || key;
}

function renderAdminPosts(posts, reload) {
  $('#adminPosts').innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>게시판</th>
          <th>제목</th>
          <th>게시자</th>
          <th>IP</th>
          <th>조회</th>
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        ${posts.map((post) => `
          <tr>
            <td>${post.id}</td>
            <td>${esc(post.board_id)}</td>
            <td class="admin-title">${esc(post.title)}</td>
            <td>${esc(post.author)}</td>
            <td><code>${esc(post.author_ip || '기록 없음')}</code></td>
            <td>${post.views}</td>
            <td class="admin-actions">
              <button class="btn btn-ghost admin-edit-post" data-id="${post.id}">수정</button>
              <button class="btn btn-danger admin-delete-post" data-id="${post.id}">삭제</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('.admin-edit-post').forEach((btn) => {
    btn.addEventListener('click', () => {
      const post = posts.find((item) => String(item.id) === btn.dataset.id);
      showAdminPostModal(post, reload);
    });
  });

  document.querySelectorAll('.admin-delete-post').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 게시물을 삭제할까요?')) return;
      await api(`/api/admin/posts/${btn.dataset.id}`, { method: 'DELETE' });
      reload();
    });
  });
}

async function showAdminPostModal(post, reload) {
  const detail = await api(`/api/posts/${post.id}`);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box admin-edit-modal">
      <h3>게시물 수정</h3>
      <div class="form-group">
        <label>게시판</label>
        <select id="adminEditBoard">
          ${boards.map((board) => `<option value="${attr(board.id)}" ${board.id === detail.post.board_id ? 'selected' : ''}>${esc(board.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>게시자</label>
        <input id="adminEditAuthor" value="${attr(detail.post.author)}" maxlength="20" />
      </div>
      <div class="form-group">
        <label>제목</label>
        <input id="adminEditTitle" value="${attr(detail.post.title)}" maxlength="100" />
      </div>
      <div class="form-group">
        <label>내용</label>
        <textarea id="adminEditContent" maxlength="10000">${esc(detail.post.content)}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="adminEditCancel">취소</button>
        <button class="btn btn-primary" id="adminEditSave">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#adminEditCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#adminEditSave').addEventListener('click', async () => {
    await api(`/api/admin/posts/${post.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        board_id: overlay.querySelector('#adminEditBoard').value,
        author: overlay.querySelector('#adminEditAuthor').value,
        title: overlay.querySelector('#adminEditTitle').value,
        content: overlay.querySelector('#adminEditContent').value,
      }),
    });
    overlay.remove();
    reload();
  });
}

function renderAdminUsers(users, reload) {
  $('#adminUsers').innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>사용자</th>
          <th>계정</th>
          <th>이메일</th>
          <th>권한</th>
          <th>상태</th>
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => `
          <tr>
            <td>${user.id}</td>
            <td>${esc(user.username)}</td>
            <td>${esc(user.account_name)}</td>
            <td>${esc(user.email)}</td>
            <td>
              <select class="admin-user-role" data-id="${user.id}">
                <option value="user" ${user.role !== 'admin' ? 'selected' : ''}>일반</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>관리자</option>
              </select>
            </td>
            <td>
              <select class="admin-user-status" data-id="${user.id}">
                <option value="active" ${user.status !== 'blocked' ? 'selected' : ''}>활성</option>
                <option value="blocked" ${user.status === 'blocked' ? 'selected' : ''}>차단</option>
              </select>
            </td>
            <td class="admin-actions">
              <button class="btn btn-ghost admin-password-user" data-id="${user.id}">비번 변경</button>
              <button class="btn btn-danger admin-delete-user" data-id="${user.id}" ${currentUser.id === user.id ? 'disabled' : ''}>삭제</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const patchUser = async (id) => {
    const role = document.querySelector(`.admin-user-role[data-id="${id}"]`).value;
    const status = document.querySelector(`.admin-user-status[data-id="${id}"]`).value;
    await api(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role, status }),
    });
    reload();
  };

  document.querySelectorAll('.admin-user-role, .admin-user-status').forEach((select) => {
    select.addEventListener('change', () => patchUser(select.dataset.id));
  });

  document.querySelectorAll('.admin-password-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const password = prompt('새 비밀번호를 입력하세요 (6자 이상)');
      if (!password) return;
      await api(`/api/admin/users/${btn.dataset.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      alert('비밀번호가 변경되었습니다.');
    });
  });

  document.querySelectorAll('.admin-delete-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || !confirm('이 유저를 삭제할까요?')) return;
      await api(`/api/admin/users/${btn.dataset.id}`, { method: 'DELETE' });
      reload();
    });
  });
}

// ── 삭제 모달 ──
function showDeleteModal(type, id, redirectParam) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>🔒 비밀번호 확인</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">
        ${type === 'post' ? '글' : '댓글'}을 삭제하려면 비밀번호를 입력하세요.
      </p>
      <input type="password" id="delPassword" placeholder="비밀번호" />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="delCancel">취소</button>
        <button class="btn btn-danger" id="delConfirm">삭제</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#delCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#delConfirm').addEventListener('click', async () => {
    const password = overlay.querySelector('#delPassword').value;
    try {
      if (type === 'post') {
        await api(`/api/posts/${id}/delete`, {
          method: 'POST',
          body: JSON.stringify({ password }),
        });
        overlay.remove();
        navigate(`/board/${redirectParam}`);
      } else {
        await api(`/api/comments/${id}/delete`, {
          method: 'POST',
          body: JSON.stringify({ password }),
        });
        overlay.remove();
        // 해당 댓글만 DOM에서 제거
        document.querySelector(`.comment-item:has(.comment-delete[data-id="${id}"])`).remove();
      }
    } catch (e) {
      alert(e.message);
    }
  });
}

// ── 사용자 인증 ──
function renderAuth() {
  if (currentUser) {
    headerAuth.innerHTML = `
      <div class="auth-menu">
        <span class="user-name">${isAdmin() ? '🛡 ' : ''}${esc(currentUser.username)}</span>
        <button class="btn btn-ghost" onclick="logout()">로그아웃</button>
      </div>
    `;
  } else {
    headerAuth.innerHTML = `
      <div class="auth-menu">
        <button class="btn btn-ghost" onclick="showLoginModal()">로그인</button>
        <button class="btn btn-primary" onclick="showSignupModal()">회원가입</button>
      </div>
    `;
  }
}

function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  renderAuth();
  renderNav();
  navigate('/');
  route();
}

function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  // 김하담: 계정이름으로 로그인하도록 변경
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔐 로그인</h3>
      <div class="form-group">
        <label>계정이름</label>
        <input id="loginAccountName" placeholder="계정이름을 입력하세요 (영어/숫자)" />
      </div>
      <div class="form-group">
        <label>비밀번호</label>
        <input id="loginPassword" type="password" placeholder="비밀번호를 입력하세요" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="loginCancel">취소</button>
        <button class="btn btn-primary" id="loginSubmit">로그인</button>
      </div>
      <p style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:12px">
        계정이 없으신가요? <a href="#" id="openSignupFromLogin" style="color:var(--primary);font-weight:bold">회원가입</a>
      </p>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#loginCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#openSignupFromLogin').addEventListener('click', (e) => {
    e.preventDefault();
    modal.remove();
    showSignupModal();
  });

  modal.querySelector('#loginSubmit').addEventListener('click', async () => {
    // 김하담: account_name으로 변경
    const account_name = modal.querySelector('#loginAccountName').value;
    const password = modal.querySelector('#loginPassword').value;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account_name, password }),
      });
      currentUser = { ...data.user, token: data.token };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      modal.remove();
      renderAuth();
      renderNav();
      route();
    } catch (e) {
      alert(e.message);
    }
  });
}

function showSignupModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  // 김하담: 계정이름 필드 추가
  modal.innerHTML = `
    <div class="modal-box">
      <h3>📝 계정 만들기</h3>
      <div class="form-group">
        <label>사용자명</label>
        <input id="signupUsername" placeholder="사용자명을 입력하세요" maxlength="20" />
      </div>
      <div class="form-group">
        <label>계정이름</label>
        <input id="signupAccountName" placeholder="계정이름을 입력하세요 (영어/숫자, 3-20자)" maxlength="20" />
      </div>
      <div class="form-group">
        <label>이메일</label>
        <input id="signupEmail" type="email" placeholder="이메일을 입력하세요" />
      </div>
      <div class="form-group">
        <label>비밀번호</label>
        <input id="signupPassword" type="password" placeholder="비밀번호를 입력하세요" />
      </div>
      <div class="form-group">
        <label>비밀번호 확인</label>
        <input id="signupPasswordConfirm" type="password" placeholder="비밀번호를 다시 입력하세요" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="signupCancel">취소</button>
        <button class="btn btn-primary" id="signupSubmit">가입</button>
      </div>
      <p style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:12px">
        이미 계정이 있으신가요? <a href="#" id="openLoginFromSignup" style="color:var(--primary);font-weight:bold">로그인</a>
      </p>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#signupCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#openLoginFromSignup').addEventListener('click', (e) => {
    e.preventDefault();
    modal.remove();
    showLoginModal();
  });

  modal.querySelector('#signupSubmit').addEventListener('click', async () => {
    const username = modal.querySelector('#signupUsername').value;
    // 김하담: 계정이름 입력값
    const account_name = modal.querySelector('#signupAccountName').value;
    const email = modal.querySelector('#signupEmail').value;
    const password = modal.querySelector('#signupPassword').value;
    const passwordConfirm = modal.querySelector('#signupPasswordConfirm').value;

    if (!username || !account_name || !email || !password || !passwordConfirm) {
      alert('모든 필드를 입력해주세요');
      return;
    }
    // 김하담: 계정이름 영어/숫자 검증
    if (!/^[a-zA-Z0-9]+$/.test(account_name)) {
      alert('계정이름은 영어와 숫자만 사용 가능합니다. 다시 입력해주세요');
      return;
    }
    if (account_name.length < 3 || account_name.length > 20) {
      alert('계정이름은 3자 이상 20자 이하여야 합니다');
      return;
    }
    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    try {
      // 김하담: account_name 데이터 전송
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, account_name, email, password }),
      });
      currentUser = { ...data.user, token: data.token };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      modal.remove();
      renderAuth();
      renderNav();
      alert('가입되었습니다!');
    } catch (e) {
      alert(e.message);
    }
  });
}
