package com.lovemyfreetime.billiardstrainer;

import android.Manifest;
import android.net.Uri;
import android.webkit.PermissionRequest;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class CameraPermissionTest {
    static class Request extends PermissionRequest {
        final Uri origin;final String[] resources;String[] granted;boolean denied;
        Request(String origin,String... resources){this.origin=Uri.parse(origin);this.resources=resources;}
        @Override public Uri getOrigin(){return origin;}
        @Override public String[] getResources(){return resources;}
        @Override public void grant(String[] resources){granted=resources;}
        @Override public void deny(){denied=true;}
    }
    private String js(MainActivity a,String source)throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->a.webView.evaluateJavascript(source,s->{value.set(s);done.countDown();}));
        assertTrue(done.await(20,TimeUnit.SECONDS));return value.get();
    }
    @Test public void nativeMicrophoneProducesAnAudioFile()throws Exception {
        android.app.Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
        instrumentation.getUiAutomation().grantRuntimePermission(
            instrumentation.getTargetContext().getPackageName(),Manifest.permission.RECORD_AUDIO);
        AtomicReference<MainActivity> current=new AtomicReference<>();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(current::set);MainActivity a=current.get();
            long until=System.currentTimeMillis()+45000;
            while(System.currentTimeMillis()<until&&
                !"true".equals(js(a,"location.hostname==='lovemyfreetime.github.io'&&document.readyState==='complete'&&!location.pathname.endsWith('/__android_start__.html')")))
                Thread.sleep(200);
            MainActivity.AndroidBridge bridge=a.new AndroidBridge();
            String token=bridge.startNarrationMicrophone();
            assertNotEquals("permission",token);
            assertNotEquals("error",token);
            assertNotEquals("unavailable",token);
            assertNotEquals("busy",token);
            Thread.sleep(1800);
            long length=bridge.stopNarrationMicrophone(token);
            assertTrue("Native microphone must produce an AAC take, got "+length,length>1024);
            byte[] header=android.util.Base64.decode(bridge.readNarrationMicrophoneChunk(token,0,64),
                android.util.Base64.DEFAULT);
            assertTrue(header.length>=12);
            assertEquals('f',header[4]);assertEquals('t',header[5]);
            assertEquals('y',header[6]);assertEquals('p',header[7]);
            bridge.clearNarrationMicrophone(token);
        }
    }
    @Test public void onlyTrainerVideoIsGrantedAndLiveCameraStarts()throws Exception {
        android.app.Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
        instrumentation.getUiAutomation().grantRuntimePermission(instrumentation.getTargetContext().getPackageName(),Manifest.permission.CAMERA);
        instrumentation.getUiAutomation().grantRuntimePermission(instrumentation.getTargetContext().getPackageName(),Manifest.permission.RECORD_AUDIO);
        AtomicReference<MainActivity> current=new AtomicReference<>();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(current::set);MainActivity a=current.get();
            long until=System.currentTimeMillis()+30000;
            while(System.currentTimeMillis()<until&&!"true".equals(js(a,"document.readyState==='complete'&&!location.pathname.endsWith('/__android_start__.html')")))Thread.sleep(100);
            scenario.onActivity(activity->{
                Request foreign=new Request("https://example.com",PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(foreign);assertTrue(foreign.denied);
                Request foreignAudio=new Request("https://example.com",PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(foreignAudio);assertTrue(foreignAudio.denied);
                Request combined=new Request(BundledApp.ORIGIN,PermissionRequest.RESOURCE_VIDEO_CAPTURE,PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(combined);assertTrue(combined.denied);
                Request audio=new Request(BundledApp.ORIGIN,PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(audio);
                assertArrayEquals(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE},audio.granted);
                Request camera=new Request(BundledApp.ORIGIN,PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(camera);assertArrayEquals(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE},camera.granted);
            });
            // The cold offline WebView may navigate again while starting. Retry only
            // when that reload destroys the temporary JS value, not on media denial.
            String observed=null;
            for(int attempt=0;attempt<3;attempt++){
                long readyUntil=System.currentTimeMillis()+45000;
                boolean pageReady=false;
                while(System.currentTimeMillis()<readyUntil){
                    if("true".equals(js(a,"document.readyState==='complete'&&location.hostname==='lovemyfreetime.github.io'&&!location.pathname.endsWith('/__android_start__.html')"))){
                        pageReady=true;break;
                    }
                    Thread.sleep(200);
                }
                assertTrue("Bundled Trainer page did not become ready",pageReady);
                js(a,"window.cameraTest='pending';navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(s=>{window.cameraTest=s.getVideoTracks().length===1?'ready':'no video';s.getTracks().forEach(t=>t.stop());}).catch(e=>window.cameraTest=e.name)");
                long captureUntil=System.currentTimeMillis()+20000;
                while(System.currentTimeMillis()<captureUntil){
                    observed=js(a,"window.cameraTest");
                    if("\"ready\"".equals(observed))return;
                    if(observed==null||"null".equals(observed))break;
                    if(!"\"pending\"".equals(observed))assertEquals("\"ready\"",observed);
                    Thread.sleep(100);
                }
            }
            assertEquals("Camera capture never completed after WebView startup","\"ready\"",observed);
        }
    }
}
