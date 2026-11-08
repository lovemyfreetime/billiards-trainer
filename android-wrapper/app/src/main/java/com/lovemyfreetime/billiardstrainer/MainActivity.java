package com.lovemyfreetime.billiardstrainer;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
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
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.webkit.ServiceWorkerController;
import android.webkit.ServiceWorkerClient;
import java.util.concurrent.atomic.AtomicInteger;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import android.widget.TextView;
import android.widget.Toast;

import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String APP_URL = BuildConfig.APP_URL;
    private static final int FILE_CHOOSER_REQUEST = 4201;

    private static final int CAMERA_PERMISSION_REQUEST = 4202;
    private static final int AUDIO_PERMISSION_REQUEST = 4206;
    private PermissionRequest pendingCameraRequest;
    private PermissionRequest pendingAudioRequest;
    private WebChromeClient.FileChooserParams pendingCameraChooser;
    private boolean requestingCameraPermission, requestingAudioPermission;

    private final ApkUpdates apkUpdates = new ApkUpdates(this);
    WebView webView;
    BundledApp bundledApp;
    private volatile boolean bootstrapPending;
    private boolean fullscreenEnabled=true;
    private android.speech.tts.TextToSpeech descriptionVoice;
    private boolean descriptionVoiceReady,descriptionVoiceFailed;
    private String pendingDescription;
    private void descriptionSpeechState(String state){
        if(webView!=null)webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('billiards:description-speech',{detail:"+org.json.JSONObject.quote(state)+"}))",null);
    }
    private void readDescription(){
        if(!descriptionVoiceReady||pendingDescription==null)return;
        String text=pendingDescription;pendingDescription=null;
        if(descriptionVoice.speak(text,android.speech.tts.TextToSpeech.QUEUE_FLUSH,null,"description")!=android.speech.tts.TextToSpeech.SUCCESS)descriptionSpeechState("error");
    }
    private static final String BOOTSTRAP_PATH=BundledApp.PREFIX+"__android_start__.html";
    final AtomicInteger externalRequests=new AtomicInteger();
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

    private void createAndLoadWebView(Bundle savedInstanceState) throws Exception {
        if(BuildConfig.BUNDLED_APP){bundledApp=new BundledApp(getAssets());try{bundledApp.enableUpdates(new java.io.File(getFilesDir(),"content-updates"));}catch(Exception ignored){/* Packaged files remain usable if update storage is unavailable. */}}
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
        if(bundledApp!=null){
            if(!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))throw new IllegalStateException("Update Android System WebView or Chrome to open this version of Billiards Trainer.");
            String migration="window.BilliardsBundledAndroid=true;window.BilliardsContentUpdateProtocol="+(bundledApp.updates==null?0:ContentUpdates.PROTOCOL)+";(()=>{if(location.pathname!=="+org.json.JSONObject.quote(BOOTSTRAP_PATH)+")return;"+
                "(async()=>{try{if('serviceWorker' in navigator){const sw=navigator.serviceWorker;sw.register=()=>Promise.reject(new Error('App files are installed locally'));const registrations=await sw.getRegistrations();await Promise.all(registrations.map(r=>r.unregister()));}BilliardsAndroid.finishBundledStartup();}catch(e){const report=()=>document.body.textContent='Please close and reopen Billiards Trainer. '+String(e);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',report,{once:true});else report();console.error(e);}})();})();";
            WebViewCompat.addDocumentStartJavaScript(webView,migration,Collections.singleton(BundledApp.ORIGIN));
        }

        if(bundledApp!=null)ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return resolveRequest(request);}
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return resolveRequest(request);}

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if(bootstrapPending&&request.isForMainFrame()&&!BOOTSTRAP_PATH.equals(u.getPath()))return true;
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
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    String[] resources=request.getResources();
                    if(!trustedCameraPage(request.getOrigin()) || resources.length!=1){request.deny();return;}
                    if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resources[0])){
                        if(pendingCameraRequest!=null)pendingCameraRequest.deny();
                        pendingCameraRequest=request;
                        if(cameraAllowed())finishCameraRequest();else requestCameraPermission();
                    }else if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0])){
                        if(pendingAudioRequest!=null)pendingAudioRequest.deny();
                        pendingAudioRequest=request;
                        if(audioAllowed())finishAudioRequest();else requestAudioPermission();
                    }else request.deny();
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request){
                runOnUiThread(() -> {
                    if(pendingCameraRequest==request)pendingCameraRequest=null;
                    if(pendingAudioRequest==request)pendingAudioRequest=null;
                });
            }
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                launchFileChooser(params);
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
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    if (filename == null || filename.trim().isEmpty()) filename = "BilliardsTrainer_download";
                    r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                    Toast.makeText(MainActivity.this, "Download started", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Could not start download", Toast.LENGTH_SHORT).show();
                }
            }
        });

        if (bundledApp != null) {
            startBundledApp();
        } else if (savedInstanceState != null) {
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

    private WebResourceResponse resolveRequest(WebResourceRequest request){
        if(bundledApp==null)return null;
        if(BundledApp.isAppOrigin(request.getUrl()))return bundledApp.respond(request);
        if("http".equals(request.getUrl().getScheme())||"https".equals(request.getUrl().getScheme())){externalRequests.incrementAndGet();if(bootstrapPending)return BundledApp.empty(503,"Starting installed app",null);}
        return null;
    }

    private void startBundledApp(){
        // Use a real HTTPS document, served from the APK. Document-start migration
        // also runs if an old worker returns a cached page for this first request.
        bootstrapPending=true;
        webView.loadUrl(BundledApp.ORIGIN+BOOTSTRAP_PATH+"?native=1");
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

    private boolean cameraAllowed(){return checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;}
    private boolean audioAllowed(){return checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED;}
    private boolean trustedCameraPage(Uri origin){
        if(origin==null||webView==null)return false;
        Uri page=Uri.parse(webView.getUrl()==null?"":webView.getUrl());
        return BundledApp.ORIGIN.equals(origin.toString().replaceAll("/$",""))
            && "https".equals(page.getScheme()) && "lovemyfreetime.github.io".equals(page.getHost())
            && (page.getPort()==-1||page.getPort()==443) && page.getPath()!=null && page.getPath().startsWith(BundledApp.PREFIX);
    }
    private void requestCameraPermission(){
        if(!requestingCameraPermission){requestingCameraPermission=true;requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_PERMISSION_REQUEST);}
    }
    private void finishCameraRequest(){
        PermissionRequest request=pendingCameraRequest;pendingCameraRequest=null;
        if(request!=null){if(cameraAllowed()&&trustedCameraPage(request.getOrigin()))request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else request.deny();}
    }
    private void requestAudioPermission(){
        if(!requestingAudioPermission){
            requestingAudioPermission=true;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},AUDIO_PERMISSION_REQUEST);
        }
    }
    private void finishAudioRequest(){
        PermissionRequest request=pendingAudioRequest;pendingAudioRequest=null;
        if(request!=null){
            if(audioAllowed()&&trustedCameraPage(request.getOrigin()))request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else request.deny();
        }
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
        super.onRequestPermissionsResult(code,permissions,results);
        if(code==CAMERA_PERMISSION_REQUEST){
            requestingCameraPermission=false;finishCameraRequest();
            WebChromeClient.FileChooserParams chooser=pendingCameraChooser;pendingCameraChooser=null;
            if(chooser!=null)launchFileChooserGranted(chooser);
        }
        if(code==AUDIO_PERMISSION_REQUEST){
            requestingAudioPermission=false;finishAudioRequest();
        }
    }
    private void launchFileChooser(WebChromeClient.FileChooserParams params) {
        if(params!=null&&params.isCaptureEnabled()&&!cameraAllowed()){
            pendingCameraChooser=params;requestCameraPermission();return;
        }
        launchFileChooserGranted(params);
    }
    private void launchFileChooserGranted(WebChromeClient.FileChooserParams params) {
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        java.util.ArrayList<String> accepts=new java.util.ArrayList<>();
        if(params!=null)for(String type:params.getAcceptTypes()){
            if(type==null||type.trim().isEmpty())continue;
            if(type.equalsIgnoreCase(".json"))type="application/json";
            if(type.contains("/"))accepts.add(type);
        }
        boolean media=accepts.isEmpty();
        for(String type:accepts)if(type.startsWith("image/")||type.startsWith("video/"))media=true;
        if(accepts.isEmpty()){accepts.add("image/*");accepts.add("video/*");}
        pick.putExtra(Intent.EXTRA_MIME_TYPES,accepts.toArray(new String[0]));

        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraOutputUri = media && cameraAllowed() ? createPendingCameraUri() : null;
        if (cameraOutputUri != null) {
            camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        Intent chooser = Intent.createChooser(pick, media ? "Choose pool-table photo or video" : "Choose audio or saved file");
        if (camera.resolveActivity(getPackageManager()) != null && cameraOutputUri != null) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        }
        try {
            startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
        } catch (Exception e) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = null;
            Toast.makeText(this, "No file chooser is available", Toast.LENGTH_SHORT).show();
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
        if(!fullscreenEnabled)return;
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
        pendingDescription=null;if(descriptionVoice!=null)descriptionVoice.stop();
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

    @Override
    protected void onDestroy(){
        if(pendingCameraRequest!=null){pendingCameraRequest.deny();pendingCameraRequest=null;}
        if(pendingAudioRequest!=null){pendingAudioRequest.deny();pendingAudioRequest=null;}
        pendingCameraChooser=null;
        if(descriptionVoice!=null){descriptionVoice.stop();descriptionVoice.shutdown();}
        synchronized (this) {
            if (recordingExport != null) recordingExport.discard();
            recordingExport = null;
            if (audioExport != null) audioExport.discard();
            audioExport = null;
        }
        super.onDestroy();
    }

    private RecordingExport recordingExport;
    private AudioExport audioExport;
    private final class AudioExport {
        String token, name;
        Uri file;
        OutputStream stream;
        long size;
        void discard(){
            try{if(stream!=null)stream.close();}catch(Exception ignored){}
            discardClipDownload(file);
        }
    }
    private final class RecordingExport {
        String token, stem;
        Uri video, setup;
        OutputStream stream;
        long size;
        void discard() {
            try { if (stream != null) stream.close(); } catch (Exception ignored) {}
            for (Uri uri : new Uri[]{video, setup}) {
                if (uri != null) try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            }
        }
    }

    public class AndroidBridge {
        @JavascriptInterface public String cameraPermissionState(){return cameraAllowed()?"granted":"denied";}
        @JavascriptInterface public void openCameraSettings(){runOnUiThread(() -> {
            if(!trustedCameraPage(Uri.parse(BundledApp.ORIGIN)))return;
            startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));
        });}
        @JavascriptInterface
        public void closeApp(){runOnUiThread(()->finishAndRemoveTask());}

        @JavascriptInterface
        public void setFullscreen(boolean active){runOnUiThread(()->{
            fullscreenEnabled=active;
            if(active)enterImmersiveModeSafely();
            else if(android.os.Build.VERSION.SDK_INT>=30){
                WindowInsetsController controller=getWindow().getInsetsController();
                if(controller!=null)controller.show(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());
            }else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('billiards:native-fullscreen',{detail:"+active+"}))",null);
        });}

        @JavascriptInterface
        public void cancelDescriptionSpeech(){runOnUiThread(()->{pendingDescription=null;if(descriptionVoice!=null)descriptionVoice.stop();});}

        @JavascriptInterface
        public void speakDescription(String text){runOnUiThread(()->{
            if(text==null||text.length()>2000)return;
            pendingDescription=text;
            if(descriptionVoiceFailed){pendingDescription=null;descriptionSpeechState("error");return;}
            if(descriptionVoice!=null){readDescription();return;}
            descriptionVoice=new android.speech.tts.TextToSpeech(MainActivity.this,result->runOnUiThread(()->{
                if(result!=android.speech.tts.TextToSpeech.SUCCESS){descriptionVoiceFailed=true;pendingDescription=null;descriptionSpeechState("error");return;}
                int language=descriptionVoice.setLanguage(java.util.Locale.US);
                if(language<0){descriptionVoiceFailed=true;pendingDescription=null;descriptionSpeechState("error");return;}
                descriptionVoiceReady=true;
                descriptionVoice.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener(){
                    public void onStart(String id){}
                    public void onDone(String id){runOnUiThread(()->descriptionSpeechState("end"));}
                    public void onError(String id){runOnUiThread(()->descriptionSpeechState("error"));}
                });
                readDescription();
            }));
        });}

        @JavascriptInterface
        public void openSnapshotFolder() {
            runOnUiThread(() -> {
                if (!contentPage()) return;
                Uri folder = android.provider.DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents",
                    "primary:Pictures/Billiards Trainer/Snapshots");
                Intent browse = new Intent(Intent.ACTION_VIEW);
                browse.setDataAndType(folder, android.provider.DocumentsContract.Document.MIME_TYPE_DIR);
                browse.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(browse);
                } catch (android.content.ActivityNotFoundException e) {
                    Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    picker.setType("image/png");
                    picker.addCategory(Intent.CATEGORY_OPENABLE);
                    picker.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, folder);
                    try {
                        startActivityForResult(picker, 4204);
                    } catch (Exception unavailable) {
                        Toast.makeText(MainActivity.this,
                            "Open My Files > Pictures > Billiards Trainer > Snapshots",
                            Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                        "Open My Files > Pictures > Billiards Trainer > Snapshots",
                        Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void openTrainerClipsFolder() {
            runOnUiThread(() -> {
                if (!contentPage()) return;
                Uri folder = android.provider.DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents", "primary:Download/Billiards Trainer/Clips");
                Intent browse = new Intent(Intent.ACTION_VIEW);
                browse.setDataAndType(folder, android.provider.DocumentsContract.Document.MIME_TYPE_DIR);
                browse.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivity(browse); }
                catch (Exception unavailable) {
                    Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    picker.setType("*/*");
                    picker.addCategory(Intent.CATEGORY_OPENABLE);
                    picker.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, folder);
                    try { startActivityForResult(picker, 4205); }
                    catch (Exception ignored) {
                        Toast.makeText(MainActivity.this, "Open My Files > Internal storage > Download > Billiards Trainer > Clips",
                            Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openNarrationAudioFolder(){
            runOnUiThread(()->{
                if(!contentPage())return;
                Uri folder=android.provider.DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents","primary:Download/Billiards Trainer/Audio");
                Intent browse=new Intent(Intent.ACTION_VIEW);
                browse.setDataAndType(folder,android.provider.DocumentsContract.Document.MIME_TYPE_DIR);
                browse.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try{startActivity(browse);}
                catch(Exception unavailable){
                    Intent picker=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    picker.setType("audio/*");picker.addCategory(Intent.CATEGORY_OPENABLE);
                    picker.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI,folder);
                    try{startActivityForResult(picker,4207);}
                    catch(Exception ignored){Toast.makeText(MainActivity.this,
                        "Open My Files > Download > Billiards Trainer > Audio",Toast.LENGTH_LONG).show();}
                }
            });
        }

        @JavascriptInterface public boolean supportsNarrationAudio(){return true;}

        private boolean narrationAudioExists(String name){
            try(android.database.Cursor cursor=getContentResolver().query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,new String[]{MediaStore.MediaColumns._ID},
                MediaStore.MediaColumns.DISPLAY_NAME+"=?",new String[]{name},null)){
                return cursor!=null&&cursor.moveToFirst();
            }
        }

        @JavascriptInterface
        public String beginNarrationAudio(String name,String extension,String mime){
            synchronized(MainActivity.this){
                if(audioExport!=null||name==null||name.length()>120||extension==null||
                    !extension.matches("(?i)wav|webm|m4a|mp3|ogg|opus|aac|flac")||
                    mime==null||!mime.startsWith("audio/")||mime.length()>100)return "";
                String stem=name.replaceAll("[^\\p{L}\\p{N} ._()-]","-").trim();
                if(stem.isEmpty()||stem.equals(".")||stem.equals(".."))return "";
                AudioExport export=new AudioExport();
                try{
                    String selected=stem+"."+extension.toLowerCase(java.util.Locale.ROOT);
                    int suffix=2;
                    while(narrationAudioExists(selected))
                        selected=stem+" ("+(suffix++)+")."+extension.toLowerCase(java.util.Locale.ROOT);
                    export.name=selected;
                    export.file=newClipDownload(Environment.DIRECTORY_DOWNLOADS+"/Billiards Trainer/Audio",selected,mime);
                    if(export.file==null)throw new java.io.IOException("Cannot create audio");
                    export.stream=getContentResolver().openOutputStream(export.file);
                    if(export.stream==null)throw new java.io.IOException("Cannot open audio");
                    export.token=java.util.UUID.randomUUID().toString();
                    audioExport=export;return export.token;
                }catch(Exception failure){export.discard();return "";}
            }
        }

        @JavascriptInterface
        public boolean appendNarrationAudio(String token,String base64){
            synchronized(MainActivity.this){
                AudioExport export=audioExport;
                if(export==null||!export.token.equals(token)||base64==null||base64.length()>1500000)return false;
                try{
                    byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
                    if(export.size+bytes.length>300000000L)throw new java.io.IOException("Audio too large");
                    export.stream.write(bytes);export.size+=bytes.length;return true;
                }catch(Exception failure){export.discard();audioExport=null;return false;}
            }
        }

        @JavascriptInterface
        public String finishNarrationAudio(String token){
            synchronized(MainActivity.this){
                AudioExport export=audioExport;
                if(export==null||!export.token.equals(token))return "";
                try{
                    if(export.size==0)throw new java.io.IOException("Empty audio");
                    export.stream.close();export.stream=null;
                    ContentValues ready=new ContentValues();ready.put(MediaStore.MediaColumns.IS_PENDING,0);
                    if(getContentResolver().update(export.file,ready,null,null)!=1)
                        throw new java.io.IOException("Audio not finalized");
                    audioExport=null;
                    return "Download/Billiards Trainer/Audio/"+export.name;
                }catch(Exception failure){export.discard();audioExport=null;return "";}
            }
        }

        @JavascriptInterface
        public void abortNarrationAudio(String token){
            synchronized(MainActivity.this){
                if(audioExport!=null&&audioExport.token.equals(token)){
                    audioExport.discard();audioExport=null;
                }
            }
        }

        private boolean recordingNameExists(String name) {
            try (android.database.Cursor cursor = getContentResolver().query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    new String[]{MediaStore.MediaColumns._ID},
                    MediaStore.MediaColumns.DISPLAY_NAME + " IN (?, ?)",
                    new String[]{name + ".mp4", name + ".session.billiards.json"}, null)) {
                return cursor != null && cursor.moveToFirst();
            }
        }

        @JavascriptInterface
        public boolean supportsNarratedVideo() { return true; }

        @JavascriptInterface
        public String beginTrainerRecording(String name, String session) {
            synchronized (MainActivity.this) {
                if (recordingExport != null || name == null || name.length() > 120 ||
                    (session != null && session.length() > 24000000)) return "";
                String stem = name.replaceAll("[^\\p{L}\\p{N} ._()-]", "-").trim();
                if (stem.isEmpty() || stem.equals(".") || stem.equals("..")) return "";
                RecordingExport export = new RecordingExport();
                try {
                    String selected = stem;
                    int suffix = 2;
                    while (recordingNameExists(selected)) selected = stem + " (" + suffix++ + ")";
                    export.stem = selected;
                    String folder = Environment.DIRECTORY_DOWNLOADS + "/Billiards Trainer/Clips";
                    export.video = newClipDownload(folder, selected + ".mp4", "video/mp4");
                    if (session != null) {
                        export.setup = newClipDownload(folder, selected + ".session.billiards.json", "application/json");
                        writeClipDownload(export.setup, session.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    }
                    export.stream = getContentResolver().openOutputStream(export.video);
                    if (export.stream == null) throw new java.io.IOException("Cannot open video");
                    export.token = java.util.UUID.randomUUID().toString();
                    recordingExport = export;
                    return export.token;
                } catch (Exception failure) {
                    export.discard();
                    return "";
                }
            }
        }

        @JavascriptInterface
        public boolean appendTrainerRecording(String token, String base64) {
            synchronized (MainActivity.this) {
                RecordingExport export = recordingExport;
                if (export == null || !export.token.equals(token)) return false;
                try {
                    if (base64 == null || base64.length() > 1100000) throw new java.io.IOException("Chunk too large");
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    export.size += bytes.length;
                    if (export.size > 512L * 1024 * 1024) throw new java.io.IOException("Recording too large");
                    export.stream.write(bytes);
                    return true;
                } catch (Exception failure) {
                    export.discard();recordingExport = null;
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String finishTrainerRecording(String token) {
            synchronized (MainActivity.this) {
                RecordingExport export = recordingExport;
                if (export == null || !export.token.equals(token)) return "";
                try {
                    if (export.size == 0) throw new java.io.IOException("Empty video");
                    export.stream.close();export.stream = null;
                    ContentValues ready = new ContentValues();
                    ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    if ((export.setup != null && getContentResolver().update(export.setup, ready, null, null) != 1) ||
                        getContentResolver().update(export.video, ready, null, null) != 1)
                        throw new java.io.IOException("Could not finish recording");
                    recordingExport = null;
                    return "Download/Billiards Trainer/Clips/" + export.stem + ".mp4" + (export.setup != null ? " and its setup" : "");
                } catch (Exception failure) {
                    export.discard();recordingExport = null;
                    return "";
                }
            }
        }

        @JavascriptInterface
        public void abortTrainerRecording(String token) {
            synchronized (MainActivity.this) {
                if (recordingExport != null && recordingExport.token.equals(token)) {
                    recordingExport.discard();recordingExport = null;
                }
            }
        }

        @JavascriptInterface
        public String saveTrainerClip(String stem, String video, String session) {
            String prefix = "data:video/mp4;base64,";
            if (stem == null || !stem.matches("Shot [a-z0-9]{1,16}-[0-9]{2,6}") ||
                video == null || video.length() > 44000000 || !video.startsWith(prefix) ||
                session == null || session.length() > 24000000) return "";
            String folder = Environment.DIRECTORY_DOWNLOADS + "/Billiards Trainer/Clips";
            Uri clip = null, setup = null;
            try {
                byte[] bytes = Base64.decode(video.substring(prefix.length()), Base64.DEFAULT);
                clip = newClipDownload(folder, stem + ".mp4", "video/mp4");
                setup = newClipDownload(folder, stem + ".session.billiards.json", "application/json");
                writeClipDownload(clip, bytes);
                writeClipDownload(setup, session.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                ContentValues ready = new ContentValues();
                ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (getContentResolver().update(setup, ready, null, null) != 1 ||
                    getContentResolver().update(clip, ready, null, null) != 1)
                    throw new java.io.IOException("Could not finalize clip files");
                return folder;
            } catch (Exception e) {
                discardClipDownload(clip);
                discardClipDownload(setup);
                return "";
            }
        }

        private Uri newClipDownload(String folder, String name, String mime) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, folder);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            return getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        }

        private void writeClipDownload(Uri uri, byte[] bytes) throws java.io.IOException {
            if (uri == null) throw new java.io.IOException("Cannot create download");
            try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
                if (stream == null) throw new java.io.IOException("Cannot open download");
                stream.write(bytes);
            }
        }

        private void discardClipDownload(Uri uri) {
            if (uri == null) return;
            try {
                getContentResolver().delete(uri, null, null);
            } catch (RuntimeException ignored) {
                // Keep the original export failure.
            }
        }

        @JavascriptInterface
        public String saveTrainerExport(String filename, String content) {
            if (filename == null || content == null || content.length() > 24000000) return "";
            boolean png = filename.endsWith(".png");
            String prefix = "data:image/png;base64,";
            if (png ? !content.startsWith(prefix) : !filename.endsWith(".billiards.json")) return "";
            String safeName = filename.replaceAll("[^\\p{L}\\p{N} ._()-]", "-");
            String folder = png ? Environment.DIRECTORY_PICTURES + "/Billiards Trainer/Snapshots"
                                : Environment.DIRECTORY_DOWNLOADS + "/Billiards Trainer";
            Uri uri = null;
            try {
                byte[] bytes = png ? Base64.decode(content.substring(prefix.length()), Base64.DEFAULT)
                                   : content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, png ? "image/png" : "application/json");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, folder);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                uri = getContentResolver().insert(png ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                                                     : MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return "";
                try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
                    if (stream == null) throw new java.io.IOException("Cannot open export");
                    stream.write(bytes);
                }
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (getContentResolver().update(uri, values, null, null) != 1)
                    throw new java.io.IOException("Cannot finalize export");
                String[] columns = {MediaStore.MediaColumns.DISPLAY_NAME};
                try (android.database.Cursor cursor = getContentResolver().query(uri, columns, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) safeName = cursor.getString(0);
                } catch (Exception ignored) {
                    // The export is already saved.
                }
                return folder + "/" + safeName;
            } catch (Exception e) {
                if (uri != null) getContentResolver().delete(uri, null, null);
                return "";
            }
        }

        @JavascriptInterface
        public void saveBackup(String json){
            try {
                org.json.JSONObject data=new org.json.JSONObject(json);
                if(!"billiards-device-backup".equals(data.optString("format")))throw new IllegalArgumentException("Not a device backup");
                ContentValues values=new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME,"Billiards-Trainer-Backup-"+System.currentTimeMillis()+".json");
                values.put(MediaStore.Downloads.MIME_TYPE,"application/json");
                values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.Downloads.IS_PENDING,1);
                Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
                if(uri==null)throw new IllegalStateException("Downloads is unavailable");
                try {
                    try(OutputStream stream=getContentResolver().openOutputStream(uri)){
                        if(stream==null)throw new IllegalStateException("Could not open backup");
                        stream.write(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    }
                    values.clear();values.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,values,null,null);
                }catch(Exception e){getContentResolver().delete(uri,null,null);throw e;}
                runOnUiThread(()->Toast.makeText(MainActivity.this,"Backup saved to Downloads",Toast.LENGTH_LONG).show());
            }catch(Exception e){runOnUiThread(()->Toast.makeText(MainActivity.this,"Backup could not be saved. Keep a copy of the backup text.",Toast.LENGTH_LONG).show());}
        }

        @JavascriptInterface
        public void finishBundledStartup(){
            runOnUiThread(()->{
                if(!bootstrapPending||webView==null)return;
                Uri current=Uri.parse(webView.getUrl()==null?"":webView.getUrl());
                if(!BundledApp.isAppOrigin(current)||!BOOTSTRAP_PATH.equals(current.getPath()))return;
                bootstrapPending=false;
                webView.evaluateJavascript("location.replace("+org.json.JSONObject.quote(APP_URL)+")",null);
            });
        }

        @JavascriptInterface
        public String installedAppVersion(){return BuildConfig.VERSION_NAME;}

        @JavascriptInterface
        public String contentUpdateStatus(){return bundledApp!=null&&bundledApp.updates!=null?bundledApp.updates.status().toString():"{}";}

        @JavascriptInterface
        public void checkContentUpdates(boolean force){
            runOnUiThread(()->{if(!contentPage()||bundledApp.updates==null)return;
                if(force)apkUpdates.check();
                bundledApp.updates.check(force,state->runOnUiThread(()->{if(contentPage())webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:"+state.toString()+"}))",null);}));
            });
        }

        @JavascriptInterface
        public void applyContentUpdate(){
            runOnUiThread(()->{if(!contentPage()||bundledApp.updates==null||!"ready".equals(bundledApp.updates.status().optString("state")))return;
                try{bundledApp.updates.apply();webView.reload();}catch(Exception e){Toast.makeText(MainActivity.this,"The working version is still available. Close and reopen the app to try the update.",Toast.LENGTH_LONG).show();}
            });
        }
        private boolean contentPage(){if(webView==null||bundledApp==null)return false;Uri u=Uri.parse(webView.getUrl()==null?"":webView.getUrl());return BundledApp.isAppOrigin(u)&&u.getPath()!=null&&u.getPath().startsWith(BundledApp.PREFIX);}

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
