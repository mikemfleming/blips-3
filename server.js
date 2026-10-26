import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url);
const types={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png'};
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const url=new URL('.'+(path==='/'?'/index.html':path),root);if(!fileURLToPath(url).startsWith(fileURLToPath(root)))throw Error();res.setHeader('Content-Type',types[url.pathname.split('.').pop()]||'text/plain');res.end(await readFile(url));}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT)||5173,'127.0.0.1',()=>console.log('Blips: http://localhost:5173'));
