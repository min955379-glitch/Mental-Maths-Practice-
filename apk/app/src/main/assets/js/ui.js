(function () {
  'use strict';
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) { for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'dataset' && attrs[k]) { for (const dk in attrs[k]) e.dataset[dk] = attrs[k][dk]; }
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] === false || attrs[k] == null) {}
      else e.setAttribute(k, attrs[k]);
    } }
    if (children) { (Array.isArray(children) ? children : [children]).forEach(c => { if(c==null) return; if(typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }); }
    return e;
  }
  function clear(node) { while(node.firstChild) node.removeChild(node.firstChild); }
  // ---------------------------------------------------------------------------
  // In-app confirmation dialog
  // Replaces the native browser confirm() so confirmations match the app's
  // design system, work offline in the APK, and can be driven by tests.
  // ---------------------------------------------------------------------------
  let confirmResolver = null;
  let confirmReturnFocus = null;
  let confirmWired = false;

  function confirmDialog(opts) {
    opts = opts || {};
    const modal = document.getElementById('confirmModal');
    // No modal in the DOM: never fall back to the native confirm() (it is
    // blocked inside the app's WebView and breaks the design system). Decline
    // instead - every caller treats false as "stay where you are".
    if (!modal) {
      console.warn('confirmDialog: #confirmModal is missing; declining', opts.message || '');
      return Promise.resolve(false);
    }
    if (!confirmWired) {
      confirmWired = true;
      modal.addEventListener('click', (ev) => { if (ev.target === modal) closeConfirm(false); });
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && !modal.hidden) closeConfirm(false);
      });
    }
    const box = modal.querySelector('.modal');
    document.getElementById('confirmTitle').textContent = opts.title || 'Are you sure?';
    document.getElementById('confirmMessage').textContent = opts.message || '';
    // Rebind the two buttons on every call by replacing them with fresh nodes.
    // A listener attached only once is lost if the markup is ever re-created,
    // and the click silently does nothing - which is exactly how the Discard
    // button used to fail. Cloning also makes duplicate handlers impossible.
    const ok = rebindButton('confirmOk', () => closeConfirm(true));
    const cancel = rebindButton('confirmCancel', () => closeConfirm(false));
    if (!ok || !cancel) { console.warn('confirmDialog: modal buttons are missing'); }
    ok.textContent = opts.confirmLabel || 'Confirm';
    cancel.textContent = opts.cancelLabel || 'Cancel';
    ok.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
    if (box) box.classList.toggle('danger', !!opts.danger);
    confirmReturnFocus = document.activeElement;
    modal.hidden = false;
    const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
    raf(() => modal.classList.add('show'));
    try { ok.focus(); } catch (e) { /* focus is best-effort */ }
    return new Promise((resolve) => { confirmResolver = resolve; });
  }

  // Replace a button with a fresh clone carrying exactly one click handler.
  function rebindButton(id, handler) {
    const old = document.getElementById(id);
    if (!old || !old.parentNode) return null;
    const fresh = old.cloneNode(true);
    fresh.addEventListener('click', handler);
    old.parentNode.replaceChild(fresh, old);
    return fresh;
  }

  function closeConfirm(result) {
    const modal = document.getElementById('confirmModal');
    if (!modal || modal.hidden) return;
    modal.classList.remove('show');
    modal.hidden = true;
    const resolve = confirmResolver; confirmResolver = null;
    if (confirmReturnFocus && confirmReturnFocus.focus) {
      try { confirmReturnFocus.focus(); } catch (e) { /* best-effort */ }
    }
    confirmReturnFocus = null;
    if (resolve) resolve(result);
  }

  let toastTimer = null;
  function showToast(message, type) {
    const t = document.getElementById('toast'); if(!t) return;
    // Cancel any pending hide: previously a second toast shown within 2.4s was
    // wiped out by the first toast's timer.
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    t.textContent = message; t.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(() => {
      t.className = 'toast' + (type ? ' ' + type : '');
      toastTimer = null;
    }, 2400);
  }
  function setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach(n => { n.classList.toggle('active', n.dataset.route === route); });
  }
  function closeSidenav() {
    const sidenav = document.getElementById('sidenav'); if (sidenav) sidenav.classList.remove('open');
    const scrim = document.getElementById('scrim'); if (scrim) scrim.classList.remove('show');
    const toggle = document.getElementById('navToggle'); if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  function renderLanding(main) { const tpl = document.getElementById('tpl-landing'); main.appendChild(tpl.content.cloneNode(true)); }
  function greeting() { const h = new Date().getHours(); if(h<5) return 'Working late'; if(h<12) return 'Good morning'; if(h<17) return 'Good afternoon'; if(h<21) return 'Good evening'; return 'Good night'; }
  function modeLabel(s) {
    const map = { quick:'Quick Practice', timed:'Timed Quiz', fulltest:'Full Test', category:'Category Practice', weak:'Weak Areas', mistakes:'Mistake Review' };
    let base = map[s.mode] || 'Practice';
    if(s.category) base += ' - ' + s.category;
    return base;
  }

  // Permanently delete one unfinished quiz and refresh whatever is on screen.
  // The deletion is real (persisted storage), it never touches completed
  // history or the user's statistics, and it only ever removes the one
  // session whose id it was given.
  function discardUnfinished(snap) {
    const id = snap && snap.id;
    const key = String(id);
    const engine = window.QuizEngine && window.QuizEngine.Quiz;
    // If the discarded session is the one running right now, stop it first so
    // a stray tick cannot re-save it a moment after we delete it.
    if (engine && engine.current && String(engine.current.id) === key) {
      try { engine.stopTimer(); } catch (e) { /* ignore */ }
      engine.current = null;
      engine.progress = null;
      if (typeof engine._detachCallbacks === 'function') engine._detachCallbacks();
    }

    // Delete from the SAME store Continue Quiz reads from, then prove it.
    let removed = false;
    try { removed = StateStore.removeUnfinished(key); } catch (e) { removed = false; }
    if (!removed && snap) {
      // The stored copy can disagree with the snapshot the card was built
      // from (an id that round-tripped as a number, or a re-save that changed
      // the object). Match the quiz itself so the tap is never a no-op.
      const fingerprint = (x) => [
        x.mode || '', x.startedAt || '', x.count || 0,
        Array.isArray(x.questionIds) ? x.questionIds.join(',') : '',
      ].join('|');
      const want = fingerprint(snap);
      const twin = StateStore.getUnfinished().find((x) => String(x.id) !== key && fingerprint(x) === want)
        || StateStore.getUnfinished().find((x) => x.startedAt && x.startedAt === snap.startedAt && x.mode === snap.mode);
      if (twin) {
        try { removed = StateStore.removeUnfinished(twin.id); } catch (e) { removed = false; }
      }
    }

    // Re-render into the LIVE host: the node captured when the card was built
    // can be stale if the dashboard was rendered again afterwards, and a
    // re-render into a detached node would look like "nothing happened".
    const liveHost = document.getElementById('continueQuizHost');
    if (liveHost) renderContinueQuiz(liveHost);
    else route('/dashboard');
    const left = StateStore.getUnfinished().length;
    const section = document.getElementById('continueSection');
    if (section) section.hidden = (left === 0);
    // Never leave the user guessing: say what was removed and what is left.
    if (removed) {
      showToast(left
        ? `Quiz discarded. ${left} unfinished ${left === 1 ? 'quiz' : 'quizzes'} left.`
        : 'Quiz discarded. Continue Quiz is now empty.', 'success');
    } else {
      showToast('That quiz was already removed.', 'error');
    }
    return removed;
  }

  // -- Continue Quiz card ---------------------------------------------------
  // Renders a list of unfinished sessions into a host element.
  // The most recent unfinished quiz is shown prominently; the rest go
  // in a collapsible "Other unfinished quizzes" list.
  function renderContinueQuiz(host) {
    if (!host) return;
    clear(host);
    const unfinished = StateStore.getUnfinished();
    // Make the section title visible only if there's something to show.
    const sectionTitle = document.getElementById('continueSection');
    if (sectionTitle) sectionTitle.hidden = (unfinished.length === 0);
    if (!unfinished.length) return;
    // The store returns sorted by lastSavedAt desc, so the first is the most recent.
    const primary = unfinished[0];
    const others = unfinished.slice(1);

    function buildCard(snap, isPrimary) {
      const total = (snap.questionCache || []).length || snap.count || 0;
      if (!total) return null;
      const idx = Math.min(snap.currentIndex || 0, Math.max(0, total - 1));
      const answered = (snap.progress && Array.isArray(snap.progress.entries))
        ? snap.progress.entries.filter(e => e && (e.userAnswer !== '' && e.userAnswer != null || e.isCorrect)).length
        : idx;
      const remaining = Math.max(0, total - answered);
      const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
      const title = modeLabel(snap);
      const card = el('div', {class: 'continue-card card' + (isPrimary ? ' primary' : '')});
      card.setAttribute('data-session-id', String(snap.id));
      const head = el('div', {class: 'continue-head'});
      head.appendChild(el('span', {class: 'continue-icon', html: window.Icons.play}));
      const meta = el('div', {class: 'continue-meta'});
      meta.appendChild(el('h3', null, isPrimary ? 'Continue Quiz' : 'Unfinished quiz'));
      meta.appendChild(el('div', {class: 'continue-sub'}, title));
      head.appendChild(meta);
      card.appendChild(head);
      const stats = el('div', {class: 'continue-stats'});
      stats.appendChild(el('span', {class: 'cs-pill'}, answered + ' / ' + total + ' completed'));
      stats.appendChild(el('span', {class: 'cs-pill soft'}, pct + '%'));
      stats.appendChild(el('span', {class: 'cs-pill soft'}, remaining + ' remaining'));
      if (snap.timeLimitSec && snap.remainingSec != null) {
        stats.appendChild(el('span', {class: 'cs-pill soft'}, Stats.formatMs(snap.remainingSec * 1000) + ' left'));
      }
      card.appendChild(stats);
      const bar = el('div', {class: 'quiz-progressbar'});
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(pct));
      const fill = el('span'); fill.style.width = pct + '%'; bar.appendChild(fill);
      card.appendChild(bar);
      const actions = el('div', {class: 'continue-actions'});
      const contBtn = el('button', {class: 'btn btn-primary', type: 'button', onclick: () => { location.hash = '#/resume?id=' + encodeURIComponent(snap.id); }});
      contBtn.appendChild(el('span', {class: 'btn-icon', html: window.Icons.play}));
      contBtn.appendChild(document.createTextNode(' ' + (isPrimary ? 'Continue Quiz' : 'Resume')));
      actions.appendChild(contBtn);
      const discardBtn = el('button', {class: 'btn btn-ghost', type: 'button', onclick: () => {
        confirmDialog({
          title: 'Discard this quiz?',
          message: 'Your progress will be lost and the quiz will be removed from Continue Quiz.',
          confirmLabel: 'Discard Quiz',
          cancelLabel: 'Keep It',
          danger: true,
        }).then((yes) => {
          if (!yes) return;      // "Keep It": close and change nothing
          discardUnfinished(snap);
        });
      }}, 'Discard');
      actions.appendChild(discardBtn);
      card.appendChild(actions);
      return card;
    }

    const primaryCard = buildCard(primary, true);
    if (primaryCard) host.appendChild(primaryCard);
    if (others.length) {
      const wrap = el('div', {class: 'continue-others'});
      const summary = el('details');
      const sum = el('summary', null, 'Other unfinished quizzes (' + others.length + ')');
      summary.appendChild(sum);
      const body = el('div', {class: 'continue-others-body'});
      others.forEach(s => { const c = buildCard(s, false); if (c) body.appendChild(c); });
      summary.appendChild(body);
      sum.setAttribute('aria-expanded', 'false');
      summary.addEventListener('toggle', () => sum.setAttribute('aria-expanded', summary.open ? 'true' : 'false'));
      wrap.appendChild(summary);
      host.appendChild(wrap);
    }
  }

  function renderDashboard(main) {
    const tpl = document.getElementById('tpl-dashboard'); main.appendChild(tpl.content.cloneNode(true));
    const t = Stats.totals(); const u = StateStore.getUser();
    const greet = greeting();
    document.getElementById('dashGreeting').textContent = u ? (greet + ', ' + u.name.split(' ')[0]) : greet;
    document.getElementById('dashStreak').textContent = Stats.dailyStreak() + '-day streak';
    document.getElementById('kpiAccuracy').textContent = t.total ? t.accuracy + '%' : '-';
    document.getElementById('kpiSolved').textContent = t.total;
    document.getElementById('kpiAvgTime').textContent = t.total ? Stats.formatTime(t.avgMs) : '-';
    const best = Stats.bestScore();
    document.getElementById('kpiBest').textContent = best == null ? '-' : best + '%';
    // Render the Continue Quiz card if any unfinished sessions exist.
    const continueHost = document.getElementById('continueQuizHost');
    if (continueHost) renderContinueQuiz(continueHost);
    const cats = Stats.categoryStats(); const list = document.getElementById('categoryBars'); const empty = document.getElementById('categoryEmpty');
    if (cats.length === 0) { empty.hidden = false; }
    else { empty.hidden = true; cats.forEach(c => { const row = el('div', {class:'bar-row'}); row.appendChild(el('span', {class:'bar-name'}, c.category)); const track = el('div', {class:'bar-track'}); const fill = el('div', {class:'bar-fill'}); fill.style.width = c.accuracy + '%'; track.appendChild(fill); row.appendChild(track); row.appendChild(el('span', {class:'bar-pct'}, c.accuracy + '%')); list.appendChild(row); }); }
    const recent = Stats.recentSessions(5); const ra = document.getElementById('recentActivity');
    if (recent.length === 0) { ra.innerHTML = '<p class="muted">No sessions yet. Start a practice to see your activity here.</p>'; }
    else { clear(ra); recent.forEach(s => { const score = Math.round((s.correct/Math.max(1,s.count))*100); const item = el('div', {class:'history-item'}); item.appendChild(el('div', {class:'hi-mode'}, modeLabel(s))); item.appendChild(el('div', {class:'hi-score'}, s.correct+'/'+s.count+' - '+score+'%')); item.appendChild(el('div', {class:'hi-time'}, new Date(s.startedAt).toLocaleString())); ra.appendChild(item); }); }
  }
  function renderCategories(main) { const tpl = document.getElementById('tpl-categories'); main.appendChild(tpl.content.cloneNode(true)); const grid = document.getElementById('catGrid'); const counts = {}; (window.QUESTIONS || []).forEach(q => { counts[q.category] = (counts[q.category] || 0) + 1; }); window.CATEGORIES.forEach(cat => { const card = el('button', {class:'cat-card', type:'button', onclick:() => { location.hash = '#/setup?mode=category&cat=' + encodeURIComponent(cat); }}); card.appendChild(el('h3', null, cat));       const seeded = counts[cat] || 0;
      card.appendChild(el('div', {class:'cat-meta'}, seeded ? (seeded + ' seeded questions') : 'Generator only - unlimited questions')); grid.appendChild(card); }); }
  // ------------------------------------------------- pre-quiz difficulty chooser
  const DIFF_META = {
    Easy: {
      blurb: 'One clear step. The shortcut is visible as soon as you read it.',
      icon: '<path d="M5 19V11M12 19V5M19 19v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    },
    Medium: {
      blurb: 'Two steps, or a pattern you have to simplify before it becomes easy.',
      icon: '<path d="M5 19V9M12 19V5M19 19v-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    },
    Hard: {
      blurb: 'Multi-step reasoning, reverse problems and chained percentage changes.',
      icon: '<path d="M5 19V7M12 19V5M19 19v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    }
  };

  function modeHeading(mode, cat) {
    if (mode === 'category' && cat) return cat;
    if (mode === 'quick') return 'Quick Practice';
    if (mode === 'timed') return 'Timed Quiz';
    if (mode === 'fulltest') return 'Full Test';
    if (mode === 'weak') return 'Weak Areas';
    if (mode === 'mistakes') return 'Mistake Review';
    return 'Practice';
  }
  function modeSubtitle(mode, cat) {
    if (mode === 'category' && cat) return '10 questions from ' + cat + '. Choose how hard they should be.';
    if (mode === 'timed') return '20 questions, 10 minutes on the clock.';
    if (mode === 'fulltest') return '50 questions across every category.';
    if (mode === 'weak') return 'Drawn from the categories you score lowest on.';
    if (mode === 'mistakes') return 'Questions you previously got wrong, plus fresh ones on the same topics.';
    return '10 questions with instant feedback.';
  }
  function seededCount(cat, difficulty) {
    return (window.QUESTIONS || []).filter(q => (!cat || q.category === cat) && q.difficulty === difficulty).length;
  }

  function renderSetup(main, opts) {
    opts = opts || {};
    const mode = ['quick','timed','fulltest','category','weak','mistakes'].indexOf(opts.mode) !== -1 ? opts.mode : 'quick';
    const cat = (window.CATEGORIES || []).indexOf(opts.cat) !== -1 ? opts.cat : '';
    clear(main);
    const tpl = document.getElementById('tpl-setup');
    main.appendChild(tpl.content.cloneNode(true));

    document.getElementById('setupHeading').textContent = 'Choose your difficulty';
    document.getElementById('setupEyebrow').textContent = cat ? 'Category practice' : modeHeading(mode, cat);
    document.getElementById('setupSub').textContent = modeSubtitle(mode, cat);

    const stats = window.Stats.difficultyStats(cat || null);
    const rec = window.Stats.recommendedDifficulty(cat || null);
    document.getElementById('setupRecommend').textContent = 'Recommended: ' + rec.difficulty + ' - ' + rec.reason;

    const grid = document.getElementById('difficultyGrid');
    ['Easy', 'Medium', 'Hard'].forEach(diff => {
      const meta = DIFF_META[diff];
      const stat = stats.find(x => x.difficulty === diff) || { attempts: 0, accuracy: 0 };
      const available = seededCount(cat, diff);
      const card = el('button', {
        class: 'diff-card' + (rec.difficulty === diff ? ' recommended' : ''),
        type: 'button',
        'data-difficulty': diff,
        onclick: () => { startQuiz(main, mode, { category: cat || null, difficulty: diff }); }
      });
      const head = el('div', { class: 'diff-head' });
      head.appendChild(el('span', { class: 'diff-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24">' + meta.icon + '</svg>' }));
      head.appendChild(el('h3', null, diff));
      if (rec.difficulty === diff) head.appendChild(el('span', { class: 'diff-badge' }, 'Recommended'));
      card.appendChild(head);
      card.appendChild(el('p', { class: 'diff-blurb' }, meta.blurb));

      const rows = el('div', { class: 'diff-stats' });
      rows.appendChild(el('span', null, available + ' questions ready'));
      rows.appendChild(el('span', null, stat.attempts
        ? 'Your accuracy: ' + stat.accuracy + '% over ' + stat.attempts
        : 'Not attempted yet'));
      card.appendChild(rows);

      const bar = el('div', { class: 'diff-bar' });
      const fill = el('span', null, '');
      fill.style.width = Math.max(0, Math.min(100, stat.accuracy)) + '%';
      bar.appendChild(fill);
      card.appendChild(bar);
      card.appendChild(el('span', { class: 'diff-cta' }, 'Start ' + diff));
      grid.appendChild(card);
    });

    document.getElementById('setupMixed').addEventListener('click', () => {
      startQuiz(main, mode, { category: cat || null, difficulty: 'Mixed' });
    });
  }

  function renderSettings(main) {
    const tpl = document.getElementById('tpl-settings'); main.appendChild(tpl.content.cloneNode(true));
    const s = StateStore.getSettings();
    document.getElementById('setTheme').value = s.theme; document.getElementById('setSound').checked = !!s.sound;
    document.getElementById('setTimer').checked = !!s.timerInPractice; document.getElementById('setHint').checked = !!s.hintMode;
    document.getElementById('setDifficulty').value = s.difficulty; document.getElementById('setCount').value = s.defaultCount;
    document.getElementById('setGoal').value = s.dailyGoal; document.getElementById('setMotion').checked = !!s.reducedMotion;
    // Upgrade the native <select>s to the custom dropdown once their values are
    // in place (the select itself stays the source of truth, so everything
    // below - and the save handler - keeps reading it exactly as before).
    if (window.AppSelect) window.AppSelect.enhanceAll(main);
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      StateStore.setSettings({ theme:document.getElementById('setTheme').value, sound:document.getElementById('setSound').checked, timerInPractice:document.getElementById('setTimer').checked, hintMode:document.getElementById('setHint').checked, difficulty:document.getElementById('setDifficulty').value, defaultCount:parseInt(document.getElementById('setCount').value,10)||10, dailyGoal:parseInt(document.getElementById('setGoal').value,10)||20, reducedMotion:document.getElementById('setMotion').checked });
      showToast('Settings saved', 'success'); applyTheme(); applyMotionPref();
    });
    document.getElementById('resetData').addEventListener('click', () => { confirmDialog({ title: 'Reset all data?', message: 'This will delete all local data, sessions, attempts, and your account. This cannot be undone.', confirmLabel: 'Reset Everything', cancelLabel: 'Cancel', danger: true }).then((yes) => { if(!yes) return; StateStore.resetAll(); localStorage.removeItem('iscsp-mm-accounts-v1'); showToast('All local data reset', 'success'); location.hash = '#/dashboard'; route('/dashboard'); }); });
  }
  function renderHistory(main) { const tpl = document.getElementById('tpl-history'); main.appendChild(tpl.content.cloneNode(true)); const list = document.getElementById('historyList'); const sessions = Stats.recentSessions(100); if(sessions.length === 0) { list.appendChild(el('p', {class:'muted'}, 'No sessions yet.')); return; } sessions.forEach(s => { const score = Math.round((s.correct/Math.max(1,s.count))*100); const item = el('div', {class:'history-item'}); item.appendChild(el('div', {class:'hi-mode'}, modeLabel(s))); item.appendChild(el('div', {class:'hi-score'}, s.correct+'/'+s.count+' - '+score+'% - '+Stats.formatTime(s.totalResponseTimeMs/Math.max(1,s.count)))); item.appendChild(el('div', {class:'hi-time'}, new Date(s.startedAt).toLocaleString())); item.appendChild(el('button', {class:'btn btn-ghost btn-sm', type:'button', onclick: () => { confirmDialog({ title: 'Delete this session?', message: 'The session will be removed from your quiz history.', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true }).then((yes) => { if(!yes) return; deleteSession(s.id); renderHistory(main); }); }}, 'Delete'));
    list.appendChild(item);
  }); }
  function deleteSession(id) {
    StateStore.deleteSession(id);
    StateStore.save();
  }
  function renderPatterns(main) {
    const tpl = document.getElementById('tpl-patterns'); main.appendChild(tpl.content.cloneNode(true));
    const list = document.getElementById('patternList'); const searchInput = document.getElementById('patternSearch');
    function draw(q) { clear(list); const matches = window.Patterns.search(q); if(matches.length === 0) { list.appendChild(el('p', {class:'muted'}, 'No patterns match your search.')); return; } matches.forEach(p => { const card = el('div', {class:'pattern-card'}); card.appendChild(el('h3', null, p.title)); const ul = el('ul'); p.items.forEach(it => ul.appendChild(el('li', null, it))); card.appendChild(ul); list.appendChild(card); }); }
    draw(''); searchInput.addEventListener('input', (e) => draw(e.target.value));
  }
  function renderCoach(main) { const tpl = document.getElementById('tpl-coach'); main.appendChild(tpl.content.cloneNode(true)); const out = document.getElementById('coachOutput'); const tips = window.Coach.advice(); if(tips.length === 0) out.appendChild(el('p', {class:'muted'}, 'No advice yet - complete a few practice questions first.')); tips.forEach(t => { const row = el('div', {class:'coach-msg'}); row.appendChild(el('h4', null, t.title)); row.appendChild(el('p', null, t.body)); out.appendChild(row); }); }
  function renderAuth(main) {
    const tpl = document.getElementById('tpl-auth'); main.appendChild(tpl.content.cloneNode(true));
    const loginForm = document.getElementById('loginForm'); const registerForm = document.getElementById('registerForm');
    document.querySelectorAll('.auth-tab').forEach(btn => { btn.addEventListener('click', () => { const tab = btn.dataset.tab; document.querySelectorAll('.auth-tab').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn); }); loginForm.hidden = (tab !== 'login'); registerForm.hidden = (tab !== 'register');
        const focusTarget = (tab === 'login' ? loginForm : registerForm).querySelector('input');
        if (focusTarget) { try { focusTarget.focus(); } catch (e) { /* focus is best-effort */ } }
      }); });
    const loginMsg = document.getElementById('loginMsg'); const registerMsg = document.getElementById('registerMsg');
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); loginMsg.textContent = ''; const fd = new FormData(loginForm); const res = await window.Auth.login({ email:fd.get('email'), password:fd.get('password') }); if(res.ok) { showToast('Welcome back', 'success'); location.hash = '#/dashboard'; route('/dashboard'); } else { loginMsg.textContent = res.msg; } });
    registerForm.addEventListener('submit', async (e) => { e.preventDefault(); registerMsg.textContent = ''; const fd = new FormData(registerForm); if(fd.get('password') !== fd.get('confirm')) { registerMsg.textContent = 'Passwords do not match.'; return; } const res = await window.Auth.register({ name:fd.get('name'), email:fd.get('email'), password:fd.get('password') }); if(res.ok) { showToast('Account created', 'success'); location.hash = '#/dashboard'; route('/dashboard'); } else { registerMsg.textContent = res.msg; } });
  }
  // Contact Us is static content, so the only thing the renderer has to do is
  // stamp the shared WhatsApp glyph into the two places that show it. The
  // button itself is a real link to the real wa.me URL - there is no
  // JavaScript click handler standing in for it.
  function renderContact(main) {
    const tpl = document.getElementById('tpl-contact');
    if (!tpl) return;
    main.appendChild(tpl.content.cloneNode(true));
    const icon = (window.Icons && window.Icons.whatsapp) || '';
    const chip = document.getElementById('waIcon');
    const btnIcon = document.getElementById('waBtnIcon');
    if (chip) chip.innerHTML = icon;
    if (btnIcon) btnIcon.innerHTML = icon;
  }

  function renderAccount(main) { const u = StateStore.getUser(); if(!u) { location.hash = '#/auth'; route('/auth'); return; } const tpl = document.getElementById('tpl-account'); main.appendChild(tpl.content.cloneNode(true)); const acc = window.Auth.getAccountDetails(); const t = Stats.totals(); document.getElementById('accName').textContent = acc.name; document.getElementById('accEmail').textContent = acc.email; document.getElementById('accSince').textContent = new Date(acc.since || acc.createdAt || Date.now()).toLocaleDateString(); document.getElementById('accSolved').textContent = t.total; document.getElementById('accAccuracy').textContent = t.total ? t.accuracy + '%' : '-'; document.getElementById('logoutBtn').addEventListener('click', () => { window.Auth.logout(); showToast('Signed out'); location.hash = '#/dashboard'; route('/dashboard'); }); }

  // -- Quiz screen ---------------------------------------------------------
  function startQuiz(main, mode, opts) {
    // Starting a new session while one is running would orphan the running
    // one; pause (i.e. save) it first so it stays on the dashboard.
    pauseActiveQuiz('');
    const session = window.QuizEngine.buildSession(mode, opts || {});
    if(!session.questionCache.length) { showToast('Could not build quiz. Try again.', 'error'); return; }
    // If a session with this id was previously saved as unfinished, the
    // store will have removed it. Save it now so that the very first
    // answer is enough to consider it a tracked in-progress quiz.
    window.QuizEngine.Quiz.start(session);
    renderQuizScreen(main, session, 0);
  }
  function resumeQuiz(main, snapshot) {
    if (!snapshot) { location.hash = '#/dashboard'; route('/dashboard'); return; }
    window.QuizEngine.Quiz.resume(snapshot);
    const session = window.QuizEngine.Quiz.current;
    renderQuizScreen(main, session, window.QuizEngine.Quiz.index);
  }
  function renderQuizScreen(main, session, index) {
    clear(main); const tpl = document.getElementById('tpl-quiz'); main.appendChild(tpl.content.cloneNode(true));
    const total = session.questionCache.length;
    document.getElementById('qProgress').textContent = 'Question ' + (index+1) + ' / ' + total;
    const fillEl = document.querySelector('#qProgressbar span');
    fillEl.style.width = Math.round((index/total)*100) + '%';
    document.getElementById('qProgressbar').setAttribute('aria-valuenow', String(Math.round((index/total)*100)));
    const settings = StateStore.getSettings();
    const timerWrap = document.getElementById('qTimer');
    const showTimer = session.timeLimitSec || settings.timerInPractice;
    // One painter for both kinds of quiz: countdown quizzes show the time
    // left, every other mode shows the elapsed session time. Both are read
    // from the engine's timestamp clock, so the value is correct the moment
    // the screen appears (including right after a resume).
    function paintTimer() {
      const t = document.getElementById('qTimerText');
      if (!t) return;
      const eng = window.QuizEngine.Quiz;
      const wrap = document.getElementById('qTimer');
      if (eng.isCountdown && eng.isCountdown()) {
        const sec = eng.remainingSec;
        t.textContent = Stats.formatClock(sec * 1000);
        if (wrap) wrap.classList.toggle('warn', sec <= 30);
      } else {
        t.textContent = Stats.formatClock(eng.elapsedMsNow());
        if (wrap) wrap.classList.remove('warn');
      }
    }
    if (showTimer) { timerWrap.hidden = false; paintTimer(); }
    const q = session.questionCache[index];
    document.getElementById('qCategory').textContent = q.category; document.getElementById('qText').textContent = q.question;
    const diffEl = document.getElementById('qDifficulty');
    if (diffEl) {
      const label = (session.difficulty && session.difficulty !== 'Mixed') ? session.difficulty : (q.difficulty || '');
      diffEl.textContent = label && label !== 'Mixed' ? label : '';
      diffEl.hidden = !diffEl.textContent;
      if (diffEl.textContent) diffEl.setAttribute('data-difficulty', diffEl.textContent);
    }
    const input = document.getElementById('qInput'); input.value = '';
    // If the question was already answered in a previous resume, show the
    // prior answer in the input (the user can change it).
    const priorEntry = window.QuizEngine.Quiz.progress && window.QuizEngine.Quiz.progress.entries[index];
    if (priorEntry && (priorEntry.userAnswer || priorEntry.isCorrect)) {
      input.value = priorEntry.userAnswer || '';
    }
    input.focus();

    // Hint button -------------------------------------------------------------
    const hintBtn = document.getElementById('qHint');
    if (hintBtn) {
      const hintsAllowed = settings.hintMode !== false && session.mode !== 'fulltest';
      if (hintsAllowed) {
        hintBtn.hidden = false;
        // If a hint was already used on this question (for example after a
        // resume), show it again and mark the button as already activated so
        // the click is idempotent.
        if (window.QuizEngine.Quiz.hintsUsedForCurrent() > 0) {
          showHint();
          markHintActivated();
        }
        hintBtn.onclick = (e) => {
          e.preventDefault();
          if (hintBtn.classList.contains('activated')) return; // no duplicates
          if (window.QuizEngine.Quiz.hintsUsedForCurrent() > 0) {
            showHint();
            markHintActivated();
            return;
          }
          showHint();
          window.QuizEngine.Quiz.markHintUsed();
          markHintActivated();
        };
      } else {
        hintBtn.hidden = true;
        hintBtn.classList.remove('activated');
        hintBtn.disabled = false;
      }
    }

    // Quit button --------------------------------------------------------------
    const quitBtn = document.getElementById('qQuit');
    if (quitBtn) {
      quitBtn.onclick = (e) => {
        e.preventDefault();
        confirmDialog({
          title: 'Leave this quiz?',
          message: 'Your progress will be saved so you can continue this quiz later.',
          confirmLabel: 'Save & Quit Quiz',
          cancelLabel: 'Keep Practising',
        }).then((yes) => {
          if (!yes) return;
          // Stop everything and go back to the dashboard. The snapshot has
          // already been saved on every action, so the session is safe.
          window.QuizEngine.Quiz.quit();
          showToast('Progress saved. Resume anytime from the dashboard.', 'success');
          location.hash = '#/dashboard';
          route('/dashboard');
        });
      };
    }

    window.QuizEngine.Quiz.onTick = () => paintTimer();
    window.QuizEngine.Quiz.onTimeout = () => { showToast('Time is up. Submitting final answers.', 'error'); window.QuizEngine.Quiz.finish(); };
    window.QuizEngine.Quiz.onFeedback = (attempt, q) => { showFeedback(attempt, q, session); };
    window.QuizEngine.Quiz.onAdvance = () => { const i = window.QuizEngine.Quiz.index; const s = window.QuizEngine.Quiz.current; renderQuizScreen(main, s, i); };
    window.QuizEngine.Quiz.onFinish = (finishedSession) => { renderResult(main, finishedSession); };
    document.getElementById('quizForm').addEventListener('submit', (e) => { e.preventDefault(); const val = input.value; if(val.trim() === '') { showToast('Type an answer first.', 'error'); return; } window.QuizEngine.Quiz.submit(val); });
  }

  // Build the hint text for the current question. Never throws, and never
  // returns something that simply hands over the answer.
  function computeHint(q) {
    if (!q) return 'Read the question carefully and identify what it is asking for first.';
    let text = '';
    try {
      if (window.Hints && typeof window.Hints.hintFor === 'function') text = window.Hints.hintFor(q);
    } catch (e) { text = ''; }
    if (!text && window.Hints && window.Hints.CATEGORY_HINTS) {
      const list = window.Hints.CATEGORY_HINTS[q.category];
      if (list && list.length) text = list[Math.floor(Math.random() * list.length)];
    }
    if (!text) text = 'Break the problem into smaller, friendlier steps and solve each one.';
    // Last line of defence: if the text still contains the answer, fall back.
    try {
      const answer = String(q.correctAnswer == null ? '' : q.correctAnswer).trim();
      if (answer && text.toLowerCase().indexOf(answer.toLowerCase()) !== -1) {
        text = 'Identify the pattern this question is testing, then apply it step by step.';
      }
    } catch (e) {}
    return text;
  }

  function showHint() {
    const wrap = document.getElementById('qHintText');
    if (!wrap) return;
    const q = window.QuizEngine.Quiz.currentQuestion();
    if (!q) return;
    // Idempotent: once a hint is on screen for this question, keep the same
    // text instead of rolling a new one on every repeat click.
    if (wrap.dataset.questionId !== String(q.id) || !wrap.textContent) {
      wrap.dataset.questionId = String(q.id);
      wrap.textContent = computeHint(q);
    }
    wrap.hidden = false;
    // Smooth reveal with a tiny animation.
    wrap.classList.remove('show');
    void wrap.offsetWidth; // restart transition
    wrap.classList.add('show');
  }
  function markHintActivated() {
    const hintBtn = document.getElementById('qHint');
    if (!hintBtn) return;
    hintBtn.classList.add('activated');
    hintBtn.disabled = true;
    hintBtn.setAttribute('aria-pressed', 'true');
    // Replace the label with a confirmation.
    hintBtn.innerHTML = '';
    const okIco = el('span', {class:'btn-icon', html: window.Icons.check});
    hintBtn.appendChild(okIco);
    hintBtn.appendChild(document.createTextNode(' Hint shown'));
  }

  function showFeedback(attempt, q, session) {
    const fb = document.getElementById('quizFeedback'); const card = document.getElementById('quizCard');
    if (!fb) return; card.style.display = 'none'; fb.hidden = false;
    fb.className = 'quiz-feedback card ' + (attempt.isCorrect ? 'correct' : 'wrong');
    const head = document.getElementById('fbHead'); head.innerHTML = '';
    const icon = el('span', {class:'fb-icon ' + (attempt.isCorrect ? 'ok' : 'bad'), html: attempt.isCorrect ? window.Icons.check : window.Icons.x });
    head.appendChild(icon);
    head.appendChild(el('span', null, attempt.isCorrect ? 'Your answer is correct.' : 'Your answer is incorrect.'));
    const ans = document.getElementById('fbAnswers'); ans.innerHTML = '';
    const userBlock = el('div', {class:'fb-ans ' + (attempt.isCorrect ? 'user-ok' : 'user-bad')});
    userBlock.appendChild(el('div', {class:'lbl'}, 'Your answer')); userBlock.appendChild(el('div', {class:'val'}, attempt.userAnswer));
    const corrBlock = el('div', {class:'fb-ans'}); corrBlock.appendChild(el('div', {class:'lbl'}, 'Correct answer')); corrBlock.appendChild(el('div', {class:'val'}, q.correctAnswer + (q.unit ? ' ' + q.unit : '')));
    ans.appendChild(userBlock); ans.appendChild(corrBlock);
    document.getElementById('fbShortcut').textContent = q.shortcut;
    document.getElementById('fbExplanation').textContent = q.explanation;
    document.getElementById('fbPattern').textContent = q.mentalPattern;
    const mistakeBlock = document.getElementById('fbMistakeBlock');
    if (q.commonMistake) { mistakeBlock.hidden = false; document.getElementById('fbMistake').textContent = q.commonMistake; } else { mistakeBlock.hidden = true; }
    document.getElementById('fbTrySimilar').onclick = () => { const gen = window.Generator.generateOne(q.category); if(gen) { window.QuizEngine.Quiz.current.questionCache.splice(window.QuizEngine.Quiz.index+1, 0, Object.assign({}, gen, {_origin:'similar'})); showToast('A similar question is queued next.', 'success'); } };
    document.getElementById('fbNext').onclick = () => { window.QuizEngine.Quiz.next(); };
  }
  function renderResult(main, session) {
    // A quit session means the user explicitly left the quiz. The unfinished
    // snapshot is already saved; just route back to the dashboard.
    if (window.QuizEngine.isQuitSession(session)) {
      location.hash = '#/dashboard';
      route('/dashboard');
      return;
    }
    clear(main); const tpl = document.getElementById('tpl-result'); main.appendChild(tpl.content.cloneNode(true));
    const score = Math.round((session.correct/Math.max(1,session.count))*100);
    const avgMs = session.count ? Math.round(session.totalResponseTimeMs/session.count) : 0;
    document.getElementById('resModeLabel').textContent = modeLabel(session);
    document.getElementById('resScore').textContent = session.correct + ' / ' + session.count;
    document.getElementById('resAccuracy').textContent = score + '%';
    document.getElementById('resAvg').textContent = Stats.formatTime(avgMs);
    document.getElementById('resFast').textContent = session.fastestMs == null ? '-' : Stats.formatTime(session.fastestMs);
    document.getElementById('resCorrect').textContent = session.correct;
    document.getElementById('resWrong').textContent = session.incorrect;
    const map = {}; for (const q of session.questionCache) { const attempts = StateStore.getAttempts().filter(a => a.sessionId === session.id && a.questionId === q.id); const att = attempts[attempts.length-1]; if(!att) continue; if(!map[att.category]) map[att.category] = {correct:0,total:0}; map[att.category].total++; if(att.isCorrect) map[att.category].correct++; }
    const list = document.getElementById('resCategoryBars');
    Object.entries(map).forEach(([cat,v]) => { const acc = Math.round((v.correct/v.total)*100); const row = el('div', {class:'bar-row'}); row.appendChild(el('span', {class:'bar-name'}, cat)); const track = el('div', {class:'bar-track'}); const fill = el('div', {class:'bar-fill'}); fill.style.width = acc + '%'; track.appendChild(fill); row.appendChild(track); row.appendChild(el('span', {class:'bar-pct'}, acc + '%')); list.appendChild(row); });
    const review = document.getElementById('resReview');
    const wrongAttempts = StateStore.getAttempts().filter(a => a.sessionId === session.id && !a.isCorrect);
    if (wrongAttempts.length === 0) { review.appendChild(el('p', {class:'muted'}, 'No incorrect answers in this session - nice work.')); }
    else { wrongAttempts.forEach(att => { const q = (window.QUESTIONS || []).find(x => x.id === att.questionId); const item = el('div', {class:'review-item'}); item.appendChild(el('p', {class:'ri-q'}, att.questionText)); const meta = el('div', {class:'ri-meta'}); meta.appendChild(el('span', {class:'ri-pill bad'}, 'Incorrect')); meta.appendChild(el('span', null, att.category)); meta.appendChild(el('span', null, att.difficulty)); item.appendChild(meta); const detail = el('div', {class:'ri-detail'}); if(q) { detail.appendChild(el('p', null, 'Your answer: ' + att.userAnswer + '   |   Correct: ' + (q.correctAnswer + (q.unit ? ' ' + q.unit : '')))); detail.appendChild(el('p', null, 'Fast trick: ' + q.shortcut)); detail.appendChild(el('p', null, 'Mental pattern: ' + q.mentalPattern)); } else { detail.appendChild(el('p', null, 'Your answer: ' + att.userAnswer + '   |   Correct: ' + att.correctAnswer)); } item.appendChild(detail); review.appendChild(item); }); }
  }
  function applyTheme() { const s = StateStore.getSettings(); const wantsDark = s.theme === 'dark' || (s.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = wantsDark ? 'dark' : 'light'; const ico = document.getElementById('themeIcon'); if(ico) { ico.innerHTML = wantsDark ? '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' : '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'; } }
  function applyMotionPref() { const s = StateStore.getSettings(); document.documentElement.dataset.reducedMotion = s.reducedMotion ? 'true' : 'false'; }
  function parseRoute() {
    const h = location.hash || '#/dashboard';
    // Hashes may be like "#/resume?id=xyz" — split off the query cleanly.
    let pathPart = h.replace(/^#/, '');
    let queryPart = '';
    const qIdx = pathPart.indexOf('?');
    if (qIdx >= 0) { queryPart = pathPart.slice(qIdx + 1); pathPart = pathPart.slice(0, qIdx); }
    const params = {};
    if (queryPart) queryPart.split('&').forEach(p => { const [k,v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v||''); });
    return { path: pathPart, params };
  }
  // If a quiz is in flight and the user navigates anywhere else (Android Back
  // button, side-nav link, any hash change), pause it before rendering: stop
  // the countdown, persist the snapshot and detach the callbacks so nothing
  // can fire into the screen we are about to draw.
  function pauseActiveQuiz(nextPath) {
    const engine = window.QuizEngine && window.QuizEngine.Quiz;
    if (!engine || typeof engine.isActive !== 'function') return;
    if (!engine.isActive()) return;
    if (nextPath === '/resume') return;
    engine.pause();
  }

  function route(explicitPath) {
    const { path: hashPath, params } = parseRoute();
    const path = explicitPath || hashPath;
    pauseActiveQuiz(path);
    const main = document.getElementById('main'); clear(main); main.scrollTop = 0; window.scrollTo(0,0);
    const sidenav = document.getElementById('sidenav'); if (sidenav) sidenav.classList.remove('open'); const scrim = document.getElementById('scrim'); if (scrim) scrim.classList.remove('show'); const toggle = document.getElementById('navToggle'); if (toggle) toggle.setAttribute('aria-expanded', 'false');
    let routeName = path.replace(/^\//, '') || 'dashboard';
    if (routeName === 'setup') {
      const setupMode = params.mode;
      routeName = (setupMode === 'timed' || setupMode === 'fulltest' || setupMode === 'weak' || setupMode === 'mistakes')
        ? setupMode : (setupMode === 'category' ? 'categories' : 'practice');
    }
    setActiveNav(routeName);
    if (path === '/' || path === '' || path === '#/') renderLanding(main);
    else if (path === '/dashboard') renderDashboard(main);
    else if (path === '/practice') startQuiz(main, 'quick', { count:10 });
    else if (path === '/timed') startQuiz(main, 'timed', { count:20, minutes:10 });
    else if (path === '/fulltest') startQuiz(main, 'fulltest');
    else if (path === '/category') {
      // Only accept a real category: a hand-crafted ?cat= must not end up
      // stored in the session record.
      const known = (window.CATEGORIES || []).indexOf(params.cat) !== -1 ? params.cat : null;
      if (params.cat && !known) { showToast('Unknown category. Starting mixed practice.', 'error'); }
      startQuiz(main, 'category', { category: known });
    }
    else if (path === '/setup') renderSetup(main, { mode: params.mode, cat: params.cat });
    else if (path === '/weak') startQuiz(main, 'weak');
    else if (path === '/mistakes') startQuiz(main, 'mistakes');
    else if (path === '/resume') {
      const id = params.id;
      const unfinished = StateStore.getUnfinished();
      const snap = id ? unfinished.find(x => x.id === id) : unfinished[0];
      if (snap) { resumeQuiz(main, snap); } else { showToast('No unfinished quiz to resume.', 'error'); location.hash = '#/dashboard'; route('/dashboard'); }
    }
    else if (path === '/settings') renderSettings(main);
    else if (path === '/patterns') renderPatterns(main);
    else if (path === '/history') renderHistory(main);
    else if (path === '/coach') renderCoach(main);
    else if (path === '/auth') renderAuth(main);
    else if (path === '/account') renderAccount(main);
    else if (path === '/categories') renderCategories(main);
    else if (path === '/contact') renderContact(main);
    else renderLanding(main);
  }
  window.UI = { route, applyTheme, applyMotionPref, showToast, confirmDialog, closeConfirm, startQuiz, resumeQuiz, renderResult, renderContinueQuiz, renderSetup, renderContact };
})();
