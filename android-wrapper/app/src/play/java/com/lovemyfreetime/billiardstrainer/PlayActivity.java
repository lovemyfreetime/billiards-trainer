package com.lovemyfreetime.billiardstrainer;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import java.util.Locale;
import android.view.View;
import android.view.KeyEvent;
import android.view.InputDevice;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Bitmap;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import org.json.JSONObject;
import java.util.ArrayList;

/** Standalone offline Play flavor. Original Trainer and Installer remain independent. */
public class PlayActivity extends Activity {
 private WebView web;
 private TextToSpeech tts;
 private boolean ttsReady=false;
 private AndroidPlayServer server;
 private SpeechRecognizer recognizer;
 private WifiManager.LocalOnlyHotspotReservation hotspot;
 private boolean recognizing=false,foreground=false,hotspotPending=false;
 private long voiceGeneration=0;
 private volatile boolean clickerCapture=false;
 private final Handler handler=new Handler(Looper.getMainLooper());
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  try{
   server=new AndroidPlayServer(this);server.start(5000,false);
   web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMediaPlaybackRequiresUserGesture(true);
   web.addJavascriptInterface(new Bridge(),"BilliardsAndroid");
   web.setWebViewClient(new WebViewClient(){
    @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
     Uri u=request.getUrl();if("http".equals(u.getScheme())&&"127.0.0.1".equals(u.getHost())&&u.getPort()==server.getListeningPort())return false;
     if(request.isForMainFrame()&&("https".equals(u.getScheme())||"http".equals(u.getScheme())))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;
    }
    @Override public void onPageFinished(WebView view,String url){immersive();}
   });
   setContentView(web);web.loadUrl(server.hostUrl());immersive();
   tts=new TextToSpeech(this,status->{if(status!=TextToSpeech.SUCCESS)return;handler.post(()->{tts.setLanguage(Locale.US);if(tts.getVoices()!=null)for(Voice voice:tts.getVoices()){if(voice.getLocale().getLanguage().equals("en")&&!voice.isNetworkConnectionRequired()){tts.setVoice(voice);ttsReady=true;break;}}tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){speechState(true,id);}public void onDone(String id){speechState(false,id);}public void onError(String id){speechState(false,id);}});});});
  }catch(Exception e){new AlertDialog.Builder(this).setTitle("Play could not start").setMessage(e.getMessage()).setPositiveButton("Close",(d,w)->finish()).show();}
 }
 private void immersive(){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);}
 private void emit(String callback,JSONObject value){if(web!=null)web.evaluateJavascript("window."+callback+"?.("+value.toString()+")",null);}
 private void speechState(boolean speaking,String id){runOnUiThread(()->{try{JSONObject event=new JSONObject();event.put("speaking",speaking);event.put("id",id);emit("billiardsNativeSpeech",event);}catch(Exception ignored){}});}
 private void voiceError(String message,boolean fatal){try{JSONObject v=new JSONObject();v.put("error",message);v.put("fatal",fatal);emit("billiardsNativeVoice",v);}catch(Exception ignored){}}
 private void stopVoice(){voiceGeneration++;recognizing=false;if(recognizer!=null){recognizer.cancel();recognizer.destroy();recognizer=null;}}
 private void listen(){
  if(!foreground||recognizing)return;
  if(Build.VERSION.SDK_INT<31||!SpeechRecognizer.isOnDeviceRecognitionAvailable(this)){voiceError("On-device recognition is unavailable on this device.",true);return;}
  if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},101);return;}
  try{
   if(recognizer==null)recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
   final long generation=++voiceGeneration;recognizing=true;
   recognizer.setRecognitionListener(new RecognitionListener(){
    public void onReadyForSpeech(Bundle b){} public void onBeginningOfSpeech(){} public void onRmsChanged(float v){} public void onBufferReceived(byte[] b){} public void onEndOfSpeech(){} public void onPartialResults(Bundle b){} public void onEvent(int a,Bundle b){}
    public void onError(int error){if(generation!=voiceGeneration)return;recognizing=false;boolean fatal=error==SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS||error==SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED||error==SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE;voiceError(fatal?"Offline English recognition or microphone permission is unavailable.":"Listening paused. Say Table and repeat your command.",fatal);}
    public void onResults(Bundle b){if(generation!=voiceGeneration)return;recognizing=false;try{ArrayList<String> words=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);float[] scores=b.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);JSONObject v=new JSONObject();v.put("text",words==null||words.isEmpty()?"":words.get(0));v.put("confidence",scores==null||scores.length==0?0:scores[0]);v.put("id",Long.toString(generation));emit("billiardsNativeVoice",v);}catch(Exception e){voiceError("Voice result was unavailable.",false);}}
   });
   Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"en-US");i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true);i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);recognizer.startListening(i);
  }catch(Exception e){stopVoice();voiceError("Offline recognition could not start.",true);}
 }
 private void startHotspot(){
  if(hotspot!=null){showHotspot();return;}if(hotspotPending)return;
  String permission=Build.VERSION.SDK_INT>=33?Manifest.permission.NEARBY_WIFI_DEVICES:Manifest.permission.ACCESS_FINE_LOCATION;
  if(checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{permission},102);return;}
  try{hotspotPending=true;WifiManager manager=(WifiManager)getApplicationContext().getSystemService(WIFI_SERVICE);manager.startLocalOnlyHotspot(new WifiManager.LocalOnlyHotspotCallback(){
   @Override public void onStarted(WifiManager.LocalOnlyHotspotReservation r){hotspotPending=false;hotspot=r;showHotspot();}
   @Override public void onStopped(){hotspotPending=false;hotspot=null;Toast.makeText(PlayActivity.this,"Local hotspot stopped",Toast.LENGTH_LONG).show();}
   @Override public void onFailed(int reason){hotspotPending=false;new AlertDialog.Builder(PlayActivity.this).setTitle("Hotspot unavailable").setMessage("Android could not create a local hotspot ("+reason+"). Turn off tethering or connect everyone to the same private Wi-Fi. Older Android versions may require Location to be enabled.").setPositiveButton("Wi-Fi settings",(d,w)->startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS))).setNegativeButton("Close",null).show();}
  },handler);}catch(Exception e){hotspotPending=false;Toast.makeText(this,"Hotspot unavailable: "+e.getMessage(),Toast.LENGTH_LONG).show();}
 }
 private void showHotspot(){
  if(hotspot==null)return;String ssid,password;
  if(Build.VERSION.SDK_INT>=30){ssid=hotspot.getSoftApConfiguration().getSsid();password=hotspot.getSoftApConfiguration().getPassphrase();}else{ssid=hotspot.getWifiConfiguration().SSID;password=hotspot.getWifiConfiguration().preSharedKey;}
  LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(24,12,24,12);TextView instructions=new TextView(this);instructions.setText("Network: "+ssid+"\nPassword: "+password+"\n\nPlayers scan this Wi-Fi QR or join in Wi-Fi settings. Stay connected without internet. Then scan the Local table QR. Keep this app open. Hotspot support varies by device.");content.addView(instructions);
  try{String wifi="WIFI:T:WPA;S:"+wifiEscape(ssid)+";P:"+wifiEscape(password)+";;";BitMatrix matrix=new MultiFormatWriter().encode(wifi,BarcodeFormat.QR_CODE,420,420);Bitmap image=Bitmap.createBitmap(420,420,Bitmap.Config.ARGB_8888);for(int x=0;x<420;x++)for(int y=0;y<420;y++)image.setPixel(x,y,matrix.get(x,y)?0xff000000:0xffffffff);ImageView qr=new ImageView(this);qr.setImageBitmap(image);qr.setContentDescription("Scan to join the local table Wi-Fi");qr.setAdjustViewBounds(true);qr.setMaxHeight(420);content.addView(qr);}catch(Exception ignored){}
  new AlertDialog.Builder(this).setTitle("Local table Wi-Fi").setView(content).setPositiveButton("Show table QR",(d,w)->web.evaluateJavascript("window.BilliardsLocalSession?.open()",null)).setNegativeButton("Stop hotspot",(d,w)->{hotspot.close();hotspot=null;}).show();
 }
 private String wifiEscape(String value){return value==null?"":value.replace("\\","\\\\").replace(";","\\;").replace(",","\\,").replace("\"","\\\"");}
 @Override public void onRequestPermissionsResult(int request,String[] names,int[] results){super.onRequestPermissionsResult(request,names,results);if(results.length==0||results[0]!=PackageManager.PERMISSION_GRANTED){if(request==101)voiceError("Microphone permission denied.",true);else Toast.makeText(this,"Wi-Fi permission denied. Use an existing private network.",Toast.LENGTH_LONG).show();return;}if(request==101)listen();if(request==102)startHotspot();}
 @Override public boolean dispatchKeyEvent(KeyEvent event){
  InputDevice device=event.getDevice();int code=event.getKeyCode();boolean media=code==KeyEvent.KEYCODE_VOLUME_UP||code==KeyEvent.KEYCODE_VOLUME_DOWN||code==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE||code==KeyEvent.KEYCODE_MEDIA_NEXT||code==KeyEvent.KEYCODE_MEDIA_PREVIOUS;
  if(foreground&&clickerCapture&&device!=null&&device.isExternal()&&media){if(event.getAction()==KeyEvent.ACTION_DOWN&&event.getRepeatCount()==0&&web!=null)web.evaluateJavascript("window.billiardsNativeButton?.("+code+")",null);return true;}return super.dispatchKeyEvent(event);
 }
 @Override protected void onResume(){super.onResume();foreground=true;immersive();if(web!=null)web.onResume();}
 @Override protected void onPause(){foreground=false;stopVoice();if(tts!=null)tts.stop();if(web!=null){web.evaluateJavascript("document.dispatchEvent(new Event('billiards-native-pause'))",null);web.onPause();}super.onPause();}
 @Override protected void onDestroy(){stopVoice();if(tts!=null)tts.shutdown();if(hotspot!=null)hotspot.close();if(server!=null)server.stop();if(web!=null)web.destroy();super.onDestroy();}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("End this local table and close Play?").setPositiveButton("End table",(d,w)->finish()).setNegativeButton("Keep playing",null).show();}
 public class Bridge{
  @JavascriptInterface public void speakOffline(String message,String id){runOnUiThread(()->{if(ttsReady&&foreground&&message!=null&&message.length()<1000){stopVoice();tts.speak(message,TextToSpeech.QUEUE_FLUSH,null,id);}else{Toast.makeText(PlayActivity.this,"Install an offline English text-to-speech voice in Android settings for announcements.",Toast.LENGTH_LONG).show();speechState(false,id);}});}
  @JavascriptInterface public void cancelOfflineSpeech(){runOnUiThread(()->{if(tts!=null)tts.stop();});}
  @JavascriptInterface public void setClickerCapture(boolean capture){clickerCapture=capture;}
  @JavascriptInterface public boolean isWrapper(){return true;}
  @JavascriptInterface public boolean offlineVoiceAvailable(){return Build.VERSION.SDK_INT>=31&&SpeechRecognizer.isOnDeviceRecognitionAvailable(PlayActivity.this);}
  @JavascriptInterface public void startOfflineVoice(){runOnUiThread(()->listen());}
  @JavascriptInterface public void stopOfflineVoice(){runOnUiThread(()->stopVoice());}
  @JavascriptInterface public void startLocalHotspot(){runOnUiThread(()->startHotspot());}
  @JavascriptInterface public void openWifiSettings(){runOnUiThread(()->startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS)));}
 }
}
