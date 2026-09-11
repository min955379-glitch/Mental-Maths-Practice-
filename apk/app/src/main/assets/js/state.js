(function () {
  'use strict';
  const KEY = 'iscsp-mm-state-v1';
  const DEFAULT_STATE = {
    user: null,
    sessions: [],
    attempts: [],
    // unfinished holds in-progress quiz sessions that were paused.
    // Each entry has the same shape as a regular session, but with
    // completedAt === null and a `progress` object carrying per-question
    // answers + correctness + timings. They are migrated into `sessions`
    // when the quiz is finished.
    unfinished: [],
    // served holds the ids of questions already put in front of the user, so
    // consecutive sessions rotate instead of repeating the same ones.
    served: [],
    settings: { theme:'auto', sound:false, timerInPractice:true, hintMode:true, difficulty:'Mixed', defaultCount:10, dailyGoal:20, reducedMotion:false }
  };
  function load() {
    try { const raw = localStorage.getItem(KEY); if(!raw) return deepClone(DEFAULT_STATE); const p = JSON.parse(raw); return mergeDefaults(p); } catch(e) { return deepClone(DEFAULT_STATE); }
  }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function mergeDefaults(p) {
    const base = deepClone(DEFAULT_STATE);
    if(!p.settings) p.settings = {};
    p.settings = Object.assign({}, base.settings, p.settings);
    if(!Array.isArray(p.sessions)) p.sessions = [];
    if(!Array.isArray(p.attempts)) p.attempts = [];
    if(!Array.isArray(p.unfinished)) p.unfinished = [];
    if(!Array.isArray(p.served)) p.served = [];
    return p;
  }
  const State = { data: load(), save() { save(this.data); } };
  function uid() { return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function getSettings() { return State.data.settings; }
  function setSettings(patch) { State.data.settings = Object.assign({}, State.data.settings, patch); State.save(); }
  function setUser(u) { State.data.user = u; State.save(); }
  function getUser() { return State.data.user; }
  function clearUser() { State.data.user = null; State.save(); }
  function recordSession(s) { State.data.sessions.push(s); if(State.data.sessions.length>200) State.data.sessions = State.data.sessions.slice(-200); State.save(); }
  function getSessions() { return State.data.sessions.slice(); }
  function recordAttempt(a) { State.data.attempts.push(a); if(State.data.attempts.length>5000) State.data.attempts = State.data.attempts.slice(-5000); State.save(); }
  function getAttempts() { return State.data.attempts.slice(); }
  // -- served-question memory (repeat-free rotation) -----------------------
  function markServed(ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    const list = State.data.served.concat(ids.map(String));
    State.data.served = list.slice(-800);
    State.save();
  }
  function getServed() { return State.data.served.slice(); }
  function resetAll() { State.data = deepClone(DEFAULT_STATE); State.save(); }
  // -- unfinished session API ---------------------------------------------
  // A snapshot is the current in-memory quiz state. The store keeps one
  // entry per session.id and updates the existing one on every progress
  // tick (so we never overwrite one unfinished quiz with another).
  // Monotonic sequence number: two snapshots written in the same millisecond
  // used to keep insertion order, so "newest first" was undefined. Sorting now
  // falls back to this counter.
  let seqCounter = 0;
  function newestFirst(a, b) {
    const ta = a.lastSavedAt || a.startedAt || '';
    const tb = b.lastSavedAt || b.startedAt || '';
    if (ta !== tb) return tb.localeCompare(ta);
    return (b.savedSeq || 0) - (a.savedSeq || 0);
  }

  function saveUnfinishedSnapshot(snapshot) {
    if (!snapshot || !snapshot.id) return;
    // Defensive clone so callers can mutate freely.
    const snap = deepClone(snapshot);
    // Mark the snapshot as still in progress.
    snap.completedAt = null;
    const arr = State.data.unfinished;
    const idx = arr.findIndex(x => x.id === snap.id);
    snap.lastSavedAt = new Date().toISOString();
    snap.savedSeq = ++seqCounter;
    if (idx >= 0) {
      arr[idx] = snap;
    } else {
      arr.push(snap);
    }
    // Cap the unfinished list at 10 most-recent entries.
    if (arr.length > 10) {
      arr.sort(newestFirst);
      arr.length = 10;
    }
    State.save();
  }
  function getUnfinished() {
    // Drop any that have somehow been completed (defensive).
    return State.data.unfinished
      .filter(x => !x.completedAt)
      .slice()
      .sort(newestFirst);
  }
  function removeUnfinished(id) {
    // Compare as strings: snapshot ids come from JSON and can round-trip as a
    // number, and a strict !== comparison would then silently delete nothing.
    const key = String(id);
    const before = State.data.unfinished.length;
    State.data.unfinished = State.data.unfinished.filter(x => String(x.id) !== key);
    const removed = State.data.unfinished.length !== before;
    // Always persist: it also heals an in-memory copy that had drifted from
    // what is on disk, so a discarded quiz can never come back after a reload.
    State.save();
    return removed;
  }
  function deleteSession(id) {
    const before = State.data.sessions.length;
    State.data.sessions = State.data.sessions.filter(x => x.id !== id);
    if (State.data.sessions.length !== before) State.save();
  }
  function clearUnfinished() {
    State.data.unfinished = [];
    State.save();
  }
  // -----------------------------------------------------------------------
  window.StateStore = { State, getSettings, setSettings, setUser, getUser, clearUser, recordSession, getSessions, recordAttempt, getAttempts, markServed, getServed, resetAll, deleteSession, uid, saveUnfinishedSnapshot, getUnfinished, removeUnfinished, clearUnfinished };
})();
