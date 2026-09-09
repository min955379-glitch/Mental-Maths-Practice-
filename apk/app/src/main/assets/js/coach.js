(function () {
  'use strict';
  function advice() {
    const t = Stats.totals(); const cats = Stats.categoryStats(); const out = [];
    if (t.total < 10) { out.push({title:'Build a baseline', body:'Complete at least 20 questions across different categories so I can analyze your real performance.'}); return out; }
    const overallAcc = t.accuracy; const overallAvg = t.avgMs;
    const weak = cats.filter(c => c.attempts >= 3 && c.accuracy < overallAcc - 8);
    const slow = cats.filter(c => c.attempts >= 3 && c.avgMs > overallAvg + 1500);
    if (weak.length) { const w = weak[0]; out.push({title:'Strengthen '+w.category, body:'Your accuracy on '+w.category+' is '+w.accuracy+'%, '+(overallAcc - w.accuracy)+' points below your overall average. Practice 10 '+w.category+' questions today, focusing on the shortcuts.'}); }
    if (slow.length) { const s = slow[0]; out.push({title:'Speed up '+s.category, body:'Your average time on '+s.category+' is '+(s.avgMs/1000).toFixed(1)+' sec, '+((s.avgMs-overallAvg)/1000).toFixed(1)+' sec slower than your overall average. Aim to halve the time by practicing the mental shortcut repeatedly.'}); }
    const strong = cats.filter(c => c.attempts >= 3 && c.accuracy >= overallAcc + 5);
    if (strong.length) { out.push({title:'Strong in '+strong[0].category, body:'You are at '+strong[0].accuracy+'% on '+strong[0].category+'. To consolidate, try Expert-difficulty questions or increase your daily goal.'}); }
    const streak = Stats.dailyStreak();
    if (streak >= 3) { out.push({title:'Streak going', body:'You have a '+streak+'-day streak. Keep the bar moving — even 5 questions a day compounds.'}); }
    else { const today = Stats.questionsToday(); const goal = (StateStore.getSettings().dailyGoal || 20); if (today < goal) { out.push({title:'Daily target', body:''+today+' of '+goal+' questions today. '+(goal - today)+' more will keep your momentum.'}); } }
    const recentAttempts = StateStore.getAttempts().slice(-30); const last10 = recentAttempts.slice(-10); const wrong = last10.filter(a => !a.isCorrect).length;
    if (last10.length >= 5 && wrong >= 4) { out.push({title:'Last 10 questions - accuracy dip', body:wrong+'/10 wrong in your last ten. Slow down on shortcuts and revisit the Mistake Review session.'}); }
    if (out.length === 0) { out.push({title:'Keep training', body:'Overall accuracy '+overallAcc+'%, average time '+(overallAvg/1000).toFixed(1)+' sec. Continue with mixed practice to keep both speed and accuracy sharp.'}); }
    return out;
  }
  window.Coach = { advice };
})();
