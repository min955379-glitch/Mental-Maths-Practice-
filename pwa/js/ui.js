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
  function showToast(message, type) {
    const t = document.getElementById('toast'); if(!t) return;
    t.textContent = message; t.className = 'toast show' + (type ? ' ' + type : '');
    setTimeout(() => { t.className = 'toast' + (type ? ' ' + type : ''); }, 2400);
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
        if (confirm('Discard this unfinished quiz? Your progress will be lost.')) {
          StateStore.removeUnfinished(snap.id);
          renderContinueQuiz(host);
        }
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
  function renderCategories(main) { const tpl = document.getElementById('tpl-categories'); main.appendChild(tpl.content.cloneNode(true)); const grid = document.getElementById('catGrid'); const counts = {}; (window.QUESTIONS || []).forEach(q => { counts[q.category] = (counts[q.category] || 0) + 1; }); window.CATEGORIES.forEach(cat => { const card = el('button', {class:'cat-card', type:'button', onclick:() => { location.hash = '#/category?cat=' + encodeURIComponent(cat); }}); card.appendChild(el('h3', null, cat)); card.appendChild(el('div', {class:'cat-meta'}, (counts[cat] || 0) + ' seeded questions')); grid.appendChild(card); }); }
  function renderSettings(main) {
    const tpl = document.getElementById('tpl-settings'); main.appendChild(tpl.content.cloneNode(true));
    const s = StateStore.getSettings();
    document.getElementById('setTheme').value = s.theme; document.getElementById('setSound').checked = !!s.sound;
    document.getElementById('setTimer').checked = !!s.timerInPractice; document.getElementById('setHint').checked = !!s.hintMode;
    document.getElementById('setDifficulty').value = s.difficulty; document.getElementById('setCount').value = s.defaultCount;
    document.getElementById('setGoal').value = s.dailyGoal; document.getElementById('setMotion').checked = !!s.reducedMotion;
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      StateStore.setSettings({ theme:document.getElementById('setTheme').value, sound:document.getElementById('setSound').checked, timerInPractice:document.getElementById('setTimer').checked, hintMode:document.getElementById('setHint').checked, difficulty:document.getElementById('setDifficulty').value, defaultCount:parseInt(document.getElementById('setCount').value,10)||10, dailyGoal:parseInt(document.getElementById('setGoal').value,10)||20, reducedMotion:document.getElementById('setMotion').checked });
      showToast('Settings saved', 'success'); applyTheme(); applyMotionPref();
    });
    document.getElementById('resetData').addEventListener('click', () => { if(confirm('This will delete all local data, sessions, attempts, and account. Continue?')) { StateStore.resetAll(); localStorage.removeItem('iscsp-mm-accounts-v1'); showToast('All local data reset', 'success'); location.hash = '#/dashboard'; route(); } });
  }
  function renderHistory(main) { const tpl = document.getElementById('tpl-history'); main.appendChild(tpl.content.cloneNode(true)); const list = document.getElementById('historyList'); const sessions = Stats.recentSessions(100); if(sessions.length === 0) { list.appendChild(el('p', {class:'muted'}, 'No sessions yet.')); return; } sessions.forEach(s => { const score = Math.round((s.correct/Math.max(1,s.count))*100); const item = el('div', {class:'history-item'}); item.appendChild(el('div', {class:'hi-mode'}, modeLabel(s))); item.appendChild(el('div', {class:'hi-score'}, s.correct+'/'+s.count+' - '+score+'% - '+Stats.formatTime(s.totalResponseTimeMs/Math.max(1,s.count)))); item.appendChild(el('div', {class:'hi-time'}, new Date(s.startedAt).toLocaleString())); item.appendChild(el('button', {class:'btn btn-ghost btn-sm', type:'button', onclick: () => { if(confirm('Delete this session from history?')) { deleteSession(s.id); renderHistory(main); } }}, 'Delete'));
    list.appendChild(item);
  }); }
  function deleteSession(id) {
    StateStore.State.data.sessions = StateStore.State.data.sessions.filter(x => x.id !== id);
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
    document.querySelectorAll('.auth-tab').forEach(btn => { btn.addEventListener('click', () => { const tab = btn.dataset.tab; document.querySelectorAll('.auth-tab').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn); }); loginForm.hidden = (tab !== 'login'); registerForm.hidden = (tab !== 'register'); }); });
    const loginMsg = document.getElementById('loginMsg'); const registerMsg = document.getElementById('registerMsg');
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); loginMsg.textContent = ''; const fd = new FormData(loginForm); const res = await window.Auth.login({ email:fd.get('email'), password:fd.get('password') }); if(res.ok) { showToast('Welcome back', 'success'); location.hash = '#/dashboard'; route(); } else { loginMsg.textContent = res.msg; } });
    registerForm.addEventListener('submit', async (e) => { e.preventDefault(); registerMsg.textContent = ''; const fd = new FormData(registerForm); if(fd.get('password') !== fd.get('confirm')) { registerMsg.textContent = 'Passwords do not match.'; return; } const res = await window.Auth.register({ name:fd.get('name'), email:fd.get('email'), password:fd.get('password') }); if(res.ok) { showToast('Account created', 'success'); location.hash = '#/dashboard'; route(); } else { registerMsg.textContent = res.msg; } });
  }
  function renderAccount(main) { const u = StateStore.getUser(); if(!u) { location.hash = '#/auth'; route(); return; } const tpl = document.getElementById('tpl-account'); main.appendChild(tpl.content.cloneNode(true)); const acc = window.Auth.getAccountDetails(); const t = Stats.totals(); document.getElementById('accName').textContent = acc.name; document.getElementById('accEmail').textContent = acc.email; document.getElementById('accSince').textContent = new Date(acc.since || acc.createdAt || Date.now()).toLocaleDateString(); document.getElementById('accSolved').textContent = t.total; document.getElementById('accAccuracy').textContent = t.total ? t.accuracy + '%' : '-'; document.getElementById('logoutBtn').addEventListener('click', () => { window.Auth.logout(); showToast('Signed out'); location.hash = '#/dashboard'; route(); }); }

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
    if (!snapshot) { location.hash = '#/dashboard'; route(); return; }
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
    if (showTimer) { timerWrap.hidden = false; if(session.timeLimitSec) document.getElementById('qTimerText').textContent = Stats.formatMs(session.timeLimitSec*1000); else document.getElementById('qTimerText').textContent = '00:00'; }
    const q = session.questionCache[index];
    document.getElementById('qCategory').textContent = q.category; document.getElementById('qText').textContent = q.question;
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
        if (confirm('Are you sure you want to leave? Your progress will be saved so you can continue this quiz later.')) {
          // Stop everything and go back to the dashboard. The snapshot has
          // already been saved on every action, so the session is safe.
          window.QuizEngine.Quiz.quit();
          showToast('Progress saved. Resume anytime from the dashboard.', 'success');
          location.hash = '#/dashboard';
          route();
        }
      };
    }

    window.QuizEngine.Quiz.onTick = (sec) => { const t = document.getElementById('qTimerText'); if(!t) return; t.textContent = Stats.formatMs(sec*1000); const wrap = document.getElementById('qTimer'); if(wrap) wrap.classList.toggle('warn', sec <= 30); };
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
    // A "_quit" session means the user explicitly left the quiz. The
    // unfinished snapshot is already saved; just route back to the dashboard.
    if (session && session._quit) {
      location.hash = '#/dashboard';
      route();
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
  function applyTheme() { const s = StateStore.getSettings(); const wantsDark = s.theme === 'dark' || (s.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = wantsDark ? 'dark' : 'light'; const ico = document.getElementById('themeIcon'); if(ico) { ico.innerHTML = wantsDark ? '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' : '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'; } }
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

  function route() {
    const { path, params } = parseRoute();
    pauseActiveQuiz(path);
    const main = document.getElementById('main'); clear(main); main.scrollTop = 0; window.scrollTo(0,0);
    const sidenav = document.getElementById('sidenav'); if (sidenav) sidenav.classList.remove('open'); const scrim = document.getElementById('scrim'); if (scrim) scrim.classList.remove('show'); const toggle = document.getElementById('navToggle'); if (toggle) toggle.setAttribute('aria-expanded', 'false');
    let routeName = path.replace(/^\//, '') || 'dashboard'; setActiveNav(routeName);
    if (path === '/' || path === '' || path === '#/') renderLanding(main);
    else if (path === '/dashboard') renderDashboard(main);
    else if (path === '/practice') startQuiz(main, 'quick', { count:10 });
    else if (path === '/timed') startQuiz(main, 'timed', { count:20, minutes:10 });
    else if (path === '/fulltest') startQuiz(main, 'fulltest');
    else if (path === '/category') startQuiz(main, 'category', { category:params.cat || null });
    else if (path === '/weak') startQuiz(main, 'weak');
    else if (path === '/mistakes') startQuiz(main, 'mistakes');
    else if (path === '/resume') {
      const id = params.id;
      const unfinished = StateStore.getUnfinished();
      const snap = id ? unfinished.find(x => x.id === id) : unfinished[0];
      if (snap) { resumeQuiz(main, snap); } else { showToast('No unfinished quiz to resume.', 'error'); location.hash = '#/dashboard'; route(); }
    }
    else if (path === '/settings') renderSettings(main);
    else if (path === '/patterns') renderPatterns(main);
    else if (path === '/history') renderHistory(main);
    else if (path === '/coach') renderCoach(main);
    else if (path === '/auth') renderAuth(main);
    else if (path === '/account') renderAccount(main);
    else if (path === '/categories') renderCategories(main);
    else renderLanding(main);
  }
  window.UI = { route, applyTheme, applyMotionPref, showToast, startQuiz, resumeQuiz, renderResult, renderContinueQuiz };
})();
