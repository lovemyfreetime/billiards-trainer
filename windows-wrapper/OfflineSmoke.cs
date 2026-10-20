using Microsoft.Web.WebView2.Core;
using System.Diagnostics;

namespace BilliardsTrainer.Windows;

internal static class OfflineSmoke
{
    internal static async Task Run(CoreWebView2 core)
    {
        async Task Wait(string expression, int seconds = 12)
        {
            var watch = Stopwatch.StartNew();
            while (watch.Elapsed.TotalSeconds < seconds)
            {
                if (await core.ExecuteScriptAsync($"Boolean({expression})") == "true") return;
                await Task.Delay(50);
            }
            throw new InvalidOperationException("Offline smoke timeout: " + expression);
        }
        foreach (var page in new[] { ("welcome.html", "main nav"), ("?train=1", "#canvas"), ("?zen=1", "#zenBar"), ("play.html", "#playDialog") })
        {
            var ready = new TaskCompletionSource<bool>();
            void Complete(object? sender, CoreWebView2NavigationCompletedEventArgs e) { if (e.IsSuccess) ready.TrySetResult(true); else ready.TrySetException(new Exception(e.WebErrorStatus.ToString())); }
            core.NavigationCompleted += Complete;
            var watch = Stopwatch.StartNew();
            try { core.Navigate("https://lovemyfreetime.github.io/billiards-trainer/" + page.Item1); await ready.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
            finally { core.NavigationCompleted -= Complete; }
            await Wait($"document.querySelector('{page.Item2}')");
            Console.WriteLine($"OFFLINE {page.Item1}: {watch.ElapsedMilliseconds} ms");
        }
        await core.ExecuteScriptAsync("localStorage.setItem('offline-smoke-save','kept');window.__offlineErrors=[];document.addEventListener('billiards-audio-error',e=>window.__offlineErrors.push(e.detail));window.BilliardsAudio.speak(['player-2','turn-1'],()=>document.body.dataset.offlineAudio='done');");
        await Wait("document.body.dataset.offlineAudio==='done'");
        if (await core.ExecuteScriptAsync("window.__offlineErrors.length") != "0") throw new Exception("Chase playback failed");
        Console.WriteLine("OFFLINE recorded Chase playback: passed");
        // A guide MP3 must become playable without a service worker or public network.
        await core.ExecuteScriptAsync("(()=>{const a=new Audio(new URL('./guide/audio/get-started-03.mp3',document.baseURI));window.__guideAudio=a;a.oncanplay=()=>a.play().then(()=>{a.pause();document.body.dataset.offlineGuide='ready';});a.onerror=()=>document.body.dataset.offlineGuide='failed';a.load();})()");
        await Wait("document.body.dataset.offlineGuide==='ready'");
        Console.WriteLine("OFFLINE guide media/range loading: passed");
        await core.ExecuteScriptAsync("(()=>{const s=document.createElement('script');s.src=new URL('./vendor/onnxruntime-1.22.0/ort.wasm.min.js',document.baseURI);s.onload=async()=>{try{ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('./vendor/onnxruntime-1.22.0/',document.baseURI).href;const bytes=await fetch('./ai_model/pool_ball_classifier.onnx').then(r=>r.arrayBuffer());window.__offlineClassifier=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});document.body.dataset.offlineModel='ready';}catch(e){document.body.dataset.offlineModel=String(e);}};document.head.append(s);})()");
        await Wait("document.body.dataset.offlineModel==='ready'",45);
        Console.WriteLine("OFFLINE local WASM runtime and trained classifier: passed");
        await core.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.ServiceWorkers | CoreWebView2BrowsingDataKinds.CacheStorage | CoreWebView2BrowsingDataKinds.DiskCache);
        if (await core.ExecuteScriptAsync("localStorage.getItem('offline-smoke-save')") != "\"kept\"") throw new Exception("Save data was cleared");
        Console.WriteLine("OFFLINE save preservation: passed");
    }
}
