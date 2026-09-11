package com.iscsp.mentalmatharena;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

public class MainActivity extends Activity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set status bar color to match the app theme
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.parseColor("#0B1437"));
            window.setNavigationBarColor(Color.parseColor("#0B1437"));
        }

        // Create WebView programmatically
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // Deprecated but still needed for WebSQL/DOM storage on old API levels.
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // Required so the page can load file:///android_asset/index.html.
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        // Explicitly deny cross-file scripting: file:// pages must NOT be able to
        // read other local files or reach arbitrary origins through XHR/fetch.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Improve performance
        webView.setBackgroundColor(Color.parseColor("#0B1437"));

        // Keep the app inside the WebView, but let genuine outbound links
        // (the Contact Us WhatsApp button) reach the platform - see
        // openExternally() below. Everything local keeps loading in place.
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
        });
        webView.setWebChromeClient(new WebChromeClient());

        // Load the local PWA from assets
        webView.loadUrl("file:///android_asset/index.html");

        setContentView(webView);
    }

    /**
     * The app is entirely local (file:///android_asset), so any http(s)
     * navigation in the main frame is a real outbound link - the Contact Us
     * WhatsApp button. Handing it to the platform is what lets WhatsApp open
     * the conversation: WhatsApp registers itself for wa.me links, so the
     * pre-filled message arrives inside the app. If WhatsApp is not installed
     * the browser takes the intent and wa.me falls back to WhatsApp Web.
     * Nothing is lost either way: if no activity can handle the URL we return
     * false and the WebView loads it as it always did.
     */
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

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
