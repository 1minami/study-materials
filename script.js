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
