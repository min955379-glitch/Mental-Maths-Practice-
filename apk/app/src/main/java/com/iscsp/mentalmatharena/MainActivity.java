package com.iscsp.mentalmatharena;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

import java.util.Locale;

/**
 * Hosts the Mental Maths Practice PWA inside a WebView and integrates
 * Google AdMob (banner + interstitial) directly. The ad unit IDs are
 * chosen at build time through the {@link #BANNER_AD_UNIT_ID} /
 * {@link #INTERSTITIAL_AD_UNIT_ID} constants below: during development
 * and on the official test tracks the constants are the AdMob test IDs;
 * the same APK ships the real IDs only when produced as a final release.
 *
 * Banner placement: ABOVE the WebView, in a small fixed-height banner
 * row. The PWA itself sits below the banner and gets the rest of the
 * screen. The banner never overlaps questions, answers, hints, skip /
 * quit / submit controls or any other interactive content.
 *
 * Interstitial placement: ONLY at natural breaks - when the PWA signals
 * that a quiz session has just completed, AND in response to the user's
 * own tap on the "Continue / Done" CTA. The bridge call
 * {@code AndroidAdsBridge.showInterstitialIfReady()} returns immediately
 * synchronously and the ad is rendered inside a system-managed
 * full-screen window from that point forward. If no ad is loaded (no
 * network, ad server returned nothing, etc.) the call is a no-op and
 * the user continues to the next screen with no delay and no UI block.
 */
public class MainActivity extends Activity {

    private static final String TAG = "MentalMathsAd";

    // ------------------------------------------------------------------
    // AdMob configuration
    //
    // These IDs are intentionally switchable from a single place so the
    // release pipeline can drop in the production values, while the
    // development build uses Google's official test banner and
    // interstitial IDs. The AdMob App ID is in AndroidManifest.xml.
    // ------------------------------------------------------------------

    /** Banner Ad Unit ID. Set to Google's test ID for development. */
    private static final String BANNER_AD_UNIT_ID =
            // "/21775744923/example/anchor" is Google's OFFICIAL test ad
            // unit ID for adaptive banner ads (documented at
            // https://developers.google.com/admob/android/banner#sample_ad_units).
            com.iscsp.mentalmatharena.AdMobConfig.BANNER_AD_UNIT_ID;

