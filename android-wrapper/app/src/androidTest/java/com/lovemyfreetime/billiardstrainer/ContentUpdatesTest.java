package com.lovemyfreetime.billiardstrainer;

import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ContentUpdatesTest {
    private static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
    private static JSONObject manifest(Map<String,byte[]> data,long seq,int protocol)throws Exception {
        JSONObject entries=new JSONObject();for(Map.Entry<String,byte[]> e:data.entrySet())entries.put(e.getKey(),new JSONObject().put("sha256",ContentUpdates.hex(MessageDigest.getInstance("SHA-256").digest(e.getValue()))).put("length",e.getValue().length));
        return new JSONObject().put("format",1).put("minimumProtocol",protocol).put("version",String.format(Locale.US,"%064x",seq)).put("sequence",seq).put("files",entries);
    }
    private static void write(File file,byte[] data)throws Exception{file.getParentFile().mkdirs();try(FileOutputStream out=new FileOutputStream(file)){out.write(data);}}
    private static void check(ContentUpdates app)throws Exception{CountDownLatch done=new CountDownLatch(1);app.check(true,state->{if(!Arrays.asList("checking","downloading").contains(state.optString("state")))done.countDown();});assertTrue(done.await(20,TimeUnit.SECONDS));}
    private static String read(ContentUpdates app,String name)throws Exception{return new String(ContentUpdates.read(app.open(name),10000),StandardCharsets.UTF_8);}
    private static void remove(File file){File[] children=file.listFiles();if(children!=null)for(File child:children)remove(child);file.delete();}
    @Test public void verifiedSnapshotsAndOfflineRestart()throws Exception {
        File root=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"update-test-"+UUID.randomUUID());File bundle=new File(root,"bundle"),cache=new File(root,"cache");
        Map<String,byte[]> initial=new LinkedHashMap<>();initial.put("index.html",bytes("old trainer"));initial.put("welcome.html",bytes("home"));initial.put("play.html",bytes("play"));initial.put("app-updates.js",bytes("updater"));initial.put("clip.mp3",bytes("unchanged recording"));
        try{
            for(Map.Entry<String,byte[]> e:initial.entrySet())write(new File(bundle,e.getKey()),e.getValue());
            JSONObject baseline=manifest(initial,1,1);write(new File(bundle,"native-updates.json"),bytes(baseline.toString()));
            Map<String,byte[]> next=new LinkedHashMap<>(initial);next.put("index.html",bytes("new trainer"));next.put("new.css",bytes("new style"));
            List<String> calls=Collections.synchronizedList(new ArrayList<>());boolean[] corrupt={true},offline={false};long[] seq={2};int[] protocol={1};
            ContentUpdates.Bundle bundled=name->new FileInputStream(new File(bundle,name));
            ContentUpdates.Download download=name->{calls.add(name);if(offline[0])throw new IOException("Offline");return new ByteArrayInputStream(name.equals("native-updates.json")?bytes(manifest(next,seq[0],protocol[0]).toString()):name.equals("new.css")&&corrupt[0]?bytes("corrupt"):next.get(name));};
            ContentUpdates app=new ContentUpdates(cache,bundled,baseline.getJSONObject("files"),download);assertTrue(calls.isEmpty());check(app);assertEquals("failed",app.status().getString("state"));assertFalse(new File(cache,"pending.json").exists());assertEquals("old trainer",read(app,"index.html"));
            corrupt[0]=false;calls.clear();check(app);assertEquals("ready",app.status().getString("state"));assertFalse(calls.contains("clip.mp3"));assertFalse(calls.contains("welcome.html"));assertFalse(calls.contains("index.html"));assertEquals("old trainer",read(app,"index.html"));
            offline[0]=true;ContentUpdates restarted=new ContentUpdates(cache,bundled,baseline.getJSONObject("files"),download);assertEquals(2,restarted.selected().getLong("sequence"));assertEquals("new trainer",read(restarted,"index.html"));assertEquals("new style",read(restarted,"new.css"));check(restarted);assertEquals("new trainer",read(restarted,"index.html"));
            offline[0]=false;seq[0]=3;next.put("index.html",bytes("third trainer"));check(restarted);restarted.apply();assertEquals(3,restarted.selected().getLong("sequence"));String sha=restarted.files().getJSONObject("index.html").getString("sha256");write(new File(new File(cache,"blobs"),sha),bytes("damage"));ContentUpdates recovered=new ContentUpdates(cache,bundled,baseline.getJSONObject("files"),download);assertEquals(2,recovered.selected().getLong("sequence"));assertEquals("new trainer",read(recovered,"index.html"));
            protocol[0]=2;seq[0]=4;calls.clear();check(recovered);assertEquals("native-required",recovered.status().getString("state"));assertEquals(1,calls.size());
            for(String path:new String[]{"../outside","/absolute","a/../b","a\\b","https://evil/file","file?url=bad","a//b","a/%2e%2e/b"})assertFalse(path,ContentUpdates.safe(path));
            next.put("../escape.js",bytes("bad"));boolean rejected=false;try{ContentUpdates.parse(bytes(manifest(next,5,1).toString()));}catch(Exception expected){rejected=true;}assertTrue(rejected);
            System.out.println("ANDROID UPDATE: changed-file reuse, verification, retry, atomic/offline restart, rollback, protocol and path checks passed");
        }finally{remove(root);}
    }
}
