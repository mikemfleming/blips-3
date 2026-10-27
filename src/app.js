import {AudioEngine} from './audio.js';
import {gridFromText} from './text-grid.js';
import {parseStartupOptions} from './startup.js';
const $=id=>document.getElementById(id),audio=new AudioEngine(),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'}),canvas=$('grid'),ctx=canvas.getContext('2d',{alpha:false}),fine=document.createElement('canvas'),fc=fine.getContext('2d');fine.width=fine.height=512;canvas.width=canvas.height=1024;
let cells=new Uint8Array(512*512),image=fc.createImageData(512,512),dirty=true,playing=false,column=-1,editing=false,drawing=false,last=null,paintValue=1;
worker.onmessage=({data})=>{cells=data.cells;audio.density=data.density;$('iteration').textContent=`Iteration ${data.generation+1}`;dirty=true;};
const send=(type,data={})=>worker.postMessage({type,...data});
const startup=parseStartupOptions(location.search);
const initialText=startup.text===null?null:gridFromText(startup.text);
worker.postMessage({type:'init',cells:initialText?.cells??null,protection:initialText?.protection??null,density:startup.density},initialText?[initialText.cells.buffer,initialText.protection.buffer]:[]);
// Original Blips playing-column colors, repeating every 200 ms.
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
  ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,1024,1024);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(fine,0,0,1024,1024);
  if(playing&&column>=0){
   ctx.fillStyle='#00000006';ctx.fillRect(column*32,0,32,1024);
   ctx.fillStyle=playheadColors[Math.floor((now%200)/200*playheadColors.length)];
   for(let y=0;y<512;y++)for(let x=column*16;x<(column+1)*16;x++){
    if(cells[y*512+x])ctx.fillRect(x*2,y*2,2,2);
   }
  }
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
$('play').onclick=async()=>{if(starting)return;try{if(!playing){starting=true;await audio.play();playing=true;send('play');updatePlayback();}else pause();}catch(error){$('hint').textContent=`Audio could not start: ${error.message}`;}finally{starting=false;}};
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
function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(511,Math.floor((e.clientX-r.left)/r.width*512))),Math.max(0,Math.min(511,Math.floor((e.clientY-r.top)/r.height*512)))];}
function paint(p){const points=[];if(last){const dx=p[0]-last[0],dy=p[1]-last[1],steps=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=steps;i++)points.push([Math.round(last[0]+dx*i/(steps||1)),Math.round(last[1]+dy*i/(steps||1))]);}else points.push(p);send('paint',{points,value:paintValue});last=p;}
canvas.onpointerdown=e=>{if(e.button!==0)return;if(!editing)return;const p=point(e);canvas.setPointerCapture(e.pointerId);drawing=true;last=null;paintValue=1-cells[p[1]*512+p[0]];paint(p);};canvas.onpointermove=e=>{if(drawing)paint(point(e));};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;};$('about').onclick=()=>$('about-dialog').showModal();

// Share available square size with the header. Short screens scroll vertically.
function sizeWorkspace(){
 const bodyStyle=getComputedStyle(document.body);
 const width=document.body.clientWidth-parseFloat(bodyStyle.paddingLeft)-parseFloat(bodyStyle.paddingRight);
 const height=window.innerHeight-document.querySelector('header').getBoundingClientRect().height-document.querySelector('footer').getBoundingClientRect().height-32;
 const size=Math.floor(Math.min(width,Math.max(Math.min(320,width),height)));
 const value=`${size}px`;
 if(document.body.style.getPropertyValue('--grid-size')!==value)document.body.style.setProperty('--grid-size',value);
}
const workspaceObserver=new ResizeObserver(()=>requestAnimationFrame(sizeWorkspace));
workspaceObserver.observe(document.querySelector('header'));
workspaceObserver.observe(document.querySelector('footer'));
window.addEventListener('resize',sizeWorkspace);sizeWorkspace();
