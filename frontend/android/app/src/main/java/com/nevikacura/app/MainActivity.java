package com.nevikacura.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.net.Uri;
import android.content.Intent;
import android.view.View;
import android.view.WindowManager;
import android.graphics.Color;
import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final String APP_URL = "https://carecompanion-37.preview.emergentagent.com";
    private static final int CAMERA_PERMISSION_REQUEST = 1001;
    private static final int FILE_CHOOSER_REQUEST = 1002;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest currentPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make fullscreen
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        
        // Create WebView programmatically
        webView = new WebView(this);
        setContentView(webView);
        
        // Configure WebView settings
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        
        // Set user agent
        String userAgent = settings.getUserAgentString();
        settings.setUserAgentString(userAgent + " NevikaCuraApp/1.0");
        
        // WebViewClient to handle navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Handle external links (tel:, mailto:, etc.)
                if (url.startsWith("tel:") || url.startsWith("mailto:") || 
                    url.startsWith("whatsapp:") || url.startsWith("upi:")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                
                // Keep navigation within the app
                if (url.contains("carecompanion") || url.contains("nevikacura")) {
                    return false;
                }
                
                // Open external URLs in browser
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                
                return false;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });
        
        // WebChromeClient for permissions and file uploads
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
            
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                currentPermissionRequest = request;
                
                for (String resource : request.getResources()) {
                    if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        // Check camera permission
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) 
                            != PackageManager.PERMISSION_GRANTED) {
                            ActivityCompat.requestPermissions(MainActivity.this, 
                                new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
                        } else {
                            request.grant(request.getResources());
                        }
                        return;
                    }
                }
                
                request.grant(request.getResources());
            }
            
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        
        // Load the app URL
        webView.loadUrl(APP_URL);
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (currentPermissionRequest != null) {
                    currentPermissionRequest.grant(currentPermissionRequest.getResources());
                }
            } else {
                if (currentPermissionRequest != null) {
                    currentPermissionRequest.deny();
                }
            }
            currentPermissionRequest = null;
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
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
        webView.onResume();
    }
    
    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }
    
    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
