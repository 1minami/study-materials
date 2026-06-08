(function() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const main = document.querySelector('.main');
  const backTop = document.querySelector('.back-top');
  const isMobile = () => window.innerWidth <= 768;

  // --- Sidebar toggle ---
  window.toggleSidebar = function() {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  window.closeSidebar = function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  };

  main.addEventListener('click', () => { if (isMobile()) closeSidebar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

  // Close sidebar on TOC link click (mobile)
  sidebar.querySelectorAll('.toc-section a').forEach(a => {
    a.addEventListener('click', () => { if (isMobile()) closeSidebar(); });
  });

  // --- Touch swipe gestures ---
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dy > 60) return; // vertical swipe, ignore
    if (dx > 60 && touchStartX < 40 && !sidebar.classList.contains('open')) {
      toggleSidebar();
    } else if (dx < -60 && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  }, { passive: true });

  // --- Back to top button ---
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  // --- Table horizontal scroll wrapper ---
  function wrapTables() {
    document.querySelectorAll('.chapter table:not(.wrapped)').forEach(table => {
      table.classList.add('wrapped');
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
      checkTableOverflow(wrap);
    });
  }
  function checkTableOverflow(wrap) {
    wrap.classList.toggle('scrollable', wrap.scrollWidth > wrap.clientWidth + 2);
  }
  function recheckAllTables() {
    document.querySelectorAll('.table-wrap').forEach(checkTableOverflow);
  }
  wrapTables();
  window.addEventListener('resize', recheckAllTables);

  // --- Notes panel ---
  const noteChapterName = document.getElementById('note-chapter-name');
  const noteTextarea = document.getElementById('note-textarea');
  const noteStatus = document.getElementById('note-status');
  let currentNoteId = null;
  let saveTimer = null;

  function loadNote(chapterId, chapterTitle) {
    // Save current note before switching
    if (currentNoteId && noteTextarea) {
      saveNote(currentNoteId);
    }
    currentNoteId = chapterId;
    if (noteChapterName) noteChapterName.textContent = chapterTitle || '—';
    if (noteTextarea) {
      noteTextarea.value = localStorage.getItem('takken-note-' + chapterId) || '';
      noteTextarea.disabled = false;
    }
    if (noteStatus) noteStatus.textContent = '';
  }

  function saveNote(chapterId) {
    if (!chapterId || !noteTextarea) return;
    const val = noteTextarea.value;
    if (val) {
      localStorage.setItem('takken-note-' + chapterId, val);
    } else {
      localStorage.removeItem('takken-note-' + chapterId);
    }
  }

  if (noteTextarea) {
    noteTextarea.addEventListener('input', () => {
      if (noteStatus) noteStatus.textContent = '';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveNote(currentNoteId);
        if (noteStatus) {
          noteStatus.textContent = '保存しました';
          setTimeout(() => { noteStatus.textContent = ''; }, 2000);
        }
      }, 500);
    });
  }

  // --- Random Quiz ---
  const QUIZ_SIZE = 10;
  const quizOverlay = document.getElementById('quiz-overlay');
  const quizBody = document.getElementById('quiz-body');
  const quizProgress = document.getElementById('quiz-progress');
  const quizNextBtn = document.getElementById('quiz-next-btn');
  const quizTextbookIframe = document.getElementById('quiz-textbook-iframe');
  const SECTION_TO_ID = {"37条書面":"09-宅建業法②業務規制-16","8種制限（自ら売主制限）":"10-宅建業法③報酬・監督-2","その他の法令上の制限":"00-試験概要-7","その他の税（国税・地方税の横断整理）":"17-税・価格-1","クーリング・オフ":"09-宅建業法②業務規制-27","不動産取得税":"17-税・価格-2","不動産登記法":"07-不動産登記法-1","不動産鑑定評価基準":"17-税・価格-33","不法行為・使用者責任":"03-民法債権-30","代理":"01-民法総則-12","住宅瑕疵担保履行法":"10-宅建業法③報酬・監督-22","借地借家法":"05-借地借家法-1","債務不履行・契約不適合責任":"03-民法債権-2","免許制度":"08-宅建業法①総則・免許-7","区分所有法":"06-区分所有法-1","印紙税":"17-税・価格-25","営業保証金・保証協会":"08-宅建業法①総則・免許-17","固定資産税":"17-税・価格-9","国土利用計画法":"13-国土利用計画法-1","土地区画整理法":"15-土地区画整理法-1","地価公示法":"17-税・価格-30","報酬に関する制限":"10-宅建業法③報酬・監督-11","媒介契約":"09-宅建業法②業務規制-6","宅地建物取引士":"00-試験概要-1","宅地造成等規制法（盛土規制法）":"16-盛土規制法-1","広告・その他の業務規制":"09-宅建業法②業務規制-23","建築基準法 ─ 建蔽率・容積率":"12-建築基準法-11","建築基準法 ─ 用途制限・道路・その他":"12-建築基準法-10","意思表示":"01-民法総則-5","所得税（譲渡所得）":"17-税・価格-15","抵当権":"02-民法物権-22","時効":"01-民法総則-19","物権変動":"02-民法物権-2","登録免許税":"17-税・価格-22","監督処分・罰則":"10-宅建業法③報酬・監督-18","相続":"04-民法親族相続-1","賃貸借":"03-民法債権-12","贈与税・相続税（税制改正関連）":"17-税・価格-1","農地法":"14-農地法-1","都市計画法 ─ 都市計画の内容":"11-都市計画法-1","都市計画法 ─ 開発許可制度":"11-都市計画法-7","重要事項説明（35条書面）":"09-宅建業法②業務規制-9"};
  let quizTextbookLoaded = false;
  let quizPool = null;
  let quizSet = [];
  let quizIdx = 0;
  let quizScore = 0;
  let quizAnswered = false;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function loadQuizPool() {
    if (quizPool) return quizPool;
    try {
      const res = await fetch('quiz.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      quizPool = await res.json();
    } catch (e) {
      quizPool = [];
      console.error('quiz.json load failed:', e);
    }
    return quizPool;
  }

  function updateTextbookPane(section) {
    if (!quizTextbookIframe) return;
    const anchorId = SECTION_TO_ID[section];
    if (!anchorId) return;
    const url = 'index.html#' + encodeURIComponent(anchorId);
    if (!quizTextbookLoaded) {
      quizTextbookIframe.src = url;
      quizTextbookLoaded = true;
    } else {
      try {
        const iframeDoc = quizTextbookIframe.contentDocument || quizTextbookIframe.contentWindow.document;
        const el = iframeDoc.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          quizTextbookIframe.src = url;
        }
      } catch (e) {
        quizTextbookIframe.src = url;
      }
    }
  }

  function renderQuestion() {
    const q = quizSet[quizIdx];
    quizAnswered = false;
    quizNextBtn.disabled = true;
    quizNextBtn.textContent = (quizIdx === quizSet.length - 1) ? '結果を見る ▶' : '次の問題 ▶';
    quizProgress.textContent = `${quizIdx + 1} / ${quizSet.length}（正解 ${quizScore}）`;

    const meta = `<div class="quiz-meta"><span class="quiz-q-num">Q${quizIdx + 1}</span><span class="quiz-chapter">${escapeHtml(q.category)} ／ ${escapeHtml(q.section || '')} ／ ${escapeHtml(q.source)}</span></div>`;
    const qtext = `<div class="quiz-question">${escapeHtml(q.question).replace(/\n/g, '<br>')}</div>`;
    const choices = q.choices.map((c, i) => {
      const n = i + 1;
      return `<button type="button" class="quiz-choice" data-n="${n}"><span class="quiz-choice-num">${n}</span><span class="quiz-choice-text">${escapeHtml(c)}</span></button>`;
    }).join('');
    quizBody.innerHTML = meta + qtext + `<div class="quiz-choices">${choices}</div><div class="quiz-explanation" id="quiz-explanation" hidden></div>`;

    quizBody.querySelectorAll('.quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => answerQuestion(parseInt(btn.dataset.n, 10)));
    });
    quizBody.scrollTop = 0;
  }

  function answerQuestion(n) {
    if (quizAnswered) return;
    quizAnswered = true;
    const q = quizSet[quizIdx];
    const correct = q.answer;
    const isCorrect = (n === correct);
    if (isCorrect) quizScore++;

    quizBody.querySelectorAll('.quiz-choice').forEach(btn => {
      const v = parseInt(btn.dataset.n, 10);
      btn.disabled = true;
      if (v === correct) btn.classList.add('correct');
      else if (v === n) btn.classList.add('wrong');
    });

    const expl = document.getElementById('quiz-explanation');
    const verdict = isCorrect
      ? '<span class="quiz-verdict ok">○ 正解</span>'
      : `<span class="quiz-verdict ng">× 不正解（正解: ${correct}）</span>`;
    expl.innerHTML = verdict + `<div class="quiz-explanation-body">${escapeHtml(q.explanation || '').replace(/\n/g, '<br>')}</div>`;
    expl.hidden = false;

    quizProgress.textContent = `${quizIdx + 1} / ${quizSet.length}（正解 ${quizScore}）`;
    quizNextBtn.disabled = false;
    updateTextbookPane(q.section);
  }

  function showResult() {
    const total = quizSet.length;
    const pct = total ? Math.round((quizScore / total) * 100) : 0;
    quizProgress.textContent = `終了`;
    quizBody.innerHTML = `
      <div class="quiz-score">スコア ${quizScore} / ${total}（正答率 ${pct}%）</div>
    `;
    quizNextBtn.disabled = true;
    quizNextBtn.textContent = '次の問題 ▶';
  }

  window.nextQuiz = function() {
    if (!quizAnswered) return;
    if (quizIdx >= quizSet.length - 1) {
      showResult();
      return;
    }
    quizIdx++;
    renderQuestion();
    if (quizTextbookIframe) quizTextbookIframe.contentDocument?.documentElement?.replaceChildren();
  };

  window.openQuiz = async function() {
    quizOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    quizBody.innerHTML = '<div class="quiz-empty">読み込み中…</div>';
    quizProgress.textContent = '';
    quizNextBtn.disabled = true;

    const pool = await loadQuizPool();
    if (!pool || pool.length === 0) {
      quizBody.innerHTML = '<div class="quiz-empty">問題データが見つからない。<br>quiz.json を確認。</div>';
      return;
    }
    quizSet = shuffle(pool).slice(0, Math.min(QUIZ_SIZE, pool.length));
    quizIdx = 0;
    quizScore = 0;
    renderQuestion();
  };

  window.closeQuiz = function(e) {
    if (e && e.target && !e.target.classList.contains('quiz-overlay')) return;
    quizOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    if (quizTextbookIframe) {
      quizTextbookIframe.removeAttribute('src');
      quizTextbookLoaded = false;
    }
  };

  // --- Fill-in-blank Quiz ---
  const FILLIN_SIZE_DEFAULT = 10;
  const fillinOverlay = document.getElementById('fillin-overlay');
  const fillinBody = document.getElementById('fillin-body');
  const fillinProgress = document.getElementById('fillin-progress');
  const fillinSubmitBtn = document.getElementById('fillin-submit-btn');
  const fillinNextBtn = document.getElementById('fillin-next-btn');
  let fillinPool = null;
  let fillinSet = [];
  let fillinIdx = 0;
  let fillinScore = 0;
  let fillinAnswered = false;
  let fillinSize = FILLIN_SIZE_DEFAULT;
  let fillinSelectedCats = null;

  // 答え揺らぎ吸収: NFKC正規化 + 空白/記号除去 + カナ→ひらがな統一 + 小文字化
  function normAns(s) {
    return String(s == null ? '' : s)
      .normalize('NFKC')
      .replace(/[\s　、，,・･]+/g, '')
      .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .toLowerCase();
  }

  // Markdown軽量変換: **bold** / `code` / リスト・改行を許容
  function paragraphToHtml(p, answer, masked) {
    const lines = p.split('\n');
    return lines.map(line => {
      let html = escapeHtml(line);
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\*\*([^*]+?)\*\*/g, function(_, inner) {
        if (masked && inner === answer) {
          return '<input type="text" class="fillin-input" autocomplete="off" autocapitalize="off" spellcheck="false">';
        }
        if (!masked && inner === answer) {
          return '<strong class="fillin-answer-hl">' + escapeHtml(inner) + '</strong>';
        }
        return '<strong>' + escapeHtml(inner) + '</strong>';
      });
      const listM = html.match(/^(\s*)(?:[-*]|\d+\.)\s+(.*)$/);
      if (listM) {
        return '<div class="fillin-li">・' + listM[2] + '</div>';
      }
      return '<div class="fillin-line">' + html + '</div>';
    }).join('');
  }

  async function loadFillinPool() {
    if (fillinPool) return fillinPool;
    try {
      const res = await fetch('fillin.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      fillinPool = await res.json();
    } catch (e) {
      fillinPool = [];
      console.error('fillin.json load failed:', e);
    }
    return fillinPool;
  }

  function buildFillinSet(pool) {
    let filtered = pool;
    if (fillinSelectedCats && fillinSelectedCats.size > 0) {
      filtered = pool.filter(q => fillinSelectedCats.has(q.category || ''));
    }
    if (filtered.length === 0) return [];
    return shuffle(filtered).slice(0, Math.min(fillinSize, filtered.length));
  }

  function renderFillin() {
    const q = fillinSet[fillinIdx];
    fillinAnswered = false;
    fillinSubmitBtn.disabled = false;
    fillinSubmitBtn.hidden = false;
    fillinNextBtn.hidden = true;
    fillinNextBtn.disabled = true;
    fillinNextBtn.textContent = (fillinIdx === fillinSet.length - 1) ? '結果を見る ▶' : '次の問題 ▶';
    fillinProgress.textContent = `${fillinIdx + 1} / ${fillinSet.length}（正解 ${fillinScore}）`;

    const path = [q.category, q.chapter, q.section, q.heading].filter(Boolean).map(escapeHtml).join(' ／ ');
    const meta = `<div class="quiz-meta"><span class="quiz-q-num">Q${fillinIdx + 1}</span><span class="quiz-chapter">${path}</span></div>`;
    const hint = q.blank_count > 1
      ? `<div class="fillin-hint">同じ語が ${q.blank_count} 箇所あり。空欄1つに入力すれば全箇所判定。</div>`
      : '';
    const para = `<div class="fillin-paragraph">${paragraphToHtml(q.paragraph, q.answer, true)}</div>`;
    fillinBody.innerHTML = meta + hint + para + `<div class="quiz-explanation" id="fillin-explanation" hidden></div>`;

    const inputs = fillinBody.querySelectorAll('.fillin-input');
    if (inputs.length > 0) {
      inputs[0].focus();
      inputs[0].addEventListener('input', () => {
        const v = inputs[0].value;
        inputs.forEach((el, i) => { if (i > 0) el.value = v; });
      });
      inputs.forEach(el => {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!fillinAnswered) submitFillin();
            else nextFillin();
          }
        });
      });
    }
    fillinBody.scrollTop = 0;
  }

  window.submitFillin = function() {
    if (fillinAnswered) return;
    const q = fillinSet[fillinIdx];
    const inputs = fillinBody.querySelectorAll('.fillin-input');
    if (inputs.length === 0) return;
    const userAns = inputs[0].value;
    const isCorrect = normAns(userAns) === normAns(q.answer);
    fillinAnswered = true;
    if (isCorrect) fillinScore++;

    inputs.forEach(el => {
      el.disabled = true;
      el.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) {
        const tag = document.createElement('span');
        tag.className = 'fillin-answer-correct';
        tag.textContent = ' → ' + q.answer;
        el.parentNode.insertBefore(tag, el.nextSibling);
      }
    });

    const expl = document.getElementById('fillin-explanation');
    const verdict = isCorrect
      ? '<span class="quiz-verdict ok">○ 正解</span>'
      : `<span class="quiz-verdict ng">× 不正解（正解: ${escapeHtml(q.answer)}）</span>`;
    expl.innerHTML = verdict;
    expl.hidden = false;

    fillinProgress.textContent = `${fillinIdx + 1} / ${fillinSet.length}（正解 ${fillinScore}）`;
    fillinSubmitBtn.hidden = true;
    fillinNextBtn.hidden = false;
    fillinNextBtn.disabled = false;
    fillinNextBtn.focus();
  };

  function showFillinResult() {
    const total = fillinSet.length;
    const pct = total ? Math.round((fillinScore / total) * 100) : 0;
    fillinProgress.textContent = `終了`;
    fillinBody.innerHTML = `
      <div class="quiz-score">スコア ${fillinScore} / ${total}（正答率 ${pct}%）</div>
    `;
    fillinSubmitBtn.hidden = true;
    fillinNextBtn.hidden = true;
  }

  window.nextFillin = function() {
    if (!fillinAnswered) return;
    if (fillinIdx >= fillinSet.length - 1) {
      showFillinResult();
      return;
    }
    fillinIdx++;
    renderFillin();
  };

  function renderFillinSetup(pool) {
    // カテゴリ集計
    const catCount = {};
    pool.forEach(q => {
      const c = q.category || '(未分類)';
      catCount[c] = (catCount[c] || 0) + 1;
    });
    const cats = Object.keys(catCount);
    if (!fillinSelectedCats) {
      fillinSelectedCats = new Set(cats);
    }

    const catItems = cats.map(c => {
      const checked = fillinSelectedCats.has(c) ? 'checked' : '';
      return `<label class="fillin-cat"><input type="checkbox" data-cat="${escapeHtml(c)}" ${checked}><span>${escapeHtml(c)} <em>(${catCount[c]})</em></span></label>`;
    }).join('');
    const sizeOpts = [10, 20, 50, 100].map(n => {
      const sel = (n === fillinSize) ? 'selected' : '';
      return `<option value="${n}" ${sel}>${n}問</option>`;
    }).join('');

    fillinBody.innerHTML = `
      <div class="fillin-setup">
        <div class="fillin-setup-section">
          <div class="fillin-setup-label">出題範囲（カテゴリ）</div>
          <div class="fillin-setup-actions">
            <button type="button" class="quiz-btn fillin-btn-mini" id="fillin-cat-all">全選択</button>
            <button type="button" class="quiz-btn fillin-btn-mini" id="fillin-cat-none">全解除</button>
          </div>
          <div class="fillin-cats">${catItems}</div>
        </div>
        <div class="fillin-setup-section">
          <div class="fillin-setup-label">問題数</div>
          <select id="fillin-size-select" class="fillin-size-select">${sizeOpts}</select>
        </div>
        <div class="fillin-setup-section fillin-setup-start">
          <button type="button" class="quiz-btn quiz-btn-primary" id="fillin-start-btn">開始 ▶</button>
        </div>
      </div>
    `;

    fillinBody.querySelectorAll('input[type=checkbox][data-cat]').forEach(cb => {
      cb.addEventListener('change', () => {
        const c = cb.getAttribute('data-cat');
        if (cb.checked) fillinSelectedCats.add(c);
        else fillinSelectedCats.delete(c);
      });
    });
    fillinBody.querySelector('#fillin-cat-all').addEventListener('click', () => {
      fillinSelectedCats = new Set(cats);
      renderFillinSetup(pool);
    });
    fillinBody.querySelector('#fillin-cat-none').addEventListener('click', () => {
      fillinSelectedCats = new Set();
      renderFillinSetup(pool);
    });
    fillinBody.querySelector('#fillin-size-select').addEventListener('change', (e) => {
      fillinSize = parseInt(e.target.value, 10) || FILLIN_SIZE_DEFAULT;
    });
    fillinBody.querySelector('#fillin-start-btn').addEventListener('click', () => startFillin(pool));
  }

  function startFillin(pool) {
    fillinSet = buildFillinSet(pool);
    if (fillinSet.length === 0) {
      fillinBody.innerHTML = '<div class="quiz-empty">該当問題なし。<br>カテゴリ選択を見直してくれ。</div>';
      fillinSubmitBtn.hidden = true;
      fillinNextBtn.hidden = true;
      return;
    }
    fillinIdx = 0;
    fillinScore = 0;
    fillinSubmitBtn.hidden = false;
    fillinSubmitBtn.disabled = false;
    renderFillin();
  }

  window.openFillin = async function() {
    fillinOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    fillinBody.innerHTML = '<div class="quiz-empty">読み込み中…</div>';
    fillinProgress.textContent = '設定';
    fillinSubmitBtn.hidden = true;
    fillinNextBtn.hidden = true;

    const pool = await loadFillinPool();
    if (!pool || pool.length === 0) {
      fillinBody.innerHTML = '<div class="quiz-empty">穴埋め問題が見つからない。<br>fillin.json を確認。</div>';
      return;
    }
    renderFillinSetup(pool);
  };

  window.closeFillin = function(e) {
    if (e && e.target && !e.target.classList.contains('quiz-overlay')) return;
    fillinOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  };

  // --- Active TOC highlight + Notes sync ---
  const tocLinks = document.querySelectorAll('.toc-section li a');
  const chapters = document.querySelectorAll('.chapter');
  const tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector('.toc-section li a[href="#' + e.target.id + '"]');
        if (link) {
          link.classList.add('active');
          link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        // Update notes panel
        const h2 = e.target.querySelector('h2');
        const title = h2 ? h2.textContent : e.target.id;
        loadNote(e.target.id, title);
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
  chapters.forEach(ch => tocObserver.observe(ch));
})();
