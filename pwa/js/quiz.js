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
  const Quiz = {
    current: null, index: 0, startedAt: 0, timerHandle: null, remainingSec: 0,
    onTick: null, onTimeout: null, onFeedback: null, onAdvance: null, onFinish: null,
    start(session) { this.current = session; this.index = 0; this.startedAt = performance.now(); this.remainingSec = session.timeLimitSec || 0; if(this.remainingSec){ this.timerHandle = setInterval(() => { this.remainingSec--; if(this.onTick) this.onTick(this.remainingSec); if(this.remainingSec <= 0){ this.stopTimer(); if(this.onTimeout) this.onTimeout(); } }, 1000); } },
    stopTimer() { if(this.timerHandle) clearInterval(this.timerHandle); this.timerHandle = null; },
    currentQuestion() { if(!this.current) return null; return this.current.questionCache[this.index]; },
    submit(answer) { const q = this.currentQuestion(); if(!q) return null; const now = performance.now(); const responseTimeMs = Math.max(0, Math.round(now - this.startedAt)); const isCorrect = window.Normalize.compareAnswers(answer, q); const attempt = { id:StateStore.uid(), sessionId:this.current.id, userId:this.current.userId, questionId:q.id, questionText:q.question, category:q.category, difficulty:q.difficulty, userAnswer:answer, correctAnswer:q.correctAnswer, isCorrect, responseTimeMs, attemptedAt:new Date().toISOString(), _origin:q._origin || 'seed' }; StateStore.recordAttempt(attempt); this.current.correct += isCorrect?1:0; this.current.incorrect += isCorrect?0:1; this.current.totalResponseTimeMs += responseTimeMs; if(this.current.fastestMs==null || responseTimeMs < this.current.fastestMs) this.current.fastestMs = responseTimeMs; if(this.onFeedback) this.onFeedback(attempt, q, responseTimeMs); return attempt; },
    next() { this.index++; this.startedAt = performance.now(); if(this.index >= this.current.questionCache.length) { this.finish(); return false; } if(this.onAdvance) this.onAdvance(); return true; },
    finish() { this.stopTimer(); this.current.completedAt = new Date().toISOString(); StateStore.recordSession(this.current); const session = this.current; this.current = null; if(this.onFinish) this.onFinish(session); }
  };
  window.QuizEngine = { Quiz, buildSession, findQuestion };
})();
