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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      if (typeof closeQuiz === 'function') closeQuiz();
      if (typeof closeMarubatsu === 'function') closeMarubatsu();
      if (typeof closeFillin === 'function') closeFillin();
    }
  });

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
    // 一問一答モーダル表示中の横スワイプは回答操作。サイドバーは開閉しない
    if (mbOverlay && mbOverlay.classList.contains('visible')) return;
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
  const quizTextbookPane = document.getElementById('quiz-textbook-pane');
  const SECTION_TO_ID = {"37条書面":"09-宅建業法②業務規制-16","8種制限（自ら売主制限）":"10-宅建業法③報酬・監督-2","その他の法令上の制限":"00-試験概要-7","その他の税（国税・地方税の横断整理）":"17-税・価格-1","クーリング・オフ":"09-宅建業法②業務規制-27","不動産取得税":"17-税・価格-2","不動産登記法":"07-不動産登記法-1","不動産鑑定評価基準":"17-税・価格-33","不法行為・使用者責任":"03-民法債権-30","代理":"01-民法総則-12","住宅瑕疵担保履行法":"10-宅建業法③報酬・監督-22","借地借家法":"05-借地借家法-1","債務不履行・契約不適合責任":"03-民法債権-2","免許制度":"08-宅建業法①総則・免許-7","区分所有法":"06-区分所有法-1","印紙税":"17-税・価格-25","営業保証金・保証協会":"08-宅建業法①総則・免許-17","固定資産税":"17-税・価格-9","国土利用計画法":"13-国土利用計画法-1","土地区画整理法":"15-土地区画整理法-1","地価公示法":"17-税・価格-30","報酬に関する制限":"10-宅建業法③報酬・監督-11","媒介契約":"09-宅建業法②業務規制-6","宅地建物取引士":"00-試験概要-1","宅地造成等規制法（盛土規制法）":"16-盛土規制法-1","広告・その他の業務規制":"09-宅建業法②業務規制-23","建築基準法 ─ 建蔽率・容積率":"12-建築基準法-11","建築基準法 ─ 用途制限・道路・その他":"12-建築基準法-10","意思表示":"01-民法総則-5","所得税（譲渡所得）":"17-税・価格-15","抵当権":"02-民法物権-22","時効":"01-民法総則-19","物権変動":"02-民法物権-2","登録免許税":"17-税・価格-22","監督処分・罰則":"10-宅建業法③報酬・監督-18","相続":"04-民法親族相続-1","賃貸借":"03-民法債権-12","贈与税・相続税（税制改正関連）":"17-税・価格-1","農地法":"14-農地法-1","都市計画法 ─ 都市計画の内容":"11-都市計画法-1","都市計画法 ─ 開発許可制度":"11-都市計画法-7","重要事項説明（35条書面）":"09-宅建業法②業務規制-9"};
  // --- 演習 → 学習メモへの追加（PC のみ / 4択演習・一問一答） ---
  // 一問一答（marubatsu.json）の section 表記は 4択（quiz.json）と異なるため別マップを持つ
  const MB_SECTION_TO_CHAPTER = {
    // 権利関係
    "制限行為能力者": "01-民法総則",
    "意思表示": "01-民法総則",
    "代理": "01-民法総則",
    "時効": "01-民法総則",
    "条件": "01-民法総則",
    "物権変動": "02-民法物権",
    "共有": "02-民法物権",
    "抵当権": "02-民法物権",
    "相隣関係": "02-民法物権",
    "債務不履行": "03-民法債権",
    "危険負担": "03-民法債権",
    "契約不適合責任": "03-民法債権",
    "売買": "03-民法債権",
    "賃貸借": "03-民法債権",
    "連帯債務": "03-民法債権",
    "保証": "03-民法債権",
    "不法行為": "03-民法債権",
    "債権譲渡": "03-民法債権",
    "相殺": "03-民法債権",
    "相続": "04-民法親族相続",
    "遺言": "04-民法親族相続",
    "遺留分": "04-民法親族相続",
    "配偶者居住権": "04-民法親族相続",
    "借地借家法": "05-借地借家法",
    "区分所有法": "06-区分所有法",
    "不動産登記法": "07-不動産登記法",
    // 宅建業法
    "宅建業の定義": "08-宅建業法①総則・免許",
    "免許制度": "08-宅建業法①総則・免許",
    "欠格事由": "08-宅建業法①総則・免許",
    "事務所": "08-宅建業法①総則・免許",
    "案内所等": "08-宅建業法①総則・免許",
    "営業保証金": "08-宅建業法①総則・免許",
    "保証協会": "08-宅建業法①総則・免許",
    "宅地建物取引士": "09-宅建業法②業務規制",
    "媒介契約": "09-宅建業法②業務規制",
    "重要事項説明": "09-宅建業法②業務規制",
    "37条書面": "09-宅建業法②業務規制",
    "広告等の規制": "09-宅建業法②業務規制",
    "その他の業務規制": "09-宅建業法②業務規制",
    "クーリング・オフ": "09-宅建業法②業務規制",
    "8種制限": "10-宅建業法③報酬・監督",
    "報酬": "10-宅建業法③報酬・監督",
    "監督処分": "10-宅建業法③報酬・監督",
    "住宅瑕疵担保履行法": "10-宅建業法③報酬・監督",
    // 法令上の制限
    "都市計画法": "11-都市計画法",
    "建築基準法": "12-建築基準法",
    "国土利用計画法": "13-国土利用計画法",
    "農地法": "14-農地法",
    "土地区画整理法": "15-土地区画整理法",
    "盛土規制法": "16-盛土規制法",
    // 税・価格
    "不動産取得税": "17-税・価格",
    "固定資産税": "17-税・価格",
    "所得税": "17-税・価格",
    "登録免許税": "17-税・価格",
    "印紙税": "17-税・価格",
    "地価公示法": "17-税・価格",
    "不動産鑑定評価": "17-税・価格",
    // 免除科目
    "住宅金融支援機構": "18-免除科目",
    "景品表示法": "18-免除科目",
    "土地の知識": "18-免除科目",
    "建物の知識": "18-免除科目"
  };

  function chapterIdForSection(section) {
    const anchorId = SECTION_TO_ID[section];
    if (!anchorId) return null;
    return anchorId.replace(/-\d+$/, '');
  }

  function mbChapterIdForSection(section) {
    return MB_SECTION_TO_CHAPTER[section] || null;
  }

  function quizNoteKey(chapterId) { return 'takken-note-' + chapterId; }

  function quizNoteMarker(q) { return '[' + (q.id || '') + ']'; }

  function readNoteBody(chapterId) {
    // 表示中の章は textarea が最新（debounce 保存前の入力を取りこぼさない）
    if (currentNoteId === chapterId && noteTextarea) return noteTextarea.value;
    return localStorage.getItem(quizNoteKey(chapterId)) || '';
  }

  function quizNoteAdded(chapterId, q) {
    if (!chapterId || !q.id) return false;
    return readNoteBody(chapterId).indexOf(quizNoteMarker(q)) !== -1;
  }

  function quizNoteToday() {
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  function buildQuizNoteEntry(q, memo) {
    const topic = [q.section, q.source].filter(Boolean).join('／') || q.category || '';
    const lines = ['--- 演習 ' + quizNoteToday() + ' ' + quizNoteMarker(q) + ' ---'];
    if (topic) lines.push('論点: ' + topic);
    if (q.explanation) lines.push('解説: ' + String(q.explanation).trim());
    if (memo && memo.trim()) lines.push('メモ: ' + memo.trim());
    return lines.join('\n');
  }

  function buildMbNoteEntry(q, memo) {
    const topic = [q.category, q.section].filter(Boolean).join('／');
    const lines = ['--- 一問一答 ' + quizNoteToday() + ' ' + quizNoteMarker(q) + ' ---'];
    if (topic) lines.push('論点: ' + topic);
    // ○× は問題文がないと後から読めないため statement ごと残す
    if (q.statement) {
      lines.push('問題: ' + String(q.statement).trim() + '（正解: ' + (q.answer ? '⭕ 正しい' : '❌ 誤り') + '）');
    }
    if (q.explanation) lines.push('解説: ' + String(q.explanation).trim());
    if (memo && memo.trim()) lines.push('メモ: ' + memo.trim());
    return lines.join('\n');
  }

  function appendNote(chapterId, entry) {
    if (!chapterId) return null;
    const cur = readNoteBody(chapterId);
    const next = cur ? (cur.replace(/\s+$/, '') + '\n\n' + entry) : entry;
    localStorage.setItem(quizNoteKey(chapterId), next);
    if (currentNoteId === chapterId && noteTextarea) {
      clearTimeout(saveTimer);
      noteTextarea.value = next;
      noteTextarea.scrollTop = noteTextarea.scrollHeight;
    }
    return chapterId;
  }

  // 4択演習・一問一答 共通の「テキストに追加」欄。
  // id ではなく class で引く（演習モーダル間での id 衝突を避ける）
  function renderNoteAdd(expl, chapterId, q, buildEntry) {
    if (!expl || !chapterId) return;

    const box = document.createElement('div');
    box.className = 'quiz-note-add';
    box.innerHTML =
      '<div class="quiz-note-head">📌 テキストに追加<span class="quiz-note-target">' + escapeHtml(chapterId) + '</span></div>' +
      '<textarea class="quiz-note-input" rows="2" placeholder="メモ（任意・Ctrl+Enter で追加）"></textarea>' +
      '<div class="quiz-note-actions">' +
        '<button type="button" class="quiz-btn quiz-note-btn">📌 テキストに追加</button>' +
        '<span class="quiz-note-status"></span>' +
      '</div>';
    expl.appendChild(box);

    const btn = box.querySelector('.quiz-note-btn');
    const input = box.querySelector('.quiz-note-input');
    const status = box.querySelector('.quiz-note-status');

    if (quizNoteAdded(chapterId, q)) {
      btn.disabled = true;
      btn.textContent = '✓ 追加済み';
      input.disabled = true;
      status.textContent = 'この問題は追加済み';
      return;
    }

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const added = appendNote(chapterId, buildEntry(q, input.value));
      if (!added) return;
      btn.disabled = true;
      btn.textContent = '✓ 追加済み';
      input.disabled = true;
      status.textContent = added + ' の学習メモに追加';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        btn.click();
      }
    });
  }

  function renderQuizNoteAdd(q) {
    renderNoteAdd(document.getElementById('quiz-explanation'), chapterIdForSection(q.section), q, buildQuizNoteEntry);
  }

  function renderMbNoteAdd(q) {
    renderNoteAdd(document.getElementById('mb-explanation'), mbChapterIdForSection(q.section), q, buildMbNoteEntry);
  }

  let quizTextbookLoaded = false;
  let quizPool = null;
  let quizSet = [];
  let quizIdx = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let quizWrong = [];   // セッション内のみ保持（結果画面の「間違えた問題」一覧用）

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 解説文の軽量 Markdown 変換（**太字** / `code` / 行頭リスト）。
  // 解説は教材 Markdown から生成されるため記法が混じる。4択・一問一答で共用
  function explanationToHtml(text) {
    if (text == null || text === '') return '';
    return String(text).split('\n').map(line => {
      let html = escapeHtml(line);
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
      const listM = html.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
      if (listM) return '<div class="expl-li">・' + listM[1] + '</div>';
      return '<div class="expl-line">' + html + '</div>';
    }).join('');
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
    // テキスト本体は自分自身。生成先が index.html / takken-textbook.html /
    // takken-offline.html のいずれでも動くよう、自ページのファイル名を使う
    const selfPage = location.pathname.split('/').pop() || 'index.html';
    const url = selfPage + '#' + encodeURIComponent(anchorId);
    if (quizTextbookPane) quizTextbookPane.classList.remove('is-hidden');
    if (!quizTextbookLoaded) {
      quizTextbookIframe.src = url;
      quizTextbookLoaded = true;
      return;
    }
    try {
      const iframeDoc = quizTextbookIframe.contentDocument || quizTextbookIframe.contentWindow.document;
      const el = iframeDoc.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // src への代入はフラグメント違いだけだと再ロードされないため location で置換する
        quizTextbookIframe.contentWindow.location.replace(url);
      }
    } catch (e) {
      quizTextbookIframe.removeAttribute('src');
      quizTextbookIframe.src = url;
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
    else quizWrong.push({ q, chosen: n });

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
    expl.innerHTML = verdict + `<div class="quiz-explanation-body">${explanationToHtml(q.explanation)}</div>`;
    expl.hidden = false;

    quizProgress.textContent = `${quizIdx + 1} / ${quizSet.length}（正解 ${quizScore}）`;
    quizNextBtn.disabled = false;
    updateTextbookPane(q.section);
    renderQuizNoteAdd(q);
  }

  function showResult() {
    const total = quizSet.length;
    const pct = total ? Math.round((quizScore / total) * 100) : 0;
    quizProgress.textContent = `終了`;

    const score = `<div class="quiz-score">スコア ${quizScore} / ${total}（正答率 ${pct}%）</div>`;
    let review;
    if (quizWrong.length === 0) {
      review = '<div class="mb-review-perfect">全問正解 🎉</div>';
    } else {
      // 一覧の見た目は一問一答の結果画面と共通（.mb-review-* を流用）
      const items = quizWrong.map((w, i) => {
        const q = w.q;
        const path = [q.category, q.section, q.source].filter(Boolean).map(escapeHtml).join(' ／ ');
        const correctText = escapeHtml(q.choices[q.answer - 1] || '');
        const chosenText = escapeHtml(q.choices[w.chosen - 1] || '');
        const expl = explanationToHtml(q.explanation);
        return `<li class="mb-review-item">
          <div class="quiz-meta"><span class="quiz-q-num">${i + 1}</span><span class="quiz-chapter">${path}</span></div>
          <div class="mb-review-statement">${escapeHtml(q.question).replace(/\n/g, '<br>')}</div>
          <div class="mb-review-answer">正解: ${q.answer}　${correctText}</div>
          <div class="mb-review-chosen">あなたの回答: ${w.chosen}　${chosenText}</div>
          ${expl ? `<div class="mb-review-explanation">${expl}</div>` : ''}
        </li>`;
      }).join('');
      review = `<div class="mb-review">
        <div class="mb-review-title">間違えた問題（${quizWrong.length}問）</div>
        <ol class="mb-review-list">${items}</ol>
      </div>`;
    }

    quizBody.innerHTML = score + review;
    quizBody.scrollTop = 0;
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
    if (quizTextbookPane) quizTextbookPane.classList.add('is-hidden');
  };

  window.openQuiz = async function() {
    quizOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    quizBody.innerHTML = '<div class="quiz-empty">読み込み中…</div>';
    quizProgress.textContent = '';
    quizNextBtn.disabled = true;
    if (quizTextbookPane) quizTextbookPane.classList.add('is-hidden');

    const pool = await loadQuizPool();
    if (!pool || pool.length === 0) {
      quizBody.innerHTML = '<div class="quiz-empty">問題データが見つからない。<br>quiz.json を確認。</div>';
      return;
    }
    quizSet = shuffle(pool).slice(0, Math.min(QUIZ_SIZE, pool.length));
    quizIdx = 0;
    quizScore = 0;
    quizWrong = [];
    renderQuestion();
  };

  window.closeQuiz = function() {
    quizOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    if (quizTextbookIframe) {
      quizTextbookIframe.removeAttribute('src');
      quizTextbookLoaded = false;
    }
  };

  // --- Marubatsu (一問一答) ---
  const MARUBATSU_SIZE_DEFAULT = 10;
  const mbOverlay = document.getElementById('marubatsu-overlay');
  const mbBody = document.getElementById('marubatsu-body');
  const mbProgress = document.getElementById('marubatsu-progress');
  const mbNextBtn = document.getElementById('marubatsu-next-btn');
  const mbAnswerBar = document.getElementById('mb-answer-bar');
  let mbPool = null;
  let mbSet = [];
  let mbIdx = 0;
  let mbScore = 0;
  let mbAnswered = false;
  let mbWrong = [];
  let mbSize = MARUBATSU_SIZE_DEFAULT;
  let mbSelectedCats = null;

  async function loadMbPool() {
    if (mbPool) return mbPool;
    try {
      const res = await fetch('marubatsu.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      mbPool = await res.json();
    } catch (e) {
      mbPool = [];
      console.error('marubatsu.json load failed:', e);
    }
    return mbPool;
  }

  // --- 重み付き出題（重要度 × 誤答履歴）---
  // 履歴は { id: { s: 連続正解数, n: 回答数 } }。誤答で s = 0 に戻す
  const MB_STATS_KEY = 'takken-mb-stats';
  const MB_WEIGHTED_KEY = 'takken-mb-weighted';
  const MB_IMPORTANCE_WEIGHT = { A: 3, B: 2, C: 1 };
  const MB_IMPORTANCE_DEFAULT = 'B';

  // localStorage が使えない環境（プライベートウィンドウ等）でも出題は続ける
  function loadMbStats() {
    try {
      const stats = JSON.parse(localStorage.getItem(MB_STATS_KEY) || '{}');
      return (stats && typeof stats === 'object' && !Array.isArray(stats)) ? stats : {};
    } catch (e) {
      return {};
    }
  }

  function recordMbResult(id, isCorrect) {
    if (!id) return;
    try {
      const stats = loadMbStats();
      const st = stats[id] || { s: 0, n: 0 };
      stats[id] = { s: isCorrect ? (st.s || 0) + 1 : 0, n: (st.n || 0) + 1 };
      localStorage.setItem(MB_STATS_KEY, JSON.stringify(stats));
    } catch (e) { /* 保存できなくても続行 */ }
  }

  function resetMbStats() {
    try { localStorage.removeItem(MB_STATS_KEY); } catch (e) { /* noop */ }
  }

  function isMbWeighted() {
    try { return localStorage.getItem(MB_WEIGHTED_KEY) !== '0'; } catch (e) { return true; }
  }

  function setMbWeighted(on) {
    try { localStorage.setItem(MB_WEIGHTED_KEY, on ? '1' : '0'); } catch (e) { /* noop */ }
  }

  function mbImportance(q) {
    return MB_IMPORTANCE_WEIGHT[q.importance] ? q.importance : MB_IMPORTANCE_DEFAULT;
  }

  // 直近誤答 ×4 / 未回答 ×2 / 正解1回 ×1 / 連続正解2回以上 ×0.5
  function mbHistoryWeight(st) {
    if (!st || !st.n) return 2;
    if (!st.s) return 4;
    return st.s >= 2 ? 0.5 : 1;
  }

  function mbWeight(q, stats) {
    return MB_IMPORTANCE_WEIGHT[mbImportance(q)] * mbHistoryWeight(stats[q.id]);
  }

  // 非復元の重み付き抽出（Efraimidis–Spirakis）: key = U^(1/w) の上位 n 件
  function weightedSampleBy(items, weightOf, n) {
    return items
      .map(item => ({ item, key: Math.pow(Math.random(), 1 / weightOf(item)) }))
      .sort((a, b) => b.key - a.key)
      .slice(0, n)
      .map(e => e.item);
  }

  function buildMbSet(pool) {
    let filtered = pool;
    if (mbSelectedCats && mbSelectedCats.size > 0) {
      filtered = pool.filter(q => mbSelectedCats.has(q.category || ''));
    }
    if (filtered.length === 0) return [];
    const n = Math.min(mbSize, filtered.length);
    if (!isMbWeighted()) return shuffle(filtered).slice(0, n);
    const stats = loadMbStats();
    // 抽出結果は重い順に並びやすいので、出題順は混ぜ直す
    return shuffle(weightedSampleBy(filtered, q => mbWeight(q, stats), n));
  }

  // 回答ボタンはフッター固定（スマホで親指が届く位置）。左 = ⭕ / 右 = ❌ でキー操作と揃える
  function showMbAnswerBar() {
    if (!mbAnswerBar) return;
    mbAnswerBar.innerHTML = `
      <button type="button" class="marubatsu-btn" data-ans="true">⭕ 正しい</button>
      <button type="button" class="marubatsu-btn" data-ans="false">❌ 誤り</button>`;
    mbAnswerBar.hidden = false;
    mbAnswerBar.querySelectorAll('.marubatsu-btn').forEach(btn => {
      btn.addEventListener('click', () => answerMb(btn.dataset.ans === 'true'));
    });
  }

  function hideMbAnswerBar() {
    if (!mbAnswerBar) return;
    mbAnswerBar.hidden = true;
    mbAnswerBar.innerHTML = '';
  }

  function renderMb() {
    const q = mbSet[mbIdx];
    mbAnswered = false;
    mbNextBtn.hidden = true;
    mbNextBtn.textContent = (mbIdx === mbSet.length - 1) ? '結果を見る ▶' : '次の問題 ▶';
    mbProgress.textContent = `${mbIdx + 1} / ${mbSet.length}（正解 ${mbScore}）`;

    const path = [q.category, q.section].filter(Boolean).map(escapeHtml).join(' ／ ');
    const imp = mbImportance(q);
    const badge = `<span class="mb-importance mb-importance-${imp}" title="重要度 ${imp}">${imp}</span>`;
    const meta = `<div class="quiz-meta"><span class="quiz-q-num">Q${mbIdx + 1}</span>${badge}<span class="quiz-chapter">${path}</span></div>`;
    const stmt = `<div class="marubatsu-statement" id="mb-statement">${escapeHtml(q.statement)}</div>`;
    mbBody.innerHTML = meta + stmt + `<div class="quiz-explanation" id="mb-explanation" hidden></div>`;

    showMbAnswerBar();
    mbBody.scrollTop = 0;
  }

  function answerMb(userAns) {
    if (mbAnswered) return;
    mbAnswered = true;
    const q = mbSet[mbIdx];
    const isCorrect = (userAns === q.answer);
    if (isCorrect) mbScore++;
    else mbWrong.push(q);
    recordMbResult(q.id, isCorrect);

    // 回答バーは「次の問題」ボタンに場所を譲る
    hideMbAnswerBar();

    const stmtEl = document.getElementById('mb-statement');
    if (stmtEl) stmtEl.classList.add(isCorrect ? 'is-correct' : 'is-wrong');

    const expl = document.getElementById('mb-explanation');
    const ansLabel = q.answer ? '⭕ 正しい' : '❌ 誤り';
    const userLabel = userAns ? '⭕ 正しい' : '❌ 誤り';
    const verdict = isCorrect
      ? '<span class="quiz-verdict ok">○ 正解</span>'
      : `<span class="quiz-verdict ng">× 不正解（あなた: ${userLabel} ／ 正解: ${ansLabel}）</span>`;
    expl.innerHTML = verdict + `<div class="quiz-explanation-body">${explanationToHtml(q.explanation)}</div>`;
    expl.hidden = false;

    mbProgress.textContent = `${mbIdx + 1} / ${mbSet.length}（正解 ${mbScore}）`;
    renderMbNoteAdd(q);
    mbNextBtn.hidden = false;
    mbNextBtn.disabled = false;
    // 解説はカードの下に出るため、スマホでは画面外になりやすい。見える位置まで送る
    expl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // focus しない: フォーカス中ボタンへの Enter/Space 誤爆で次へ進むのを防ぐ（次へは ← → のみ）
  }

  function showMbResult() {
    const total = mbSet.length;
    const pct = total ? Math.round((mbScore / total) * 100) : 0;
    mbProgress.textContent = '終了';

    const score = `<div class="quiz-score">スコア ${mbScore} / ${total}（正答率 ${pct}%）</div>`;
    let review;
    if (mbWrong.length === 0) {
      review = '<div class="mb-review-perfect">全問正解 🎉</div>';
    } else {
      const items = mbWrong.map((q, i) => {
        const path = [q.category, q.section].filter(Boolean).map(escapeHtml).join(' ／ ');
        const ansLabel = q.answer ? '⭕ 正しい' : '❌ 誤り';
        const expl = explanationToHtml(q.explanation);
        return `<li class="mb-review-item">
          <div class="quiz-meta"><span class="quiz-q-num">${i + 1}</span><span class="quiz-chapter">${path}</span></div>
          <div class="mb-review-statement">${escapeHtml(q.statement)}</div>
          <div class="mb-review-answer">正解: ${ansLabel}</div>
          ${expl ? `<div class="mb-review-explanation">${expl}</div>` : ''}
        </li>`;
      }).join('');
      review = `<div class="mb-review">
        <div class="mb-review-title">間違えた問題（${mbWrong.length}問）</div>
        <ol class="mb-review-list">${items}</ol>
      </div>`;
    }

    mbBody.innerHTML = score + review;
    mbBody.scrollTop = 0;
    mbNextBtn.hidden = true;
    hideMbAnswerBar();
  }

  window.nextMarubatsu = function() {
    if (!mbAnswered) return;
    if (mbIdx >= mbSet.length - 1) {
      showMbResult();
      return;
    }
    mbIdx++;
    renderMb();
  };

  function renderMbSetup(pool) {
    const catCount = {};
    pool.forEach(q => {
      const c = q.category || '(未分類)';
      catCount[c] = (catCount[c] || 0) + 1;
    });
    const cats = Object.keys(catCount);
    if (!mbSelectedCats) {
      mbSelectedCats = new Set(cats);
    }

    const catItems = cats.map(c => {
      const checked = mbSelectedCats.has(c) ? 'checked' : '';
      return `<label class="fillin-cat"><input type="checkbox" data-cat="${escapeHtml(c)}" ${checked}><span>${escapeHtml(c)} <em>(${catCount[c]})</em></span></label>`;
    }).join('');
    const sizeOpts = [10, 20, 50, 100].map(n => {
      const sel = (n === mbSize) ? 'selected' : '';
      return `<option value="${n}" ${sel}>${n}問</option>`;
    }).join('');

    const stats = loadMbStats();
    let wrongCount = 0, answeredCount = 0;
    pool.forEach(q => {
      const st = stats[q.id];
      if (!st || !st.n) return;
      answeredCount++;
      if (!st.s) wrongCount++;
    });
    const weightedChecked = isMbWeighted() ? 'checked' : '';

    mbBody.innerHTML = `
      <div class="fillin-setup">
        <div class="fillin-setup-section">
          <div class="fillin-setup-label">出題範囲（カテゴリ）</div>
          <div class="fillin-setup-actions">
            <button type="button" class="quiz-btn fillin-btn-mini" id="mb-cat-all">全選択</button>
            <button type="button" class="quiz-btn fillin-btn-mini" id="mb-cat-none">全解除</button>
          </div>
          <div class="fillin-cats">${catItems}</div>
        </div>
        <div class="fillin-setup-section">
          <div class="fillin-setup-label">問題数</div>
          <select id="mb-size-select" class="fillin-size-select">${sizeOpts}</select>
        </div>
        <div class="fillin-setup-section">
          <div class="fillin-setup-label">出題の重み付け</div>
          <label class="fillin-cat mb-weighted-toggle"><input type="checkbox" id="mb-weighted" ${weightedChecked}><span>苦手・頻出を優先 <em>(重要度 × 誤答履歴)</em></span></label>
          <div class="mb-stats-line">直近誤答 ${wrongCount}問 ／ 未回答 ${pool.length - answeredCount}問 ／ 回答済み ${answeredCount}問</div>
          <div class="fillin-setup-actions">
            <button type="button" class="quiz-btn fillin-btn-mini" id="mb-stats-reset">履歴リセット</button>
          </div>
        </div>
        <div class="fillin-setup-section fillin-setup-start">
          <button type="button" class="quiz-btn quiz-btn-primary" id="mb-start-btn">開始 ▶</button>
        </div>
      </div>
    `;

    mbBody.querySelectorAll('input[type=checkbox][data-cat]').forEach(cb => {
      cb.addEventListener('change', () => {
        const c = cb.getAttribute('data-cat');
        if (cb.checked) mbSelectedCats.add(c);
        else mbSelectedCats.delete(c);
      });
    });
    mbBody.querySelector('#mb-cat-all').addEventListener('click', () => {
      mbSelectedCats = new Set(cats);
      renderMbSetup(pool);
    });
    mbBody.querySelector('#mb-cat-none').addEventListener('click', () => {
      mbSelectedCats = new Set();
      renderMbSetup(pool);
    });
    mbBody.querySelector('#mb-size-select').addEventListener('change', (e) => {
      mbSize = parseInt(e.target.value, 10) || MARUBATSU_SIZE_DEFAULT;
    });
    mbBody.querySelector('#mb-weighted').addEventListener('change', (e) => {
      setMbWeighted(e.target.checked);
    });
    mbBody.querySelector('#mb-stats-reset').addEventListener('click', () => {
      if (!confirm('一問一答の正誤履歴を消去する。よいか？')) return;
      resetMbStats();
      renderMbSetup(pool);
    });
    mbBody.querySelector('#mb-start-btn').addEventListener('click', () => startMb(pool));
  }

  function startMb(pool) {
    mbSet = buildMbSet(pool);
    if (mbSet.length === 0) {
      mbBody.innerHTML = '<div class="quiz-empty">該当問題なし。<br>カテゴリ選択を見直してくれ。</div>';
      mbNextBtn.hidden = true;
      hideMbAnswerBar();
      return;
    }
    mbIdx = 0;
    mbScore = 0;
    mbWrong = [];
    renderMb();
  }

  window.openMarubatsu = async function() {
    mbOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    mbBody.innerHTML = '<div class="quiz-empty">読み込み中…</div>';
    mbProgress.textContent = '設定';
    mbNextBtn.hidden = true;
    hideMbAnswerBar();
    mbAnswered = false;

    const pool = await loadMbPool();
    if (!pool || pool.length === 0) {
      mbBody.innerHTML = '<div class="quiz-empty">一問一答データが見つからない。<br>marubatsu.json を確認。</div>';
      return;
    }
    renderMbSetup(pool);
  };

  window.closeMarubatsu = function() {
    if (!mbOverlay) return;
    mbOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  };

  // --- Marubatsu キーボード回答（← = ⭕ / → = ❌ / 回答後は ← → で次へ）---
  document.addEventListener('keydown', (e) => {
    // 一問一答モーダルを持たないページ（takken-textbook.html）でも読み込まれる
    if (!mbOverlay) return;
    if (!mbOverlay.classList.contains('visible')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.repeat) return; // 長押しリピートで解説を飛ばさない
    // メモ欄の入力中は ← → をカーソル移動として扱う（次の問題へ飛ばさない）
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
    if (!mbAnswered) {
      if (!document.getElementById('mb-statement')) return;
      e.preventDefault();
      answerMb(e.key === 'ArrowLeft');
    } else if (!mbNextBtn.hidden) {
      e.preventDefault();
      nextMarubatsu();
    }
  });

  // --- Marubatsu スワイプ回答（タッチ端末のみ。左 = ⭕ / 右 = ❌ / 回答後は左右どちらでも次へ）---
  const MB_SWIPE_LOCK = 10; // 縦横どちらの操作かを確定する移動量(px)
  const MB_SWIPE_MAX = 80;  // 回答・次へと判定する移動量の上限(px)。狭い画面では幅の 25%
  let mbSwipe = null;       // { x, y, dir: null | 'h' | 'v', dx }

  function mbSwipeLimit() {
    return Math.min(MB_SWIPE_MAX, window.innerWidth * 0.25);
  }

  function releaseMbCard() {
    releaseMbFooter();
    const card = document.getElementById('mb-statement');
    if (!card) return;
    card.classList.remove('is-dragging');
    card.style.transform = '';
    delete card.dataset.swipe;
  }

  // スワイプ中は下の回答ボタンも連動させ、離すとどちらの回答になるかを示す。
  // 回答前 = 引っ張っている側のボタンを持ち上げて色付け（確定位置で塗りつぶし）/ 回答後 = 「次へ」ボタンを指に追従
  function dragMbFooter(dx) {
    const pull = Math.min(1, Math.abs(dx) / mbSwipeLimit());
    const armed = pull >= 1;
    if (mbAnswered) {
      if (mbNextBtn.hidden) return;
      mbNextBtn.classList.add('is-dragging');
      mbNextBtn.classList.toggle('is-armed', armed);
      mbNextBtn.style.transform = `translateX(${Math.sign(dx) * pull * 16}px)`;
      return;
    }
    if (!mbAnswerBar || mbAnswerBar.hidden) return;
    const target = dx < 0 ? 'true' : 'false';
    mbAnswerBar.querySelectorAll('.marubatsu-btn').forEach(btn => {
      const on = btn.dataset.ans === target;
      btn.classList.add('is-dragging');
      btn.classList.toggle('is-pulled', on);
      btn.classList.toggle('is-armed', on && armed);
      btn.style.setProperty('--mb-pull', on ? pull : 0);
      btn.style.opacity = on ? '' : String(1 - pull * 0.6);
    });
  }

  function releaseMbFooter() {
    if (mbAnswerBar) {
      mbAnswerBar.querySelectorAll('.marubatsu-btn').forEach(btn => {
        btn.classList.remove('is-dragging', 'is-pulled', 'is-armed');
        btn.style.removeProperty('--mb-pull');
        btn.style.opacity = '';
      });
    }
    mbNextBtn.classList.remove('is-dragging', 'is-armed');
    mbNextBtn.style.transform = '';
  }

  if (mbBody) {
    mbBody.addEventListener('touchstart', (e) => {
      // 2本目の指が触れたらドラッグ中のカードを戻して中断（ピンチ操作を優先）
      if (mbSwipe) releaseMbCard();
      mbSwipe = null;
      if (e.touches.length !== 1) return;
      // 設定画面・結果画面には問題カードが無い
      if (!document.getElementById('mb-statement')) return;
      const t = e.target;
      if (t && t.closest && t.closest('textarea, input, select, button, a')) return;
      mbSwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null, dx: 0 };
    }, { passive: true });

    mbBody.addEventListener('touchmove', (e) => {
      if (!mbSwipe) return;
      const dx = e.touches[0].clientX - mbSwipe.x;
      const dy = e.touches[0].clientY - mbSwipe.y;
      if (!mbSwipe.dir) {
        if (Math.abs(dx) < MB_SWIPE_LOCK && Math.abs(dy) < MB_SWIPE_LOCK) return;
        mbSwipe.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (mbSwipe.dir !== 'h') return; // 縦は解説のスクロールに譲る
      if (e.cancelable) e.preventDefault();
      mbSwipe.dx = dx;
      dragMbFooter(dx);
      if (mbAnswered) return; // 回答後は「次へ」の判定のみ。カードは動かさない
      const card = document.getElementById('mb-statement');
      if (!card) return;
      card.classList.add('is-dragging');
      card.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
      // 離すと回答が確定する位置まで来たら、どちらの回答になるかを表示
      if (Math.abs(dx) >= mbSwipeLimit()) card.dataset.swipe = dx < 0 ? 'maru' : 'batsu';
      else delete card.dataset.swipe;
    }, { passive: false });

    mbBody.addEventListener('touchend', () => {
      const s = mbSwipe;
      mbSwipe = null;
      if (!s || s.dir !== 'h') return;
      releaseMbCard();
      if (Math.abs(s.dx) < mbSwipeLimit()) return;
      if (!mbAnswered) answerMb(s.dx < 0);
      else if (!mbNextBtn.hidden) nextMarubatsu();
    });

    mbBody.addEventListener('touchcancel', () => {
      if (mbSwipe) releaseMbCard();
      mbSwipe = null;
    });
  }

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

  // 重み付き非復元抽選（Efraimidis-Spirakis A-Res）: importance が高い問ほど出やすい
  function weightedSample(items, n) {
    const picked = items
      .map(q => ({ q, key: Math.pow(Math.random(), 1 / (1 + (q.importance || 0))) }))
      .sort((a, b) => b.key - a.key)
      .slice(0, n)
      .map(x => x.q);
    return shuffle(picked);
  }

  function buildFillinSet(pool) {
    let filtered = pool;
    if (fillinSelectedCats && fillinSelectedCats.size > 0) {
      filtered = pool.filter(q => fillinSelectedCats.has(q.category || ''));
    }
    if (filtered.length === 0) return [];
    return weightedSample(filtered, Math.min(fillinSize, filtered.length));
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
    const hintRow = `<div class="fillin-hint-row"><button type="button" class="quiz-btn fillin-btn-mini" id="fillin-hint-btn">💡 ヒント</button><span class="fillin-hint-display" id="fillin-hint-display"></span></div>`;
    fillinBody.innerHTML = meta + hint + para + hintRow + `<div class="quiz-explanation" id="fillin-explanation" hidden></div>`;

    // ヒント: 1回目=文字数、2回目=頭文字（ペナルティなし）
    let hintStage = 0;
    const hintBtn = fillinBody.querySelector('#fillin-hint-btn');
    const hintDisp = fillinBody.querySelector('#fillin-hint-display');
    hintBtn.addEventListener('click', () => {
      if (fillinAnswered) return;
      hintStage++;
      const len = q.answer.length;
      if (hintStage === 1) {
        hintDisp.textContent = `${len}文字`;
        hintBtn.textContent = '💡 もっと';
      } else {
        hintDisp.textContent = `「${q.answer[0]}」で始まる${len}文字`;
        hintBtn.disabled = true;
      }
      const input = fillinBody.querySelector('.fillin-input');
      if (input && !input.disabled) input.focus();
    });

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

    const hintBtn = fillinBody.querySelector('#fillin-hint-btn');
    if (hintBtn) hintBtn.disabled = true;

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

  window.closeFillin = function() {
    fillinOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  };

  // --- 読み上げ（Web Speech API / 本文 00-18 章のみ）---
  const ttsSynth = window.speechSynthesis;
  if (ttsSynth && typeof SpeechSynthesisUtterance === 'function') {
    const TTS_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const TTS_RATE_KEY = 'takken-tts-rate';
    const TTS_CHUNK_MAX = 70;         // 1発話の上限文字数（Chrome は長い発話が約15秒で黙るため文単位に刻む）
    let ttsQueue = [];                // { el, chunks, head }（head = h2/h3 = 節の先頭）
    let ttsPos = 0;
    let ttsChunk = 0;
    let ttsState = 'idle';            // idle | playing | paused
    let ttsToken = 0;                 // cancel() 後に届く古い onend / onerror を捨てるための世代番号
    let ttsUtter = null;              // 参照を保持しないと GC され onend が発火しないことがある
    let ttsVoice = null;
    let ttsMarked = null;
    let ttsRate = parseFloat(localStorage.getItem(TTS_RATE_KEY));
    if (TTS_RATES.indexOf(ttsRate) === -1) ttsRate = 1;

    // \p{...} 非対応ブラウザでスクリプト全体が構文エラーにならないよう実行時に組み立てる
    let ttsEmojiRe = null;
    try { ttsEmojiRe = new RegExp('\\p{Extended_Pictographic}\\uFE0F?', 'gu'); } catch (e) { /* 絵文字は除去しない */ }

    const isTtsChapter = (ch) => {
      const n = parseInt(ch.id, 10);
      return n >= 0 && n <= 18;       // 19-22 は演習問題、99 は用語索引
    };

    function ttsClean(text) {
      let t = text.replace(/★+/g, '').replace(/⚠️?/g, '注意、').replace(/[→⇒➡]️?/g, '、');
      if (ttsEmojiRe) t = t.replace(ttsEmojiRe, '');
      return t.replace(/\s+/g, ' ').trim();
    }

    // 読み辞書: 端末の音声が誤読する語を、発話する文字列の上だけでカタカナに置き換える（画面の文言・検索には影響しない）。
    // 「語=ヨミ」を空白区切りで並べる。長い語から順に照合する。
    // 「語=同じ語」は誤爆よけ（「優先順位」の中の「先順位」、「提供する」の中の「供する」を置換させない）。
    // 読みは法律読みに統一（遺言=イゴン、競売=ケイバイ、立木=リュウボク など）
    const TTS_READINGS = (
      '譲渡人=ジョウトニン 譲受人=ユズリウケニン 保佐人=ホサニン 被保佐人=ヒホサニン 補助人=ホジョニン 被補助人=ヒホジョニン 被相続人=ヒソウゾクニン 買受人=カイウケニン ' +
      '転借人=テンシャクニン 公証人=コウショウニン 管理人=カンリニン 申請人=シンセイニン 承継人=ショウケイニン 被承継人=ヒショウケイニン 利害関係人=リガイカンケイニン 請求人=セイキュウニン ' +
      '持参人=ジサンニン 同一人=ドウイツニン 複数人=フクスウニン 私人=シジン 保佐=ホサ 何人も=ナンピトモ 買主=カイヌシ 借主=カリヌシ ' +
      '貸主=カシヌシ 工事主=コウジヌシ 前主=ゼンシュ 後主=コウシュ 手付金=テツケキン 保証金=ホショウキン 違約金=イヤクキン 中間金=チュウカンキン ' +
      '分担金=ブンタンキン 賦課金=フカキン 課徴金=カチョウキン 補償金=ホショウキン 権利金=ケンリキン 保険金=ホケンキン 準備金=ジュンビキン 支払金=シハライキン ' +
      '清算金=セイサンキン 充当金=ジュウトウキン 損害金=ソンガイキン 積立金=ツミタテキン 賠償金=バイショウキン 賦払金=フバライキン 償金=ショウキン 内金=ウチキン ' +
      '残代金=ザンダイキン 供託所=キョウタクショ 登記所=トウキショ 診療所=シンリョウジョ 変電所=ヘンデンショ 保管所=ホカンショ 案内所=アンナイジョ 竹木=チクボク ' +
      '消除=ショウジョ 資力=シリョク 合筆=ガッピツ 分筆=ブンピツ 空家=アキヤ 私道=シドウ 通謀=ツウボウ 軒高=ノキダカ ' +
      '許否=キョヒ 許与=キョヨ 繰延=クリノベ 戸建=コダテ 得喪=トクソウ 予納=ヨノウ 土石流=ドセキリュウ 元利払=ガンリバライ ' +
      '擁壁=ヨウヘキ 模様替=モヨウガエ 建替=タテカエ 求償=キュウショウ 崖錐=ガイスイ 問数=モンスウ 日影=ニチエイ 接道=セツドウ ' +
      '引張=ヒッパリ 遺贈=イゾウ 浸入=シンニュウ 備付=ソナエツケ 含水率=ガンスイリツ 先後=センゴ 風致=フウチ 誤信=ゴシン ' +
      '終期=シュウキ 細目=サイモク 減縮=ゲンシュク 威迫=イハク 地下街=チカガイ 口授=クジュ 墓園=ボエン 地目=チモク ' +
      '要否=ヨウヒ 砂質=サシツ 養親子=ヨウシンシ 滅失=メッシツ 支配力=シハイリョク 住家=ジュウカ 永小作権=エイコサクケン 心裡留保=シンリリュウホ ' +
      '地役権=チエキケン 防火壁=ボウカヘキ 近傍類地=キンボウルイチ 扇頂部=センチョウブ 確答=カクトウ 緊結=キンケツ 畳数=ジョウスウ 構法=コウホウ ' +
      '庭球場=テイキュウジョウ 入会権=イリアイケン 催告=サイコク 被用者=ヒヨウシャ 廃除=ハイジョ 代襲=ダイシュウ 質権=シチケン 階建=カイダテ ' +
      '釣合=ツリアイ 遺留分=イリュウブン 過去問=カコモン 詐欺罪=サギザイ 特則=トクソク 死産=シザン 権原=ケンゲン 従物=ジュウブツ ' +
      '市町村道=シチョウソンドウ 差止=サシトメ 始期付=シキツキ 壁心=ヘキシン 原状=ゲンジョウ 剥落=ハクラク 公売=コウバイ 賃貸借=チンタイシャク ' +
      '転貸借=テンタイシャク 馬蹄形=バテイケイ 防錆=ボウセイ 結了=ケツリョウ 次順位=ジジュンイ 採草=サイソウ 復代理=フクダイリ 付合物=フゴウブツ ' +
      '切土=キリド 先取特権=サキドリトッケン 明渡=アケワタシ 要役地=ヨウエキチ 規準=キジュン 事理弁識=ジリベンシキ 承役地=ショウエキチ 顕名=ケンメイ ' +
      '隣地=リンチ 適否=テキヒ 耐力壁=タイリョクヘキ 耐力=タイリョク 申述=シンジュツ 照応=ショウオウ 持家=モチイエ 緩傾斜=カンケイシャ ' +
      '締固=シメカタメ 母数=ボスウ 書換=カキカエ 得点源=トクテンゲン 存否=ソンピ 双務=ソウム 全血=ゼンケツ 信義則=シンギソク ' +
      '除却=ジョキャク 過怠税=カタイゼイ 急迫=キュウハク 遺言=イゴン 後順位=コウジュンイ 先順位=センジュンイ 常況=ジョウキョウ 危険物=キケンブツ ' +
      '鉄骨造=テッコツゾウ 立退料=タチノキリョウ 旧河道=キュウカドウ 靱性=ジンセイ 現場助勢=ゲンバジョセイ 双方向=ソウホウコウ 目的物=モクテキブツ 差押=サシオサエ ' +
      '軽易=ケイイ 随伴性=ズイハンセイ 盛土=モリド 取壊=トリコワシ 共有物=キョウユウブツ 野球場=ヤキュウジョウ 買受=カイウケ 角地=カドチ ' +
      '自重=ジジュウ 欠缺=ケンケツ 避雷=ヒライ 自書=ジショ 背任罪=ハイニンザイ 傷害罪=ショウガイザイ 納期限=ノウキゲン 立木=リュウボク ' +
      '減歩=ゲンブ 水防法=スイボウホウ 毎葉=マイヨウ 売上高=ウリアゲダカ 制振=セイシン 代替物=ダイタイブツ 特定街区=トクテイガイク 競売=ケイバイ ' +
      '兄弟姉妹=ケイテイシマイ 取引態様=トリヒキタイヨウ 代執行=ダイシッコウ 直前期=チョクゼンキ 直上階=チョクジョウカイ 中高層=チュウコウソウ 主登記=シュトウキ 原賃貸借=ゲンチンタイシャク ' +
      '買換=カイカエ 熱膨張率=ネツボウチョウリツ 生産力=セイサンリョク 価格帯=カカクタイ 留置物=リュウチブツ 他人物=タニンブツ 基準日=キジュンビ 起算日=キサンビ ' +
      '施行日=シコウビ 指定日=シテイビ 試験日=シケンビ 耐火性=タイカセイ 必要的=ヒツヨウテキ 任意的=ニンイテキ 工作物=コウサクブツ 都府県=トフケン ' +
      '筆界=ヒッカイ 地上権=チジョウケン 配偶者=ハイグウシャ 表見=ヒョウケン 境界標=キョウカイヒョウ 供され=キョウサレ 供し=キョウシ 処せ=ショセ ' +
      '相当数=ソウトウスウ 問中=モンチュウ 日用品=ニチヨウヒン 拒め=コバメ 主たる=シュタル 満了日=マンリョウビ 調わ=トトノワ 相隣=ソウリン ' +
      '生ずべき=ショウズベキ 親等=シントウ 払戻=ハライモドシ 出向か=デムカ 営め=イトナメ 断定的=ダンテイテキ 第一次的=ダイイチジテキ 建造物=ケンゾウブツ ' +
      '設けれ=モウケレ 借換=カリカエ 上表=ジョウヒョウ 転貸主=テンタイヌシ 明渡し=アケワタシ 取壊し=トリコワシ 払戻し=ハライモドシ 建替え=タテカエ ' +
      '差押え=サシオサエ 書換え=カキカエ 借換え=カリカエ 備付け=ソナエツケ 買受け=カイウケ 引上げ=ヒキアゲ 引下げ=ヒキサゲ 取下げ=トリサゲ ' +
      '締固め=シメカタメ 差止め=サシトメ 階建て=カイダテ 戸建て=コダテ 元利払い=ガンリバライ 繰延べ=クリノベ コンクリート造=コンクリートゾウ 年1割=ネン1割 ' +
      '集会を開け=集会をヒラケ 提供=提供 優先順位=優先順位'
    ).split(' ').reduce((m, pair) => {
      const i = pair.indexOf('=');
      m[pair.slice(0, i)] = pair.slice(i + 1);
      return m;
    }, {});
    const ttsReadingRe = new RegExp(
      Object.keys(TTS_READINGS).sort((a, b) => b.length - a.length).join('|'), 'g');

    function ttsRead(text) {
      return text.replace(ttsReadingRe, w => TTS_READINGS[w]);
    }

    // 要素自身の文言（読み上げボタン・★バッジ・入れ子のリストは除く）
    function ttsOwnText(el) {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.tts-btn, .stars, ul, ol').forEach(n => n.remove());
      return ttsClean(clone.textContent);
    }

    function ttsCellText(cell) {
      const t = ttsClean(cell.textContent)
        .replace(/[○◯]/g, 'まる').replace(/×/g, 'ばつ').replace(/△/g, 'さんかく').replace(/◎/g, 'にじゅうまる');
      return (!t || /^[-−ー—–－]+$/.test(t)) ? 'なし' : t;
    }

    // 表は1行ずつ「列見出し、値。列見出し、値」の形で読む
    function ttsRowText(tr) {
      const table = tr.closest('table');
      const heads = Array.from(table.querySelectorAll('thead th')).map(th => ttsClean(th.textContent));
      return Array.from(tr.children)
        .map((cell, i) => (heads[i] ? heads[i] + '、' : '') + ttsCellText(cell))
        .join('。');
    }

    function ttsSplit(text) {
      const out = [];
      let buf = '';
      const push = (piece) => {
        if (buf && buf.length + piece.length > TTS_CHUNK_MAX) { out.push(buf); buf = ''; }
        buf += piece;
      };
      (text.match(/[^。！？]+[。！？]*/g) || [text]).forEach(s => {
        if (s.length <= TTS_CHUNK_MAX) { push(s); return; }
        (s.match(/[^、]+、*/g) || [s]).forEach(push);
      });
      if (buf) out.push(buf);
      return out;
    }

    function ttsBuildQueue(chapter) {
      const items = [];
      chapter.querySelectorAll('h2, h3, h4, h5, p, li, tbody tr').forEach(el => {
        if (el.tagName === 'P' && el.closest('li')) return;   // li 側でまとめて読む
        const text = el.tagName === 'TR' ? ttsRowText(el) : ttsOwnText(el);
        if (!text) return;
        items.push({ el, chunks: ttsSplit(ttsRead(text)), head: el.tagName === 'H2' || el.tagName === 'H3' });
      });
      return items;
    }

    function ttsPickVoice() {
      const ja = ttsSynth.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang));
      ttsVoice = ja.find(v => v.default) || ja.find(v => v.localService) || ja[0] || null;
    }
    ttsPickVoice();
    if (typeof ttsSynth.addEventListener === 'function') ttsSynth.addEventListener('voiceschanged', ttsPickVoice);
    else ttsSynth.onvoiceschanged = ttsPickVoice;

    // --- 操作バー ---
    const ttsBar = document.createElement('div');
    ttsBar.className = 'tts-bar';
    ttsBar.hidden = true;
    ttsBar.setAttribute('role', 'region');
    ttsBar.setAttribute('aria-label', '読み上げ操作');
    ttsBar.innerHTML =
      '<button type="button" class="tts-bar-btn" data-act="prev" title="前の節" aria-label="前の節">⏮</button>' +
      '<button type="button" class="tts-bar-btn tts-bar-toggle" data-act="toggle" title="一時停止" aria-label="一時停止">⏸</button>' +
      '<button type="button" class="tts-bar-btn" data-act="next" title="次の節" aria-label="次の節">⏭</button>' +
      '<button type="button" class="tts-bar-btn" data-act="stop" title="停止" aria-label="停止">■</button>' +
      '<select class="tts-rate" aria-label="読み上げ速度">' +
      TTS_RATES.map(r => '<option value="' + r + '"' + (r === ttsRate ? ' selected' : '') + '>' + r + 'x</option>').join('') +
      '</select>' +
      '<span class="tts-title"></span>';
    document.body.appendChild(ttsBar);
    const ttsToggleBtn = ttsBar.querySelector('.tts-bar-toggle');
    const ttsTitle = ttsBar.querySelector('.tts-title');

    function ttsHeadIndex(pos) {
      for (let i = Math.min(pos, ttsQueue.length - 1); i >= 0; i--) {
        if (ttsQueue[i].head) return i;
      }
      return -1;
    }

    function ttsUpdateBar() {
      const paused = ttsState === 'paused';
      ttsBar.hidden = ttsState === 'idle';
      document.body.classList.toggle('tts-active', ttsState !== 'idle');
      ttsToggleBtn.textContent = paused ? '▶' : '⏸';
      ttsToggleBtn.title = paused ? '再開' : '一時停止';
      ttsToggleBtn.setAttribute('aria-label', ttsToggleBtn.title);
      document.querySelectorAll('.tts-btn.is-playing').forEach(b => b.classList.remove('is-playing'));
      const hi = ttsState === 'idle' ? -1 : ttsHeadIndex(ttsPos);
      if (hi === -1) { ttsTitle.textContent = ''; return; }
      const head = ttsQueue[hi].el;
      ttsTitle.textContent = ttsOwnText(head);
      const btn = head.querySelector('.tts-btn');
      if (btn) btn.classList.add('is-playing');
    }

    function ttsMark(item) {
      if (ttsMarked) ttsMarked.classList.remove('tts-reading');
      ttsMarked = item ? item.el : null;
      if (!ttsMarked) return;
      ttsMarked.classList.add('tts-reading');
      const r = ttsMarked.getBoundingClientRect();
      if (r.top < 72 || r.bottom > window.innerHeight - 96) {
        ttsMarked.scrollIntoView({
          block: r.height > window.innerHeight * 0.6 ? 'start' : 'center',
          inline: 'nearest',
          behavior: 'smooth'
        });
      }
    }

    function ttsSpeak() {
      const item = ttsQueue[ttsPos];
      if (!item) { ttsStop(); return; }   // 章末
      const token = ++ttsToken;
      const u = new SpeechSynthesisUtterance(item.chunks[ttsChunk]);
      u.lang = 'ja-JP';
      if (ttsVoice) u.voice = ttsVoice;
      u.rate = ttsRate;
      u.onend = () => {
        if (token !== ttsToken) return;
        if (ttsChunk + 1 < item.chunks.length) ttsChunk++;
        else { ttsPos++; ttsChunk = 0; }
        ttsSpeak();
      };
      u.onerror = () => { if (token === ttsToken) ttsStop(); };
      ttsUtter = u;
      ttsMark(item);
      ttsUpdateBar();
      ttsSynth.speak(u);
    }

    function ttsSilence() {
      ttsToken++;
      ttsSynth.cancel();
    }

    function ttsStart(heading) {
      const chapter = heading.closest('.chapter');
      ttsSilence();
      ttsQueue = ttsBuildQueue(chapter);
      ttsPos = Math.max(0, ttsQueue.findIndex(it => it.el === heading));
      ttsChunk = 0;
      ttsState = 'playing';
      ttsSpeak();
    }

    // pause()/resume() は Android Chrome で効かないため、cancel して同じ発話単位から読み直す
    function ttsPause() {
      if (ttsState !== 'playing') return;
      ttsSilence();
      ttsState = 'paused';
      ttsUpdateBar();
    }

    function ttsResume() {
      if (ttsState !== 'paused') return;
      ttsState = 'playing';
      ttsSpeak();
    }

    function ttsStop() {
      ttsSilence();
      ttsState = 'idle';
      ttsQueue = [];
      ttsUtter = null;
      ttsMark(null);
      ttsUpdateBar();
    }

    function ttsJump(dir) {
      if (ttsState === 'idle') return;
      let target = -1;
      if (dir > 0) {
        target = ttsQueue.findIndex((it, i) => i > ttsPos && it.head);
        if (target === -1) return;      // 最後の節
      } else {
        const cur = ttsHeadIndex(ttsPos);
        const prev = cur > 0 ? ttsHeadIndex(cur - 1) : -1;
        target = prev !== -1 ? prev : Math.max(cur, 0);
      }
      ttsSilence();
      ttsPos = target;
      ttsChunk = 0;
      if (ttsState === 'playing') { ttsSpeak(); return; }
      ttsMark(ttsQueue[ttsPos]);
      ttsUpdateBar();
    }

    ttsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'toggle') { if (ttsState === 'paused') ttsResume(); else ttsPause(); }
      else if (act === 'stop') ttsStop();
      else ttsJump(act === 'next' ? 1 : -1);
    });
    ttsBar.querySelector('.tts-rate').addEventListener('change', (e) => {
      ttsRate = parseFloat(e.target.value);
      localStorage.setItem(TTS_RATE_KEY, String(ttsRate));
      if (ttsState === 'playing') { ttsSilence(); ttsSpeak(); }
    });

    // 章見出し（h2）・節見出し（h3）へ ▶ を付ける。textContent を汚さないよう文字は CSS 側で描く
    document.querySelectorAll('.chapter').forEach(ch => {
      if (!isTtsChapter(ch)) return;
      ch.querySelectorAll('h2, h3').forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tts-btn';
        btn.title = 'ここから読み上げ';
        btn.setAttribute('aria-label', 'ここから読み上げ');
        h.appendChild(btn);
      });
    });
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.tts-btn');
      if (!btn) return;
      const heading = btn.parentElement;
      if (!heading.closest('.chapter') || heading.closest('.quiz-overlay')) return;
      ttsStart(heading);
    });

    // 演習モーダルを開いたら一時停止
    document.querySelectorAll('.quiz-overlay').forEach(ov => {
      new MutationObserver(() => {
        if (ov.classList.contains('visible')) ttsPause();
      }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    });

    // リロード・離脱後も読み続けるブラウザがあるため明示的に止める
    ttsSynth.cancel();
    window.addEventListener('pagehide', () => ttsSynth.cancel());
  }

  // --- Active TOC highlight + Notes sync ---
  // --- ページ内検索（サイドバー常設 / 本文のみ）---
  const searchbar = document.getElementById('searchbar');
  const searchInput = document.getElementById('search-input');
  const searchCount = document.getElementById('search-count');
  const searchPrevBtn = document.getElementById('search-prev');
  const searchNextBtn = document.getElementById('search-next');
  const searchClearBtn = document.getElementById('search-close');
  const SEARCH_LIMIT = 1000;          // ハイライト上限（1文字検索でのフリーズ防止）
  const SEARCH_DEBOUNCE = 200;
  let searchHits = [];                // 挿入した <mark> 要素
  let searchIndex = -1;
  let searchTruncated = false;
  let searchTimer = null;
  let searchComposing = false;        // IME 変換中

  function anyModalOpen() {
    return !!document.querySelector('.quiz-overlay.visible');
  }

  // <mark> を外して元のテキストノードに戻す（normalize まで行い DOM を検索前と同一にする）
  function clearSearchHighlights() {
    const parents = new Set();
    searchHits.forEach(mark => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parents.add(parent);
    });
    parents.forEach(p => p.normalize());
    searchHits = [];
    searchIndex = -1;
    searchTruncated = false;
  }

  function searchTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const tag = node.parentNode && node.parentNode.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  // 本文（.chapter 配下）のテキストノードを走査して <mark class="search-hit"> で包む。
  // 単一テキストノード内のマッチのみ拾う（<strong> 等でタグが割れた語は対象外）。
  function highlightSearch(term) {
    const needleLower = term.toLowerCase();
    const chapters = main.querySelectorAll('.chapter');
    for (let c = 0; c < chapters.length; c++) {
      const nodes = searchTextNodes(chapters[c]);
      for (let i = 0; i < nodes.length; i++) {
        const raw = nodes[i].nodeValue;
        const lower = raw.toLowerCase();
        // toLowerCase で文字数が変わる稀な文字を含む場合は大文字小文字を区別して検索
        const caseless = lower.length === raw.length;
        const hay = caseless ? lower : raw;
        const needle = caseless ? needleLower : term;
        let target = nodes[i];
        let consumed = 0;   // target の先頭が raw 上のどの位置か
        let from = 0;
        let idx;
        while ((idx = hay.indexOf(needle, from)) !== -1) {
          const matched = target.splitText(idx - consumed);
          const rest = matched.splitText(needle.length);
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          matched.parentNode.replaceChild(mark, matched);
          mark.appendChild(matched);
          searchHits.push(mark);
          if (searchHits.length >= SEARCH_LIMIT) {
            searchTruncated = true;
            return;
          }
          target = rest;
          consumed = idx + needle.length;
          from = consumed;
        }
      }
    }
  }

  function updateSearchCount() {
    const total = searchHits.length + (searchTruncated ? '+' : '');
    const current = searchHits.length ? searchIndex + 1 : 0;
    searchCount.textContent = current + ' / ' + total;
    const noHit = searchHits.length === 0;
    searchPrevBtn.disabled = noHit;
    searchNextBtn.disabled = noHit;
  }

  // closeNav: 手動ナビ（Enter / 上下ボタン）時のみ true。スマホではジャンプ後にサイドバーを閉じる
  function setSearchCurrent(i, closeNav) {
    if (!searchHits.length) {
      searchIndex = -1;
      updateSearchCount();
      return;
    }
    if (searchIndex >= 0 && searchHits[searchIndex]) {
      searchHits[searchIndex].classList.remove('is-current');
    }
    searchIndex = (i % searchHits.length + searchHits.length) % searchHits.length;
    const el = searchHits[searchIndex];
    el.classList.add('is-current');
    if (closeNav && isMobile()) closeSidebar();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    updateSearchCount();
  }

  function runSearch() {
    clearSearchHighlights();
    const term = searchInput.value;
    if (!term) {
      searchbar.classList.remove('is-empty');
      updateSearchCount();
      return;
    }
    highlightSearch(term);
    searchbar.classList.toggle('is-empty', searchHits.length === 0);
    if (searchHits.length) setSearchCurrent(0, false);
    else updateSearchCount();
  }

  function scheduleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, SEARCH_DEBOUNCE);
  }

  // Ctrl+F: サイドバーの検索欄へフォーカス（スマホではサイドバーを開く）
  function focusSearch() {
    if (isMobile() && !sidebar.classList.contains('open')) toggleSidebar();
    searchInput.focus();
    searchInput.select();
  }

  function clearSearch() {
    clearTimeout(searchTimer);
    clearSearchHighlights();
    searchInput.value = '';
    searchbar.classList.remove('is-empty');
    updateSearchCount();
  }

  if (searchbar && searchInput) {
    searchInput.addEventListener('compositionstart', () => { searchComposing = true; });
    searchInput.addEventListener('compositionend', () => {
      searchComposing = false;
      scheduleSearch();
    });
    searchInput.addEventListener('input', () => {
      if (!searchComposing) scheduleSearch();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (searchComposing || e.isComposing) return;   // 変換確定の Enter は無視
      if (!searchHits.length) {
        clearTimeout(searchTimer);
        runSearch();
        return;
      }
      setSearchCurrent(searchIndex + (e.shiftKey ? -1 : 1), true);
    });
    searchNextBtn.addEventListener('click', () => setSearchCurrent(searchIndex + 1, true));
    searchPrevBtn.addEventListener('click', () => setSearchCurrent(searchIndex - 1, true));
    searchClearBtn.addEventListener('click', () => {
      clearSearch();
      searchInput.focus();
    });

    // capture フェーズで拾い、Esc が既存ハンドラ（サイドバー/モーダル閉じ）へ伝播しないようにする
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        if (anyModalOpen()) return;   // クイズ系モーダル表示中はブラウザ標準の検索に委ねる
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key === 'Escape' && (searchInput.value || searchHits.length)) {
        clearSearch();
        // モーダル表示中はそのまま伝播させ、既存ハンドラでモーダルも閉じる
        if (!anyModalOpen()) {
          e.preventDefault();
          e.stopPropagation();
          searchInput.blur();
        }
      }
    }, true);

    updateSearchCount();
  }

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
