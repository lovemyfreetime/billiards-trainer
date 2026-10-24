package com.lovemyfreetime.billiardstrainer;

import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Complete content snapshots. Network checks never change the active snapshot. */
final class ContentUpdates {
    static final int PROTOCOL=1;
    static final String SOURCE="https://lovemyfreetime.github.io/billiards-trainer/";
    interface Bundle { InputStream open(String name)throws Exception; }
    interface Download { InputStream open(String name)throws Exception; }
    interface Notice { void send(JSONObject state); }
    private final File root,blobs;
    private final Bundle bundle;
    private final JSONObject bundledFiles,baseline;
    private final Download download;
    private final AtomicBoolean busy=new AtomicBoolean();
    private volatile JSONObject active,pending;
    private volatile JSONObject state=new JSONObject();
    private volatile long lastCheck;

    ContentUpdates(File root,Bundle bundle,JSONObject bundledFiles,Download download)throws Exception {
        this.root=root;this.blobs=new File(root,"blobs");this.bundle=bundle;this.bundledFiles=bundledFiles;this.download=download;
        blobs.mkdirs();baseline=parse(read(bundle.open("native-updates.json"),1024*1024));
        select();setState("idle",0,0);
    }
    static Download network(){return name->{
        if(!safe(name))throw new IOException("Invalid update path");
        HttpURLConnection c=(HttpURLConnection)new URL(SOURCE+name.replace(" ","%20")).openConnection();
        c.setInstanceFollowRedirects(false);c.setConnectTimeout(5000);c.setReadTimeout(20000);c.setRequestProperty("Cache-Control","no-cache");
        try{if(c.getResponseCode()!=200)throw new IOException("Update unavailable");
            return new FilterInputStream(c.getInputStream()){@Override public void close()throws IOException{try{super.close();}finally{c.disconnect();}}};
        }catch(Exception e){c.disconnect();throw e;}
    };}
    JSONObject status(){return state;}
    JSONObject selected(){return active==null?baseline:active;}
    synchronized void select()throws Exception {
        JSONObject saved=load("active.json"),previous=load("previous.json");
        active=usable(saved)?saved:usable(previous)?previous:null;
        if(active!=null&&active.getLong("sequence")<=baseline.getLong("sequence"))active=null;
        pending=load("pending.json");
        if(usable(pending)&&pending.getLong("sequence")>selected().getLong("sequence")){
            if(active!=null)atomic("previous.json",active.toString().getBytes(StandardCharsets.UTF_8));
            atomic("active.json",pending.toString().getBytes(StandardCharsets.UTF_8));active=pending;
        }
        pending=null;new File(root,"pending.json").delete();
    }
    synchronized void apply()throws Exception {if(!busy.get()&&pending!=null){select();setState("idle",0,0);}}
    InputStream open(String name)throws Exception {
        if(active==null)return bundle.open(name);
        JSONObject info=active.getJSONObject("files").optJSONObject(name);
        if(info==null)throw new FileNotFoundException(name);
        if(inBundle(name,info))return bundle.open(name);
        return new FileInputStream(new File(blobs,info.getString("sha256")));
    }
    JSONObject files(){return active==null?bundledFiles:active.optJSONObject("files");}
    private boolean inBundle(String name,JSONObject info){JSONObject b=bundledFiles.optJSONObject(name);return b!=null&&b.optString("sha256").equals(info.optString("sha256"));}
    void check(boolean force,Notice notice){
        if(!force&&System.currentTimeMillis()-lastCheck<300000){notice.send(state);return;}
        if(!busy.compareAndSet(false,true)){notice.send(state);return;}
        lastCheck=System.currentTimeMillis();
        new Thread(()->{
            try {
                setState("checking",0,0);notice.send(state);
                JSONObject release=parse(read(download.open("native-updates.json"),1024*1024));
                if(release.getInt("minimumProtocol")>PROTOCOL){setState("native-required",0,0);return;}
                long newest=Math.max(selected().getLong("sequence"),pending==null?0:pending.optLong("sequence"));
                if(release.getLong("sequence")<=newest){setState(pending==null?"current":"ready",0,0);return;}
                JSONObject files=release.getJSONObject("files");int done=0,total=files.length();
                List<String> names=new ArrayList<>();for(Iterator<String> it=files.keys();it.hasNext();)names.add(it.next());Collections.sort(names);
                for(String name:names){JSONObject info=files.getJSONObject(name);
                    File target=new File(blobs,info.getString("sha256"));
                    if(!inBundle(name,info)&&!valid(target,info)){
                        File temp=new File(blobs,"partial-"+UUID.randomUUID());
                        try(InputStream input=download.open(name);FileOutputStream output=new FileOutputStream(temp)){
                            MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];long size=0;int n;
                            while((n=input.read(buffer))!=-1){size+=n;if(size>info.getLong("length"))throw new IOException("Update file size mismatch");digest.update(buffer,0,n);output.write(buffer,0,n);}
                            if(size!=info.getLong("length")||!hex(digest.digest()).equals(info.getString("sha256")))throw new IOException("Update file verification failed");
                            output.getFD().sync();
                        }catch(Exception e){temp.delete();throw e;}
                        Files.move(temp.toPath(),target.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
                    }
                    done++;if(done==total||done%25==0){setState("downloading",done,total);notice.send(state);}
                }
                atomic("pending.json",release.toString().getBytes(StandardCharsets.UTF_8));pending=release;clean();setState("ready",total,total);
            }catch(Exception e){setState(pending==null?"failed":"ready",0,0);}
            finally{busy.set(false);notice.send(state);}
        },"Billiards-content-update").start();
    }
    private void setState(String value,int done,int total){
        JSONObject s=new JSONObject();try{s.put("state",value);s.put("done",done);s.put("total",total);s.put("version",selected().optString("version").substring(0,16));s.put("protocol",PROTOCOL);}catch(Exception ignored){}state=s;
    }
    static JSONObject parse(byte[] bytes)throws Exception {
        JSONObject m=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
        if(m.getInt("format")!=1||m.getInt("minimumProtocol")<1||!m.getString("version").matches("[a-f0-9]{64}")||m.getLong("sequence")<1)throw new IOException("Unsupported update inventory");
        JSONObject files=m.getJSONObject("files");if(files.length()<3||files.length()>5000)throw new IOException("Invalid file count");long total=0;
        for(Iterator<String> it=files.keys();it.hasNext();){String name=it.next();JSONObject v=files.getJSONObject(name);long size=v.getLong("length");if(!safe(name)||!v.getString("sha256").matches("[a-f0-9]{64}")||size<0||size>128*1024*1024L)throw new IOException("Invalid update entry");total+=size;}
        if(total>1024*1024*1024L||!files.has("welcome.html")||!files.has("index.html")||!files.has("play.html")||!files.has("app-updates.js"))throw new IOException("Incomplete update inventory");return m;
    }
    static boolean safe(String name){if(name.isEmpty()||name.startsWith("/")||name.contains("\\")||name.contains(":")||name.contains("%")||name.contains("?")||name.contains("#")||!name.matches("[A-Za-z0-9_./ -]+"))return false;for(String p:name.split("/",-1))if(p.isEmpty()||p.equals(".")||p.equals(".."))return false;return true;}
    private JSONObject load(String name){try{return parse(read(new FileInputStream(new File(root,name)),1024*1024));}catch(Exception e){return null;}}
    private boolean usable(JSONObject m){if(m==null||m.optInt("minimumProtocol")>PROTOCOL)return false;try{JSONObject f=m.getJSONObject("files");for(Iterator<String> it=f.keys();it.hasNext();){String name=it.next();JSONObject info=f.getJSONObject(name);if(!inBundle(name,info)&&!valid(new File(blobs,info.getString("sha256")),info))return false;}return true;}catch(Exception e){return false;}}
    private static boolean valid(File file,JSONObject info)throws Exception {if(!file.isFile()||file.length()!=info.getLong("length"))return false;try(InputStream input=new FileInputStream(file)){MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] b=new byte[65536];int n;while((n=input.read(b))!=-1)digest.update(b,0,n);return hex(digest.digest()).equals(info.getString("sha256"));}}
    private void atomic(String name,byte[] bytes)throws Exception {File temp=new File(root,name+".tmp");try(FileOutputStream out=new FileOutputStream(temp)){out.write(bytes);out.getFD().sync();}Files.move(temp.toPath(),new File(root,name).toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
    private void clean(){try{Set<String> keep=new HashSet<>();for(JSONObject m:new JSONObject[]{active,pending,load("previous.json")})if(m!=null){JSONObject f=m.getJSONObject("files");for(Iterator<String> it=f.keys();it.hasNext();)keep.add(f.getJSONObject(it.next()).getString("sha256"));}File[] files=blobs.listFiles();if(files!=null)for(File file:files)if(!keep.contains(file.getName()))file.delete();}catch(Exception ignored){}}
    static byte[] read(InputStream input,int max)throws Exception {try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>max)throw new IOException("Inventory too large");out.write(b,0,n);}return out.toByteArray();}}
    static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.US,"%02x",b&255));return s.toString();}
}
