using BilliardsTrainer.Windows;
using System.Text;
var folder=Path.Combine(Path.GetTempPath(),Guid.NewGuid().ToString());Directory.CreateDirectory(folder);
try{
 var bytes=Enumerable.Range(0,100).Select(i=>(byte)i).ToArray();File.WriteAllBytes(Path.Combine(folder,"clip.mp3"),bytes);File.WriteAllText(Path.Combine(folder,"welcome.html"),"ready");
 File.WriteAllText(Path.Combine(folder,"index.html"),"trainer");
 var assets=new BundledAssets(folder);Uri Url(string p)=>new("https://lovemyfreetime.github.io/billiards-trainer/"+p);
 void Check(bool condition,string name){if(!condition)throw new Exception(name);}
 var home=assets.Read(Url(""),"GET",null);Check(home.Status==200,"Opening page is local");home.Body!.Dispose();
 foreach(var mode in new[]{"?train=1","?zen=1"}){var r=assets.Read(Url(mode),"GET",null);Check(r.Status==200&&new StreamReader(r.Body!).ReadToEnd()=="trainer","Mode opens local trainer shell");r.Body!.Dispose();}
 var full=assets.Read(Url("clip.mp3?v=123"),"GET",null);Check(full.Status==200&&full.Body!.Length==100,"MP3 full response");full.Body!.Dispose();
 foreach(var (range,start,count) in new[]{("bytes=10-19",10,10),("bytes=90-",90,10),("bytes=-5",95,5),("bytes=95-1000",95,5)}){var r=assets.Read(Url("clip.mp3"),"GET",range);Check(r.Status==206,"Range status");var data=new byte[count];r.Body!.ReadExactly(data);r.Body.Dispose();Check(data.SequenceEqual(bytes.Skip(start).Take(count)),range);}
 foreach(var range in new[]{"bytes=100-","bytes=9-2","bytes=0-1,4-5","bytes=-0","broken"})Check(assets.Read(Url("clip.mp3"),"GET",range).Status==416,range);
 Check(assets.Read(Url("clip.mp3"),"HEAD",null).Body==null,"HEAD has no body");Check(assets.Read(Url("missing.js"),"GET",null).Status==404,"Missing asset returns immediately");
 Check(assets.Read(Url("%2e%2e/secret"),"GET",null).Status==404,"Traversal cannot escape bundle");
 Check(assets.Read(Url("clip.mp3"),"POST",null).Status==405,"Only read methods allowed");
 Console.WriteLine("Bundled asset tests passed: local entry, versioned paths, media ranges, HEAD, immediate misses, traversal protection.");
}finally{Directory.Delete(folder,true);}
await UpdateTests.Run();
