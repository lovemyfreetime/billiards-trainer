package com.lovemyfreetime.billiardstrainer;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/** All app-origin resources are resolved from the APK, including instant local misses. */
final class BundledApp {
    static final String ORIGIN="https://lovemyfreetime.github.io";
    static final String PREFIX="/billiards-trainer/";
    private final AssetManager assets;
    private final JSONObject files;
    ContentUpdates updates;
    final AtomicInteger missingRequests=new AtomicInteger();
    BundledApp(AssetManager assets) throws Exception {
        this.assets=assets;
        try(InputStream in=assets.open("app/app-manifest.json")){
            files=new JSONObject(new String(readAll(in),StandardCharsets.UTF_8)).getJSONObject("files");
        }
        if(!files.has("welcome.html")||!files.has("index.html")||!files.has("play.html"))throw new IOException("The installed app files are incomplete. Reinstall the current Android app.");
    }
    void enableUpdates(File directory)throws Exception {updates=new ContentUpdates(directory,name->assets.open("app/"+name),files,ContentUpdates.network());}
    static boolean isAppOrigin(Uri uri){return "https".equals(uri.getScheme())&&"lovemyfreetime.github.io".equalsIgnoreCase(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
    WebResourceResponse respond(WebResourceRequest request) {
        Uri uri=request.getUrl();String path=uri.getPath();String method=request.getMethod();
        if(!"GET".equals(method)&&!"HEAD".equals(method))return empty(405,"Method Not Allowed",null);
        if(path==null||!path.startsWith(PREFIX))return missing();
        String name=path.substring(PREFIX.length());
        if(name.isEmpty())name="index.html";else if(name.endsWith("/"))name+="index.html";
        for(String part:name.split("/",-1))if(part.equals("..")||part.equals(".")||part.indexOf('\\')>=0||part.indexOf('\0')>=0)return missing();
        JSONObject info=(updates==null||name.equals("__android_start__.html")?files:updates.files()).optJSONObject(name);if(info==null)return missing();
        long length=info.optLong("length",-1);if(length<0)return missing();
        Map<String,String> headers=new HashMap<>();headers.put("Accept-Ranges","bytes");headers.put("Cache-Control","no-store");headers.put("X-Content-Type-Options","nosniff");
        String range=null;for(Map.Entry<String,String> h:request.getRequestHeaders().entrySet())if(h.getKey().equalsIgnoreCase("Range"))range=h.getValue();
        long start=0,count=length;
        if(range!=null){AssetRange r=AssetRange.parse(range,length);if(r==null){headers.put("Content-Range","bytes */"+length);return empty(416,"Range Not Satisfiable",headers);}start=r.start;count=r.count;headers.put("Content-Range","bytes "+start+"-"+(start+count-1)+"/"+length);}
        headers.put("Content-Length",Long.toString(count));String mime=mime(name);String encoding=mime.startsWith("text/")||mime.equals("application/json")?"UTF-8":null;
        try {
            InputStream body=new ByteArrayInputStream(new byte[0]);
            if(!"HEAD".equals(method)){
                InputStream input=updates==null||name.equals("__android_start__.html")?assets.open("app/"+name,AssetManager.ACCESS_RANDOM):updates.open(name);
                try {long skipped=0;while(skipped<start){long n=input.skip(start-skipped);if(n==0){if(input.read()<0)throw new EOFException();n=1;}skipped+=n;}body=new LimitedStream(input,count);}
                catch(IOException e){input.close();throw e;}
            }
            return new WebResourceResponse(mime,encoding,range==null?200:206,range==null?"OK":"Partial Content",headers,body);
        }catch(Exception e){return missing();}
    }
    private WebResourceResponse missing(){missingRequests.incrementAndGet();return empty(404,"Not Found",null);}
    static WebResourceResponse empty(int status,String reason,Map<String,String> source){Map<String,String> h=source==null?new HashMap<>():source;h.put("Content-Length","0");h.put("Cache-Control","no-store");return new WebResourceResponse("text/plain","UTF-8",status,reason,h,new ByteArrayInputStream(new byte[0]));}
    private static byte[] readAll(InputStream in)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}
    private static String mime(String name){String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.US);switch(ext){case "html":return "text/html";case "js":case "mjs":return "text/javascript";case "css":return "text/css";case "json":case "webmanifest":return "application/json";case "wasm":return "application/wasm";case "mp3":return "audio/mpeg";case "wav":return "audio/wav";case "svg":return "image/svg+xml";case "png":return "image/png";case "webp":return "image/webp";case "jpg":case "jpeg":return "image/jpeg";case "ico":return "image/x-icon";default:return "application/octet-stream";}}
    private static final class LimitedStream extends FilterInputStream {
        private long left;LimitedStream(InputStream in,long count){super(in);left=count;}
        @Override public int read()throws IOException{if(left<=0)return -1;int b=in.read();if(b>=0)left--;return b;}
        @Override public int read(byte[] b,int off,int len)throws IOException{if(left<=0)return -1;int n=in.read(b,off,(int)Math.min(len,left));if(n>0)left-=n;return n;}
        @Override public long skip(long n)throws IOException{long done=in.skip(Math.min(n,left));left-=done;return done;}
        @Override public int available()throws IOException{return (int)Math.min(left,in.available());}
    }
}
