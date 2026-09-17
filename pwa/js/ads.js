(function () {
  'use strict';

  // ------------------------------------------------------------------
  // ads.js - bridge between the PWA and the native AdMob integration.
  //
  // There is one rule, and this file enforces it:
  //
  //   The interstitial MUST ONLY fire after the user has reached a
  //   natural break - that is, once the RESULTS screen of a finished
  //   quiz session is on screen. It is *never* fired while the user is
  //   answering a question, and never on the dashboard / category /
  //   settings / stats screens.
  //
  // How it detects that break: it watches the DOM for the results
  // screen instead of wrapping QuizEngine.Quiz.onFinish. The engine
  // callback cannot be used as a hook because renderQuizScreen()
  // re-assigns `Quiz.onFinish` on every question, which silently
  // discards any wrapper installed here. Watching for the element the
  // results screen renders is both stable and independent of the quiz
  // engine's internals.
  //
  // The bridge itself is the `window.AndroidAdsBridge` object that the
  // Android MainActivity exposes via WebView.addJavascriptInterface.
  // In a normal browser the property is `undefined` and this module
  // does nothing - so the same PWA can still be hosted on a website
  // for users without the AdMob build.
  //
  // No third-party network calls, no analytics, no extra JS.
  // ------------------------------------------------------------------

  function bridge() { return window.AndroidAdsBridge; }

  function maybeShowInterstitial() {
    var b = bridge();
    if (!b || typeof b.showInterstitialIfReady !== 'function') return;
    try {
      b.showInterstitialIfReady();
    } catch (e) {
      // Per the spec, a failed call must never throw out to JS land.
    }
  }

  // One ad per results screen: armed again as soon as the screen goes
  // away, so the next completed quiz can request one.
  var armed = true;

  function resultsOnScreen() {
    return !!(document.querySelector('.result-screen') || document.getElementById('resScore'));
  }

  function watchForResults() {
    if (typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(function () {
      if (resultsOnScreen()) {
        if (!armed) return;
        armed = false;
        // Let the results screen paint first: the user sees their
        // score and review before anything else happens.
        setTimeout(maybeShowInterstitial, 250);
      } else {
        armed = true;      // left the results screen - re-arm
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function start() {
    watchForResults();
    // Nothing to do if the results screen is somehow already up.
    if (resultsOnScreen()) { armed = false; setTimeout(maybeShowInterstitial, 250); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Expose for diagnostics only; not part of the runtime API.
  window.__MentalMathsAds = {
    bridgeAvailable: function () { return !!bridge(); },
    mayShowInterstitial: maybeShowInterstitial,
  };
})();
