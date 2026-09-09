(function () {
  'use strict';
  const KEY = 'iscsp-mm-state-v1';
  const DEFAULT_STATE = {
    user: null,
    sessions: [],
    attempts: [],
    settings: { theme:'auto', sound:false, timerInPractice:true, hintMode:false, difficulty:'Mixed', defaultCount:10, dailyGoal:20, reducedMotion:false }
  };
  function load() {
    try { const raw = localStorage.getItem(KEY); if(!raw) return deepClone(DEFAULT_STATE); const p = JSON.parse(raw); return mergeDefaults(p); } catch(e) { return deepClone(DEFAULT_STATE); }
  }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function mergeDefaults(p) { const base = deepClone(DEFAULT_STATE); if(!p.settings) p.settings={}; p.settings = Object.assign({}, base.settings, p.settings); if(!Array.isArray(p.sessions)) p.sessions=[]; if(!Array.isArray(p.attempts)) p.attempts=[]; return p; }
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
  window.StateStore = { State, getSettings, setSettings, setUser, getUser, clearUser, recordSession, getSessions, recordAttempt, getAttempts, resetAll, uid };
})();
