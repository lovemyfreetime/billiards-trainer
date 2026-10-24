package com.lovemyfreetime.billiardstrainer;

import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ContentUpdatesDeviceTest {
    private String js(MainActivity activity,String source)throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->activity.webView.evaluateJavascript(source,s->{value.set(s);done.countDown();}));
        assertTrue(done.await(20,TimeUnit.SECONDS));return value.get();
    }
    private void waitFor(MainActivity a,String expression)throws Exception {long end=System.currentTimeMillis()+25000;while(System.currentTimeMillis()<end){if("true".equals(js(a,"Boolean("+expression+")")))return;Thread.sleep(100);}fail("Updated native page did not become ready: "+expression);}
    private void remove(File file){File[] list=file.listFiles();if(list!=null)for(File child:list)remove(child);file.delete();}
    @Test public void pendingUpdateActivatesInRealWebViewWithoutLosingSaves()throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File directory=new File(context.getFilesDir(),"content-updates");remove(directory);
        AtomicReference<MainActivity> current=new AtomicReference<>();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(current::set);MainActivity a=current.get();
            waitFor(a,"document.readyState==='complete'&&!location.pathname.endsWith('/__android_start__.html')&&window.BilliardsContentUpdateProtocol===1");
            js(a,"localStorage.setItem('content-update-save','keep this layout')");
            JSONObject bundled=new JSONObject(new String(ContentUpdates.read(context.getAssets().open("app/app-manifest.json"),1024*1024),StandardCharsets.UTF_8)).getJSONObject("files");
            JSONObject release=new JSONObject(new String(ContentUpdates.read(context.getAssets().open("app/native-updates.json"),1024*1024),StandardCharsets.UTF_8));
            JSONObject files=new JSONObject(bundled.toString());files.remove("native-updates.json");files.remove("__android_start__.html");
            byte[] welcome=ContentUpdates.read(context.getAssets().open("app/welcome.html"),2*1024*1024);
            byte[] changed=new String(welcome,StandardCharsets.UTF_8).replaceFirst("<body", "<body data-content-update-smoke=\"ready\"").getBytes(StandardCharsets.UTF_8);
            files.put("welcome.html",new JSONObject().put("sha256",ContentUpdates.hex(MessageDigest.getInstance("SHA-256").digest(changed))).put("length",changed.length));
            release.put("files",files).put("sequence",release.getLong("sequence")+1).put("version",String.format("%064x",123));
            ContentUpdates updates=new ContentUpdates(directory,name->context.getAssets().open("app/"+name),bundled,name->{if(name.equals("native-updates.json"))return new ByteArrayInputStream(release.toString().getBytes(StandardCharsets.UTF_8));if(name.equals("welcome.html"))return new ByteArrayInputStream(changed);throw new IOException("Unchanged files must not be downloaded: "+name);});
            CountDownLatch ready=new CountDownLatch(1);updates.check(true,s->{if("ready".equals(s.optString("state"))||"failed".equals(s.optString("state")))ready.countDown();});assertTrue(ready.await(20,TimeUnit.SECONDS));assertEquals("ready",updates.status().optString("state"));
            scenario.recreate();scenario.onActivity(current::set);a=current.get();final MainActivity restarted=a;
            waitFor(a,"document.readyState==='complete'&&!location.pathname.endsWith('/__android_start__.html')&&window.BilliardsContentUpdateProtocol===1");scenario.onActivity(activity->activity.webView.loadUrl(BundledApp.ORIGIN+BundledApp.PREFIX+"welcome.html?update-smoke=1"));
            waitFor(restarted,"document.body?.dataset.contentUpdateSmoke==='ready'");assertEquals("\"keep this layout\"",js(restarted,"localStorage.getItem('content-update-save')"));
            assertEquals("Updated pages retain the public save-data origin","\"https://lovemyfreetime.github.io\"",js(restarted,"location.origin"));
            System.out.println("ANDROID UPDATE DEVICE: real WebView loads verified content after restart with saved layouts and HTTPS origin preserved");
        }finally{remove(directory);}
    }
}
