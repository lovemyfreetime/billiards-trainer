package com.lovemyfreetime.billiardstrainer;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.speech.RecognizerIntent;
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
import java.util.ArrayList;
import java.util.Collections;
import org.json.JSONObject;

/** Android-only preview. The remote page never receives Trainer's native bridge. */
final class ChasePreview {
    static final String ENTRY_SCRIPT =
        "(() => {\n" +
        "  const bridge = window.TrainerChasePreview;\n" +
        "  if (!bridge || window.cueChatEntryInstalled || !document.body) return;\n" +
        "  window.cueChatEntryInstalled = true;\n" +
        "  const open = () => bridge.postMessage('open');\n" +
        "  const crest = '<svg width=\"26\" height=\"26\" viewBox=\"0 0 32 32\" aria-hidden=\"true\"><path d=\"M13 4Q16 0 19 4L29 23Q32 29 26 29H23L25 32L18 29H6Q0 29 3 23Z\" fill=\"#f5f4ea\" stroke=\"#b4834d\" stroke-width=\"2\"/><circle cx=\"16\" cy=\"10.5\" r=\"4\" fill=\"#fff\" stroke=\"#a6a193\"/><circle cx=\"11\" cy=\"21\" r=\"4.7\" fill=\"#078374\"/><circle cx=\"21\" cy=\"21\" r=\"4.7\" fill=\"#175abb\"/></svg>';\n" +
        "  const button = document.createElement('button');\n" +
        "  button.type = 'button';\n" +
        "  button.id = 'cue-chat-launch';\n" +
        "  button.setAttribute('aria-label', 'Cue Chat');\n" +
        "  button.innerHTML = crest + '<span>Cue Chat</span>';\n" +
        "  const label = button.lastElementChild;\n" +
        "  button.style.cssText = 'position:fixed;z-index:68;display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;height:44px;padding:0 10px;min-width:44px;border:1px solid #658293;border-radius:14px;background:#152f3f;color:#eff7ff;font:600 13px system-ui;white-space:nowrap;cursor:pointer';\n" +
        "  button.style.display = 'none';\n" +
        "  button.addEventListener('click', open);\n" +
        "  document.body.append(button);\n" +
        "\n" +
        "  const box = el => {\n" +
        "    if (!el) return null;\n" +
        "    const r = el.getBoundingClientRect();\n" +
        "    return r.width && r.height && getComputedStyle(el).visibility !== 'hidden' ? r : null;\n" +
        "  };\n" +
        "  function update() {\n" +
        "    const play = document.querySelector('.play-home-companion');\n" +
        "    if (play && play.dataset.cueChat !== '1') {\n" +
        "      play.dataset.cueChat = '1';\n" +
        "      play.removeAttribute('href');\n" +
        "      play.setAttribute('role', 'button');\n" +
        "      play.setAttribute('aria-label', 'Cue Chat');\n" +
        "      play.tabIndex = 0;\n" +
        "      play.innerHTML = '<span class=\"play-ui-icon\">' + crest + '</span><span>Cue Chat</span><small>Chat with Chase.</small>';\n" +
        "      play.onclick = event => { event.preventDefault(); open(); };\n" +
        "      play.onkeydown = event => {\n" +
        "        if (event.key === 'Enter' || event.key === ' ') {\n" +
        "          event.preventDefault(); play.click();\n" +
        "        }\n" +
        "      };\n" +
        "    }\n" +
        "    const classes = document.body.classList;\n" +
        "    const zen = classes.contains('zen-mode');\n" +
        "    const trainer = classes.contains('trainer-workspace');\n" +
        "    if ((!zen && !trainer) || classes.contains('play-mode') || classes.contains('app-experience-host')) {\n" +
        "      button.style.display = 'none';\n" +
        "      return;\n" +
        "    }\n" +
        "    label.hidden = false;\n" +
        "    const bar = document.getElementById('workspaceTools');\n" +
        "    const panel = box(document.getElementById('panel'));\n" +
        "    const display = box(document.getElementById('appDisplayControl'));\n" +
        "    const close = box(document.getElementById('appCloseControl'));\n" +
        "    if (zen) {\n" +
        "      const dots = [display, close].filter(Boolean).sort((a,b) => a.left-b.left);\n" +
        "      label.hidden = true;\n" +
        "      Object.assign(button.style, {\n" +
        "        display:'inline-flex', width:'44px', left:'auto', top:Math.max(0, (dots[0]?.top ?? 7) + ((dots[0]?.height ?? 44) - 44)/2) + 'px',\n" +
        "        right:Math.max(8, dots.length ? innerWidth - dots[0].left + 5 : 72) + 'px',\n" +
        "        borderColor:'transparent', background:'transparent', padding:'0'\n" +
        "      });\n" +
        "      return;\n" +
        "    }\n" +
        "    const barBox = box(bar);\n" +
        "    if (!barBox) { button.style.display = 'none'; return; }\n" +
        "    const top = Math.max(0, barBox.top + (barBox.height - 44) / 2);\n" +
        "    const topRow = r => r && r.top < top + 44 && r.bottom > top;\n" +
        "    const leftBoxes = [...bar.children].filter(e => e.id !== 'workspaceTopActions').map(box).filter(topRow);\n" +
        "    const rightBoxes = [box(document.getElementById('workspaceTopActions')), display, close].filter(topRow);\n" +
        "    const min = Math.max(8, ...leftBoxes.map(r => r.right + 8));\n" +
        "    const max = Math.min(innerWidth - 8, ...rightBoxes.map(r => r.left - 8), panel && panel.left > innerWidth / 2 ? panel.left - 8 : innerWidth);\n" +
        "    if (max - min < 44) { button.style.display = 'none'; return; }\n" +
        "    const compact = max - min < 111;\n" +
        "    label.hidden = compact;\n" +
        "    const width = compact ? 44 : 111;\n" +
        "    const preferred = innerWidth * (classes.contains('table-3d') ? .635 : .59) - width / 2;\n" +
        "    Object.assign(button.style, {\n" +
        "      display:'inline-flex', width:width+'px', top:top+'px', right:'auto',\n" +
        "      left:Math.max(min, Math.min(max - width, preferred))+'px',\n" +
        "      background:'#152f3f', borderColor:'#658293', padding:'0'\n" +
        "    });\n" +
        "  }\n" +
        "  let queued = false;\n" +
        "  function queue() {\n" +
        "    if (queued) return;\n" +
        "    queued = true;\n" +
        "    window.requestAnimationFrame(() => { queued = false; update(); });\n" +
        "  }\n" +
        "  const observer = new MutationObserver(queue);\n" +
        "  observer.observe(document.body, {childList:true, subtree:true});\n" +
        "  observer.observe(document.body, {attributes:true, attributeFilter:['class']});\n" +
        "  window.addEventListener('resize', queue);\n" +
        "  document.addEventListener('billiards:display-change', queue);\n" +
        "  update();\n" +
        "})();\n";

