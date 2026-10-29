import {AudioEngine} from './audio.js';
import {gridFromText} from './text-grid.js';
import {parseStartupOptions} from './startup.js';
const $=id=>document.getElementById(id),audio=new AudioEngine(),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'}),canvas=$('grid'),ctx=canvas.getContext('2d',{alpha:false}),fine=document.createElement('canvas'),fc=fine.getContext('2d');
const cellPixels=()=>Math.max(2,Math.ceil(Math.max(innerWidth,innerHeight)/1024));
let scale=cellPixels(),gridWidth=Math.max(32,Math.ceil(innerWidth/scale)),gridHeight=Math.max(32,Math.ceil(innerHeight/scale));
fine.width=gridWidth;fine.height=gridHeight;canvas.width=innerWidth;canvas.height=innerHeight;
let cells=new Uint8Array(gridWidth*gridHeight),image=fc.createImageData(gridWidth,gridHeight),dirty=true,playing=false,column=-1,editing=false,drawing=false,last=null,paintValue=1;
worker.onmessage=({data})=>{gridWidth=data.width;gridHeight=data.height;if(fine.width!==gridWidth||fine.height!==gridHeight){fine.width=gridWidth;fine.height=gridHeight;image=fc.createImageData(gridWidth,gridHeight);}cells=data.cells;audio.density=data.density;$('iteration').textContent=`Iteration ${data.generation+1}`;dirty=true;};
const send=(type,data={})=>worker.postMessage({type,...data});
const startup=parseStartupOptions(location.search);
let initialText=null;
if(startup.text!==null){const size=Math.min(gridWidth,gridHeight),text=gridFromText(startup.text,size);initialText={cells:new Uint8Array(gridWidth*gridHeight),protection:new Uint16Array(gridWidth*gridHeight)};const dx=Math.floor((gridWidth-size)/2),dy=Math.floor((gridHeight-size)/2);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y+dy)*gridWidth+x+dx;initialText.cells[i]=text.cells[y*size+x];initialText.protection[i]=text.protection[y*size+x];}}
window.addEventListener('resize',()=>{scale=cellPixels();canvas.width=innerWidth;canvas.height=innerHeight;send('resize',{width:Math.max(32,Math.ceil(innerWidth/scale)),height:Math.max(32,Math.ceil(innerHeight/scale))});dirty=true;});
worker.postMessage({type:'init',width:gridWidth,height:gridHeight,cells:initialText?.cells??null,protection:initialText?.protection??null,density:startup.density},initialText?[initialText.cells.buffer,initialText.protection.buffer]:[]);
// Original Blips playing-column colors, repeating every 200 ms.
const titleElement=document.querySelector('h1'),titleRaster=document.createElement('canvas'),titleCtx=titleRaster.getContext('2d',{willReadFrequently:true});
let titleMask=null,titleBounds=null;
function prepareTitle(){
 const bounds=titleElement.getBoundingClientRect();
 titleBounds={x:Math.round(bounds.left),y:Math.round(bounds.top),width:Math.round(bounds.width),height:Math.round(bounds.height)};
 titleRaster.width=titleBounds.width;titleRaster.height=titleBounds.height;
 titleCtx.font='700 32px Helvetica, Arial, sans-serif';titleCtx.textBaseline='top';
 let word='BLIPS';
 while(titleCtx.measureText(word+'I').width<=titleRaster.width)word=word.replace('P','IP');
 const measured=titleCtx.measureText(word).width;
 titleCtx.fillStyle='#000';
 titleCtx.save();titleCtx.scale(titleRaster.width/measured,1);titleCtx.fillText(word,0,0);titleCtx.restore();
 titleMask=titleCtx.getImageData(0,0,titleRaster.width,titleRaster.height);dirty=true;
}
new ResizeObserver(prepareTitle).observe(titleElement);
window.addEventListener('resize',prepareTitle);
function drawTitle(){
 if(!titleMask||!titleBounds)return;
 const output=titleCtx.createImageData(titleMask.width,titleMask.height),mask=titleMask.data,pixels=output.data;
 for(let y=0;y<titleMask.height;y++)for(let x=0;x<titleMask.width;x++){
  const i=(y*titleMask.width+x)*4;if(!mask[i+3])continue;
  const gx=Math.floor((titleBounds.x+x)/scale),gy=Math.floor((titleBounds.y+y)/scale);
  const alive=gx>=0&&gx<gridWidth&&gy>=0&&gy<gridHeight&&cells[gy*gridWidth+gx];
  const value=alive?255-mask[i]:mask[i];pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=mask[i+3];
 }
 titleCtx.putImageData(output,0,0);ctx.drawImage(titleRaster,titleBounds.x,titleBounds.y);
}
const playheadColors=['#9400D3','#0000FF','#00FF00','#FFFF00','#FF7F00','#FF0000'];
function render(now){
 let changed=false;
 if(audio.ctx)while(audio.events.length&&audio.events[0].time<=audio.ctx.currentTime){
  column=audio.events.shift().column;changed=true;
 }
 if(dirty){
  const p=image.data;
  for(let i=0;i<cells.length;i++){
   p[i*4]=p[i*4+1]=p[i*4+2]=17;p[i*4+3]=cells[i]?255:0;
  }
  fc.putImageData(image,0,0);
 }
 if(dirty||changed||playing){
  ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(fine,0,0,gridWidth*scale,gridHeight*scale);
  if(playing&&column>=0){
   ctx.fillStyle='#00000006';ctx.fillRect(column*gridWidth/32*scale,0,gridWidth/32*scale,canvas.height);
   ctx.fillStyle=playheadColors[Math.floor((now%200)/200*playheadColors.length)];
   for(let y=0;y<gridHeight;y++)for(let x=Math.ceil(column*gridWidth/32);x<Math.ceil((column+1)*gridWidth/32);x++){
    if(cells[y*gridWidth+x])ctx.fillRect(x*scale,y*scale,scale,scale);
   }
  }
  drawTitle();
  dirty=false;
 }
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape')setEditing(false);
 const typing=e.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog[open]');
 if(e.code==='Space'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)$('play').click();}
});
function updateHint(){$('hint').textContent=editing?(playing?'Draw live · Space to pause':'Drag cells to draw · Space to play'):(playing?'Select pencil to draw live · Space to pause':'Select pencil to draw · Space to play');}
function setEditing(value){editing=value;drawing=false;last=null;$('draw').setAttribute('aria-pressed',String(value));canvas.classList.toggle('editable',value);updateHint();}
function pause(){audio.pause();playing=false;send('pause');column=-1;dirty=true;updatePlayback();}
function updatePlayback(){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');updateHint();}
let starting=false;
// Stop both clocks when the page is hidden; returning requires an explicit Play.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(playing||starting))pause();});
window.addEventListener('pagehide',()=>{if(playing||starting)pause();});
$('play').onclick=async()=>{if(starting)return;try{if(!playing){starting=true;await audio.play();if(document.hidden){pause();return;}playing=true;send('play');updatePlayback();}else pause();}catch(error){$('hint').textContent=`Audio could not start: ${error.message}`;}finally{starting=false;}};
$('random').onclick=()=>send('random');
$('clear').onclick=()=>send('clear');
$('draw').onclick=()=>setEditing(!editing);
const speeds={tortoise:30,hare:90};
function setSpeed(name){
 audio.bpm=speeds[name];
 for(const id of Object.keys(speeds))$(id).setAttribute('aria-pressed',String(id===name));
 send('tempo',{bpm:audio.bpm});
}
for(const name of Object.keys(speeds))$(name).onclick=()=>setSpeed(name);
setSpeed(startup.speed);
function setSound(mode){
 audio.setMode(mode);
 for(const id of ['trigger','swell'])$(id).setAttribute('aria-pressed',String(id===mode));
}
for(const mode of ['trigger','swell'])$(mode).onclick=()=>setSound(mode);
setSound(startup.sound==='smooth'?'swell':'trigger');
function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(gridWidth-1,Math.floor((e.clientX-r.left)/scale))),Math.max(0,Math.min(gridHeight-1,Math.floor((e.clientY-r.top)/scale)))];}
function paint(p){const points=[];if(last){const dx=p[0]-last[0],dy=p[1]-last[1],steps=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=steps;i++)points.push([Math.round(last[0]+dx*i/(steps||1)),Math.round(last[1]+dy*i/(steps||1))]);}else points.push(p);send('paint',{points,value:paintValue});last=p;}
canvas.onpointerdown=e=>{if(e.button!==0)return;if(!editing)return;const p=point(e);canvas.setPointerCapture(e.pointerId);drawing=true;last=null;paintValue=1-cells[p[1]*gridWidth+p[0]];paint(p);};canvas.onpointermove=e=>{if(drawing)paint(point(e));};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;};$('about').onclick=()=>$('about-dialog').showModal();
