(function () {
  'use strict';

  // ------------------------------------------------------------------
  // ads.js - bridge between the PWA and the native AdMob integration.
  //
  // There is one rule, and this file enforces it:
  //
  //   The interstitial MUST ONLY fire after the user has reached a
  //   natural break - that is, after `QuizEngine.Quiz.onFinish` fires
  //   (i.e. the results screen is about to render). It is *never*
  //   fired while the user is answering a question, and never on the
  //   dashboard / category / settings screens.
  //
  // The bridge itself is the `window.AndroidAdsBridge` object that
  // the Android MainActivity exposes via `WebView.addJavascriptInterface`.
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

  function wireOnce() {
    var Quiz = window.QuizEngine && window.QuizEngine.Quiz;
    if (!Quiz) return false;
    if (Quiz.__adsWired) return true;
    Quiz.__adsWired = true;

    var prevOnFinish = Quiz.onFinish;
    Quiz.onFinish = function (session) {
      // 1) Render the results screen first (as before). The user
      //    sees their score and review before any ad is requested.
      if (typeof prevOnFinish === 'function') {
        try { prevOnFinish(session); } catch (e) {}
      }
      // 2) AFTER the results screen is in place, fire the ad. The
      //    bridge.showInterstitialIfReady() returns synchronously -
      //    the actual ad is shown asynchronously by the native code
      //    when the cached ad is ready, with proper Google
      //    frequency-capping applied.
      setTimeout(maybeShowInterstitial, 250);
    };
    return true;
  }

  // Hook on DOMContentLoaded - the PWA's app.js sets up the rest of
  // the engine at that point, so by the time we run `Quiz.onFinish`
  // is already defined.
  document.addEventListener('DOMContentLoaded', function () {
    // App.js may set `window.QuizEngine.Quiz` either at boot or after
    // a tiny async step, so we hook both paths.
    wireOnce();
    var tries = 0;
    var iv = setInterval(function () {
      if (wireOnce() || ++tries > 40) clearInterval(iv);
    }, 50);
  });

  // Expose for diagnostics only; not part of the runtime API.
  window.__MentalMathsAds = {
    bridgeAvailable: function () { return !!bridge(); },
    mayShowInterstitial: maybeShowInterstitial,
  };
})();
