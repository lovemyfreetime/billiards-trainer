// Local static fixture with byte ranges, matching Pages and bundled WebView media loading.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.argv[2]);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.mp3':'audio/mpeg','.wav':'audio/wav','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const stat=fs.statSync(file);if(!stat.isFile())throw Error();
 const size=stat.size,range=req.headers.range,headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
 let start=0,end=size-1;
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2])){res.writeHead(416);res.end();return}if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}else start=Math.max(0,size-Number(m[2]));if(start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return}headers['Content-Range']=`bytes ${start}-${end}/${size}`}
 headers['Content-Length']=end-start+1;res.writeHead(range?206:200,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
 }catch(_){res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('Ready on '+port));
