package com.lovemyfreetime.billiardstrainer;

import android.content.Intent;
import android.net.Uri;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.IOException;
import android.os.SystemClock;
import android.webkit.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class BundledAppTest {
    private MainActivity activity;
    private String js(String source)throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.webView.evaluateJavascript(source,value->{result.set(value);done.countDown();}));
        assertTrue("JavaScript callback: "+source,done.await(25,TimeUnit.SECONDS));return result.get();
    }
    private void waitFor(String predicate,int seconds)throws Exception {
        long until=SystemClock.elapsedRealtime()+seconds*1000L;
        while(SystemClock.elapsedRealtime()<until){if("true".equals(js("Boolean("+predicate+")")))return;Thread.sleep(100);}
        fail("Timed out: "+predicate+"; page="+js("JSON.stringify({url:location.href,text:document.body?.innerText.slice(0,1200),data:document.body?.dataset,native:window.BilliardsBundledAndroid,ready:document.readyState,lessonSequence:window.__lessonSequence,guide:window.billiardsPoolGuide?.getState(),tour:window.billiardsGetStartedTour?.getState()})"));
    }
    private void navigate(ActivityScenario<MainActivity> scenario,String path,String selector)throws Exception {
        long start=SystemClock.elapsedRealtime();String url=BundledApp.ORIGIN+BundledApp.PREFIX+path+(path.contains("?")?"&":"?")+"androidSmoke="+SystemClock.elapsedRealtime();
        scenario.onActivity(a->{activity=a;a.webView.loadUrl(url);});
        waitFor("location.href==="+org.json.JSONObject.quote(url)+"&&document.readyState==='complete'&&window.BilliardsBundledAndroid&&document.querySelector("+org.json.JSONObject.quote(selector)+")",25);
        System.out.println("ANDROID LOCAL "+path+": "+(SystemClock.elapsedRealtime()-start)+" ms");
    }
    @Test public void completeAppWithoutInternetAndLegacyCacheMigration()throws Exception {
        // A local network may remain connected; public web access must fail.
        HttpURLConnection probe=(HttpURLConnection)new URL("https://example.com/").openConnection();
        probe.setConnectTimeout(1500);probe.setReadTimeout(1500);boolean internet=false;
        try{probe.getInputStream().close();internet=true;}catch(IOException expected){}finally{probe.disconnect();}
        assertFalse("Public internet must be blocked",internet);
        Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(intent)){
            scenario.onActivity(a->{activity=a;a.webView.setWebChromeClient(new WebChromeClient(){@Override public boolean onConsoleMessage(ConsoleMessage m){android.util.Log.d("BilliardsOfflineTest",m.message());return true;}});});
            waitFor("document.readyState==='complete'&&window.BilliardsBundledAndroid&&(document.querySelector('main nav')||document.querySelector('[data-device=android]'))",30);
            navigate(scenario,"welcome.html","main nav");
            js("localStorage.setItem('android-offline-smoke','kept');(()=>{const r=indexedDB.open('billiards-offline-save-test',1);r.onupgradeneeded=()=>r.result.createObjectStore('layouts');r.onsuccess=()=>{const db=r.result,t=db.transaction('layouts','readwrite');t.objectStore('layouts').put('kept','layout');t.oncomplete=()=>{db.close();document.body.dataset.saved='yes';};};})()");
            waitFor("document.body.dataset.saved==='yes'",10);
            navigate(scenario,"?train=1","#canvas");
            // Install the probe at document start so it observes the real player's native media.
            String lessonProbe;
            try(java.io.InputStream stream=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("lesson-sequence.js")){
                java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;
                while((count=stream.read(buffer))!=-1)bytes.write(buffer,0,count);
                lessonProbe=new String(bytes.toByteArray(),StandardCharsets.UTF_8);
            }
            final String probeSource=lessonProbe;
            scenario.onActivity(a->androidx.webkit.WebViewCompat.addDocumentStartJavaScript(a.webView,probeSource,Collections.singleton(BundledApp.ORIGIN)));
            navigate(scenario,"?train=1&lessonSmoke=1","#canvas");
            waitFor("window.runLessonSequence&&window.billiardsGetStartedTour",25);
            // A single mobile run includes 150 Guide/Resources clips plus eight Quick Start recordings
            // and seven real practice waits. Give each section an independent bounded budget;
            // the JS probe still fails a missing/stalled recording within its own 20-second wait.
            for(String category:new String[]{"fundamentals","physics","drills","exercises","more"}){
                js("void runLessonSequence({category:"+org.json.JSONObject.quote(category)+"})");
                waitFor("['passed','failed'].includes(window.__lessonSequence?.status)",300);
                assertEquals(js("JSON.stringify(window.__lessonSequence)"),"\"passed\"",js("window.__lessonSequence.status"));
                System.out.println("ANDROID LOCAL Guide section: "+js("JSON.stringify(window.__lessonSequence)"));
            }
            assertEquals("150",js("window.__lessonSequence.guide"));
            js("void runLessonSequence({quickStartOnly:true})");
            waitFor("['passed','failed'].includes(window.__lessonSequence?.status)",180);
            assertEquals(js("JSON.stringify(window.__lessonSequence)"),"\"passed\"",js("window.__lessonSequence.status"));
            assertEquals("8",js("window.__lessonSequence.quickStart"));
            System.out.println("ANDROID LOCAL lesson sequence: "+js("JSON.stringify(window.__lessonSequence)"));
            navigate(scenario,"?zen=1","#zenBar");
            navigate(scenario,"play.html","#playDialog");
            js("window.__audioErrors=[];document.addEventListener('billiards-audio-error',e=>__audioErrors.push(e.detail));BilliardsAudio.speak(['player-2','turn-1'],()=>document.body.dataset.chase='done');");
            waitFor("document.body.dataset.chase==='done'",20);assertEquals("0",js("__audioErrors.length"));
            js("(()=>{const a=new Audio('./guide/audio/get-started-03.mp3');window.__guide=a;a.oncanplay=()=>a.play().then(()=>{a.pause();document.body.dataset.guide='ready';});a.onerror=()=>document.body.dataset.guide='failed';a.load();})()");
            waitFor("document.body.dataset.guide==='ready'",20);
            js("(()=>{const s=document.createElement('script');s.src='./vendor/onnxruntime-1.22.0/ort.wasm.min.js';s.onload=async()=>{try{ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('./vendor/onnxruntime-1.22.0/',document.baseURI).href;const b=await fetch('./ai_model/pool_ball_classifier.onnx').then(r=>r.arrayBuffer());window.__classifier=await ort.InferenceSession.create(b,{executionProviders:['wasm']});document.body.dataset.model='ready';}catch(e){document.body.dataset.model=String(e);}};document.head.append(s);})()");
            waitFor("document.body.dataset.model==='ready'",60);
            navigate(scenario,"backup.html","#create");
            js("(async()=>{try{window.__backup=await BilliardsBackup.create();localStorage.removeItem('android-offline-smoke');await BilliardsBackup.restore(__backup);document.body.dataset.backup='ready';}catch(e){document.body.dataset.backup=String(e);}})()");
            waitFor("document.body.dataset.backup==='ready'",20);
            assertEquals("\"kept\"",js("localStorage.getItem('android-offline-smoke')"));
            js("BilliardsAndroid.saveBackup(__backup)");
            // Read the actual app-owned Downloads file to verify it survived outside WebView storage.
            android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
            try(android.database.Cursor cursor=context.getContentResolver().query(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,new String[]{android.provider.MediaStore.Downloads._ID},android.provider.MediaStore.Downloads.DISPLAY_NAME+" LIKE ?",new String[]{"Billiards-Trainer-Backup-%.json"},android.provider.MediaStore.Downloads._ID+" DESC")){
                assertNotNull(cursor);assertTrue("Backup exists in Downloads",cursor.moveToFirst());
                android.net.Uri file=android.content.ContentUris.withAppendedId(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,cursor.getLong(0));
                try(java.io.InputStream stream=context.getContentResolver().openInputStream(file)){
                    java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;while((count=stream.read(buffer))!=-1)bytes.write(buffer,0,count);
                    assertEquals("billiards-device-backup",new org.json.JSONObject(new String(bytes.toByteArray(),java.nio.charset.StandardCharsets.UTF_8)).getString("format"));
                }
            }
            navigate(scenario,"install/","[data-device=android]");
            assertEquals("0",js("[...document.querySelectorAll('iframe')].filter(f=>f.getAttribute('src')).length"));
            scenario.onActivity(a->{WebBackForwardList history=a.webView.copyBackForwardList();for(int i=0;i<history.getSize();i++)assertFalse("Startup page is not a Back destination",history.getItemAtIndex(i).getUrl().contains("__android_start__.html"));});
            assertEquals("No public network requests needed",0,activity.externalRequests.get());
            assertEquals("All requested app assets were installed",0,activity.bundledApp.missingRequests.get());
            navigate(scenario,"welcome.html","main nav");
            // Reproduce a previously installed site worker without putting a test endpoint in the APK.
            final String workerPath=BundledApp.PREFIX+"__legacy_test_worker.js";
            final String worker="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(new Response('<!doctype html><title>old cached app</title><body>old cached app</body>',{headers:{'Content-Type':'text/html'}}));});";
            scenario.onActivity(a->{
                WebViewClient original=a.webView.getWebViewClient();
                a.webView.setWebViewClient(new WebViewClient(){@Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return r.getUrl().getPath().equals(workerPath)?worker(worker):original.shouldInterceptRequest(v,r);}});
                ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest r){return r.getUrl().getPath().equals(workerPath)?worker(worker):a.bundledApp.respond(r);}});
            });
            js("navigator.serviceWorker.register('./__legacy_test_worker.js').then(()=>navigator.serviceWorker.ready).then(()=>document.body.dataset.legacy='ready').catch(e=>document.body.dataset.legacy=String(e));");
            waitFor("document.body.dataset.legacy==='ready'&&navigator.serviceWorker.controller",20);
            scenario.recreate();scenario.onActivity(a->{activity=a;});
            waitFor("document.readyState==='complete'&&window.BilliardsBundledAndroid&&(document.querySelector('main nav')||document.querySelector('[data-device=android]'))",30);
            assertEquals("\"kept\"",js("localStorage.getItem('android-offline-smoke')"));
            js("(()=>{const r=indexedDB.open('billiards-offline-save-test');r.onsuccess=()=>{const db=r.result,q=db.transaction('layouts').objectStore('layouts').get('layout');q.onsuccess=()=>{document.body.dataset.restored=q.result;db.close();};};navigator.serviceWorker.getRegistrations().then(r=>document.body.dataset.workers=String(r.length));})()");
            waitFor("document.body.dataset.restored==='kept'&&document.body.dataset.workers==='0'",10);
            assertEquals(0,activity.externalRequests.get());
            System.out.println("ANDROID LOCAL passed: all experiences, Chase/guide media, trained WASM classifier, installer, worker migration, LocalStorage and IndexedDB; zero internet requests.");
        }
    }
    private static WebResourceResponse worker(String source){return new WebResourceResponse("text/javascript","UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(source.getBytes(StandardCharsets.UTF_8)));}
    @Test public void assetRangesAndMissingFiles()throws Exception {
        BundledApp app=new BundledApp(InstrumentationRegistry.getInstrumentation().getTargetContext().getAssets());
        WebResourceResponse r=app.respond(request("play-audio/call-number-1.mp3?v=test","bytes=10-19"));
        assertEquals(206,r.getStatusCode());assertEquals("10",r.getResponseHeaders().get("Content-Length"));byte[] bytes=new byte[20];assertEquals(10,r.getData().read(bytes));assertEquals(-1,r.getData().read());r.getData().close();
        assertEquals(416,app.respond(request("play-audio/call-number-1.mp3","bytes=999999999-")).getStatusCode());
        assertEquals(404,app.respond(request("not-installed.js",null)).getStatusCode());
        assertEquals(404,app.respond(request("../private.txt",null)).getStatusCode());
        assertNull(AssetRange.parse("bytes=1-2,8-9",100));assertNull(AssetRange.parse("bytes=-0",100));assertNull(AssetRange.parse("bytes=9-2",100));
        assertEquals(5,AssetRange.parse("bytes=-5",100).count);assertEquals(10,AssetRange.parse("bytes=90-",100).count);
    }
    private static WebResourceRequest request(String path,String range){return new WebResourceRequest(){public Uri getUrl(){return Uri.parse(BundledApp.ORIGIN+BundledApp.PREFIX+path);}public boolean isForMainFrame(){return false;}public boolean isRedirect(){return false;}public boolean hasGesture(){return false;}public String getMethod(){return "GET";}public Map<String,String> getRequestHeaders(){return range==null?Collections.emptyMap():Collections.singletonMap("Range",range);}};}
}
