package com.lovemyfreetime.billiardstrainer;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.text.InputType;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Android-only preview. The remote page never receives Trainer's native bridge. */
final class ChasePreview {
    static final String ENTRY_SCRIPT =
        "(() => {\n" +
        "  if (!document.body?.classList.contains('trainer-workspace')) return;\n" +
        "  const bar = document.getElementById('workspaceTools');\n" +
        "  if (!bar || document.getElementById('chase-preview-launch')) return;\n" +
        "  const button = document.createElement('button');\n" +
        "  button.type = 'button';\n" +
        "  button.id = 'chase-preview-launch';\n" +
        "  button.textContent = 'Chase Preview';\n" +
        "  button.setAttribute('aria-label', 'Chat with Chase (under construction)');\n" +
        "  button.style.cssText = 'flex:none;white-space:nowrap;padding:4px 8px;font-size:12px';\n" +
        "  button.addEventListener('click', () => window.TrainerChasePreview.postMessage('open'));\n" +
        "  bar.append(button);\n" +
        "})();\n";

    private final Activity activity;
    private Dialog dialog;
    private AlertDialog setup;
    private WebView panel;

    ChasePreview(Activity activity) { this.activity = activity; }

    boolean attach(WebView trainer) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return false;
        WebViewCompat.addWebMessageListener(trainer, "TrainerChasePreview",
            Collections.singleton(BundledApp.ORIGIN), (view, message, origin, mainFrame, reply) -> {
                if (view == trainer && mainFrame && BundledApp.ORIGIN.equals(origin.toString())
                        && isTrainerPage(trainer.getUrl()) && "open".equals(message.getData())) open();
            });
        return true;
    }

    static boolean isTrainerPage(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        return BundledApp.isAppOrigin(uri) && (BundledApp.PREFIX.equals(path)
            || (BundledApp.PREFIX + "index.html").equals(path));
    }

    private android.content.SharedPreferences prefs() {
        return activity.getSharedPreferences("chase-preview", Activity.MODE_PRIVATE);
    }

    private void open() {
        if (dialog != null || setup != null) return;
        String url = ChasePreviewAddress.normalize(prefs().getString("endpoint", ""));
        if (url == null) configure(); else show(url);
    }

    private void configure() {
        if (setup != null) return;
        EditText field = new EditText(activity);
        field.setSingleLine(true);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        field.setHint("https://computer.example.ts.net:9443/");
        field.setText(prefs().getString("endpoint", ""));
        AlertDialog prompt = new AlertDialog.Builder(activity)
            .setTitle("Set up Chase Preview")
            .setMessage("Paste the private Cue Chat address once. Keep Tailscale connected and Cue Chat running on the PC.")
            .setView(field).setNegativeButton("Cancel", null).setPositiveButton("Open Chase", null).create();
        setup = prompt;
        prompt.setOnDismissListener(ignored -> { if (setup == prompt) setup = null; });
        prompt.setOnShowListener(ignored -> prompt.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String url = ChasePreviewAddress.normalize(field.getText().toString());
            if (url == null) { field.setError("Enter the HTTPS Cue Chat address ending in .ts.net."); return; }
            prefs().edit().putString("endpoint", url).apply();
            prompt.dismiss();
            close();
            show(url);
        }));
        prompt.show();
    }

    private void show(String url) {
        Dialog sheet = new Dialog(activity);
        sheet.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout body = new LinearLayout(activity);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setBackgroundColor(Color.rgb(9, 24, 35));
        LinearLayout header = new LinearLayout(activity);
        body.addView(header);
        Button back = new Button(activity);
        back.setText("Back to Table");
        back.setOnClickListener(v -> sheet.dismiss());
        header.addView(back);
        TextView title = new TextView(activity);
        title.setText("Chat with Chase · Under construction");
        title.setTextColor(Color.WHITE);
        title.setGravity(android.view.Gravity.CENTER_VERTICAL);
        header.addView(title, new LinearLayout.LayoutParams(0, -1, 1));
        Button settings = new Button(activity);
        settings.setText("Server");
        settings.setOnClickListener(v -> configure());
        header.addView(settings);
        TextView status = new TextView(activity);
        status.setTextColor(Color.WHITE);
        status.setPadding(14, 8, 14, 8);
        status.setVisibility(View.GONE);
        body.addView(status);
        Button retry = new Button(activity);
        retry.setText("Retry");
        retry.setVisibility(View.GONE);
        body.addView(retry);

        WebView page = new WebView(activity);
        body.addView(page, new LinearLayout.LayoutParams(-1, 0, 1));
        WebSettings web = page.getSettings();
        web.setJavaScriptEnabled(true);
        web.setDomStorageEnabled(true);
        web.setAllowFileAccess(false);
        web.setAllowContentAccess(false);
        web.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setSupportMultipleWindows(false);
        // Cue Chat still asks the player to opt in to automatic replies.
        web.setMediaPlaybackRequiresUserGesture(false);
        Runnable unavailable = () -> {
            if (panel != page) return;
            status.setText("Can’t open Cue Chat. Check Tailscale and Start-With-Speechify on the PC.");
            status.setVisibility(View.VISIBLE);
            retry.setVisibility(View.VISIBLE);
        };
        retry.setOnClickListener(v -> {
            status.setVisibility(View.GONE);
            retry.setVisibility(View.GONE);
            page.loadUrl(url);
        });
        page.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !ChasePreviewAddress.sameOrigin(url, request.getUrl().toString());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (ChasePreviewAddress.sameOrigin(url, request.getUrl().toString())) return null;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) unavailable.run();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) unavailable.run();
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                sheet.dismiss();
                android.widget.Toast.makeText(activity, "Chase Preview closed. Your table is still open.", android.widget.Toast.LENGTH_LONG).show();
                return true;
            }
        });
        dialog = sheet;
        panel = page;
        sheet.setContentView(body);
        sheet.setOnDismissListener(ignored -> {
            if (dialog == sheet) { dialog = null; panel = null; }
            body.removeView(page);
            page.destroy();
        });
        sheet.show();
        if (sheet.getWindow() != null) {
            sheet.getWindow().setLayout(-1, -1);
            sheet.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        }
        page.loadUrl(url);
    }

    void pause() {
        if (panel == null) return;
        panel.evaluateJavascript("document.querySelectorAll('audio,video').forEach(el=>el.pause())", null);
        panel.onPause();
    }

    void resume() { if (panel != null) panel.onResume(); }

    void close() {
        if (setup != null) setup.dismiss();
        if (dialog != null) dialog.dismiss();
    }
}
