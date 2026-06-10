/* 전주영생고등학교 커뮤니티 미니게임 (타깃 + 지뢰찾기)
   - '타깃'은 기존 동작 유지
   - '지뢰찾기'는 9x9(10지뢰) 기본 모드, 첫 클릭 안전, 타이머, 깃발, 승리/패배 처리
*/
(function () {
  const TARGET_HIGH_KEY = 'youngsaeng_target_high';
  const MEMORY_HIGH_KEY = 'youngsaeng_memory_best';

  const $ = (selector, root = document) => root.querySelector(selector);

  function getNumber(key, fallback = 0) {
    return Number(localStorage.getItem(key) || fallback);
  }

  function setNumber(key, value) {
    localStorage.setItem(key, String(value));
  }

  function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay game-modal';
    const T = (k) => (window.t ? window.t(k) : '');
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="game-shell">
          <aside class="game-side">
            <h3>${T('miniGameTitle') || '🎮 미니게임'}</h3>
            <div class="game-tabs">
              <button class="btn btn-primary" id="targetMode">${T('tabTarget') || '타깃'}</button>
              <button class="btn btn-ghost" id="memoryMode">${T('tabMemory') || '지뢰찾기'}</button>
            </div>
            <div class="game-hud">
              <div class="game-score" id="gameScore">${T('score') ? T('score') + ' 0' : '점수: 0'}</div>
              <div class="game-timer" id="gameTimer">${T('timer') || '남은시간: 30'}</div>
            </div>
            <p class="game-note" id="gameNote">${T('note_target') || '움직이는 원을 클릭해 점수를 올리세요.'}</p>
            <div class="game-controls">
              <button class="btn btn-primary" id="gameStart">${T('start') || '시작'}</button>
              <button class="btn btn-ghost" id="gameClose">${T('close') || '닫기'}</button>
            </div>
            <div class="game-best" id="gameBest">${T('best_prefix') ? T('best_prefix') + ' 0' : '최고 기록: 0'}</div>
          </aside>
          <section class="game-main" id="gameMain"></section>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openGame() {
    const modal = createModal();
    const state = { mode: 'target', interval: null, frame: null };

    function cleanup() {
      if (state.interval) { clearInterval(state.interval); state.interval = null; }
      if (state.frame) { cancelAnimationFrame(state.frame); state.frame = null; }
    }

    function setMode(mode) {
      cleanup();
      state.mode = mode;
      $('#targetMode', modal).classList.toggle('btn-primary', mode === 'target');
      $('#targetMode', modal).classList.toggle('btn-ghost', mode !== 'target');
      $('#memoryMode', modal).classList.toggle('btn-primary', mode === 'memory');
      $('#memoryMode', modal).classList.toggle('btn-ghost', mode !== 'memory');
      $('#gameScore', modal).textContent = '점수: 0';
      // timer / note / best text per mode (use translations if available)
      if (mode === 'target') {
        $('#gameTimer', modal).textContent = window.t ? (window.t('note_target_timer') || '남은시간: 30') : '남은시간: 30';
        $('#gameNote', modal).textContent = window.t ? (window.t('note_target') || '움직이는 원을 클릭해 점수를 올리세요.') : '움직이는 원을 클릭해 점수를 올리세요.';
        $('#gameBest', modal).textContent = `${window.t ? (window.t('best_prefix') || '최고 기록:') : '최고 기록:'} ${getNumber(TARGET_HIGH_KEY)}${window.t? '' : '점'}`;
        $('#gameMain', modal).innerHTML = '<canvas class="game-canvas" width="620" height="380"></canvas>';
      } else {
        $('#gameTimer', modal).textContent = window.t ? (window.t('timer') || '시간: 0s') : '시간: 0s';
        $('#gameNote', modal).textContent = window.t ? (window.t('note_memory') || '지뢰찾기를 플레이하세요. 왼쪽클릭: 열기, 오른쪽클릭: 깃발.') : '지뢰찾기를 플레이하세요. 왼쪽클릭: 열기, 오른쪽클릭: 깃발.';
        $('#gameBest', modal).textContent = `${window.t ? (window.t('best_prefix') || '최고 기록:') : '최고 기록:'} ${getNumber(MEMORY_HIGH_KEY, 0) || '-'}${window.t? '' : '초'}`;
        $('#gameMain', modal).innerHTML = '<div class="minesweeper-board"></div>';
      }
    }

    $('#targetMode', modal).addEventListener('click', () => setMode('target'));
    $('#memoryMode', modal).addEventListener('click', () => setMode('memory'));
    $('#gameStart', modal).addEventListener('click', () => {
      if (state.mode === 'target') startTarget(modal, state, cleanup);
      else startMemory(modal, state, cleanup);
    });
    $('#gameClose', modal).addEventListener('click', () => { cleanup(); modal.remove(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { cleanup(); modal.remove(); } });

    setMode('target');
  }

  // --- Target game (unchanged) ---
  function startTarget(modal, state, cleanup) {
    cleanup();
    const main = $('#gameMain', modal);
    main.innerHTML = '<canvas class="game-canvas" width="620" height="380"></canvas>';
    const canvas = $('canvas', main);
    const ctx = canvas.getContext('2d');
    const scoreEl = $('#gameScore', modal);
    const timerEl = $('#gameTimer', modal);
    const bestEl = $('#gameBest', modal);
    const targets = [];
    let score = 0;
    let timeLeft = 30;
    let lastSpawn = 0;

    function spawn(now) {
      targets.push({
        x: 36 + Math.random() * (canvas.width - 72),
        y: 36 + Math.random() * (canvas.height - 72),
        r: 18 + Math.random() * 18,
        created: now,
        ttl: 900 + Math.random() * 800,
      });
    }

    function draw(now) {
      if (now - lastSpawn > Math.max(260, 850 - score * 8)) {
        spawn(now);
        lastSpawn = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0f766e');
      gradient.addColorStop(0.55, '#1d4ed8');
      gradient.addColorStop(1, '#4338ca');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = targets.length - 1; i >= 0; i -= 1) {
        const target = targets[i];
        const age = now - target.created;
        if (age > target.ttl) { targets.splice(i, 1); continue; }
        const alpha = 1 - age / target.ttl;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(252, 211, 77, ${0.92 * alpha})`;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
        ctx.stroke();
      }

      state.frame = requestAnimationFrame(draw);
    }

    canvas.onclick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      for (let i = targets.length - 1; i >= 0; i -= 1) {
        const target = targets[i];
        const dx = x - target.x;
        const dy = y - target.y;
        if (dx * dx + dy * dy <= target.r * target.r) {
          score += Math.max(10, Math.round(44 - target.r));
          targets.splice(i, 1);
          scoreEl.textContent = `점수: ${score}`;
          break;
        }
      }
    };

    timerEl.textContent = `남은시간: ${timeLeft}`;
    state.interval = setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = `남은시간: ${timeLeft}`;
      if (timeLeft <= 0) {
        cleanup();
        const best = Math.max(getNumber(TARGET_HIGH_KEY), score);
        setNumber(TARGET_HIGH_KEY, best);
        bestEl.textContent = `최고 기록: ${best}점`;
        $('#gameNote', modal).textContent = `게임 종료! 점수 ${score}점`;
      }
    }, 1000);
    state.frame = requestAnimationFrame(draw);
  }

  // --- Minesweeper mode (replaces previous memory mode) ---
  function startMemory(modal, state, cleanup) {
    cleanup();
    const rows = 9, cols = 9, mines = 10;
    const total = rows * cols;
    let board = [];
    let started = false;
    let revealedCount = 0;
    let flags = 0;
    let seconds = 0;

    function makeBoard() {
      board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })));
    }

    function inBounds(r, c) { return r >= 0 && r < rows && c >= 0 && c < cols; }

    function forNeighbors(r, c, fn) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) fn(nr, nc);
      }
    }

    function placeMines(firstR, firstC) {
      const forbidden = new Set();
      forbidden.add(`${firstR}:${firstC}`);
      forNeighbors(firstR, firstC, (r,c) => forbidden.add(`${r}:${c}`));
      let placed = 0;
      while (placed < mines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (forbidden.has(`${r}:${c}`)) continue;
        if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
      }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let cnt = 0; forNeighbors(r,c,(nr,nc)=>{ if (board[nr][nc].mine) cnt++; });
        board[r][c].adj = cnt;
      }
    }

    function render() {
      const main = $('#gameMain', modal);
      main.innerHTML = `
        <div class="ms-top">
          <div class="ms-controls">
            <div class="ms-counter" id="msCounter">지뢰: ${mines - flags}</div>
            <div class="ms-timer" id="msTimer">시간: ${seconds}s</div>
            <div style="margin-left:12px"><button class="btn btn-ghost" id="msReset">다시</button></div>
          </div>
        </div>
        <div class="ms-board" id="msBoard" style="grid-template-columns: repeat(${cols}, 34px)"></div>
      `;
      const boardEl = $('#msBoard', main);
      boardEl.innerHTML = '';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = board[r][c];
          const el = document.createElement('div');
          el.className = 'ms-cell' + (cell.revealed ? ' revealed' : '') + (cell.flagged ? ' flagged' : '') + (cell.mine && cell.revealed ? ' mine' : '');
          el.dataset.r = r; el.dataset.c = c;
          if (cell.revealed) {
            if (cell.mine) el.textContent = '💣';
            else if (cell.adj > 0) { el.textContent = cell.adj; el.classList.add('num-' + cell.adj); }
          } else if (cell.flagged) el.textContent = '🚩';
          boardEl.appendChild(el);
        }
      }
      $('#msReset', main).addEventListener('click', () => { cleanup(); startMemory(modal, state, cleanup); });
      $('#msCounter', main).textContent = `지뢰: ${mines - flags}`;
      $('#msTimer', main).textContent = `시간: ${seconds}s`;
    }

    function revealAll(showMineOnLose) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.mine) cell.revealed = true;
      }
      render();
      if (showMineOnLose) {
        const note = $('#gameNote', modal);
        note.textContent = '실패했습니다. 다시 도전하세요.';
        // restart animation
        note.classList.remove('ms-lose');
        void note.offsetWidth;
        note.classList.add('ms-lose');
      }
    }

    function floodReveal(r,c) {
      const stack = [[r,c]];
      while (stack.length) {
        const [cr,cc] = stack.pop();
        const cell = board[cr][cc];
        if (cell.revealed || cell.flagged) continue;
        cell.revealed = true; revealedCount++;
        if (cell.adj === 0) {
          forNeighbors(cr,cc,(nr,nc)=>{ if (!board[nr][nc].revealed) stack.push([nr,nc]); });
        }
      }
    }

    function onLeftClick(r,c) {
      if (!inBounds(r,c)) return;
      const cell = board[r][c];
      if (cell.flagged || cell.revealed) return;
      if (!started) {
        placeMines(r,c); started = true; // start timer
        seconds = 0; state.interval = setInterval(()=>{ seconds++; $('#msTimer', modal).textContent = `시간: ${seconds}s`; }, 1000);
      }
      if (cell.mine) {
        cell.revealed = true; render(); revealAll(true); clearInterval(state.interval); state.interval = null; return;
      }
      if (cell.adj === 0) floodReveal(r,c); else { cell.revealed = true; revealedCount++; }
      render();
      if (revealedCount === total - mines) {
        clearInterval(state.interval); state.interval = null;
        $('#gameNote', modal).textContent = `승리! 시간: ${seconds}s`;
        const prev = getNumber(MEMORY_HIGH_KEY, 0);
        if (!prev || seconds < prev) setNumber(MEMORY_HIGH_KEY, seconds);
        $('#gameBest', modal).textContent = `최고 기록: ${getNumber(MEMORY_HIGH_KEY) || '-'}초`;
      }
    }

    function onRightClick(r,c) {
      if (!inBounds(r,c)) return;
      const cell = board[r][c];
      if (cell.revealed) return;
      cell.flagged = !cell.flagged; flags += cell.flagged ? 1 : -1;
      render();
      $('#msCounter', modal).textContent = `지뢰: ${mines - flags}`;
    }

    makeBoard();
    render();
    // ensure any previous lose animation class is cleared when starting
    const noteEl = $('#gameNote', modal);
    if (noteEl) noteEl.classList.remove('ms-lose');

    const boardRoot = $('#gameMain', modal);
    boardRoot.oncontextmenu = (e) => { e.preventDefault(); const cell = e.target.closest('.ms-cell'); if (!cell) return; onRightClick(Number(cell.dataset.r), Number(cell.dataset.c)); };
    boardRoot.onclick = (e) => { const cell = e.target.closest('.ms-cell'); if (!cell) return; onLeftClick(Number(cell.dataset.r), Number(cell.dataset.c)); };

    // Touch support: short tap = reveal, long press = flag
    let touchTimer = null;
    boardRoot.addEventListener('touchstart', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const cell = el && el.closest('.ms-cell');
      if (!cell) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      // start long-press timer
      touchTimer = setTimeout(() => { touchTimer = null; onRightClick(r, c); }, 600);
    }, { passive: false });

    boardRoot.addEventListener('touchmove', (e) => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    }, { passive: true });

    boardRoot.addEventListener('touchend', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const cell = el && el.closest('.ms-cell');
      if (!cell) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      if (touchTimer) {
        // it was a short tap
        clearTimeout(touchTimer); touchTimer = null;
        onLeftClick(r, c);
      } else {
        // long-press already handled as flag; do not trigger reveal
      }
    }, { passive: false });

    // Desktop: mouse long-press to flag + spacebar to flag focused/hovered cell
    let mouseTimer = null;
    let lastCell = null;
    boardRoot.addEventListener('mouseover', (e) => {
      const cell = e.target.closest && e.target.closest('.ms-cell');
      lastCell = cell || lastCell;
    });
    boardRoot.addEventListener('mouseout', (e) => {
      const cell = e.target.closest && e.target.closest('.ms-cell');
      if (cell && lastCell === cell) lastCell = null;
    });

    boardRoot.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // only left button
      const cell = e.target.closest && e.target.closest('.ms-cell');
      if (!cell) return;
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      mouseTimer = setTimeout(() => {
        mouseTimer = null;
        onRightClick(r, c);
      }, 600);
    });
    boardRoot.addEventListener('mousemove', () => { if (mouseTimer) { clearTimeout(mouseTimer); mouseTimer = null; } });
    boardRoot.addEventListener('mouseup', (e) => {
      if (mouseTimer) {
        clearTimeout(mouseTimer); mouseTimer = null;
        const cell = e.target.closest && e.target.closest('.ms-cell');
        if (!cell) return;
        onLeftClick(Number(cell.dataset.r), Number(cell.dataset.c));
      } else {
        // mouseTimer null means either long-press already fired or no timer
      }
    });

    // keyboard: spacebar toggles flag on last hovered cell; auto-remove when modal closed
    const keyHandler = (ev) => {
      if (!document.body.contains(modal)) { window.removeEventListener('keydown', keyHandler); return; }
      if (ev.code === 'Space' || ev.key === ' ') {
        ev.preventDefault();
        if (!lastCell) return;
        const r = Number(lastCell.dataset.r), c = Number(lastCell.dataset.c);
        onRightClick(r, c);
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  // attach launcher
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('openGameBtn');
    if (button) button.addEventListener('click', openGame);
  });
})();

