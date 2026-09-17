package com.iscsp.mentalmatharena;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
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
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.ResponseInfo;
import com.google.android.gms.ads.initialization.AdapterStatus;
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
 * DIAGNOSTIC BUILD: every ad lifecycle event writes a one-line log under
 * the "MentalMathsAd" tag so the actual AdMob response (or error code)
 * can be captured with `adb logcat` from the device. This is the only
 * change from the v1.8.2 release: banner size changed from the
 * deprecated SMART_BANNER to an anchored adaptive banner (still a 320x50
 * banner at the top), and AdListener callbacks were added so a banner
 * failure is visible in logcat.
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
    // ------------------------------------------------------------------

    /** Banner Ad Unit ID. Switched between test and production by build. */
    private static final String BANNER_AD_UNIT_ID =
            com.iscsp.mentalmatharena.AdMobConfig.BANNER_AD_UNIT_ID;

    /** Interstitial Ad Unit ID. Switched between test and production by build. */
    private static final String INTERSTITIAL_AD_UNIT_ID =
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

        Log.d(TAG, "onCreate started. App=" + getPackageName()
                + " banner=" + BANNER_AD_UNIT_ID
                + " interstitial=" + INTERSTITIAL_AD_UNIT_ID);

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
        // Anchored adaptive banner: picks the smallest effective
        // adaptive size for the current screen width. AdMob guarantees
        // it returns a creative that fits within that height. SMART_BANNER
        // is deprecated in 21.0.0+; adaptive banner sizes match the modern
        // ad-server pool and dramatically improve fill rate on new ad units.
        bannerAdView = new AdView(this);
        bannerAdView.setAdUnitId(BANNER_AD_UNIT_ID);
        AdSize adaptive = adaptiveBannerSize(this, /*widthDp=*/320);
        Log.d(TAG, "Banner created. unitId=" + BANNER_AD_UNIT_ID
                + " size=" + adaptive);
        bannerAdView.setAdSize(adaptive);
        LinearLayout.LayoutParams bannerParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT);
        bannerAdView.setLayoutParams(bannerParams);
        // Banner at index 0 = top of vertical LinearLayout = above the
        // WebView. They cannot overlap because LinearLayout carves
        // non-overlapping rows by construction.
        root.addView(bannerAdView, 0);

        // Log when the banner is measured & laid out - lets us catch
        // zero-size layouts on device.
        bannerAdView.post(new Runnable() {
            @Override public void run() {
                Log.d(TAG, "Banner laid out: w=" + bannerAdView.getWidth()
                        + " h=" + bannerAdView.getHeight()
                        + " visible=" + bannerAdView.getVisibility()
                        + " isAttached=" + bannerAdView.isAttachedToWindow());
            }
        });

        // Attach an AdListener so we capture both the success and the
        // failure paths of the banner load. This is the diagnostic hook
        // the previous build did not have.
        bannerAdView.setAdListener(new AdListener() {
            private final String t = TAG;

            @Override
            public void onAdLoaded() {
                Log.d(t, "Banner onAdLoaded. w=" + bannerAdView.getWidth()
                        + " h=" + bannerAdView.getHeight());
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                loadedInterstitial = null; // (banner doesn't touch this, but
                                           // keep null semantics consistent)
                if (error == null) {
                    Log.d(t, "Banner onAdFailedToLoad: (null LoadAdError)");
                    return;
                }
                Log.d(t, "Banner onAdFailedToLoad: code=" + error.getCode()
                        + " domain=" + error.getDomain()
                        + " message=" + error.getMessage());
                ResponseInfo ri = error.getResponseInfo();
                if (ri != null) {
                    Log.d(t, "Banner ResponseInfo: adapter="
                            + ri.getMediationAdapterClassName()
                            + " responseId=" + ri.getResponseId());
                } else {
                    Log.d(t, "Banner ResponseInfo: null");
                }
            }

            @Override
            public void onAdOpened() {
                Log.d(t, "Banner onAdOpened (full screen).");
            }

            @Override
            public void onAdClicked() {
                Log.d(t, "Banner onAdClicked.");
            }

            @Override
            public void onAdClosed() {
                Log.d(t, "Banner onAdClosed.");
            }

            @Override
            public void onAdImpression() {
                Log.d(t, "Banner onAdImpression.");
            }
        });

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
                Log.d(TAG, "WebView onPageFinished url=" + url);
                // Once the PWA is fully loaded the first time, the banner
                // can safely request an ad (no flicker above the splash).
                if (bannerAdView != null && bannerAdView.getTag() == null) {
                    bannerAdView.setTag("first-request");
                    Log.d(TAG, "Banner loadAd() called for unitId=" + BANNER_AD_UNIT_ID);
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
        Log.d(TAG, "MobileAds.initialize called.");
        MobileAds.initialize(
                this,
                new OnInitializationCompleteListener() {
                    @Override
                    public void onInitializationComplete(InitializationStatus status) {
                        StringBuilder sb = new StringBuilder("MobileAds.initialize completed.");
                        if (status != null) {
                            sb.append(" adapterStatus=");
                            java.util.Map<String, AdapterStatus> m = status.getAdapterStatusMap();
                            if (m != null && !m.isEmpty()) {
                                for (java.util.Map.Entry<String, AdapterStatus> e : m.entrySet()) {
                                    AdapterStatus v = e.getValue();
                                    sb.append(e.getKey())
                                            .append("[state=").append(v == null ? "?" : v.getInitializationState())
                                            .append(",desc=").append(v == null ? "?" : v.getDescription())
                                            .append("] ");
                                }
                            } else {
                                sb.append("(empty)");
                            }
                        }
                        Log.d(TAG, sb.toString());
                        // Preload an interstitial right away so the first
                        // "quiz complete" event has an ad to show.
                        requestInterstitial();
                    }
                });
    }

    /**
     * Returns an anchored adaptive banner size (modern replacement for
     * SMART_BANNER, which was deprecated in play-services-ads 21.0.0).
     * Anchored to portrait; the SDK flips it on orientation change.
     * The width in dp is taken from the caller's best estimate of the
     * screen width. 320dp is the safe minimum for any phone.
     */
    private static AdSize adaptiveBannerSize(Context ctx, int widthDp) {
        // Use the device width in dp if we can read it synchronously.
        try {
            DisplayMetrics dm = ctx.getResources().getDisplayMetrics();
            int pxToDp = (int) (dm.widthPixels / dm.density);
            if (pxToDp > 0) widthDp = Math.min(Math.max(pxToDp, 320), 1080);
        } catch (Throwable ignored) {
            // Fall back to 320dp if DisplayMetrics is unavailable for any reason.
        }
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(ctx, widthDp);
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
            Log.d(TAG, "Interstitial load() called for unitId=" + INTERSTITIAL_AD_UNIT_ID);
            InterstitialAd.load(
                    this,
                    INTERSTITIAL_AD_UNIT_ID,
                    buildAdRequest(),
                    new InterstitialAdLoadCallback() {
                        @Override
                        public void onAdLoaded(InterstitialAd interstitial) {
                            loadedInterstitial = interstitial;
                            Log.d(TAG, "Interstitial onAdLoaded.");
                            ResponseInfo ri = interstitial == null ? null : interstitial.getResponseInfo();
                            if (ri != null) {
                                Log.d(TAG, "Interstitial ResponseInfo: adapter="
                                        + ri.getMediationAdapterClassName()
                                        + " responseId=" + ri.getResponseId());
                            }
                        }

                        @Override
                        public void onAdFailedToLoad(LoadAdError error) {
                            loadedInterstitial = null;
                            if (error == null) {
                                Log.d(TAG, "Interstitial onAdFailedToLoad: (null LoadAdError)");
                                return;
                            }
                            Log.d(TAG, "Interstitial onAdFailedToLoad: code=" + error.getCode()
                                    + " domain=" + error.getDomain()
                                    + " message=" + error.getMessage());
                            ResponseInfo ri = error.getResponseInfo();
                            if (ri != null) {
                                Log.d(TAG, "Interstitial ResponseInfo: adapter="
                                        + ri.getMediationAdapterClassName()
                                        + " responseId=" + ri.getResponseId());
                            } else {
                                Log.d(TAG, "Interstitial ResponseInfo: null");
                            }
                            // Do NOT retry in a tight loop here; the next
                            // quiz-complete event will trigger another
                            // request from the bridge (see below).
                        }
                    });
        } catch (Throwable t) {
            // Defensive: ads are optional. A crash here would block the
            // app from launching.
            Log.w(TAG, "Interstitial load threw: " + t.getMessage(), t);
            loadedInterstitial = null;
        }
    }

    /** Called by the JS bridge. Returns synchronously - the actual ad
     *  is shown on the UI thread once the cached object is ready. */
    void showInterstitialFromJs() {
        Log.d(TAG, "JS bridge called showInterstitialIfReady()");
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                InterstitialAd ad = loadedInterstitial;
                if (ad == null) {
                    Log.d(TAG, "Interstitial show: nothing cached, requesting a fresh load.");
                    // Try to refresh in case the previous load failed.
                    requestInterstitial();
                    return;
                }
                try {
                    ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            loadedInterstitial = null;
                            Log.d(TAG, "Interstitial onAdDismissedFullScreenContent.");
                            // Refresh so the NEXT quiz completion has an
                            // ad to show (frequency-capping is handled by
                            // Google, not the app).
                            requestInterstitial();
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError adError) {
                            loadedInterstitial = null;
                            Log.d(TAG, "Interstitial onAdFailedToShowFullScreenContent: code="
                                    + (adError == null ? "?" : adError.getCode())
                                    + " message="
                                    + (adError == null ? "?" : adError.getMessage()));
                            requestInterstitial();
                        }

                        @Override
                        public void onAdShowedFullScreenContent() {
                            Log.d(TAG, "Interstitial onAdShowedFullScreenContent.");
                            // Preload-on-dismiss handled above.
                        }

                        @Override
                        public void onAdClicked() {
                            Log.d(TAG, "Interstitial onAdClicked.");
                        }

                        @Override
                        public void onAdImpression() {
                            Log.d(TAG, "Interstitial onAdImpression.");
                        }
                    });
                    Log.d(TAG, "Interstitial ad.show() about to be called.");
                    ad.show(MainActivity.this);
                } catch (Throwable t) {
                    // Show must never propagate out as a crash.
                    Log.w(TAG, "Interstitial.show threw: " + t.getMessage(), t);
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