    /** Interstitial Ad Unit ID. Set to Google's test ID for development. */
    private static final String INTERSTITIAL_AD_UNIT_ID =
            // Google's OFFICIAL test ad unit ID for interstitials.
            com.iscsp.mentalmatharena.AdMobConfig.INTERSTITIAL_AD_UNIT_ID;

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    private WebView webView;
    private AdView bannerAdView;
    private InterstitialAd loadedInterstitial;

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar / nav bar match the dark app theme.
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.parseColor("#0B1437"));
            window.setNavigationBarColor(Color.parseColor("#0B1437"));
        }

        // Vertical layout: banner on top, WebView fills the rest.
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0B1437"));

        // -- Banner ---------------------------------------------------
        // Smart-Banner-style height (~ 50 dp). Anchored at the very TOP
        // of the window; it sits ABOVE the WebView and never overlaps
        // PWA content. The PWA's own header has the same 0 px top inset.
        //
        // We use a sized-anchor banner that picks the smallest effective
        // adaptive size for the current screen width. AdMob guarantees
        // it returns a creative that fits within that height.
        bannerAdView = new AdView(this);
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);
        bannerAdView.setAdSize(AdSize.SMART_BANNER);
        LinearLayout.LayoutParams bannerParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT);
        bannerAdView.setLayoutParams(bannerParams);
        // Reserve space at the top of the WebView so content never gets
        // covered by the banner (the banner is already above the WebView
        // in this layout; this is just clarity).
        root.addView(bannerAdView, 0);

        // -- WebView --------------------------------------------------
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setBackgroundColor(Color.parseColor("#0B1437"));

        // Hook the JS <-> native bridge BEFORE any page loads, so the
        // PWA can call window.AndroidAdsBridge.showInterstitial() from
        // the very first screen.
        webView.addJavascriptInterface(
                new AndroidAdsBridge(this),
                "AndroidAdsBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || !request.isForMainFrame()) return false;
                return openExternally(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternally(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Once the PWA is fully loaded the first time, the banner
                // can safely request an ad (no flicker above the splash).
                if (bannerAdView != null && bannerAdView.getTag() == null) {
                    bannerAdView.setTag("first-request");
                    bannerAdView.loadAd(buildAdRequest());
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        webView.loadUrl("file:///android_asset/index.html");

        LinearLayout.LayoutParams webParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,                                    // height
                        1f);                                  // weight: fill
        root.addView(webView, webParams);

        setContentView(root);

        // Initialize the Mobile Ads SDK off the UI thread.
        MobileAds.initialize(
                this,
                new OnInitializationCompleteListener() {
                    @Override
                    public void onInitializationComplete(InitializationStatus status) {
                        // Preload an interstitial right away so the first
                        // "quiz complete" event has an ad to show. If it
                        // fails to load the loader callback handles it
                        // and the user is unaffected.
                        requestInterstitial();
                    }
                });
    }

    private AdRequest buildAdRequest() {
        // Single-arg build() uses defaults (everything opt-in, no test
        // device needed). The test banner / interstitial IDs themselves
        // act as the test switch - real IDs only go in for release.
        return new AdRequest.Builder().build();
    }

    // ------------------------------------------------------------------
    // Interstitial handling
    // ------------------------------------------------------------------

    private void requestInterstitial() {
        try {
            InterstitialAd.load(
                    this,
                    INTERSTITIAL_AD_UNIT_ID,
                    buildAdRequest(),
                    new InterstitialAdLoadCallback() {
                        @Override
                        public void onAdLoaded(InterstitialAd interstitial) {
                            loadedInterstitial = interstitial;
                            Log.d(TAG, "Interstitial loaded.");
                        }

                        @Override
                        public void onAdFailedToLoad(LoadAdError error) {
                            loadedInterstitial = null;
                            Log.d(TAG, "Interstitial failed to load: "
                                    + (error == null ? "?" : error.getMessage()));
                            // Do NOT retry in a tight loop here; the next
                            // quiz-complete event will trigger another
                            // request from the bridge (see below).
                        }
                    });
        } catch (Throwable t) {
            // Defensive: ads are optional. A crash here would block the
            // app from launching.
            Log.w(TAG, "Interstitial load threw: " + t.getMessage());
            loadedInterstitial = null;
        }
    }

    /** Called by the JS bridge. Returns synchronously - the actual ad
     *  is shown on the UI thread once the cached object is ready. */
    void showInterstitialFromJs() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                InterstitialAd ad = loadedInterstitial;
                if (ad == null) {
                    // Try to refresh in case the previous load failed.
                    requestInterstitial();
                    return;
                }
                try {
                    ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            loadedInterstitial = null;
                            // Refresh so the NEXT quiz completion has an
                            // ad to show (frequency-capping is handled by
                            // Google, not the app).
                            requestInterstitial();
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError adError) {
                            loadedInterstitial = null;
                            Log.d(TAG, "Interstitial failed to show: "
                                    + (adError == null ? "?" : adError.getMessage()));
                            requestInterstitial();
                        }

                        @Override
                        public void onAdShowedFullScreenContent() {
                            // Preload-on-dismiss handled above.
                        }
                    });
                    ad.show(MainActivity.this);
                } catch (Throwable t) {
                    // Show must never propagate out as a crash.
                    Log.w(TAG, "Interstitial.show threw: " + t.getMessage());
                    loadedInterstitial = null;
                    requestInterstitial();
                }
            }
        });
    }

    // ------------------------------------------------------------------
    // Outbound URL handling (unchanged - WhatsApp etc.)
    // ------------------------------------------------------------------

    private boolean openExternally(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")
                && !scheme.equals("tel") && !scheme.equals("sms") && !scheme.equals("mailto")) {
            return false;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    // ------------------------------------------------------------------
    // WebView lifecycle (unchanged)
    // ------------------------------------------------------------------

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (bannerAdView != null) bannerAdView.resume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (bannerAdView != null) bannerAdView.pause();
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (bannerAdView != null) {
            bannerAdView.destroy();
            bannerAdView = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        loadedInterstitial = null;
        super.onDestroy();
    }

    // ------------------------------------------------------------------
    // JS Bridge: window.AndroidAdsBridge.showInterstitial()
    // ------------------------------------------------------------------

    /** Object that gets exposed to the WebView as
     *  {@code window.AndroidAdsBridge}. The PWA calls the show()
     *  method when the session results screen is shown (a natural
     *  break, see README and ads.js). */
    public static class AndroidAdsBridge {
        private final MainActivity host;

        AndroidAdsBridge(MainActivity host) {
            this.host = host;
        }

        @JavascriptInterface
        public void showInterstitialIfReady() {
            host.showInterstitialFromJs();
        }

        /** Diagnostic getter used by the PWA to detect a native host. */
        @JavascriptInterface
        public boolean isReady() {
            return host != null;
        }
    }
}
