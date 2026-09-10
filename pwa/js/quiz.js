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
    else if (mode === 'weak') { const cats = Stats.weakestCategories(1); category = cats[0] || null; count = opts.count || 10; pool = buildPool({count, difficulty, category, preferSeed:true}); }
    else if (mode === 'mistakes') { pool = mistakePool(opts.count || 10); }
    else { pool = buildPool({count:10, difficulty:'Mixed', preferSeed:true}); }
    const session = { id:StateStore.uid(), userId:StateStore.getUser()?StateStore.getUser().id:'anon', mode, category, difficulty, count:pool.length, timeLimitSec, startedAt:new Date().toISOString(), completedAt:null, correct:0, incorrect:0, totalResponseTimeMs:0, fastestMs:null, questionIds:pool.map(q => q.id), questionCache:pool };
    return session;
  }
  function buildPool({count, difficulty, category, preferSeed, balanced}) {
    const seedPool = (window.QUESTIONS || []).slice();
    const filteredSeed = seedPool.filter(q => { if(category && q.category !== category) return false; if(difficulty && difficulty !== 'Mixed' && q.difficulty !== difficulty) return false; return true; });
    const pool = [];
    const useSeed = filteredSeed.length ? filteredSeed.slice() : seedPool.slice();
    shuffle(useSeed);
    const seedTake = Math.min(useSeed.length, Math.ceil(count * 0.7));
    for (let i = 0; i < seedTake && pool.length < count; i++) pool.push(Object.assign({}, useSeed[i], {_origin:'seed'}));
    while (pool.length < count) { const gen = window.Generator.generateOne(category); if(gen) pool.push(Object.assign({}, gen, {_origin:'generated'})); else break; }
    return pool.slice(0, count);
  }
  function mistakePool(count) {
    const attempts = StateStore.getAttempts().filter(a => !a.isCorrect);
    const seen = new Set(); const real = [];
    for (let i = attempts.length-1; i >= 0 && real.length < count; i--) {
      const a = attempts[i]; if(seen.has(a.questionId)) continue;
      const q = findQuestion(a.questionId);
      if(q) { seen.add(a.questionId); real.push(Object.assign({}, q, {_origin:'mistake'})); }
    }
    if (real.length < count) {
      const cats = Stats.weakestCategories(1); const cat = cats[0] || null;
      const gen = window.Generator.generateMany(count - real.length, cat);
      for (const g of gen) real.push(Object.assign({}, g, {_origin:'generated'}));
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
      // Remove from unfinished now that we've resumed. The next tick /
      // submit will re-save a fresh snapshot for the resumed session.
      StateStore.removeUnfinished(session.id);
    },
    _newProgress(session) {
      return { startedAt: new Date().toISOString(), entries: session.questionCache.map(() => ({ userAnswer: '', isCorrect: false, responseTimeMs: 0, hintsUsed: 0 })) };
    },
    _startTimer() {
      this.stopTimer();
      if (this.remainingSec) {
        this.timerHandle = setInterval(() => {
          this.remainingSec--;
          if (this.onTick) this.onTick(this.remainingSec);
          if (this.remainingSec <= 0) {
            this.stopTimer();
            if (this.onTimeout) this.onTimeout();
          } else {
            // Persist timer state on every tick so a resume picks up correctly.
            this._saveSnapshot();
          }
        }, 1000);
      }
    },
    stopTimer() { if(this.timerHandle) clearInterval(this.timerHandle); this.timerHandle = null; },
    currentQuestion() { if(!this.current) return null; return this.current.questionCache[this.index]; },
    isQuestionAnswered(idx) { return !!(this.progress && this.progress.entries[idx] && this.progress.entries[idx].isCorrect === true || (this.progress && this.progress.entries[idx] && this.progress.entries[idx].userAnswer)); },
    isQuestionCorrect(idx) { return !!(this.progress && this.progress.entries[idx] && this.progress.entries[idx].isCorrect); },
    hintsUsedForCurrent() { if(!this.progress || !this.progress.entries[this.index]) return 0; return this.progress.entries[this.index].hintsUsed || 0; },
    markHintUsed() { if(this.progress && this.progress.entries[this.index]) { this.progress.entries[this.index].hintsUsed = (this.progress.entries[this.index].hintsUsed || 0) + 1; this._saveSnapshot(); } },
    submit(answer) {
      const q = this.currentQuestion(); if(!q) return null;
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
    },
    // Quit the quiz without finishing — saves progress and triggers onFinish
    // with a synthetic "quit" session that the caller can detect via
    // session.completedAt === null and session._quit === true.
    quit() {
      if (!this.current) return null;
      this._saveSnapshot();
      this.stopTimer();
      const session = this.current;
      session._quit = true;
      this.current = null;
      this.progress = null;
      if (this.onFinish) this.onFinish(session);
      return session;
    }
  };
  window.QuizEngine = { Quiz, buildSession, findQuestion, snapshotToSession };
})();
