package com.example.mytelegramapp;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class WebAppInterface {
    Context mContext;

    // Instantiate the interface and set the context
    WebAppInterface(Context c) {
        mContext = c;
    }

    // Show a toast from JavaScript
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }
    
    // Log messages from JavaScript
    @JavascriptInterface
    public void logMessage(String message) {
        Log.d("WebAppInterface", message);
    }
    
    // Get device information
    @JavascriptInterface
    public String getDeviceInfo() {
        return android.os.Build.MODEL + " - Android " + android.os.Build.VERSION.RELEASE;
    }
    
    // Handle Telegram-specific functions
    @JavascriptInterface
    public void closeWebApp() {
        // Close the activity or handle the close action
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).finish();
        }
    }
    
    // Share content using Android sharing functionality
    @JavascriptInterface
    public void shareContent(String title, String text, String url) {
        Intent shareIntent = new Intent();
        shareIntent.setAction(Intent.ACTION_SEND);
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
        shareIntent.putExtra(Intent.EXTRA_TEXT, text + " " + url);
        shareIntent.setType("text/plain");
        
        mContext.startActivity(Intent.createChooser(shareIntent, "Share via"));
    }
    
    // Open external URL in browser
    @JavascriptInterface
    public void openUrl(String url) {
        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        mContext.startActivity(browserIntent);
    }
    
    // Copy text to clipboard
    @JavascriptInterface
    public void copyToClipboard(String text) {
        android.content.ClipboardManager clipboard = 
            (android.content.ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
        android.content.ClipData clip = android.content.ClipData.newPlainText("Copied Text", text);
        clipboard.setPrimaryClip(clip);
        
        // Provide feedback
        showToast("Text copied to clipboard");
    }
    
    // Get app version
    @JavascriptInterface
    public String getAppVersion() {
        try {
            String packageName = mContext.getPackageName();
            return mContext.getPackageManager().getPackageInfo(packageName, 0).versionName;
        } catch (Exception e) {
            return "1.0.0"; // Default version
        }
    }
    
    // Request notification permission
    @JavascriptInterface
    public void requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            ((Activity) mContext).requestPermissions(
                new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 
                1001
            );
        }
    }
}