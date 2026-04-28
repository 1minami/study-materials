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
  const quizRetryBtn = document.getElementById('quiz-retry-btn');
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
  }

  function showResult() {
    const total = quizSet.length;
    const pct = total ? Math.round((quizScore / total) * 100) : 0;
    quizProgress.textContent = `終了`;
    quizBody.innerHTML = `
      <div class="quiz-score">スコア ${quizScore} / ${total}（正答率 ${pct}%）</div>
      <div class="quiz-result-msg">「もう10問」で再挑戦できる。</div>
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
