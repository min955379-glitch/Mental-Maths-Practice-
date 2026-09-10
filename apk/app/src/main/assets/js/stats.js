(function () {
  'use strict';
  function attempts() { return StateStore.getAttempts(); }
  function sessions() { return StateStore.getSessions(); }
  function totals() { const a = attempts(); const total = a.length; const correct = a.filter(x => x.isCorrect).length; const accuracy = total ? Math.round((correct/total)*100) : 0; const sumMs = a.reduce((s,x) => s + (x.responseTimeMs||0), 0); const avgMs = total ? Math.round(sumMs/total) : 0; const fastest = a.length ? Math.min(...a.map(x => x.responseTimeMs || Infinity)) : null; return { total, correct, incorrect: total-correct, accuracy, avgMs, fastestMs: fastest===Infinity?null:fastest }; }
  function categoryStats() { const a = attempts(); const map = {}; for (const x of a) { const c = x.category || 'Other'; if(!map[c]) map[c] = {attempts:0, correct:0, totalMs:0}; map[c].attempts++; if(x.isCorrect) map[c].correct++; map[c].totalMs += x.responseTimeMs || 0; } return Object.entries(map).map(([category,v]) => ({ category, attempts:v.attempts, accuracy:v.attempts?Math.round((v.correct/v.attempts)*100):0, avgMs:v.attempts?Math.round(v.totalMs/v.attempts):0 })).sort((a,b) => b.attempts - a.attempts); }
  function weakestCategories(limit) { const list = categoryStats().filter(c => c.attempts >= 3); list.sort((a,b) => a.accuracy - b.accuracy); return list.slice(0, limit||3).map(c => c.category); }
  function performanceLabel(accuracy, avgMs) { if(accuracy >= 90 && avgMs <= 6000) return 'Elite'; if(accuracy >= 80 && avgMs <= 9000) return 'Strong'; if(accuracy >= 70) return 'Good'; if(accuracy >= 55) return 'Improving'; return 'Needs Practice'; }
  // Local-time day key (YYYY-MM-DD). The previous implementation used
  // toISOString(), which is UTC — for a user in Asia/Karachi (UTC+5) the day
  // rolled over at 19:00 local time, so streaks and the daily goal were wrong
  // every evening.
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function attemptDay(x) {
    if (!x || !x.attemptedAt) return null;
    const t = new Date(x.attemptedAt);
    return isNaN(t.getTime()) ? null : dayKey(t);
  }
  function dailyStreak() {
    const a = attempts(); if (a.length === 0) return 0;
    const days = new Set(a.map(attemptDay));
    let count = 0;
    const d = new Date();
    const today = dayKey(d);
    let guard = 0;
    while (guard++ < 400) {
      const key = dayKey(d);
      if (days.has(key)) { count++; d.setDate(d.getDate() - 1); }
      else if (count === 0 && key === today) { d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  }
  function questionsToday() {
    const key = dayKey(new Date());
    return attempts().filter(x => attemptDay(x) === key).length;
  }
  function recentSessions(limit) { return sessions().slice().reverse().slice(0, limit||5); }
  function bestScore(mode) { const list = sessions().filter(s => !mode || s.mode === mode); if(list.length === 0) return null; return Math.max(...list.map(s => Math.round((s.correct/Math.max(1,s.count))*100))); }
  function formatTime(ms) { if(ms == null) return '-'; if(ms < 1000) return ms + ' ms'; return (ms/1000).toFixed(1) + ' sec'; }
  function formatMs(ms) { if(ms == null) return '-'; const s = Math.floor(ms/1000); const m = Math.floor(s/60); const rem = s%60; return String(m).padStart(2,'0') + ':' + String(rem).padStart(2,'0'); }
  window.Stats = { totals, categoryStats, weakestCategories, performanceLabel, dailyStreak, questionsToday, recentSessions, bestScore, formatTime, formatMs, dayKey, attemptDay };
})();