    static final String DICTATION_SCRIPT =
        "(() => {\n" +
        "  const bridge = window.CueChatDictation;\n" +
        "  const byId = id => document.getElementById(id);\n" +
        "  const dialog = byId('private-coach'), input = byId('coach-input'), mic = byId('coach-mic');\n" +
        "  const send = byId('coach-voice-send'), status = byId('coach-voice-status');\n" +
        "  if (!bridge || !dialog || !input || !mic || !send || !status || window.cueChatDictationResult) return;\n" +
        "  let pending = false;\n" +
        "  function sync() {\n" +
        "    if (dialog.open && !input.disabled && mic.disabled) mic.disabled = false;\n" +
        "    if (dialog.open && send.disabled) send.disabled = false;\n" +
        "  }\n" +
        "  const obs = new MutationObserver(sync);\n" +
        "  obs.observe(dialog, {attributes:true, attributeFilter:['open','disabled'], subtree:true});\n" +
        "  sync();\n" +
        "  mic.title = 'Dictate with Android';\n" +
        "  mic.addEventListener('click', event => {\n" +
        "    event.preventDefault();\n" +
        "    event.stopImmediatePropagation();\n" +
        "    if (!event.isTrusted || pending || !dialog.open || input.disabled) return;\n" +
        "    pending = true;\n" +
        "    byId('coach-audio')?.pause();\n" +
        "    bridge.postMessage('dictate');\n" +
        "  }, true);\n" +
        "  window.cueChatDictationResult = (transcript, unavailable) => {\n" +
        "    if (!pending) return;\n" +
        "    pending = false;\n" +
        "    if (!dialog.open || input.disabled) return;\n" +
        "    if (unavailable) { status.textContent = 'Android dictation is unavailable. Try your keyboard mic.'; return; }\n" +
        "    if (!transcript.trim()) return;\n" +
        "    const draft = input.value;\n" +
        "    input.value = (draft + (draft && !/\\s$/.test(draft) ? ' ' : '') + transcript.trim()).slice(0, input.maxLength);\n" +
        "    input.dispatchEvent(new Event('input', {bubbles:true}));\n" +
        "    if (send.checked && input.value !== draft) input.form?.requestSubmit();\n" +
        "  };\n" +
        "})();\n";

