(function () {
  'use strict';
  const ACCOUNTS_KEY = 'iscsp-mm-accounts-v1';
  function loadAccounts() { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch(e) { return []; } }
  function saveAccounts(list) { try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch(e) {} }
  // crypto.subtle needs a secure context (https, localhost, or file:// in the
  // APK). Served over plain HTTP this throws, so callers get a clear message
  // instead of an unhandled rejection.
  function cryptoReady() { return !!(globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.digest); }
  const NO_CRYPTO_MSG = 'Password security is unavailable here. Open the app over https:// or use the Android app.';
  async function sha256(str) { const buf = new TextEncoder().encode(str); const hash = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join(''); }
  async function hashPassword(password, salt) { return sha256(salt + ':' + password); }
  async function register({name, email, password}) {
    name = (name||'').trim(); email = (email||'').trim().toLowerCase();
    if(!name) return {ok:false, msg:'Name is required.'};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok:false, msg:'Enter a valid email.'};
    if(!password || password.length<6) return {ok:false, msg:'Password must be at least 6 characters.'};
    if(!cryptoReady()) return {ok:false, msg:NO_CRYPTO_MSG};
    const accounts = loadAccounts();
    if(accounts.some(a => a.email === email)) return {ok:false, msg:'An account with that email already exists.'};
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
    const hash = await hashPassword(password, salt);
    const account = { id:'u-'+Date.now().toString(36), name, email, salt, hash, createdAt:new Date().toISOString() };
    accounts.push(account); saveAccounts(accounts);
    StateStore.setUser({id:account.id, name:account.name, email:account.email, createdAt:account.createdAt});
    return {ok:true};
  }
  async function login({email, password}) {
    email = (email||'').trim().toLowerCase();
    if(!email || !password) return {ok:false, msg:'Enter email and password.'};
    if(!cryptoReady()) return {ok:false, msg:NO_CRYPTO_MSG};
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.email === email);
    if(!acc) return {ok:false, msg:'No account found with that email.'};
    const hash = await hashPassword(password, acc.salt);
    if(hash !== acc.hash) return {ok:false, msg:'Incorrect password.'};
    StateStore.setUser({id:acc.id, name:acc.name, email:acc.email, createdAt:acc.createdAt});
    return {ok:true};
  }
  function logout() { StateStore.clearUser(); }
  function getAccountDetails() {
    const u = StateStore.getUser(); if(!u) return null;
    const accounts = loadAccounts();
    const acc = accounts.find(a => a.id === u.id);
    if(!acc) return u;
    // Deliberately does NOT return salt/hash: the UI never needs them and
    // they were previously readable from the account object in devtools.
    return Object.assign({}, u, {since: acc.createdAt});
  }
  window.Auth = { register, login, logout, getAccountDetails };
})();
