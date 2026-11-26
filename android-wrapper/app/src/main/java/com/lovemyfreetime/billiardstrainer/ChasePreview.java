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
        "  const crest = '<span aria-hidden=\"true\" data-cue-chat-mark style=\"display:inline-block;flex:none;width:27px;height:27px;background:url(data:image/webp;base64,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) -8px -4px/44px 44px no-repeat\"></span>';\n" +
        "  const button = document.createElement('button');\n" +
        "  button.type = 'button';\n" +
        "  button.id = 'cue-chat-launch';\n" +
        "  button.setAttribute('aria-label', 'Cue Chat');\n" +
        "  button.innerHTML = crest + '<span>Cue Chat</span>';\n" +
        "  const label = button.lastElementChild;\n" +
        "  button.style.cssText = 'position:fixed;z-index:68;display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;height:44px;padding:0 10px;min-width:44px;border:1px solid #658293;border-radius:14px;background:#152f3f;color:#eff7ff;font:600 13px system-ui;white-space:nowrap;cursor:pointer';\n" +
        "  button.style.display = 'none';\n" +
        "  button.addEventListener('click', open);\n" +
        "  const wordmark = document.createElement('div');\n" +
        "  wordmark.id = 'cue-chat-trainer-wordmark';\n" +
        "  wordmark.innerHTML = 'Billiards <span class=\"trainer-title-color\">Trainer</span>';\n" +
        "  wordmark.style.cssText = 'display:none;position:fixed;z-index:68;pointer-events:none;white-space:nowrap;text-align:center;font:750 clamp(14px,2.3vw,23px)/44px system-ui;color:#fff';\n" +
        "  document.body.append(button);\n" +
        "  document.body.append(wordmark);\n" +
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
        "    const oldWordmark = document.querySelector('#panel .btg-pool-title h1');\n" +
        "    wordmark.style.display = 'none';\n" +
        "    if (oldWordmark) oldWordmark.hidden = false;\n" +
        "    if (classes.contains('play-mode')) {\n" +
        "      const modal = document.querySelector('.play-tools-dialog[open], #playDialog[open]');\n" +
        "      const nav = document.querySelector('.play-footer nav');\n" +
        "      if (modal && !play) {\n" +
        "        if (button.parentNode !== modal) modal.append(button);\n" +
        "        label.hidden = false;\n" +
        "        Object.assign(button.style, {\n" +
        "          display:'inline-flex', position:'fixed', width:'110px', top:'auto', bottom:'10px', left:'auto',\n" +
        "          right:'max(10px, env(safe-area-inset-right))', background:'#152f3f', borderColor:'#658293'\n" +
        "        });\n" +
        "      } else if (!modal && nav) {\n" +
        "        if (button.parentNode !== nav) nav.append(button);\n" +
        "        label.hidden = false;\n" +
        "        Object.assign(button.style, {display:'inline-flex',position:'static',width:'110px'});\n" +
        "      } else {\n" +
        "        button.style.display = 'none';\n" +
        "      }\n" +
        "      return;\n" +
        "    }\n" +
        "    if (button.parentNode !== document.body) document.body.append(button);\n" +
        "    button.style.position = 'fixed';\n" +
        "    button.style.bottom = 'auto';\n" +
        "    if ((!zen && !trainer) || classes.contains('app-experience-host')) {\n" +
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
        "    const stage = box(document.getElementById('stageWrap'));\n" +
        "    let low = min, high = max;\n" +
        "    if (stage) {\n" +
        "      const edge = panel && panel.left > stage.left && panel.left < stage.right ? panel.left : stage.right;\n" +
        "      const center = (stage.left + edge) / 2;\n" +
        "      const titleWidth = innerWidth < 700 ? 124 : 174;\n" +
        "      const left = center - titleWidth / 2;\n" +
        "      Object.assign(wordmark.style, {display:'block', width:titleWidth+'px', left:left+'px', top:top+'px'});\n" +
        "      if (oldWordmark) oldWordmark.hidden = true;\n" +
        "      low = Math.max(min, left + titleWidth + 8);\n" +
        "      if (max - low < 44 && left - 8 - min >= 44) { low = min; high = left - 8; }\n" +
        "    }\n" +
        "    if (high - low < 44) { button.style.display = 'none'; return; }\n" +
        "    const compact = high - low < 111;\n" +
        "    label.hidden = compact;\n" +
        "    const width = compact ? 44 : 111;\n" +
        "    const preferred = innerWidth * (classes.contains('table-3d') ? .635 : .59) - width / 2;\n" +
        "    Object.assign(button.style, {\n" +
        "      display:'inline-flex', width:width+'px', top:top+'px', right:'auto',\n" +
        "      left:Math.max(low, Math.min(high - width, preferred))+'px',\n" +
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
        "  observer.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','open']});\n" +
        "  window.addEventListener('resize', queue);\n" +
        "  document.addEventListener('billiards:display-change', queue);\n" +
        "  update();\n" +
        "})();\n";

    static final String DICTATION_SCRIPT =
        "(() => {\n" +
        "  const bridge = window.CueChatDictation;\n" +
        "  const byId = id => document.getElementById(id);\n" +
        "  const dialog = byId('private-coach'), thread = byId('coach-thread');\n" +
        "  const input = byId('coach-input'), mic = byId('coach-mic');\n" +
        "  const send = byId('coach-voice-send'), status = byId('coach-voice-status');\n" +
        "  if (!bridge || !dialog || !input || !mic || !send || !status || window.cueChatDictationResult) return;\n" +
        "  let pending = false;\n" +
        "  const visible = () => dialog.open || Boolean(thread && !thread.hidden);\n" +
        "  function sync() {\n" +
        "    if (visible() && !input.disabled && mic.disabled) mic.disabled = false;\n" +
        "    if (visible() && send.disabled) send.disabled = false;\n" +
        "  }\n" +
        "  const obs = new MutationObserver(sync);\n" +
        "  obs.observe(dialog, {attributes:true, attributeFilter:['open','disabled'], subtree:true});\n" +
        "  if (thread) obs.observe(thread, {attributes:true, attributeFilter:['hidden','disabled'], subtree:true});\n" +
        "  sync();\n" +
        "  mic.title = 'Dictate with Android';\n" +
        "  mic.addEventListener('click', event => {\n" +
        "    event.preventDefault();\n" +
        "    event.stopImmediatePropagation();\n" +
        "    if (!event.isTrusted || pending || !visible() || input.disabled) return;\n" +
        "    pending = true;\n" +
        "    byId('coach-audio')?.pause();\n" +
        "    bridge.postMessage('dictate');\n" +
        "  }, true);\n" +
        "  window.cueChatDictationResult = (transcript, unavailable) => {\n" +
        "    if (!pending) return;\n" +
        "    pending = false;\n" +
        "    if (!visible() || input.disabled) return;\n" +
        "    if (unavailable) { status.textContent = 'Android dictation is unavailable. Try your keyboard mic.'; return; }\n" +
        "    if (!transcript.trim()) return;\n" +
        "    const draft = input.value;\n" +
        "    input.value = (draft + (draft && !/\\s$/.test(draft) ? ' ' : '') + transcript.trim()).slice(0, input.maxLength);\n" +
        "    input.dispatchEvent(new Event('input', {bubbles:true}));\n" +
        "    if (send.checked && !draft.trim() && input.value !== draft) input.form?.requestSubmit();\n" +
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
            .setTitle("Set up Cue Chat")
            .setMessage("Paste the private Cue Chat address once. Keep Tailscale connected and Cue Chat running on the PC.")
            .setView(field).setNegativeButton("Cancel", null).setPositiveButton("Open Cue Chat", null).create();
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
        String conversationUrl = url + "?chat=chase";
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
        title.setText("Cue Chat · Under construction");
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
            page.loadUrl(conversationUrl);
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
                android.widget.Toast.makeText(activity, "Cue Chat closed. Your table is still open.", android.widget.Toast.LENGTH_LONG).show();
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
        page.loadUrl(conversationUrl);
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
