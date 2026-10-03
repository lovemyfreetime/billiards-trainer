package com.lovemyfreetime.billiardstrainer;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import android.widget.Toast;

import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://lovemyfreetime.github.io/billiards-trainer/";
    private static final int FILE_CHOOSER_REQUEST = 4201;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraOutputUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        try {
            createAndLoadWebView(savedInstanceState);
        } catch (Throwable t) {
            showStartupError(t);
        }
    }

    private void createAndLoadWebView(Bundle savedInstanceState) {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 11, 14));
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new AndroidBridge(), "BilliardsAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (u != null && "lovemyfreetime.github.io".equalsIgnoreCase(u.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                scheduleImmersiveMode();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                try {
                    if (webView != null) {
                        webView.destroy();
                        webView = null;
                    }
                    createAndLoadWebView(null);
                } catch (Throwable t) {
                    showStartupError(t);
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                launchFileChooser();
                return true;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url == null || url.startsWith("blob:") || url.startsWith("data:")) return;
                try {
                    DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                    r.setMimeType(mimeType);
                    r.addRequestHeader("User-Agent", userAgent);
                    r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "BilliardsTrainer_download");
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                    Toast.makeText(MainActivity.this, "Download started", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Could not start download", Toast.LENGTH_SHORT).show();
                }
            }
        });

        if (savedInstanceState != null) {
            try {
                if (webView.restoreState(savedInstanceState) == null) webView.loadUrl(APP_URL);
            } catch (Throwable ignored) {
                webView.loadUrl(APP_URL);
            }
        } else {
            webView.loadUrl(APP_URL);
        }

        scheduleImmersiveMode();
    }

    private void showStartupError(Throwable t) {
        TextView tv = new TextView(this);
        tv.setBackgroundColor(Color.rgb(9, 11, 14));
        tv.setTextColor(Color.WHITE);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(40, 40, 40, 40);
        tv.setTextSize(18f);
        String msg = t == null ? "Unknown startup error" : t.getClass().getSimpleName() + ": " + String.valueOf(t.getMessage());
        tv.setText("Billiards Trainer could not start.\n\n" + msg + "\n\nPlease update Android System WebView / Chrome and reopen the app.");
        setContentView(tv);
    }

    private void launchFileChooser() {
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});

        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraOutputUri = createPendingCameraUri();
        if (cameraOutputUri != null) {
            camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        Intent chooser = Intent.createChooser(pick, "Choose pool-table photo or video");
        if (camera.resolveActivity(getPackageManager()) != null && cameraOutputUri != null) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        }
        try {
            startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
        } catch (Exception e) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = null;
            Toast.makeText(this, "No photo/video chooser is available", Toast.LENGTH_SHORT).show();
        }
    }

    private Uri createPendingCameraUri() {
        try {
            String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, "Billiards_Camera_" + stamp + ".jpg");
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Billiards Trainer/Camera");
            return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST) return;
        Uri[] out = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (cameraOutputUri != null) out = new Uri[]{cameraOutputUri};
        } else if (cameraOutputUri != null) {
            try { getContentResolver().delete(cameraOutputUri, null, null); } catch (Exception ignored) {}
        }
        if (fileCallback != null) fileCallback.onReceiveValue(out);
        fileCallback = null;
        cameraOutputUri = null;
        scheduleImmersiveMode();
    }

    private void scheduleImmersiveMode() {
        View decor = getWindow().getDecorView();
        decor.postDelayed(this::enterImmersiveModeSafely, 120);
    }

    private void enterImmersiveModeSafely() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }
        } catch (Throwable ignored) {
            try {
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            } catch (Throwable ignoredAgain) {}
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) scheduleImmersiveMode();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        scheduleImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else moveTaskToBack(true);
    }

    private String cleanName(String name) {
        String n = name == null ? "Billiards_Analysis.jpg" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!n.toLowerCase(Locale.US).endsWith(".jpg") && !n.toLowerCase(Locale.US).endsWith(".jpeg")) n += ".jpg";
        return n;
    }

    private void saveJpegDataUrl(String dataUrl, String name, String subfolder, boolean showToast) {
        if (dataUrl == null) return;
        int comma = dataUrl.indexOf(',');
        if (comma < 0) return;
        try {
            byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, cleanName(name));
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Billiards Trainer" + subfolder);
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IllegalStateException("No MediaStore URI");
            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                if (os == null) throw new IllegalStateException("No output stream");
                os.write(bytes);
            }
            if (showToast) runOnUiThread(() -> Toast.makeText(MainActivity.this, "Saved to Pictures/Billiards Trainer", Toast.LENGTH_SHORT).show());
        } catch (Exception e) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not save photo", Toast.LENGTH_SHORT).show());
        }
    }

    public class AndroidBridge {
        @JavascriptInterface
        public boolean isWrapper() { return true; }

        @JavascriptInterface
        public void archiveJpeg(String dataUrl, String filename) {
            saveJpegDataUrl(dataUrl, filename, "/Analysis Archive", false);
        }

        @JavascriptInterface
        public void saveJpeg(String dataUrl, String filename) {
            saveJpegDataUrl(dataUrl, filename, "", true);
        }
    }
}
