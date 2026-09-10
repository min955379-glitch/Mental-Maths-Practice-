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
  function resetAll() { State.data = deepClone(DEFAULT_STATE); State.save(); }
  // -- unfinished session API ---------------------------------------------
  // A snapshot is the current in-memory quiz state. The store keeps one
  // entry per session.id and updates the existing one on every progress
  // tick (so we never overwrite one unfinished quiz with another).
  function saveUnfinishedSnapshot(snapshot) {
    if (!snapshot || !snapshot.id) return;
    // Defensive clone so callers can mutate freely.
    const snap = deepClone(snapshot);
    // Mark the snapshot as still in progress.
    snap.completedAt = null;
    const arr = State.data.unfinished;
    const idx = arr.findIndex(x => x.id === snap.id);
    snap.lastSavedAt = new Date().toISOString();
    if (idx >= 0) {
      arr[idx] = snap;
    } else {
      arr.push(snap);
    }
    // Cap the unfinished list at 10 most-recent entries.
    if (arr.length > 10) {
      arr.sort((a,b) => (b.lastSavedAt || '').localeCompare(a.lastSavedAt || ''));
      arr.length = 10;
    }
    State.save();
  }
  function getUnfinished() {
    // Drop any that have somehow been completed (defensive).
    return State.data.unfinished
      .filter(x => !x.completedAt)
      .slice()
      .sort((a,b) => (b.lastSavedAt || b.startedAt || '').localeCompare(a.lastSavedAt || a.startedAt || ''));
  }
  function removeUnfinished(id) {
    const before = State.data.unfinished.length;
    State.data.unfinished = State.data.unfinished.filter(x => x.id !== id);
    if (State.data.unfinished.length !== before) State.save();
  }
  function clearUnfinished() {
    State.data.unfinished = [];
    State.save();
  }
  // -----------------------------------------------------------------------
  window.StateStore = { State, getSettings, setSettings, setUser, getUser, clearUser, recordSession, getSessions, recordAttempt, getAttempts, resetAll, uid, saveUnfinishedSnapshot, getUnfinished, removeUnfinished, clearUnfinished };
})();
