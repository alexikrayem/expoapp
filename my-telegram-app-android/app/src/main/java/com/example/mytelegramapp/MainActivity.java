package com.example.mytelegramapp;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable fullscreen mode similar to Telegram apps
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        
        // Configure WebView settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAppCacheEnabled(true);
        webSettings.setGeolocationEnabled(false);
        
        // Set user agent to simulate mobile browser with Telegram identifier
        webSettings.setUserAgentString("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36 Telegram-Android/10.4.2");
        
        // Enable mixed content mode if needed
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        
        // Set WebViewClient to handle page navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Show loading indicator if needed
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Hide loading indicator if needed
                
                // Inject Telegram Web App script if not already present
                injectTelegramWebAppScript();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Handle links to external URLs - open in browser or stay in app
                // For Telegram Web App, you might want to handle this differently
                return false;
            }
            
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // Handle errors appropriately
            }
        });
        
        // Enable JavaScript interface for Telegram Web App integration
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");
        
        // Load your Telegram web app
        loadTelegramWebApp();
    }
    
    private void loadTelegramWebApp() {
        // Set the URL to your deployed Telegram web app
        // This could be a local development URL or the production URL
        String telegramAppUrl = "http://10.0.2.2:5173"; // Localhost address for Android emulator
        
        // You can also load from your deployed URL if available
        // String telegramAppUrl = "https://your-telegram-app-url.com"; 
        webView.loadUrl(telegramAppUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Refresh the UI if needed when returning to the app
    }
    
    // Handle permission results
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == 1001) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted
                // You can notify the web app that permission was granted
            } else {
                // Permission denied
                // You can notify the web app that permission was denied
            }
        }
    }
    
    // Inject necessary scripts for Telegram Web App compatibility
    private void injectTelegramWebAppScript() {
        // This ensures the Telegram Web App SDK is available
        webView.evaluateJavascript(
            "(function() {" +
            "  if (typeof window.Telegram === 'undefined') {" +
            "    var script = document.createElement('script');" +
            "    script.src = 'https://telegram.org/js/telegram-web-app.js';" +
            "    document.head.appendChild(script);" +
            "  }" +
            "})();", 
            null
        );
    }
}