    private final Activity activity;
    private static final int DICTATION_REQUEST = 4202;
    private Dialog dialog;
    private AlertDialog setup;
    private WebView panel;
    private WebView dictationPage;
    private boolean dictationInFlight;

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
            || (BundledApp.PREFIX + "index.html").equals(path)
            || (BundledApp.PREFIX + "play.html").equals(path));
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
        boolean dictationBridge = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER);
        if (dictationBridge) {
            String origin = url.substring(0, url.length() - 1);
            WebViewCompat.addWebMessageListener(page, "CueChatDictation", Collections.singleton(origin),
                (view, message, source, mainFrame, reply) -> {
                    if (view == page && panel == page && mainFrame && origin.equals(source.toString())
                            && ChasePreviewAddress.sameOrigin(url, page.getUrl())
                            && "dictate".equals(message.getData())) dictate(page);
                });
        }
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
            @Override public void onPageStarted(WebView view, String target, android.graphics.Bitmap icon) {
                if (dictationPage == view) dictationPage = null;
            }
            @Override public void onPageFinished(WebView view, String target) {
                if (dictationBridge && panel == view && ChasePreviewAddress.sameOrigin(url, target))
                    view.evaluateJavascript(DICTATION_SCRIPT, null);
            }
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
            if (dictationPage == page) dictationPage = null;
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

    private void dictate(WebView page) {
        if (dictationInFlight) {
            reportDictation(page, "", true);
            return;
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Ask Chase");
        dictationPage = page;
        dictationInFlight = true;
        try {
            activity.startActivityForResult(intent, DICTATION_REQUEST);
        } catch (ActivityNotFoundException | SecurityException unavailable) {
            dictationPage = null;
            dictationInFlight = false;
            reportDictation(page, "", true);
        }
    }

    boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != DICTATION_REQUEST) return false;
        WebView page = dictationPage;
        dictationPage = null;
        dictationInFlight = false;
        if (page != null && page == panel) {
            ArrayList<String> results = resultCode == Activity.RESULT_OK && data != null
                ? data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) : null;
            String text = results == null || results.isEmpty() ? null : results.get(0);
            reportDictation(page, text == null ? "" : text.substring(0, Math.min(text.length(), 1800)), false);
        }
        return true;
    }

    private void reportDictation(WebView page, String transcript, boolean unavailable) {
        page.evaluateJavascript("window.cueChatDictationResult?.(" + JSONObject.quote(transcript)
            + "," + unavailable + ")", null);
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
