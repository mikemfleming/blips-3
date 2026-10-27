import {PENCIL_LIFETIME} from './life.js';
export const TEXT_LIFETIME_STEP=1;
const MAX_TEXT_LENGTH=512;
const INK_THRESHOLD=128;

// Center the actual ink bounds, rather than the font's baseline or whitespace.
export function centerTextLayers(rgba,width,height,size=512,lifetimes=null){
 const cells=new Uint8Array(size*size),protection=new Uint16Array(size*size);
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(rgba[(y*width+x)*4+3]<INK_THRESHOLD)continue;
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left)return {cells,protection};
 const inkWidth=right-left+1,inkHeight=bottom-top+1;
 const offsetX=Math.floor((size-inkWidth)/2),offsetY=Math.floor((size-inkHeight)/2);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  if(rgba[(y*width+x)*4+3]>=INK_THRESHOLD){
   const xx=x-left+offsetX,yy=y-top+offsetY;
   if(xx>=0&&xx<size&&yy>=0&&yy<size){const i=yy*size+xx;cells[i]=1;protection[i]=lifetimes?.[y*width+x]??0;}
  }
 }
 return {cells,protection};
}

export const centerTextInk=(rgba,width,height,size=512)=>centerTextLayers(rgba,width,height,size).cells;

export function gridFromText(text,size=512){
 const normalized=Array.from(String(text).replace(/\r\n?/g,'\n')).slice(0,MAX_TEXT_LENGTH).join('');
 if(!normalized.trim())return {cells:new Uint8Array(size*size),protection:new Uint16Array(size*size)};
 const lines=normalized.split('\n').flatMap(line=>{
  const characters=Array.from(line),wrapped=[];
  while(characters.length>32){
   let split=32;
   for(let i=32;i>=16;i--)if(/\s/u.test(characters[i])){split=i;break;}
   wrapped.push(characters.splice(0,split).join(''));
   while(characters[0]===' ')characters.shift();
  }
  wrapped.push(characters.join(''));return wrapped;
 });
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
 const characters=lines.map(line=>segmenter?Array.from(segmenter.segment(line),part=>part.segment):Array.from(line));
 const raster=document.createElement('canvas');raster.width=raster.height=size;
 const context=raster.getContext('2d',{willReadFrequently:true});
 const font=pixels=>`700 ${pixels}px Helvetica, Arial, sans-serif`;
 context.font=font(128);
 const longest=Math.max(...characters.map(line=>line.reduce((width,char)=>width+context.measureText(char).width,0)),1);
 const available=size*.8;
 const fontSize=Math.min(128,128*available/longest,available/(lines.length*1.2));
 context.font=font(fontSize);context.textAlign='left';context.textBaseline='top';context.fillStyle='#111';
 const ink=new Uint8ClampedArray(size*size*4),lifetimes=new Uint16Array(size*size);
 let characterIndex=0;
 characters.forEach((line,lineIndex)=>{
  const widths=line.map(char=>context.measureText(char).width);
  let x=(size-widths.reduce((sum,width)=>sum+width,0))/2;
  const y=lineIndex*fontSize*1.2;
  line.forEach((char,index)=>{
   if(char.trim()){
    const lifetime=PENCIL_LIFETIME+TEXT_LIFETIME_STEP*characterIndex++;
    context.clearRect(0,0,size,size);context.fillText(char,x,y);
    const left=Math.max(0,Math.floor(x)-4),top=Math.max(0,Math.floor(y)-4);
    const width=Math.min(size-left,Math.ceil(widths[index])+8),height=Math.min(size-top,Math.ceil(fontSize*1.5)+8);
    const glyph=context.getImageData(left,top,width,height).data;
    for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++)if(glyph[(yy*width+xx)*4+3]>=INK_THRESHOLD){
     const i=(top+yy)*size+left+xx;ink[i*4+3]=255;lifetimes[i]=Math.max(lifetimes[i],lifetime);
    }
   }
   x+=widths[index];
  });
 });
 return centerTextLayers(ink,size,size,size,lifetimes);
}
