(function () {
  'use strict';
  function buildSession(mode, opts) {
    opts = opts || {};
    const settings = StateStore.getSettings();
    let count = opts.count || settings.defaultCount || 10;
    let category = opts.category || null;
    let difficulty = opts.difficulty || settings.difficulty || 'Mixed';
    let timeLimitSec = null;
    let pool = [];
    if (mode === 'quick') { count = opts.count || 10; pool = buildPool({count, difficulty, category, preferSeed:true}); }
    else if (mode === 'timed') { count = opts.count || 20; timeLimitSec = (opts.minutes || 10) * 60; pool = buildPool({count, difficulty:'Mixed', category:null, preferSeed:true}); }
    else if (mode === 'fulltest') { count = 50; timeLimitSec = null; pool = buildPool({count, difficulty:'Mixed', category:null, preferSeed:true, balanced:true}); }
    else if (mode === 'category') { count = opts.count || 10; pool = buildPool({count, difficulty, category, preferSeed:true}); }
    else if (mode === 'weak') {
      const cats = Stats.weakestCategories(1);
      category = cats[0] || null;
      count = opts.count || 10;
      // Adaptive: work at the hardest tier the user is actually holding up on.
      if (!opts.difficulty || opts.difficulty === 'Mixed') {
        difficulty = (Stats.recommendedDifficulty ? Stats.recommendedDifficulty(category).difficulty : difficulty);
      }
      pool = buildPool({count, difficulty, category, preferSeed:true});
    }
    else if (mode === 'mistakes') { count = opts.count || 10; pool = mistakePool(count, difficulty); }
    else { pool = buildPool({count:10, difficulty:'Mixed', preferSeed:true}); }
    // Remember what was served so the next session rotates to fresh ones.
    if (StateStore.markServed) StateStore.markServed(pool.map((q) => q.id));
    const session = { id:StateStore.uid(), userId:StateStore.getUser()?StateStore.getUser().id:'anon', mode, category, difficulty, count:pool.length, timeLimitSec, startedAt:new Date().toISOString(), completedAt:null, correct:0, incorrect:0, totalResponseTimeMs:0, fastestMs:null, questionIds:pool.map(q => q.id), questionCache:pool };
    return session;
  }
  function buildPool({count, difficulty, category, preferSeed, balanced}) {
    const seedPool = (window.QUESTIONS || []).slice();
    const matches = (q) => {
      if (category && q.category !== category) return false;
      if (difficulty && difficulty !== 'Mixed' && q.difficulty !== difficulty) return false;
      return true;
    };
    let filteredSeed = seedPool.filter(matches);
    // Nothing seeded at exactly this difficulty: step down to the hardest tier
    // that exists instead of silently falling back to an arbitrary mix.
    let useSeed;
    let exactTier = true;          // false when we had to borrow another tier
    if (filteredSeed.length) {
      useSeed = filteredSeed.slice();
    } else {
      exactTier = false;
      const tiers = { Expert: ['Expert', 'Hard'], Hard: ['Hard', 'Medium'] }[difficulty] || null;
      let found = null;
      if (tiers) {
        for (const tier of tiers) {
          const f = seedPool.filter(q => (!category || q.category === category) && q.difficulty === tier);
          if (f.length) { found = f.slice(); break; }
        }
      }
      useSeed = found || seedPool.slice();
    }

    // Randomisation without repeats (master prompt):
    //  1. within a session every question text is unique;
    //  2. across sessions, questions answered recently are pushed to the back.
    const seen = (window.Stats && window.Stats.recentlySeenIds) ? window.Stats.recentlySeenIds(300) : new Set();
    const fresh = [], repeats = [];
    for (const q of useSeed) (seen.has(String(q.id)) ? repeats : fresh).push(q);
    shuffle(fresh); shuffle(repeats);

    let ordered = fresh.concat(repeats);
    if (balanced) ordered = balanceByCategory(ordered, category);

    const pool = [];
    const usedText = new Set();
    function push(q, origin) {
      if (!q) return false;
      const key = String(q.question || '').trim().toLowerCase();
      if (!key || usedText.has(key)) return false;
      usedText.add(key);
      pool.push(Object.assign({}, q, { _origin: origin }));
      return true;
    }

    // The v1.2 bank holds at least 20 seeded questions for every
    // (category, difficulty) pair, so short sessions are filled entirely from
    // real seeds - the generator only tops up long ones. That keeps the chosen
    // difficulty honest: generated items can only promise Easy/Medium.
    // When the requested tier has no seeds of its own (Expert borrows Hard),
    // leave room for the generator so the tier really is represented.
    // Fresh seeds first: questions the user has not been served recently.
    let seedTake = Math.min(fresh.length, count);
    if (!exactTier && difficulty && difficulty !== 'Mixed') {
      seedTake = Math.min(seedTake, Math.floor(count * 0.6));
    }
    for (let i = 0; i < seedTake && pool.length < count; i++) push(ordered[i], 'seed');

    // Still short (a small category, or everything has already been served):
    // generate brand new questions BEFORE reusing anything already seen.
    let guard = 0;
    const genDifficulty = (difficulty && difficulty !== 'Mixed') ? difficulty : null;
    while (pool.length < count && guard++ < count * 25) {
      const gen = window.Generator.generateOne(category, genDifficulty);
      if (!gen) break;
      push(gen, 'generated');
    }
    // Last resort: rather than hand back a short quiz, reuse seeds that were
    // skipped only because the user had seen them recently.
    if (pool.length < count) { for (let i = 0; i < ordered.length && pool.length < count; i++) push(ordered[i], 'seed'); }
    return pool.slice(0, count);
  }

  // Spread a long session evenly over the categories instead of letting the
  // shuffle pile the first questions into two or three topics.
  function balanceByCategory(list, category) {
    if (category) return list;                 // one category: nothing to balance
    const byCat = {};
    for (const q of list) { const c = q.category || 'Other'; (byCat[c] = byCat[c] || []).push(q); }
    for (const c of Object.keys(byCat)) shuffle(byCat[c]);
    const out = [];
    let more = true;
    while (more) {
      more = false;
      for (const c of Object.keys(byCat)) {
        if (byCat[c].length) { out.push(byCat[c].pop()); more = true; }
      }
    }
    return out;
  }
  function mistakePool(count, difficulty) {
    const attempts = StateStore.getAttempts().filter(a => !a.isCorrect);
    const seen = new Set(); const texts = new Set(); const real = [];
    const add = (q, origin) => {
      const key = String(q.question || '').trim().toLowerCase();
      if (!key || texts.has(key)) return;
      texts.add(key); real.push(Object.assign({}, q, { _origin: origin }));
    };
    for (let i = attempts.length-1; i >= 0 && real.length < count; i--) {
      const a = attempts[i]; if(seen.has(a.questionId)) continue;
      const q = findQuestion(a.questionId);
      if(q) { seen.add(a.questionId); add(q, 'mistake'); }
    }
    if (real.length < count) {
      // Fill the rest from the weakest categories at the chosen difficulty, so
      // the session stays on topic instead of dragging in random questions.
      const cats = Stats.weakestCategories(3); const cat = cats[0] || null;
      const work = (difficulty && difficulty !== 'Mixed') ? difficulty : (Stats.recommendedDifficulty ? Stats.recommendedDifficulty(cat).difficulty : null);
      const gen = window.Generator.generateMany((count - real.length) * 8, cat, work);
      for (const g of gen) { if (real.length >= count) break; add(g, 'generated'); }
    }
    return real.slice(0, count);
  }
  function findQuestion(id) { const fromSeed = (window.QUESTIONS || []).find(q => q.id === id); return fromSeed || null; }
  function shuffle(arr) { for (let i = arr.length-1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [arr[i],arr[j]] = [arr[j],arr[i]]; } }

  // Reconstruct a session object from an unfinished snapshot.
  // The snapshot is exactly what was passed to saveUnfinishedSnapshot,
  // with the same id, questionCache, count, etc.
  function snapshotToSession(snap) {
    const session = deepClone(snap);
    delete session.lastSavedAt;
    return session;
  }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  // How many countdown ticks between persistence writes (see _startTimer).
  const SAVE_EVERY_TICKS = 5;
  // Public flag used by quit() so the UI can tell "user left" from "finished".
  const QUIT_FLAG = '_quit';

  const Quiz = {
    current: null,
    index: 0,
    startedAt: 0,
    timerHandle: null,
    remainingSec: 0,
    // per-question progress for the current session
    progress: null,
    onTick: null, onTimeout: null, onFeedback: null, onAdvance: null, onFinish: null,
    // ----------------------------------------------------------------
    start(session) {
      this.current = session;
      this.index = 0;
      this.startedAt = performance.now();
      this.remainingSec = session.timeLimitSec || 0;
      this.progress = this._newProgress(session);
      this._startTimer();
      this._saveSnapshot();
    },
    // Resume a session that was previously saved as unfinished.
    resume(snapshot) {
      const session = snapshotToSession(snapshot);
      this.current = session;
      // Restore index and per-question progress if present.
      this.index = Math.min(snapshot.currentIndex || 0, Math.max(0, session.questionCache.length - 1));
      this.progress = (snapshot.progress && Array.isArray(snapshot.progress.entries))
        ? snapshot.progress
        : this._newProgress(session);
      // Restore per-question answered state from saved entries.
      for (const e of this.progress.entries) {
        if (!e || !e.questionId) continue;
        e.givenAnswer = (e.givenAnswer != null) ? e.givenAnswer : '';
        e.userAnswer = (e.userAnswer != null) ? e.userAnswer : '';
        e.isCorrect = !!e.isCorrect;
        e.responseTimeMs = e.responseTimeMs || 0;
      }
      this.startedAt = performance.now();
      this.remainingSec = (snapshot.remainingSec != null)
        ? snapshot.remainingSec
        : (session.timeLimitSec || 0);
      this._startTimer();
      // Re-save the snapshot immediately. The unfinished entry is NOT removed
      // here: if the user leaves straight after resuming (without answering
      // anything) the session must still be waiting on the dashboard. It is
      // cleared by finish(), quit(), discard, or an explicit removal once the
      // session is genuinely over.
      this._saveSnapshot();
    },
    _newProgress(session) {
      return { startedAt: new Date().toISOString(), entries: session.questionCache.map(() => ({ userAnswer: '', isCorrect: false, responseTimeMs: 0, hintsUsed: 0 })) };
    },
    _startTimer() {
      this.stopTimer();
      this._ticksSinceSave = 0;
      if (this.remainingSec) {
        this.timerHandle = setInterval(() => {
          this.remainingSec--;
          if (this.onTick) this.onTick(this.remainingSec);
          if (this.remainingSec <= 0) {
            this.stopTimer();
            if (this.onTimeout) this.onTimeout();
          } else {
            // Persist the countdown at most once every SAVE_EVERY_TICKS.
            // A 10-minute quiz now writes ~120 times instead of 600, and
            // pause() / quit() / submit() / next() always flush the exact
            // remaining time before it can be needed.
            this._ticksSinceSave++;
            if (this._ticksSinceSave >= SAVE_EVERY_TICKS) {
              this._ticksSinceSave = 0;
              this._saveSnapshot();
            }
          }
        }, 1000);
      }
    },
    stopTimer() { if(this.timerHandle) clearInterval(this.timerHandle); this.timerHandle = null; },
    currentQuestion() { if(!this.current) return null; return this.current.questionCache[this.index]; },
    isQuestionAnswered(idx) {
      const e = this.progress && this.progress.entries ? this.progress.entries[idx] : null;
      if (!e) return false;
      return !!(e.isCorrect === true || (e.userAnswer !== '' && e.userAnswer != null));
    },
    isQuestionCorrect(idx) { return !!(this.progress && this.progress.entries[idx] && this.progress.entries[idx].isCorrect); },
    hintsUsedForCurrent() { if(!this.progress || !this.progress.entries[this.index]) return 0; return this.progress.entries[this.index].hintsUsed || 0; },
    markHintUsed() { if(this.progress && this.progress.entries[this.index]) { this.progress.entries[this.index].hintsUsed = (this.progress.entries[this.index].hintsUsed || 0) + 1; this._saveSnapshot(); } },
    submit(answer) {
      const q = this.currentQuestion(); if(!q) return null;
      // Never record a blank answer: null / undefined / "" / "   " used to be
      // graded as a wrong attempt, which corrupted accuracy, streaks and the
      // attempt history. Callers get null back and nothing is persisted.
      if (answer == null || String(answer).trim() === '') return null;
      const now = performance.now();
      const responseTimeMs = Math.max(0, Math.round(now - this.startedAt));
      const isCorrect = window.Normalize.compareAnswers(answer, q);
      const attempt = { id:StateStore.uid(), sessionId:this.current.id, userId:this.current.userId, questionId:q.id, questionText:q.question, category:q.category, difficulty:q.difficulty, userAnswer:answer, correctAnswer:q.correctAnswer, isCorrect, responseTimeMs, attemptedAt:new Date().toISOString(), _origin:q._origin || 'seed' };
      StateStore.recordAttempt(attempt);
      // Update session aggregates and per-question progress.
      this.current.correct += isCorrect?1:0;
      this.current.incorrect += isCorrect?0:1;
      this.current.totalResponseTimeMs += responseTimeMs;
      if(this.current.fastestMs==null || responseTimeMs < this.current.fastestMs) this.current.fastestMs = responseTimeMs;
      if (this.progress && this.progress.entries[this.index]) {
        const e = this.progress.entries[this.index];
        e.userAnswer = answer;
        e.isCorrect = isCorrect;
        e.responseTimeMs = responseTimeMs;
        e.attemptedAt = attempt.attemptedAt;
      }
      this._saveSnapshot();
      if(this.onFeedback) this.onFeedback(attempt, q, responseTimeMs);
      return attempt;
    },
    next() {
      this.index++;
      this.startedAt = performance.now();
      if(this.index >= this.current.questionCache.length) {
        this.finish();
        return false;
      }
      this._saveSnapshot();
      if(this.onAdvance) this.onAdvance();
      return true;
    },
    finish() {
      if (!this.current) return null;   // defensive: nothing to finish
      this.stopTimer();
      this.current.completedAt = new Date().toISOString();
      StateStore.recordSession(this.current);
      // Make absolutely sure it does not appear as unfinished.
      StateStore.removeUnfinished(this.current.id);
      const session = this.current;
      this.current = null;
      this.progress = null;
      if(this.onFinish) this.onFinish(session);
    },
    // Persist the current quiz as an unfinished session so the user can
    // resume later. Called on every answer, navigation, timer tick, and
    // also explicitly from the "Quit" button.
    _saveSnapshot() {
      if (!this.current) return;
      const snap = deepClone(this.current);
      snap.currentIndex = this.index;
      snap.remainingSec = this.remainingSec;
      snap.progress = this.progress ? deepClone(this.progress) : null;
      snap.lastSavedAt = new Date().toISOString();
      snap.completedAt = null;
      StateStore.saveUnfinishedSnapshot(snap);
      return snap;
    },
    // Quit the quiz without finishing — saves progress and triggers onFinish
    // with a synthetic "quit" session that the caller can detect via
    // session.completedAt === null and session._quit === true.
    quit() {
      if (!this.current) return null;
      this._saveSnapshot();
      this.stopTimer();
      const session = this.current;
      session[QUIT_FLAG] = true;
      this.current = null;
      this.progress = null;
      this._detachCallbacks();
      if (this.onFinish) this.onFinish(session);
      return session;
    },
    // Pause without any UI decision: used when the user navigates away from
    // the quiz screen (Android Back button, side-nav link, hash change).
    // The countdown must stop, the snapshot must be stored, and no callback
    // may fire into whatever screen is rendered next.
    pause() {
      if (!this.current) return null;
      this._ticksSinceSave = 0;
      const snap = this._saveSnapshot();
      this.stopTimer();
      this.current = null;
      this.progress = null;
      this._detachCallbacks();
      return snap;
    },
    isActive() { return !!this.current; },
    _detachCallbacks() {
      this.onTick = null;
      this.onTimeout = null;
      this.onFeedback = null;
      this.onAdvance = null;
      this.onFinish = null;
    }
  };
  function isQuitSession(session) { return !!(session && session[QUIT_FLAG]); }

  window.QuizEngine = { Quiz, buildSession, findQuestion, snapshotToSession, isQuitSession, QUIT_FLAG };
})();
