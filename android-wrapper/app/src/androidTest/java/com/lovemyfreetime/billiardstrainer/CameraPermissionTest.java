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
    @Test public void onlyTrainerVideoIsGrantedAndLiveCameraStarts()throws Exception {
        android.app.Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
        instrumentation.getUiAutomation().grantRuntimePermission(instrumentation.getTargetContext().getPackageName(),Manifest.permission.CAMERA);
        AtomicReference<MainActivity> current=new AtomicReference<>();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(current::set);MainActivity a=current.get();
            long until=System.currentTimeMillis()+30000;
            while(System.currentTimeMillis()<until&&!"true".equals(js(a,"document.readyState==='complete'&&!location.pathname.endsWith('/__android_start__.html')")))Thread.sleep(100);
            scenario.onActivity(activity->{
                Request foreign=new Request("https://example.com",PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(foreign);assertTrue(foreign.denied);
                Request audio=new Request(BundledApp.ORIGIN,PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(audio);assertTrue(audio.denied);
                Request camera=new Request(BundledApp.ORIGIN,PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                activity.webView.getWebChromeClient().onPermissionRequest(camera);assertArrayEquals(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE},camera.granted);
            });
            js(a,"window.cameraTest='pending';navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(s=>{window.cameraTest=s.getVideoTracks().length===1?'ready':'no video';s.getTracks().forEach(t=>t.stop());}).catch(e=>window.cameraTest=e.name)");
            until=System.currentTimeMillis()+20000;
            while(System.currentTimeMillis()<until&&"\"pending\"".equals(js(a,"window.cameraTest")))Thread.sleep(100);
            assertEquals("\"ready\"",js(a,"window.cameraTest"));
        }
    }
}
