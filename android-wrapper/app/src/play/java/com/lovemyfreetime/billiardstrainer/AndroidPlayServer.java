package com.lovemyfreetime.billiardstrainer;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Base64;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import fi.iki.elonen.NanoHTTPD;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URI;
import java.security.SecureRandom;
import java.util.*;

/** Authenticated, in-memory local sessions. Raw game snapshots never leave loopback. */
final class AndroidPlayServer extends NanoHTTPD {
 private final Context context;
 private final String hostToken=secret();
 private String invite=secret();
 private JSONObject state=null;
 private int revision=0,match=0;
 private long lastHost=System.currentTimeMillis(),quietUntil=0;
 private final Map<String,Member> members=new LinkedHashMap<>();
 private final Map<String,long[]> rates=new HashMap<>();
 private final Set<String> snapshots=new LinkedHashSet<>();
 private final List<JSONObject> events=new ArrayList<>();
 private final LinkedList<Lease> waiting=new LinkedList<>();
 private Lease speaking=null;
 private final Set<String> files=new HashSet<>();
 private static class Member {String id=secret(),token=secret(),name;Integer seat=null;long seen=System.currentTimeMillis();boolean revoked=false;Member(String n){name=n;}}
 private static class Lease {String owner,id;long seen,until;Lease(String o,String i){owner=o;id=i;seen=System.currentTimeMillis();}}
 private static class Problem extends RuntimeException {Response.Status status;Problem(Response.Status s,String m){super(m);status=s;}}
 AndroidPlayServer(Context context)throws Exception{
  super(8788);this.context=context;
  try(InputStream in=context.getAssets().open("play/offline-manifest.json")){JSONObject manifest=new JSONObject(read(in));Iterator<String> keys=manifest.keys();while(keys.hasNext())files.add(keys.next());}
  files.add("index.html");files.add("README.txt");
 }
 String hostUrl(){return "http://127.0.0.1:"+getListeningPort()+"/play.html#host="+hostToken;}
 private static String secret(){byte[] bytes=new byte[24];new SecureRandom().nextBytes(bytes);return Base64.encodeToString(bytes,Base64.NO_WRAP|Base64.URL_SAFE|Base64.NO_PADDING);}
 private static String read(InputStream in)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}
 private static JSONObject obj(Object... args)throws Exception{JSONObject o=new JSONObject();for(int i=0;i<args.length;i+=2)o.put((String)args[i],args[i+1]==null?JSONObject.NULL:args[i+1]);return o;}
 private void fail(Response.Status s,String m){throw new Problem(s,m);}
 private boolean loopback(String ip){try{return InetAddress.getByName(ip).isLoopbackAddress();}catch(Exception e){return false;}}
 private boolean local(String ip){try{InetAddress a=InetAddress.getByName(ip);return a.isLoopbackAddress()||a.isSiteLocalAddress()||a.isLinkLocalAddress();}catch(Exception e){return false;}}
 private List<String> addresses(){List<String> out=new ArrayList<>();try{Enumeration<NetworkInterface> networks=NetworkInterface.getNetworkInterfaces();while(networks.hasMoreElements()){NetworkInterface n=networks.nextElement();if(!n.isUp())continue;Enumeration<InetAddress> all=n.getInetAddresses();while(all.hasMoreElements()){InetAddress a=all.nextElement();if(a instanceof Inet4Address&&!a.isLoopbackAddress()&&local(a.getHostAddress()))out.add(a.getHostAddress());}}}catch(Exception ignored){}return out;}
 private String token(IHTTPSession s){String a=s.getHeaders().get("authorization");return a!=null&&a.startsWith("Bearer ")?a.substring(7):"";}
 private void admin(IHTTPSession s){if(!loopback(s.getRemoteIpAddress())||!hostToken.equals(token(s)))fail(Response.Status.FORBIDDEN,"Host access required.");lastHost=System.currentTimeMillis();}
 private Member member(IHTTPSession s){String t=token(s);for(Member m:members.values())if(!m.revoked&&m.token.equals(t)){m.seen=System.currentTimeMillis();return m;}fail(Response.Status.UNAUTHORIZED,"Rejoin this table.");return null;}
 private JSONObject body(IHTTPSession s)throws Exception{
  String type=s.getHeaders().get("content-type");if(type==null||!type.startsWith("application/json"))fail(Response.Status.UNSUPPORTED_MEDIA_TYPE,"Use JSON.");
  int length;try{length=Integer.parseInt(s.getHeaders().get("content-length"));}catch(Exception e){fail(Response.Status.BAD_REQUEST,"Content length required.");return null;}
  if(length<0||length>131072)fail(Response.Status.PAYLOAD_TOO_LARGE,"Request too large.");Map<String,String> data=new HashMap<>();s.parseBody(data);return new JSONObject(data.get("postData"));
 }
 private Response json(Response.Status status,JSONObject data){return newFixedLengthResponse(status,"application/json; charset=utf-8",data.toString());}
 private JSONArray players(){return state==null?new JSONArray():state.optJSONArray("players");}
 private int actor(){return state.optString("phase").equals("vote")?state.optInt("voteSeat"):state.optInt("active");}
 private JSONArray actions(int seat){JSONArray a=new JSONArray();if(state==null||state.optBoolean("localPaused")||seat!=actor()||state.optString("phase").equals("result"))return a;String phase=state.optString("phase"),game=state.optString("game");if(game.equals("poker")&&phase.equals("choose"))a.put("choose");if(phase.equals("vote"))a.put("vote");if(phase.equals("fleet")){a.put("fleet-shuffle");a.put("fleet-lock");}if(game.equals("blackjack")&&phase.equals("ready"))a.put("stand");return a;}
 private String card(int c){return new String[]{"2","3","4","5","6","7","8","9","10","J","Q","K","A"}[c%13]+new String[]{"♠","♥","♦","♣"}[c/13];}
 private JSONArray cards(JSONArray hand){JSONArray a=new JSONArray();if(hand!=null)for(int i=0;i<hand.length();i++)a.put(card(hand.optInt(i)));return a;}
 private JSONObject view(int seat)throws Exception{
  if(state==null)return null;String game=state.optString("game"),phase=state.optString("phase");JSONArray ps=players(),pub=new JSONArray();int active=actor(),next=active;
  for(int j=1;j<=ps.length();j++){int i=(active+j)%ps.length();JSONObject p=ps.getJSONObject(i);if(game.equals("killer")&&p.optInt("lives")<=0||game.equals("horse")&&p.optInt("letters")>=5)continue;next=i;break;}
  JSONArray summaries=state.optJSONArray("localPlayerStats");for(int i=0;i<ps.length();i++)pub.put(obj("id",i,"name",ps.getJSONObject(i).optString("name"),"stat",summaries==null?"":summaries.optString(i)));
  JSONObject p=ps.optJSONObject(seat),personal=new JSONObject();if(p!=null){
   if(game.equals("poker")||game.equals("blackjack"))personal.put("hand",cards(p.optJSONArray("hand")));
   if(game.equals("poker")&&seat==active&&phase.equals("choose"))personal.put("choices",cards(state.optJSONArray("pending")));
   if(game.equals("kelly")||game.equals("bounty"))personal.put("target",p.optInt("target"));
   if(game.equals("saboteur"))personal.put("role",seat==state.optInt("saboteur")?"Saboteur":"Crew");
   if(game.equals("blackjack")){JSONArray hand=p.optJSONArray("hand");int total=0,aces=0;if(hand!=null)for(int i=0;i<hand.length();i++){int n=hand.optInt(i)%13+2;if(n==14){total+=11;aces++;}else total+=Math.min(n,10);}while(total>21&&aces-->0)total-=10;personal.put("total",total);}
   if(game.equals("battleship")){personal.put("fleet",p.optJSONArray("fleet"));JSONArray attacks=p.optJSONArray("attacks"),other=ps.getJSONObject(1-seat).optJSONArray("fleet"),rows=new JSONArray();if(attacks!=null)for(int i=0;i<attacks.length();i++){int cell=attacks.optInt(i);rows.put(obj("cell",cell,"hit",contains(other,cell)));}personal.put("attacks",rows);}
  }
  JSONObject result=state.optJSONObject("result");return obj("game",game,"name",state.optString("localGameName"),"rules",state.optString("localRules"),"phase",phase,"paused",state.optBoolean("localPaused"),"round",state.optInt("round"),"rack",state.optInt("rack"),"shots",state.optInt("shots"),"active",active,"next",next,"players",pub,"last",state.optString("last"),"result",result==null?null:obj("text",result.optString("text"),"winners",result.optJSONArray("winners")),"you",seat,"private",personal,"actions",actions(seat),"clock",state.optJSONObject("localClock"));
 }
 private boolean contains(JSONArray a,Object v){if(a!=null)for(int i=0;i<a.length();i++)if(v.equals(a.opt(i)))return true;return false;}
 private JSONObject audio(String owner,JSONObject b)throws Exception{
  String id=b.optString("id");long now=System.currentTimeMillis();if(id.isEmpty()||id.length()>80)fail(Response.Status.BAD_REQUEST,"Invalid alert.");
  if(b.optBoolean("done")){waiting.removeIf(a->a.owner.equals(owner)&&a.id.equals(id));if(speaking!=null&&speaking.owner.equals(owner)&&speaking.id.equals(id)){speaking=null;quietUntil=now+800;}return obj("ok",true);}
  if(state==null||state.optBoolean("localPaused")||now-lastHost>=12000)fail(Response.Status.FORBIDDEN,"Alerts are unavailable.");if(b.optInt("revision",-1)!=revision)fail(Response.Status.CONFLICT,"The table changed.");
  if(speaking!=null&&now>=speaking.until){speaking=null;quietUntil=now+800;}waiting.removeIf(a->now-a.seen>=3000);
  if(speaking!=null&&speaking.owner.equals(owner)&&speaking.id.equals(id))return obj("granted",true,"remaining",Math.max(0,speaking.until-now-2000));
  waiting.removeIf(a->a.owner.equals(owner)&&!a.id.equals(id));Lease item=null;for(Lease a:waiting)if(a.owner.equals(owner)&&a.id.equals(id))item=a;if(item==null){item=new Lease(owner,id);waiting.add(item);}item.seen=now;
  if(speaking==null&&now>=quietUntil&&waiting.peek()==item){waiting.removeFirst();speaking=item;long budget=Math.max(1000,Math.min(45000,b.optLong("duration",12000)));item.until=now+budget+2000;return obj("granted",true,"remaining",budget);}return obj("granted",false);
 }
 @Override public synchronized Response serve(IHTTPSession s){Response response;try{response=handle(s);}catch(Problem e){try{response=json(e.status,obj("error",e.getMessage()));}catch(Exception ignored){response=newFixedLengthResponse(Response.Status.INTERNAL_ERROR,"text/plain","Error");}}catch(Exception e){try{response=json(Response.Status.INTERNAL_ERROR,obj("error","The local table could not complete that request."));}catch(Exception ignored){response=newFixedLengthResponse(Response.Status.INTERNAL_ERROR,"text/plain","Error");}}
  response.addHeader("Cache-Control","no-store");response.addHeader("Referrer-Policy","no-referrer");response.addHeader("X-Content-Type-Options","nosniff");response.addHeader("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; form-action 'self'");return response;
 }
 private Response handle(IHTTPSession s)throws Exception{
  if(!local(s.getRemoteIpAddress()))fail(Response.Status.FORBIDDEN,"Local network only.");String authority=s.getHeaders().get("host"),host=authority==null?"":authority.split(":")[0];List<String> addresses=addresses();if(!("127.0.0.1".equals(host)||"localhost".equals(host)||addresses.contains(host))||!authority.endsWith(":"+getListeningPort()))fail(Response.Status.FORBIDDEN,"Unknown host address.");String origin=s.getHeaders().get("origin");if(origin!=null&&!origin.equals("http://"+authority))fail(Response.Status.FORBIDDEN,"Open this table directly.");
  String route=s.getUri();boolean post=s.getMethod()==Method.POST,get=s.getMethod()==Method.GET;long now=System.currentTimeMillis();
  if(route.equals("/api/join")&&post){String ip=s.getRemoteIpAddress();long[] rate=rates.get(ip);if(rate==null||now-rate[0]>60000){rate=new long[]{now,0};rates.put(ip,rate);}if(++rate[1]>12)fail(Response.Status.TOO_MANY_REQUESTS,"Please wait before joining again.");JSONObject b=body(s);if(!invite.equals(b.optString("invite")))fail(Response.Status.FORBIDDEN,"Invitation expired. Ask the host for a new QR.");if(members.size()>=32)fail(Response.Status.CONFLICT,"Table joining limit reached.");String name=b.optString("name").trim();if(name.isEmpty())fail(Response.Status.BAD_REQUEST,"Enter your name.");Member m=new Member(name.substring(0,Math.min(28,name.length())));members.put(m.id,m);return json(Response.Status.CREATED,obj("token",m.token));}
  if(route.equals("/api/player")&&get){Member m=member(s);return json(Response.Status.OK,obj("serverTime",now,"name",m.name,"approved",m.seat!=null,"revision",revision,"match",match,"hostOnline",now-lastHost<12000,"view",m.seat==null?null:view(m.seat)));}
  if(route.equals("/api/audio")&&post){Member m=member(s);JSONObject b=body(s);if(m.seat==null)fail(Response.Status.FORBIDDEN,"Seat approval required.");return json(Response.Status.OK,audio(m.id,b));}
  if(route.equals("/api/action")&&post){Member m=member(s);JSONObject b=body(s);if(state==null||m.seat==null||!contains(actions(m.seat),b.optString("type")))fail(Response.Status.FORBIDDEN,"Action unavailable for your seat.");if(b.optInt("revision",-1)!=revision||!events.isEmpty())fail(Response.Status.CONFLICT,"The table changed. Wait for an update.");String type=b.optString("type");JSONObject event=obj("type",type);if(type.equals("choose")||type.equals("vote")){Object raw=b.opt("index");if(!(raw instanceof Integer))fail(Response.Status.BAD_REQUEST,"Choose an option.");int index=(Integer)raw;if(type.equals("choose")&&(index<0||index>1)||type.equals("vote")&&(index< -1||index>=players().length()))fail(Response.Status.BAD_REQUEST,"Choose an option.");event.put("index",index);}events.add(obj("id",secret(),"memberId",m.id,"seat",m.seat,"revision",revision,"match",match,"event",event));return json(Response.Status.ACCEPTED,obj("accepted",true));}
  if(route.startsWith("/api/host")){
   admin(s);
   if(route.equals("/api/host")&&get){JSONArray urls=new JSONArray(),ms=new JSONArray(),ps=new JSONArray();for(String ip:addresses)urls.put("http://"+ip+":"+getListeningPort()+"/join#invite="+invite);for(Member m:members.values())if(!m.revoked)ms.put(obj("id",m.id,"name",m.name,"seat",m.seat,"online",now-m.seen<10000));for(int i=0;i<players().length();i++)ps.put(obj("id",i,"name",players().getJSONObject(i).optString("name")));return json(Response.Status.OK,obj("revision",revision,"match",match,"invite",invite,"urls",urls,"members",ms,"players",ps,"events",new JSONArray(events)));}
   if(!post)fail(Response.Status.METHOD_NOT_ALLOWED,"Use POST.");JSONObject b=body(s);
   if(route.equals("/api/host/audio"))return json(Response.Status.OK,audio("host",b));
   if(route.equals("/api/host/qr")){String url=b.optString("url");URI u=new URI(url);if(!addresses.contains(u.getHost())||!"http".equals(u.getScheme())||u.getPort()!=getListeningPort()||!"/join".equals(u.getPath())||!("invite="+invite).equals(u.getFragment()))fail(Response.Status.BAD_REQUEST,"Choose a local address.");BitMatrix matrix=new MultiFormatWriter().encode(url,BarcodeFormat.QR_CODE,320,320);Bitmap image=Bitmap.createBitmap(320,320,Bitmap.Config.ARGB_8888);for(int x=0;x<320;x++)for(int y=0;y<320;y++)image.setPixel(x,y,matrix.get(x,y)?0xff000000:0xffffffff);ByteArrayOutputStream out=new ByteArrayOutputStream();image.compress(Bitmap.CompressFormat.PNG,100,out);image.recycle();return json(Response.Status.OK,obj("image","data:image/png;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP)));}
   if(route.equals("/api/host/state")){String id=b.optString("id");if(!id.isEmpty()&&snapshots.contains(id))return json(Response.Status.OK,obj("revision",revision,"match",match));JSONObject next=b.optJSONObject("state");JSONArray ps=next==null?null:next.optJSONArray("players");if(ps==null||ps.length()<1||ps.length()>12||next.optInt("active",-1)<0||next.optInt("active")>=ps.length())fail(Response.Status.BAD_REQUEST,"Invalid game snapshot.");for(int i=0;i<ps.length();i++)if(ps.getJSONObject(i).optString("name").length()>28)fail(Response.Status.BAD_REQUEST,"Invalid player.");if(b.optBoolean("newGame")){match++;for(Member m:members.values())m.seat=null;}state=next;for(Member m:members.values())if(m.seat!=null&&m.seat==state.optInt("localHostSeat",-1))m.seat=null;revision++;events.clear();waiting.clear();if(!id.isEmpty()){snapshots.add(id);if(snapshots.size()>256)snapshots.remove(snapshots.iterator().next());}return json(Response.Status.OK,obj("revision",revision,"match",match));}
   if(route.equals("/api/host/seat")){Member m=members.get(b.optString("id"));if(m==null||m.revoked)fail(Response.Status.NOT_FOUND,"Player not found.");Integer seat=null;if(!b.isNull("seat")){Object raw=b.opt("seat");if(!(raw instanceof Integer))fail(Response.Status.BAD_REQUEST,"Choose a seat.");seat=(Integer)raw;if(state==null||seat<0||seat>=players().length())fail(Response.Status.BAD_REQUEST,"Choose a seat.");if(state.optInt("localHostSeat",-1)==seat)fail(Response.Status.CONFLICT,"That is the host player seat.");for(Member other:members.values())if(other!=m&&!other.revoked&&seat.equals(other.seat))fail(Response.Status.CONFLICT,"Seat already assigned.");}m.seat=seat;final String mid=m.id;events.removeIf(e->mid.equals(e.optString("memberId")));waiting.removeIf(a->a.owner.equals(mid));return json(Response.Status.OK,obj("ok",true));}
   if(route.equals("/api/host/remove")){Member m=members.get(b.optString("id"));if(m!=null)m.revoked=true;events.removeIf(e->b.optString("id").equals(e.optString("memberId")));waiting.removeIf(a->a.owner.equals(b.optString("id")));return json(Response.Status.OK,obj("ok",true));}
   if(route.equals("/api/host/ack")){JSONArray ids=b.optJSONArray("ids");events.removeIf(e->contains(ids,e.optString("id")));return json(Response.Status.OK,obj("ok",true));}
   if(route.equals("/api/host/end")){members.clear();events.clear();waiting.clear();state=null;invite=secret();revision++;match++;return json(Response.Status.OK,obj("ok",true));}
   fail(Response.Status.NOT_FOUND,"Not found.");
  }
  if(!get)fail(Response.Status.METHOD_NOT_ALLOWED,"Method not allowed.");String file=route.equals("/")||route.equals("/join")?"local-host/player.html":route.equals("/player.js")?"local-host/player.js":route.equals("/player.css")?"local-host/player.css":route.startsWith("/")?route.substring(1):"";
  if(!files.contains(file))fail(Response.Status.NOT_FOUND,"Not found.");if(!file.startsWith("local-host/player.")&&!file.startsWith("play-audio/")&&!file.equals("play-announcements.js")&&!file.equals("play-announcements-data.js")&&!file.equals("play-recorded-audio.js")&&!file.equals("play-narration.js")&&!file.equals("play-narration-data.js")&&!file.equals("icons/icon-192.png")&&!loopback(s.getRemoteIpAddress()))fail(Response.Status.FORBIDDEN,"Open the player invitation on this device.");
  InputStream in=context.getAssets().open("play/"+file);String mime=file.endsWith(".html")?"text/html; charset=utf-8":file.endsWith(".js")?"text/javascript; charset=utf-8":file.endsWith(".css")?"text/css; charset=utf-8":file.endsWith(".mp3")?"audio/mpeg":file.endsWith(".png")?"image/png":file.endsWith(".webp")?"image/webp":file.endsWith(".svg")?"image/svg+xml":"application/octet-stream";return newChunkedResponse(Response.Status.OK,mime,in);
 }
}
